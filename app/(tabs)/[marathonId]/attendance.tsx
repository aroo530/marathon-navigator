import { Header } from '@/components/Header';
import { logger } from '@/utils/logger';
import { BorderRadius, Colors, Font, Spacing } from '@/constants/Theme';
import { useAuth } from '@/context/AuthContext';
import { useMarathon } from '@/context/MarathonContext';
import { useMarathonTheme } from '@/hooks/useMarathonTheme';
import {
  AttendanceChallenge,
  AttendanceRecord,
  FamilyAttendanceStat,
  RosterParticipant,
  fetchAttendanceChallengeForWeek,
  fetchFamilyAttendanceStats,
  fetchMarathonRoster,
  fetchWeekAttendance,
  recordAttendance,
  refreshFamilyScore,
  removeAttendance,
  resolveParticipantFromQR,
} from '@/services/attendanceService';
import { fetchWeeksByMarathonId } from '@/services/marathonService';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCameraPermissions } from 'expo-camera';
import QRCameraView from '@/components/QRCameraView';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  SectionList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  const [pendingRemoveId, setPendingRemoveId] = useState<number | null>(null);

  // Manual attendance mode
  const [manualVisible, setManualVisible] = useState(false);
  const [roster, setRoster] = useState<RosterParticipant[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [familyFilter, setFamilyFilter] = useState<number | null>(null);

  // Debug counters — visible overlay so we know if onBarcodeScanned fires at all
  const [rawScanFires, setRawScanFires] = useState(0);
  const [lastRawData, setLastRawData] = useState('');

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
      const [records, ac] = await Promise.all([
        fetchWeekAttendance(selectedWeekId, currentMarathonId),
        fetchAttendanceChallengeForWeek(currentMarathonId, selectedWeekId),
      ]);
      const stats = await fetchFamilyAttendanceStats(currentMarathonId, records);
      setAttendees(records);
      setFamilyStats(stats);
      setAttendanceChallenge(ac);
    } catch (e) {
      logger.error('loadAttendanceData failed', e);
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
    // Track every raw fire — shown on-screen so we know if camera detection works at all
    setRawScanFires(n => n + 1);
    setLastRawData(data.slice(0, 60));
    logger.log('[QR] onBarcodeScanned fired', { dataLen: data.length, preview: data.slice(0, 80) });

    const now = Date.now();
    // Debounce same QR (camera fires many times per second on the same code)
    if (data === lastScanRef.current.data && now - lastScanRef.current.time < SAME_QR_DEBOUNCE_MS) {
      logger.log('[QR] debounced — same QR within window');
      return;
    }
    lastScanRef.current = { data, time: now };

    // Client-side duplicate check (instant, no network)
    if (scannedQRSet.current.has(data)) {
      logger.log('[QR] client-side duplicate, already in scannedQRSet');
      showFeedback(t('attendance.scanFeedback.alreadyScanned'), 'duplicate');
      return;
    }

    // Validate minimal QR shape before queuing
    try {
      const parsed = JSON.parse(data);
      if (!parsed.pid || typeof parsed.pid !== 'string') throw new Error();
      logger.log('[QR] parsed OK', { pid: parsed.pid, name: parsed.name });
    } catch {
      logger.warn('[QR] JSON parse failed or missing pid field', { raw: data.slice(0, 120) });
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

  function handleScannerError(e: unknown) {
    logger.warn('[QR] scanner error', e);
    showFeedback(t('attendance.cameraError', 'Unable to access camera'), 'error');
  }

  async function openScanner() {
    // Native uses expo-camera permissions. On web, qr-scanner's start() triggers
    // the browser prompt and surfaces denial via onError (handleScannerError).
    if (Platform.OS !== 'web' && !permission?.granted) {
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

  async function confirmRemoveAttendee(record: AttendanceRecord) {
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
    } finally {
      setPendingRemoveId(null);
    }
  }

  async function openManual() {
    setSearch('');
    setFamilyFilter(null);
    setRosterLoading(true);
    setManualVisible(true);
    try {
      const data = await fetchMarathonRoster(currentMarathonId);
      setRoster(data);
    } catch (e) {
      logger.error('fetchMarathonRoster failed', e);
    } finally {
      setRosterLoading(false);
    }
  }

  async function toggleManual(p: RosterParticipant) {
    if (!selectedWeekId || togglingId) return;
    const isPresent = attendees.some(a => a.participant_id === p.id);
    setTogglingId(p.id);
    try {
      if (isPresent) {
        await removeAttendance(p.id, selectedWeekId, p.family_id, attendanceChallenge);
        setAttendees(prev => prev.filter(a => a.participant_id !== p.id));
        setFamilyStats(prev =>
          prev.map(s =>
            s.familyId === p.family_id ? { ...s, present: Math.max(0, s.present - 1) } : s
          )
        );
      } else {
        const res = await recordAttendance(
          p.id,
          selectedWeekId,
          currentMarathonId,
          p.family_id,
          session?.user?.id ?? '',
          attendanceChallenge,
        );
        if (!res.alreadyRecorded) {
          setAttendees(prev => [
            ...prev,
            {
              id: Date.now() + Math.random(),
              participant_id: p.id,
              participant_name: p.full_name,
              family_id: p.family_id,
              family_name: p.family_name,
              scanned_at: new Date().toISOString(),
            },
          ]);
          setFamilyStats(prev =>
            prev.map(s =>
              s.familyId === p.family_id ? { ...s, present: s.present + 1 } : s
            )
          );
        }
      }
    } catch (e) {
      logger.error('toggleManual failed', e);
      Alert.alert(t('common.error'), t('attendance.manualToggleFailed'));
    } finally {
      setTogglingId(null);
    }
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

      {isAdminOrLeader && (
        <TouchableOpacity
          style={[styles.manualButton, { borderColor: marathonTheme.primary }]}
          onPress={openManual}
          activeOpacity={0.85}
        >
          <Ionicons name="list-outline" size={20} color={marathonTheme.primary} />
          <Text style={[styles.manualButtonText, { color: marathonTheme.primary }]}>
            {t('attendance.markManually')}
          </Text>
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
        <SectionList
          sections={Object.entries(
            attendees.reduce<Record<string, AttendanceRecord[]>>((acc, r) => {
              const key = r.family_name || 'Unknown';
              (acc[key] = acc[key] ?? []).push(r);
              return acc;
            }, {})
          ).map(([family, data]) => ({ family, data }))}
          keyExtractor={item => String(item.id)}
          ListHeaderComponent={renderHeader}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section }) => {
            const stat = familyStats.find(s => s.familyName === section.family);
            return (
              <View style={[styles.familySectionHeader, { backgroundColor: marathonTheme.tint }]}>
                <Text style={[styles.familySectionTitle, { color: marathonTheme.shade }]}>
                  {section.family}
                </Text>
                {stat && (
                  <Text style={[styles.familySectionCount, { color: marathonTheme.shade }]}>
                    {stat.present} / {stat.total}
                  </Text>
                )}
              </View>
            );
          }}
          renderItem={({ item }) => (
            <View style={styles.attendeeRow}>
              <View style={[styles.attendeeAvatar, { backgroundColor: marathonTheme.primary }]}>
                <Text style={styles.attendeeInitial}>
                  {item.participant_name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.attendeeInfo}>
                <Text style={styles.attendeeName}>{item.participant_name}</Text>
                <Text style={styles.attendeeTime}>
                  {new Date(item.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              {isAdminOrLeader && (
                pendingRemoveId === item.id ? (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity onPress={() => confirmRemoveAttendee(item)}
                      style={{ backgroundColor: Colors.red[1], borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{t('attendance.remove', 'Remove')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setPendingRemoveId(null)}
                      style={{ borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 12, color: Colors.light.textSecondary }}>{t('common.cancel', 'Cancel')}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => setPendingRemoveId(item.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={18} color={Colors.red[1]} />
                  </TouchableOpacity>
                )
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
          <QRCameraView
            active={scanning}
            onScan={(data) => handleBarcodeScanned({ data })}
            onError={handleScannerError}
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

            {__DEV__ && (
              <View style={styles.debugPanel}>
                <Text style={styles.debugText}>
                  cam fires: {rawScanFires}  |  {permission?.granted ? 'perm ✓' : 'no perm ✗'}
                </Text>
                {lastRawData ? (
                  <Text style={styles.debugText} numberOfLines={2}>last: {lastRawData}</Text>
                ) : null}
              </View>
            )}

            <TouchableOpacity
              style={[styles.doneButton, { backgroundColor: marathonTheme.primary }]}
              onPress={handleDone}
            >
              <Text style={styles.doneButtonText}>{t('attendance.done')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={manualVisible}
        animationType="slide"
        onRequestClose={() => setManualVisible(false)}
      >
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.manualHeader}>
            <Text style={[styles.manualTitle, { color: marathonTheme.shade }]}>
              {t('attendance.manualTitle')}
            </Text>
            <TouchableOpacity
              style={[styles.manualDoneButton, { backgroundColor: marathonTheme.primary }]}
              onPress={() => setManualVisible(false)}
            >
              <Text style={styles.doneButtonText}>{t('attendance.done')}</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder={t('attendance.searchPlaceholder')}
            placeholderTextColor={Colors.light.textSecondary}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {roster.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.familyFilterStrip}
              style={styles.familyFilterContainer}
            >
              <TouchableOpacity
                style={[
                  styles.weekButton,
                  familyFilter === null && { backgroundColor: marathonTheme.primary, borderColor: marathonTheme.primary },
                ]}
                onPress={() => setFamilyFilter(null)}
              >
                <Text style={[styles.weekButtonText, familyFilter === null && styles.selectedWeekText]}>
                  {t('attendance.total')}
                </Text>
              </TouchableOpacity>
              {familyStats.map(f => (
                <TouchableOpacity
                  key={f.familyId}
                  style={[
                    styles.weekButton,
                    familyFilter === f.familyId && { backgroundColor: marathonTheme.primary, borderColor: marathonTheme.primary },
                  ]}
                  onPress={() => setFamilyFilter(f.familyId)}
                >
                  <Text style={[styles.weekButtonText, familyFilter === f.familyId && styles.selectedWeekText]}>
                    {f.familyName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {rosterLoading ? (
            <ActivityIndicator size="large" color={marathonTheme.primary} style={styles.loader} />
          ) : (
            <SectionList
              sections={Object.entries(
                roster
                  .filter(p =>
                    (familyFilter === null || p.family_id === familyFilter) &&
                    p.full_name.toLowerCase().includes(search.trim().toLowerCase())
                  )
                  .reduce<Record<string, RosterParticipant[]>>((acc, p) => {
                    const key = p.family_name || 'Unknown';
                    (acc[key] = acc[key] ?? []).push(p);
                    return acc;
                  }, {})
              ).map(([family, data]) => ({ family, data }))}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              renderSectionHeader={({ section }) => (
                <View style={[styles.familySectionHeader, { backgroundColor: marathonTheme.tint }]}>
                  <Text style={[styles.familySectionTitle, { color: marathonTheme.shade }]}>
                    {section.family}
                  </Text>
                </View>
              )}
              renderItem={({ item }) => {
                const isPresent = attendees.some(a => a.participant_id === item.id);
                return (
                  <TouchableOpacity
                    style={styles.rosterRow}
                    onPress={() => toggleManual(item)}
                    disabled={!!togglingId}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.attendeeName}>{item.full_name}</Text>
                    {togglingId === item.id ? (
                      <ActivityIndicator size="small" color={marathonTheme.primary} />
                    ) : (
                      <View
                        style={[
                          styles.rosterCheck,
                          isPresent && { backgroundColor: marathonTheme.primary, borderColor: marathonTheme.primary },
                        ]}
                      >
                        {isPresent && <Ionicons name="checkmark" size={16} color={Colors.white} />}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={48} color={Colors.light.textSecondary} />
                  <Text style={styles.emptyText}>{t('attendance.noParticipants')}</Text>
                </View>
              }
            />
          )}
        </SafeAreaView>
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

  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.md,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.medium,
    borderWidth: 1.5,
    backgroundColor: Colors.light.cardBackground,
    gap: Spacing.sm,
  } as ViewStyle,
  manualButtonText: { fontSize: Font.sizes.body, fontWeight: '700' } as TextStyle,

  manualHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  } as ViewStyle,
  manualTitle: { fontSize: Font.sizes.h2, fontWeight: '800' } as TextStyle,
  manualDoneButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.medium,
  } as ViewStyle,
  familyFilterContainer: { flexGrow: 0, flexShrink: 0, marginBottom: Spacing.sm } as ViewStyle,
  familyFilterStrip: { paddingHorizontal: Spacing.md, gap: Spacing.sm, alignItems: 'center' } as ViewStyle,
  searchInput: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
    fontSize: Font.sizes.body,
    color: Colors.light.textPrimary,
  } as TextStyle,
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
    gap: Spacing.sm,
  } as ViewStyle,
  rosterCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: Colors.light.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,

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
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
    gap: Spacing.sm,
    ...Platform.select({
      ios: { shadowColor: Colors.light.cardShadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
      android: { elevation: 1 },
    }),
  } as ViewStyle,
  attendeeAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  attendeeInitial: { fontSize: Font.sizes.body, fontWeight: '800', color: Colors.white } as TextStyle,
  attendeeInfo: { flex: 1 } as ViewStyle,
  attendeeName: { fontSize: Font.sizes.body, fontWeight: '600', color: Colors.light.textPrimary } as TextStyle,
  attendeeMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: 2 } as ViewStyle,
  familyBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 } as ViewStyle,
  familyBadgeText: { fontSize: 10, fontWeight: '600' } as TextStyle,
  familySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    borderRadius: BorderRadius.medium,
  } as ViewStyle,
  familySectionTitle: {
    fontSize: Font.sizes.body,
    fontWeight: '700',
  } as TextStyle,
  familySectionCount: {
    fontSize: Font.sizes.caption,
    fontWeight: '700',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.12)',
  } as TextStyle,
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
  debugPanel: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,0,0.4)',
  } as ViewStyle,
  debugText: {
    color: '#FFE66D',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  } as TextStyle,
});
