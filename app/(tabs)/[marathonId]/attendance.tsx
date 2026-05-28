import { Header } from '@/components/Header';
import { BorderRadius, Colors, Font, Spacing } from '@/constants/Theme';
import { useAuth } from '@/context/AuthContext';
import { useMarathon } from '@/context/MarathonContext';
import { useMarathonTheme } from '@/hooks/useMarathonTheme';
import {
  AttendanceChallenge,
  AttendanceRecord,
  FamilyAttendanceStat,
  fetchAttendanceChallengeForWeek,
  fetchFamilyAttendanceStats,
  fetchWeekAttendance,
  recordAttendance,
  refreshFamilyScore,
  removeAttendance,
  resolveParticipantFromQR,
} from '@/services/attendanceService';
import { fetchWeeksByMarathonId } from '@/services/marathonService';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Week = { id: number; week_number: number; start_date: string; end_date: string };
type ScanFeedback = { text: string; type: 'success' | 'duplicate' | 'error' };

const SCREEN_WIDTH = Dimensions.get('window').width;
const QR_FRAME_SIZE = SCREEN_WIDTH * 0.65;
const SAME_QR_DEBOUNCE_MS = 2000;

export default function AttendanceScreen() {
  const { t } = useTranslation();
  const { marathonId } = useLocalSearchParams();
  const { selectedMarathon } = useMarathon();
  const { userProfile, session } = useAuth();
  const marathonTheme = useMarathonTheme();

  const currentMarathonId = Number(marathonId ?? selectedMarathon?.id);
  const isAdminOrLeader = ['admin', 'leader'].includes(userProfile?.role ?? '');

  const [permission, requestPermission] = useCameraPermissions();

  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const [attendees, setAttendees] = useState<AttendanceRecord[]>([]);
  const [familyStats, setFamilyStats] = useState<FamilyAttendanceStat[]>([]);
  const [attendanceChallenge, setAttendanceChallenge] = useState<AttendanceChallenge | null>(null);

  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<ScanFeedback | null>(null);
  // Counter shown in the scanner overlay — increments immediately on each accepted scan
  const [sessionScanCount, setSessionScanCount] = useState(0);
  const [lastScannedPerson, setLastScannedPerson] = useState<{ name: string; team: string } | null>(null);

  // Refs for the scan queue (never causes re-renders)
  const lastScanRef = useRef({ data: '', time: 0 });
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scannedQRSet = useRef(new Set<string>());   // client-side dedup by raw QR string
  const scanQueue = useRef<string[]>([]);            // pending QR strings
  const queueRunning = useRef(false);
  const affectedFamilies = useRef(new Set<number>()); // families to re-score on Done

  // Snapshot of scanning state needed inside the async queue without stale closures
  const sessionWeekId = useRef<number | null>(null);
  const sessionUserId = useRef<string | null>(null);
  const sessionAC = useRef<AttendanceChallenge | null>(null);

  // Load weeks on mount
  useEffect(() => {
    async function loadWeeks() {
      try {
        const allWeeks = await fetchWeeksByMarathonId(currentMarathonId);
        setWeeks(allWeeks);
        const today = new Date();
        const current = allWeeks.find(w => {
          const start = new Date(w.start_date);
          const end = new Date(w.end_date);
          return today >= start && today <= end;
        });
        setSelectedWeekId(current?.id ?? allWeeks[0]?.id ?? null);
      } catch {
        // silently fail
      }
    }
    loadWeeks();
  }, [currentMarathonId]);

  useFocusEffect(
    useCallback(() => {
      loadAttendanceData();
    }, [selectedWeekId])
  );

  async function loadAttendanceData() {
    if (!selectedWeekId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [records, stats, ac] = await Promise.all([
        fetchWeekAttendance(selectedWeekId, currentMarathonId),
        fetchFamilyAttendanceStats(selectedWeekId, currentMarathonId),
        fetchAttendanceChallengeForWeek(currentMarathonId, selectedWeekId),
      ]);
      setAttendees(records);
      setFamilyStats(stats);
      setAttendanceChallenge(ac);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  const showFeedback = useCallback((text: string, type: ScanFeedback['type']) => {
    setScanFeedback({ text, type });
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => setScanFeedback(null), 2500);
  }, []);

  // Drain the queue serially in the background — camera is never blocked
  const drainQueue = useCallback(async () => {
    if (queueRunning.current) return;
    queueRunning.current = true;

    while (scanQueue.current.length > 0) {
      const qrData = scanQueue.current.shift()!;
      const weekId = sessionWeekId.current;
      const userId = sessionUserId.current;
      const ac = sessionAC.current;

      if (!weekId || !userId) continue;

      try {
        const resolved = await resolveParticipantFromQR(qrData);

        if (!resolved.ok) {
          scannedQRSet.current.delete(qrData); // allow retry
          showFeedback(
            resolved.error === 'not_found'
              ? t('attendance.scanFeedback.notFound')
              : t('attendance.scanFeedback.noFamily'),
            'error',
          );
          continue;
        }

        const result = await recordAttendance(
          resolved.id,
          weekId,
          currentMarathonId,
          resolved.familyId,
          userId,
          ac,
          { skipScoreRefresh: true }, // batch at session end
        );

        if (result.alreadyRecorded) {
          scannedQRSet.current.delete(qrData);
          showFeedback(t('attendance.scanFeedback.duplicate', { name: resolved.name }), 'duplicate');
        } else {
          affectedFamilies.current.add(resolved.familyId);
          // Optimistic local state update
          setAttendees(prev => [
            ...prev,
            {
              id: Date.now() + Math.random(),
              participant_id: resolved.id,
              participant_name: resolved.name,
              family_id: resolved.familyId,
              family_name: '',
              scanned_at: new Date().toISOString(),
            },
          ]);
          setFamilyStats(prev =>
            prev.map(s =>
              s.familyId === resolved.familyId ? { ...s, present: s.present + 1 } : s
            )
          );
        }
      } catch {
        scannedQRSet.current.delete(qrData);
        showFeedback(t('attendance.scanFeedback.invalidQR'), 'error');
      }
    }

    queueRunning.current = false;
  }, [currentMarathonId, t, showFeedback]);

  // Camera callback — purely synchronous, never awaits
  const handleBarcodeScanned = useCallback(({ data }: { data: string }) => {
    const now = Date.now();
    // Debounce same QR (camera fires many times per second on the same code)
    if (data === lastScanRef.current.data && now - lastScanRef.current.time < SAME_QR_DEBOUNCE_MS) return;
    lastScanRef.current = { data, time: now };

    // Client-side duplicate check (instant, no network)
    if (scannedQRSet.current.has(data)) {
      showFeedback(t('attendance.scanFeedback.alreadyScanned'), 'duplicate');
      return;
    }

    // Validate minimal QR shape before queuing
    try {
      const parsed = JSON.parse(data);
      if (!parsed.pid || typeof parsed.pid !== 'string') throw new Error();
    } catch {
      showFeedback(t('attendance.scanFeedback.invalidQR'), 'error');
      return;
    }

    // Accept immediately
    scannedQRSet.current.add(data);
    setSessionScanCount(prev => prev + 1);

    // Show the participant's name from the QR payload
    try {
      const qrInfo = JSON.parse(data);
      if (qrInfo.name) {
        setLastScannedPerson({ name: qrInfo.name, team: qrInfo.team ?? '' });
      }
    } catch { /* ignore */ }

    showFeedback(t('attendance.scanFeedback.queued'), 'success');

    scanQueue.current.push(data);
    drainQueue();
  }, [t, showFeedback, drainQueue]);

  async function openScanner() {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) return;
    }
    // Reset session state
    scannedQRSet.current.clear();
    scanQueue.current = [];
    affectedFamilies.current.clear();
    setSessionScanCount(0);
    setScanFeedback(null);
    setLastScannedPerson(null);
    // Snapshot mutable session values into refs so the async queue always sees current values
    sessionWeekId.current = selectedWeekId;
    sessionUserId.current = session?.user?.id ?? null;
    sessionAC.current = attendanceChallenge;
    setScanning(true);
  }

  async function handleDone() {
    setScanning(false);

    // Flush any remaining queue items first
    await new Promise<void>(resolve => {
      const poll = setInterval(() => {
        if (!queueRunning.current && scanQueue.current.length === 0) {
          clearInterval(poll);
          resolve();
        }
      }, 100);
    });

    // Batch score refresh for all affected families
    const ac = attendanceChallenge;
    const weekId = selectedWeekId;
    if (ac && weekId && affectedFamilies.current.size > 0) {
      await Promise.all(
        Array.from(affectedFamilies.current).map(fid => refreshFamilyScore(weekId, fid, ac))
      );
    }

    loadAttendanceData();
  }

  function handleRemoveAttendee(record: AttendanceRecord) {
    Alert.alert(
      t('attendance.removeTitle'),
      t('attendance.removeConfirm', { name: record.participant_name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('attendance.remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              await removeAttendance(
                record.participant_id,
                selectedWeekId!,
                record.family_id,
                attendanceChallenge,
              );
              setAttendees(prev => prev.filter(a => a.id !== record.id));
              setFamilyStats(prev =>
                prev.map(s =>
                  s.familyId === record.family_id ? { ...s, present: Math.max(0, s.present - 1) } : s
                )
              );
            } catch {
              Alert.alert(t('common.error'), t('attendance.removeFailed'));
            }
          },
        },
      ],
    );
  }

  const totalPresent = familyStats.reduce((sum, s) => sum + s.present, 0);
  const totalMembers = familyStats.reduce((sum, s) => sum + s.total, 0);

  const feedbackBg: Record<string, string> = {
    success: '#1A7A4A',
    duplicate: '#B45309',
    error: '#B91C1C',
  };

  const renderHeader = () => (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.weekSelector}
        style={styles.weekSelectorContainer}
      >
        {weeks.map(week => (
          <TouchableOpacity
            key={week.id}
            style={[
              styles.weekButton,
              selectedWeekId === week.id && [
                styles.selectedWeekButton,
                { backgroundColor: marathonTheme.primary, borderColor: marathonTheme.primary },
              ],
            ]}
            onPress={() => setSelectedWeekId(week.id)}
          >
            <Text
              style={[
                styles.weekButtonText,
                selectedWeekId === week.id && styles.selectedWeekText,
              ]}
            >
              Week {week.week_number}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {familyStats.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsStrip}
        >
          <View style={[styles.statTile, styles.statTileOverall, { borderColor: marathonTheme.primary }]}>
            <Text style={[styles.statTileCount, { color: marathonTheme.primary }]}>
              {totalPresent}/{totalMembers}
            </Text>
            <Text style={styles.statTileLabel}>{t('attendance.total')}</Text>
            <View style={styles.statTileBar}>
              <View
                style={[
                  styles.statTileFill,
                  {
                    width: `${totalMembers > 0 ? Math.min((totalPresent / totalMembers) * 100, 100) : 0}%`,
                    backgroundColor: marathonTheme.primary,
                  },
                ]}
              />
            </View>
          </View>

          {familyStats.map(stat => {
            const pct = stat.total > 0 ? Math.round((stat.present / stat.total) * 100) : 0;
            return (
              <View key={stat.familyId} style={styles.statTile}>
                <Text style={styles.statTileCount}>{stat.present}/{stat.total}</Text>
                <Text style={styles.statTileName} numberOfLines={1}>{stat.familyName}</Text>
                <Text style={styles.statTilePct}>{pct}%</Text>
                <View style={styles.statTileBar}>
                  <View
                    style={[
                      styles.statTileFill,
                      {
                        width: `${Math.min(pct, 100)}%`,
                        backgroundColor:
                          pct >= 76 ? '#1A7A4A' : pct >= 51 ? '#B45309' : Colors.light.textSecondary,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {isAdminOrLeader && (
        <TouchableOpacity
          style={[styles.scanButton, { backgroundColor: marathonTheme.primary }]}
          onPress={openScanner}
          activeOpacity={0.85}
        >
          <Ionicons name="qr-code-outline" size={20} color={Colors.white} />
          <Text style={styles.scanButtonText}>{t('attendance.startScanning')}</Text>
        </TouchableOpacity>
      )}

      {attendees.length > 0 && (
        <Text style={[styles.sectionTitle, { color: marathonTheme.shade }]}>
          {t('attendance.attendees')}
        </Text>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title={t('attendance.title')} />

      {loading ? (
        <ActivityIndicator size="large" color={marathonTheme.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={attendees}
          keyExtractor={item => String(item.id)}
          ListHeaderComponent={renderHeader}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.attendeeRow}>
              <View style={styles.attendeeAvatar}>
                <Text style={[styles.attendeeInitial, { color: marathonTheme.primary }]}>
                  {item.participant_name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.attendeeInfo}>
                <Text style={styles.attendeeName}>{item.participant_name}</Text>
                <View style={styles.attendeeMeta}>
                  {item.family_name ? (
                    <View style={[styles.familyBadge, { backgroundColor: marathonTheme.tint }]}>
                      <Text style={[styles.familyBadgeText, { color: marathonTheme.shade }]}>
                        {item.family_name}
                      </Text>
                    </View>
                  ) : null}
                  <Text style={styles.attendeeTime}>
                    {new Date(item.scanned_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
              {isAdminOrLeader && (
                <TouchableOpacity
                  onPress={() => handleRemoveAttendee(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.red[1]} />
                </TouchableOpacity>
              )}
            </View>
          )}
          ListEmptyComponent={
            isAdminOrLeader ? (
              <View style={styles.emptyState}>
                <Ionicons name="qr-code-outline" size={48} color={Colors.light.textSecondary} />
                <Text style={styles.emptyText}>{t('attendance.noAttendees')}</Text>
              </View>
            ) : null
          }
        />
      )}

      <Modal
        visible={scanning}
        animationType="slide"
        onRequestClose={handleDone}
        statusBarTranslucent
      >
        <View style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFill}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarcodeScanned}
          />

          <View style={styles.overlayTop}>
            {/* Session counter — always visible at top */}
            <View style={styles.counterBadge}>
              <Text style={styles.counterNumber}>{sessionScanCount}</Text>
              <Text style={styles.counterLabel}>{t('attendance.scanned')}</Text>
            </View>
          </View>

          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            <View style={styles.qrFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <View style={styles.overlaySide} />
          </View>

          <View style={styles.overlayBottom}>
            {/* Persistent name banner — stays until next scan */}
            {lastScannedPerson ? (
              <View style={styles.scannedPersonBanner}>
                <Text style={styles.scannedPersonName}>{lastScannedPerson.name}</Text>
                {lastScannedPerson.team ? (
                  <Text style={styles.scannedPersonTeam}>{lastScannedPerson.team}</Text>
                ) : null}
              </View>
            ) : null}

            {scanFeedback ? (
              <View style={[styles.feedbackCard, { backgroundColor: feedbackBg[scanFeedback.type] }]}>
                <Text style={styles.feedbackText}>{scanFeedback.text}</Text>
              </View>
            ) : (
              <View style={styles.feedbackPlaceholder} />
            )}
            <Text style={styles.scanHint}>{t('attendance.scanHint')}</Text>
            <TouchableOpacity
              style={[styles.doneButton, { backgroundColor: marathonTheme.primary }]}
              onPress={handleDone}
            >
              <Text style={styles.doneButtonText}>{t('attendance.done')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const OVERLAY_COLOR = 'rgba(0,0,0,0.72)';
const CORNER_SIZE = 28;
const CORNER_THICKNESS = 4;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background } as ViewStyle,
  loader: { flex: 1 } as ViewStyle,
  listContent: { paddingBottom: 48 } as ViewStyle,

  weekSelectorContainer: { flexGrow: 0, marginVertical: Spacing.md } as ViewStyle,
  weekSelector: { paddingHorizontal: Spacing.md, gap: Spacing.sm } as ViewStyle,
  weekButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
    backgroundColor: Colors.light.cardBackground,
  } as ViewStyle,
  selectedWeekButton: { borderWidth: 1 } as ViewStyle,
  weekButtonText: {
    fontSize: Font.sizes.caption,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  } as TextStyle,
  selectedWeekText: { color: Colors.white, fontWeight: '700' } as TextStyle,

  statsStrip: { paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.md } as ViewStyle,
  statTile: {
    width: 110,
    padding: Spacing.sm,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
      android: { elevation: 1 },
    }),
  } as ViewStyle,
  statTileOverall: { borderWidth: 1.5 } as ViewStyle,
  statTileCount: { fontSize: Font.sizes.h2, fontWeight: '800', color: Colors.light.textPrimary } as TextStyle,
  statTileLabel: {
    fontSize: Font.sizes.caption,
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  statTileName: { fontSize: Font.sizes.caption, color: Colors.light.textSecondary, marginTop: 2 } as TextStyle,
  statTilePct: { fontSize: Font.sizes.caption, fontWeight: '700', color: Colors.light.textPrimary, marginTop: 2 } as TextStyle,
  statTileBar: {
    height: 4,
    backgroundColor: Colors.light.cardBorder,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: Spacing.xs,
  } as ViewStyle,
  statTileFill: { height: '100%', borderRadius: 2 } as ViewStyle,

  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.medium,
    gap: Spacing.sm,
  } as ViewStyle,
  scanButtonText: { color: Colors.white, fontSize: Font.sizes.body, fontWeight: '700' } as TextStyle,

  sectionTitle: {
    fontSize: Font.sizes.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  } as TextStyle,

  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
    gap: Spacing.sm,
  } as ViewStyle,
  attendeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
  } as ViewStyle,
  attendeeInitial: { fontSize: Font.sizes.body, fontWeight: '700' } as TextStyle,
  attendeeInfo: { flex: 1 } as ViewStyle,
  attendeeName: { fontSize: Font.sizes.body, fontWeight: '600', color: Colors.light.textPrimary } as TextStyle,
  attendeeMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: 2 } as ViewStyle,
  familyBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 } as ViewStyle,
  familyBadgeText: { fontSize: 10, fontWeight: '600' } as TextStyle,
  attendeeTime: { fontSize: Font.sizes.caption, color: Colors.light.textSecondary } as TextStyle,

  emptyState: { alignItems: 'center', paddingVertical: 48, gap: Spacing.md } as ViewStyle,
  emptyText: {
    fontSize: Font.sizes.body,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  } as TextStyle,

  // Scanner
  scannerContainer: { flex: 1, backgroundColor: 'black' } as ViewStyle,
  overlayTop: {
    flex: 1,
    backgroundColor: OVERLAY_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  counterBadge: { alignItems: 'center' } as ViewStyle,
  counterNumber: {
    fontSize: 64,
    fontWeight: '900',
    color: Colors.white,
    lineHeight: 68,
  } as TextStyle,
  counterLabel: {
    fontSize: Font.sizes.body,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 2,
  } as TextStyle,
  overlayMiddle: { flexDirection: 'row', height: QR_FRAME_SIZE } as ViewStyle,
  overlaySide: { flex: 1, backgroundColor: OVERLAY_COLOR } as ViewStyle,
  qrFrame: {
    width: QR_FRAME_SIZE,
    height: QR_FRAME_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: Colors.white,
  } as ViewStyle,
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderTopLeftRadius: 4 } as ViewStyle,
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderTopRightRadius: 4 } as ViewStyle,
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderBottomLeftRadius: 4 } as ViewStyle,
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderBottomRightRadius: 4 } as ViewStyle,
  overlayBottom: {
    flex: 1.2,
    backgroundColor: OVERLAY_COLOR,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 48,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  } as ViewStyle,
  feedbackCard: {
    width: '100%',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.medium,
    alignItems: 'center',
  } as ViewStyle,
  feedbackPlaceholder: { width: '100%', height: 48 } as ViewStyle,
  scannedPersonBanner: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  } as ViewStyle,
  scannedPersonName: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  } as TextStyle,
  scannedPersonTeam: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: Font.sizes.body,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
  } as TextStyle,
  feedbackText: {
    color: Colors.white,
    fontSize: Font.sizes.body,
    fontWeight: '600',
    textAlign: 'center',
  } as TextStyle,
  scanHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: Font.sizes.caption,
    textAlign: 'center',
  } as TextStyle,
  doneButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: 40,
    borderRadius: BorderRadius.medium,
  } as ViewStyle,
  doneButtonText: { color: Colors.white, fontSize: Font.sizes.body, fontWeight: '700' } as TextStyle,
});
