import { BorderRadius, Colors, Font, Spacing } from '@/constants/Theme';
import { getLeaderboardData, getLeaderboardLogs, ActivityLog } from '@/services/leaderboard';
import { fetchAvailableMarathons } from '@/services/marathonService';
import { format, parseISO } from 'date-fns';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Family = {
  id: number;
  name: string;
  avatarurl: string | null;
  rank: number;
  totalpoints: number;
};

type Marathon = { id: number; title: string };

const PRIMARY = Colors.purple[2];
const TINT = Colors.purple[0];

export default function PublicLeaderboardScreen() {
  const [marathon, setMarathon] = useState<Marathon | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const marathons = await fetchAvailableMarathons();
      const active: Marathon = marathons?.[0];
      if (!active) return;
      setMarathon(active);
      const [lb, activity] = await Promise.all([
        getLeaderboardData(active.id),
        getLeaderboardLogs(active.id),
      ]);
      setFamilies(lb ?? []);
      setLogs(activity ?? []);
    } catch {
      // silent — show whatever was loaded
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load(true)}
          tintColor={PRIMARY}
          colors={[PRIMARY]}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{marathon?.title ?? 'Leaderboard'}</Text>
        <Text style={styles.headerSub}>Family Rankings</Text>
      </View>

      {/* Rankings table */}
      <View style={styles.card}>
        <View style={styles.tableHead}>
          <Text style={[styles.colRank, styles.headText]}>#</Text>
          <Text style={[styles.colFamily, styles.headText]}>Family</Text>
          <Text style={[styles.colPoints, styles.headText]}>Points</Text>
        </View>
        {families.length === 0 ? (
          <Text style={styles.empty}>No scores yet</Text>
        ) : (
          families.map((f, i) => (
            <View
              key={f.id}
              style={[styles.tableRow, i % 2 === 1 && { backgroundColor: TINT }]}
            >
              <Text style={[styles.colRank, styles.rankText]}>{i + 1}</Text>
              <View style={styles.colFamily}>
                {f.avatarurl ? (
                <Image source={{ uri: f.avatarurl }} style={styles.avatar} />
              ) : (
                <Text style={styles.familyEmoji}>👨‍👩‍👧‍👦</Text>
              )}
                <Text style={styles.familyName}>{f.name}</Text>
              </View>
              <View style={styles.colPoints}>
                <Text style={styles.pointsBadge}>{f.totalpoints}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Recent activity */}
      <View style={[styles.sectionHead, { backgroundColor: PRIMARY }]}>
        <Text style={styles.sectionHeadTitle}>Recent Activity</Text>
        <Text style={styles.sectionHeadSub}>Latest submissions</Text>
      </View>

      {logs.length === 0 ? (
        <Text style={styles.empty}>No activity yet</Text>
      ) : (
        logs.map((log, i) => (
          <View key={`${log.family_id}-${log.challenge_id}-${i}`} style={styles.logCard}>
            <View style={styles.logTop}>
              <Text style={styles.logFamily}>{log.family_name}</Text>
              <Text style={styles.logPoints}>+{log.points_awarded}</Text>
            </View>
            <Text style={styles.logChallenge} numberOfLines={2}>{log.challenge_title}</Text>
            <View style={styles.logBottom}>
              <Text style={[styles.weekChip, { color: PRIMARY, backgroundColor: TINT }]}>
                Week {log.week_number}
              </Text>
              <Text style={styles.logDate}>
                {format(parseISO(log.submitted_at), 'MMM d, h:mm a')}
              </Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const MAX_WIDTH = 640;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: Platform.OS === 'web' ? MAX_WIDTH : undefined,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: PRIMARY,
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  headerTitle: {
    fontSize: Font.sizes.h1,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 4,
  },
  headerSub: {
    fontSize: Font.sizes.body,
    color: Colors.purple[0],
  },
  card: {
    backgroundColor: Colors.white,
    margin: Spacing.sm,
    borderRadius: BorderRadius.large,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
  },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  headText: {
    fontSize: Font.sizes.body,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.cardBorder,
  },
  colRank: {
    width: 40,
    textAlign: 'center',
  },
  colFamily: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  colPoints: {
    width: 72,
    alignItems: 'center',
  },
  rankText: {
    fontSize: Font.sizes.body,
    fontWeight: '700',
    color: PRIMARY,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: Spacing.sm,
  },
  familyEmoji: {
    fontSize: 28,
    marginRight: Spacing.sm,
  },
  familyName: {
    fontSize: Font.sizes.body,
    fontWeight: '600',
    color: Colors.light.textPrimary,
    flex: 1,
  },
  pointsBadge: {
    fontSize: Font.sizes.body,
    fontWeight: '700',
    color: PRIMARY,
    backgroundColor: TINT,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.medium,
    overflow: 'hidden',
    textAlign: 'center',
    minWidth: 52,
  },
  sectionHead: {
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  sectionHeadTitle: {
    fontSize: Font.sizes.h2,
    fontWeight: '700',
    color: Colors.white,
  },
  sectionHeadSub: {
    fontSize: Font.sizes.caption,
    color: Colors.orange[0],
    marginTop: 2,
  },
  logCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.sm,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
  },
  logTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  logFamily: {
    fontSize: Font.sizes.body,
    fontWeight: '600',
    color: Colors.light.textPrimary,
  },
  logPoints: {
    fontSize: Font.sizes.caption,
    fontWeight: '700',
    color: Colors.green[2],
    backgroundColor: Colors.green[0],
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.small,
    overflow: 'hidden',
  },
  logChallenge: {
    fontSize: Font.sizes.caption,
    color: Colors.light.textPrimary,
    marginBottom: Spacing.sm,
    lineHeight: 20,
  },
  logBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weekChip: {
    fontSize: Font.sizes.caption,
    fontWeight: '600',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.small,
    overflow: 'hidden',
  },
  logDate: {
    fontSize: Font.sizes.caption,
    color: Colors.light.textSecondary,
  },
  empty: {
    textAlign: 'center',
    padding: Spacing.xl,
    color: Colors.light.textSecondary,
    fontSize: Font.sizes.body,
  },
});
