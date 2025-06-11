import FamilyBreakdownModal from "@/components/FamilyBreakdownModal";
import { Header } from "@/components/Header";
import { ThemedText } from "@/components/ThemedText";
import { BorderRadius, Colors, Font, Spacing } from "@/constants/Theme";
import { getFamilyscoreBreakdownData } from "@/services/familyService";
import { getLeaderboardData } from "@/services/leaderboard";
import { format } from "date-fns";
import React, { useEffect, useState } from "react";
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
  const currentMarathonId = selectedMarathon?.id;
  const [leaderboardData, setLeaderboardData] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
  const insets = useSafeAreaInsets();

  const loadLeaderboardData = async () => {
    setLoading(true);
    const data = await getLeaderboardData(Number(currentMarathonId) || 0);
    setLeaderboardData(data);
    setLoading(false);
  };

  useEffect(() => {
    loadLeaderboardData();
  }, [currentMarathonId]);

  const handleFamilyPress = async (family: Family) => {
    const familyBreakdown = await getFamilyscoreBreakdownData(family.id, Number(currentMarathonId));
    setSelectedFamily({ ...family, breakdown: familyBreakdown });
    setModalVisible(true);
  };

  const renderLeaderboardItem = ({ item, index }: { item: Family; index: number }) => (
    <TouchableOpacity
      style={[
        styles.tableRow,
        index % 2 === 0 ? styles.rowEven : styles.rowOdd
      ]}
      onPress={() => handleFamilyPress(item)}
    >
      <View style={styles.rankColumn}>
        <Text style={styles.rankText}>{index + 1}</Text>
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
        <Text style={styles.familyPoints}>{item.totalpoints}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderListHeader = () => {
    if (!leaderboardData.length) return null;

    const topThree = leaderboardData.slice(0, 3);

    return (
      <>
        <View style={styles.dateContainer}>
          <ThemedText type="default" style={styles.dates}>
            {format(new Date(selectedMarathon?.start_date || ''), 'MMM d')} - {format(new Date(selectedMarathon?.end_date || ''), 'MMM d, yyyy')}
          </ThemedText>
        </View>

        {/* <View style={styles.podiumContainer}>
          <TouchableOpacity
            style={{ ...styles.podiumItem, height: 160 }}
            onPress={() => handleFamilyPress(topThree[1])}
          >
            <PodiumItem
              family={topThree[1]}
              position={t('leaderboard.second')}
              color={Colors.light.textSecondary}
              height={140}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={{ ...styles.podiumItem, height: 180 }}
            onPress={() => handleFamilyPress(topThree[0])}
          >
            <PodiumItem
              family={topThree[0]}
              position={t('leaderboard.first')}
              color={Colors.yellow[1]}
              height={160}
            />
          </TouchableOpacity >
          <TouchableOpacity
            style={{ ...styles.podiumItem, height: 140 }}
            onPress={() => handleFamilyPress(topThree[2])}
          >
            <PodiumItem
              family={topThree[2]}
              position={t('leaderboard.third')}
              color={Colors.orange[2]}
              height={120}
            />
          </TouchableOpacity>
        </View> */}

        <View style={styles.tableHeader}>
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
      </>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header
          title={selectedMarathon?.title || t('leaderboard.title')}
        // subtitle={selectedMarathon?.description}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.purple[1]} />
          <ThemedText style={styles.loadingText}>{t('leaderboard.loading')}</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title={selectedMarathon?.title || t('leaderboard.title')}
      // subtitle={selectedMarathon?.description}
      />

      <FlatList
        style={styles.leaderboardContainer}
        data={leaderboardData}
        renderItem={renderLeaderboardItem}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderListHeader}
        contentContainerStyle={{ paddingBottom: insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadLeaderboardData}
            tintColor={Colors.purple[1]}
            colors={[Colors.purple[1]]}
            progressBackgroundColor={Colors.white}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>{t('leaderboard.noData')}</ThemedText>
          </View>
        }
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
    marginHorizontal: Spacing.md,
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
});