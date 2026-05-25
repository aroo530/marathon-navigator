import FamilyBreakdownModal from "@/components/FamilyBreakdownModal";
import { Header } from "@/components/Header";
import { ThemedText } from "@/components/ThemedText";
import { BorderRadius, Colors, Font, Spacing } from "@/constants/Theme";
import { getFamilyscoreBreakdownData } from "@/services/familyService";
import { format, parseISO } from 'date-fns';

import { ActivityLog, getLeaderboardData, getLeaderboardLogs } from "@/services/leaderboard";
import { useFocusEffect } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageStyle,
  RefreshControl,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMarathon } from "../../../context/MarathonContext";
import { useMarathonTheme } from "@/hooks/useMarathonTheme";

type Family = {
  id: number;
  name: string;
  avatarurl: string | null;
  rank: number;
  totalpoints: number;
  breakdown: BreakdownItem[];
};
type BreakdownItem = {
  source: string;
  challenge_title: string;
  points_awarded: number;
  submitted_at: string;
};

type FamilyBreakdownModalProps = {
  visible: boolean;
  onClose: () => void;
  family: Family | null;
};

// type PodiumItemProps = {
//   family: Family;
//   position: string;
//   color: string;
//   height: number;
// };

// const PodiumItem: React.FC<PodiumItemProps> = ({ family, position, color, height }) => {
//   const { t } = useTranslation();
//   return (
//     <View style={[styles.podiumItem, { height }]}>
//       <View style={[styles.podiumCircle, { backgroundColor: color }]}>
//         {family?.avatarurl ? (
//           <Image source={{ uri: family.avatarurl }} style={styles.podiumAvatar} />
//         ) : (
//           <Text style={styles.podiumEmoji}>👨‍👩‍👧‍👦</Text>
//         )}
//       </View>
//       <View
//         style={[
//           styles.podiumBase,
//           { backgroundColor: color, height: height - 60 },
//         ]}
//       >
//         <Text style={styles.podiumPosition}>{position}</Text>
//         <Text style={styles.podiumFamily}>{family?.name}</Text>
//         <Text style={styles.podiumPoints}>{family?.totalpoints}</Text>
//       </View>
//     </View>
//   );
// };

export default function LeaderboardScreen() {
  const { t } = useTranslation();
  const { selectedMarathon } = useMarathon();
  const marathonTheme = useMarathonTheme();
  const currentMarathonId = selectedMarathon?.id;
  const [leaderboardData, setLeaderboardData] = useState<Family[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
  const insets = useSafeAreaInsets();

  const loadData = async () => {
    setLoading(true);
    try {
      const [data, logs] = await Promise.all([
        getLeaderboardData(Number(currentMarathonId) || 0),
        getLeaderboardLogs(Number(currentMarathonId) || 0),
      ]);
      setLeaderboardData(data);
      setActivityLogs(logs);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [currentMarathonId])
  );
  const handleFamilyPress = async (family: Family) => {
    const familyBreakdown = await getFamilyscoreBreakdownData(family.id, Number(currentMarathonId));
    setSelectedFamily({ ...family, breakdown: familyBreakdown });
    setModalVisible(true);
  };

  // const formatTimeAgo = (dateString: string) => {
  //   const now = new Date();
  //   const submittedDate = new Date(dateString);
  //   const diffInHours = Math.floor((now.getTime() - submittedDate.getTime()) / (1000 * 60 * 60));

  //   if (diffInHours < 1) {
  //     return t('activity.justNow');
  //   } else if (diffInHours < 24) {
  //     return t('activity.hoursAgo', { hours: diffInHours });
  //   } else {
  //     const diffInDays = Math.floor(diffInHours / 24);
  //     return t('activity.daysAgo', { days: diffInDays });
  //   }
  // };

  const renderLeaderboardItem = ({ item, index }: { item: Family; index: number }) => (
    <TouchableOpacity
      style={[
        styles.tableRow,
        index % 2 === 0 ? styles.rowEven : [styles.rowOdd, { backgroundColor: marathonTheme.tint }],
      ]}
      onPress={() => handleFamilyPress(item)}
    >
      <View style={styles.rankColumn}>
        <Text style={[styles.rankText, { color: marathonTheme.primary }]}>{index + 1}</Text>
      </View>

      <View style={styles.familyColumn}>
        <View style={styles.familyInfo}>
          {item.avatarurl ? (
            <Image source={{ uri: item.avatarurl }} style={styles.familyAvatar} />
          ) : (
            <Text style={styles.familyAvatar}>👨‍👩‍👧‍👦</Text>
          )}
          <View style={styles.familyDetails}>
            <Text style={styles.familyName}>{item.name}</Text>
          </View>
        </View>
      </View>

      <View style={styles.pointsColumn}>
        <Text style={[styles.familyPoints, { color: marathonTheme.primary, backgroundColor: marathonTheme.tint }]}>{item.totalpoints}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderLeaderboardSection = () => (
    <>
      <View style={styles.leaderboardContainer}>
        {leaderboardData.length > 0 ? (
          <>
            <View style={[styles.tableHeader, { backgroundColor: marathonTheme.primary, borderBottomColor: marathonTheme.shade }]}>
              <View style={styles.rankColumn}>
                <Text style={styles.tableHeaderText}>{t('leaderboard.rank')}</Text>
              </View>
              <View style={styles.familyColumn}>
                <Text style={styles.tableHeaderText}>{t('leaderboard.family')}</Text>
              </View>
              <View style={styles.pointsColumn}>
                <Text style={styles.tableHeaderText}>{t('leaderboard.points')}</Text>
              </View>
            </View>
            {leaderboardData.map((item, index) => (
              <React.Fragment key={item.id}>
                {renderLeaderboardItem({ item, index })}
              </React.Fragment>
            ))}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>{t('leaderboard.noData')}</ThemedText>
          </View>
        )}
      </View>
      <View style={[styles.headerContainer, { backgroundColor: marathonTheme.primary }]}>
        <ThemedText type="title" style={styles.headerTitle}>
          {t('activity.recentActivity')}
        </ThemedText>
        <ThemedText type="default" style={styles.headerSubtitle}>
          {t('activity.latestSubmissions')}
        </ThemedText>
      </View>
    </>
  );

  const renderActivityItem = ({ item }: { item: ActivityLog }) => (
    <View style={styles.activityItem}>
      <View style={styles.activityContent}>
        <View style={styles.activityHeader}>
          <Text style={styles.familyName}>{item.family_name}</Text>
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsText}>+{item.points_awarded}</Text>
          </View>
        </View>

        <Text style={styles.challengeTitle} numberOfLines={2}>
          {item.challenge_title}
        </Text>

        <View style={styles.activityFooter}>
          <Text style={styles.submittedBy}>
            {t('activity.submittedBy', { name: item.submitted_by_name })}
          </Text>
        </View>

        <View style={styles.weekBadge}>
          <Text style={[styles.weekText, { color: marathonTheme.primary, backgroundColor: marathonTheme.tint }]}>
            {t('activity.week', { number: item.week_number })}
          </Text>
          <Text style={styles.timeAgo}>
            {format(parseISO(item.submitted_at), 'PPP p')}
          </Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Header
          title={selectedMarathon?.title || t('leaderboard.title')}
        // subtitle={selectedMarathon?.description}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={marathonTheme.primary} />
          <ThemedText style={styles.loadingText}>{t('leaderboard.loading')}</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title={selectedMarathon?.title || t('leaderboard.title')}
      />
      <FlatList
        data={activityLogs}
        renderItem={renderActivityItem}
        keyExtractor={(item, index) => `${item.family_id}-${item.challenge_id}-${index}`}
        ListHeaderComponent={renderLeaderboardSection}
        contentContainerStyle={{ paddingBottom: insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadData}
            tintColor={marathonTheme.primary}
            colors={[marathonTheme.primary]}
            progressBackgroundColor={Colors.white}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <ThemedText style={styles.emptyText}>
              {t('activity.noActivity')}
            </ThemedText>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
      <FamilyBreakdownModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        family={selectedFamily}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  } as ViewStyle,
  dateContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.large,
    padding: Spacing.lg,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: 'center',
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  } as ViewStyle,
  podiumContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "flex-end",
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
  } as ViewStyle,
  podiumItem: {
    alignItems: "center",
    paddingHorizontal: 0,
    margin: 0,
    flex: 1,
  } as ViewStyle,
  podiumCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: -25,
    zIndex: 1,
    borderWidth: 3,
    borderColor: Colors.white,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  } as ViewStyle,
  podiumEmoji: {
    fontSize: 28,
    textAlign: 'center',
  } as TextStyle,
  podiumBase: {
    flex: 1,
    borderRadius: BorderRadius.large,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    paddingTop: 40,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  } as ViewStyle,
  podiumPosition: {
    fontSize: Font.sizes.body,
    fontWeight: "800",
    color: Colors.white,
    marginBottom: Spacing.xs,
  } as TextStyle,
  podiumFamily: {
    fontSize: Font.sizes.body,
    color: Colors.white,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  } as TextStyle,
  podiumPoints: {
    fontSize: Font.sizes.body,
    color: Colors.white,
    fontWeight: "700",
  } as TextStyle,
  leaderboardContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.large,
    // overflow: "hidden",
    margin: Spacing.sm,
    // shadowColor: Colors.light.cardShadow,
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.1,
    // shadowRadius: 4,
    // elevation: 3,
  } as ViewStyle,
  tableHeader: {
    flexDirection: "row",
    backgroundColor: Colors.purple[2],
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: Colors.purple[3],
  } as ViewStyle,
  tableHeaderText: {
    fontSize: Font.sizes.body,
    fontWeight: "700",
    color: Colors.white,
    textAlign: "center",
  } as TextStyle,
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.cardBorder,
  } as ViewStyle,
  rowEven: {
    backgroundColor: Colors.white,
  } as ViewStyle,
  rowOdd: {
    backgroundColor: Colors.purple[0],
  } as ViewStyle,
  rankColumn: {
    width: 50,
    alignItems: 'center',
    alignContent: 'center',
    borderRightWidth: 1,
    borderRightColor: Colors.light.cardBorder,
    paddingRight: Spacing.sm,
  } as ViewStyle,
  familyColumn: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    borderRightWidth: 1,
    borderRightColor: Colors.light.cardBorder,
  } as ViewStyle,
  pointsColumn: {
    width: 80,
    alignItems: 'center',
    paddingLeft: Spacing.sm,
  } as ViewStyle,
  rankText: {
    fontSize: Font.sizes.body,
    fontWeight: "700",
    color: Colors.purple[2],
  } as TextStyle,
  familyInfo: {
    flexDirection: "row",
    alignItems: "center",
    alignContent: "center"
  } as ViewStyle,
  familyAvatar: {
    width: 50,
    height: 50,
    borderRadius: 400,
    marginRight: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.white,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  } as ImageStyle,
  familyDetails: {
    flex: 1,
  } as ViewStyle,
  familyName: {
    fontSize: Font.sizes.body,
    fontWeight: "600",
    color: Colors.light.textPrimary,
  } as TextStyle,
  familyPoints: {
    fontSize: Font.sizes.body,
    fontWeight: "700",
    color: Colors.purple[2],
    backgroundColor: Colors.purple[0],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.medium,
    overflow: 'hidden',
    minWidth: 60,
    textAlign: 'center',
  } as TextStyle,
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  } as ViewStyle,
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  dates: {
    fontSize: Font.sizes.body,
    color: Colors.light.textSecondary,
    textAlign: "center",
    fontWeight: "500",
  } as TextStyle,
  podiumAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  } as ImageStyle,
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Font.sizes.body,
    color: Colors.light.textSecondary,
  } as TextStyle,
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  } as ViewStyle,
  emptyText: {
    fontSize: Font.sizes.body,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  } as TextStyle,

  headerContainer: {
    padding: Spacing.md,
    marginTop: Spacing.lg,
    backgroundColor: Colors.purple[2],
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.cardBorder,
  } as ViewStyle,
  headerTitle: {
    fontSize: Font.sizes.h1,
    fontWeight: "700",
    color: Colors.white,
    marginBottom: Spacing.xs,
  } as TextStyle,
  headerSubtitle: {
    fontSize: Font.sizes.body,
    color: Colors.orange[0],
  } as TextStyle,

  activityItem: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.sm,
    marginVertical: Spacing.xs,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  } as ViewStyle,

  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.purple[0],
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  } as ViewStyle,

  sourceIcon: {
    fontSize: 20,
  } as TextStyle,
  activityContent: {
    flex: 1,
  } as ViewStyle,

  activityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  } as ViewStyle,
  pointsBadge: {
    backgroundColor: Colors.green[0],
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.small,
  } as ViewStyle,
  pointsText: {
    fontSize: Font.sizes.caption,
    fontWeight: "700",
    color: Colors.green[2],
  } as TextStyle,
  challengeTitle: {
    fontSize: Font.sizes.body,
    color: Colors.light.textPrimary,
    marginBottom: Spacing.sm,
    lineHeight: 20,
  } as TextStyle,

  activityFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  } as ViewStyle,

  submittedBy: {
    fontSize: Font.sizes.caption,
    color: Colors.light.textSecondary,
    flex: 1,
  } as TextStyle,

  timeAgo: {
    fontSize: Font.sizes.caption,
    color: Colors.light.textSecondary,
    fontWeight: "500",
  } as TextStyle,
  weekBadge: {
    // alignSelf: "flex-start",
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: "space-between",
    // width: '100%'
  } as ViewStyle,
  weekText: {
    fontSize: Font.sizes.caption,
    color: Colors.purple[2],
    backgroundColor: Colors.purple[0],
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.small,
    fontWeight: "600",
  } as TextStyle,
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  } as TextStyle,
});