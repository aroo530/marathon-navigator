import { Header } from "@/components/Header";
import { ThemedText } from "@/components/ThemedText";
import { BorderRadius, Colors, Font, Spacing } from "@/constants/Theme";
import { getLeaderboardData } from "@/services/leaderboard";
import { format } from "date-fns";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageStyle,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMarathon } from "../../context/MarathonContext";

type Family = {
  id: number;
  name: string;
  avatarUrl: string | null;
  rank: number;
  totalPoints: number;
};

type FamilyMember = {
  id: string;
  name: string;
  points: number;
  avatar: string;
};

type FamilyBreakdownModalProps = {
  visible: boolean;
  onClose: () => void;
  family: Family | null;
};

type PodiumItemProps = {
  family: Family;
  position: string;
  color: string;
  height: number;
};

const FamilyBreakdownModal: React.FC<FamilyBreakdownModalProps> = ({
  visible,
  onClose,
  family,
}) => {
  if (!family) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{family.name}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.totalPointsCard}>
            <Text style={styles.totalPointsLabel}>Total Points</Text>
            <Text style={styles.totalPointsValue}>
              {family.totalPoints.toLocaleString()}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const PodiumItem: React.FC<PodiumItemProps> = ({ family, position, color, height }) => (
  <View style={[styles.podiumItem, { height }]}>
    <View style={[styles.podiumCircle, { backgroundColor: color }]}>
      {family?.avatarUrl ? (
        <Image source={{ uri: family.avatarUrl }} style={styles.podiumAvatar} />
      ) : (
        <Text style={styles.podiumEmoji}>👨‍👩‍👧‍👦</Text>
      )}
    </View>
    <View
      style={[
        styles.podiumBase,
        { backgroundColor: color, height: height - 60 },
      ]}
    >
      <Text style={styles.podiumPosition}>{position}</Text>
      <Text style={styles.podiumFamily}>{family?.name}</Text>
      <Text style={styles.podiumPoints}>{family?.totalPoints?.toLocaleString()}</Text>
    </View>
  </View>
);

export default function LeaderboardScreen() {
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
    console.log('data', data);
    setLeaderboardData(data);
    setLoading(false);
  };

  useEffect(() => {
    loadLeaderboardData();
  }, [currentMarathonId]);

  const handleFamilyPress = (family: Family) => {
    setSelectedFamily(family);
    setModalVisible(true);
  };

  const topThree = leaderboardData.slice(0, 3);
  const remaining = leaderboardData.slice(3);

  const renderLeaderboardItem = ({ item, index }: { item: Family; index: number }) => (
    <TouchableOpacity
      style={[styles.leaderboardItem]}
      onPress={() => handleFamilyPress(item)}
    >
      <View style={styles.rankCircle}>
        <Text style={styles.rankText}>{index + 4}</Text>
      </View>

      <View style={styles.familyInfo}>
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.familyAvatar} />
        ) : (
          <Text style={styles.familyAvatar}>👨‍👩‍👧‍👦</Text>
        )}
        <View style={styles.familyDetails}>
          <Text style={styles.familyName}>{item.name}</Text>
        </View>
      </View>

      <Text style={styles.familyPoints}>{item.totalPoints}</Text>
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

        <View style={styles.podiumContainer}>
          <PodiumItem
            family={topThree[1]}
            position="2nd"
            color={Colors.light.textSecondary}
            height={120}
          />
          <PodiumItem
            family={topThree[0]}
            position="1st"
            color={Colors.yellow[1]}
            height={140}
          />
          <PodiumItem
            family={topThree[2]}
            position="3rd"
            color={Colors.orange[2]}
            height={100}
          />
        </View>

        <View style={styles.leaderboardContainer}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderText}>Rank</Text>
            <Text style={styles.tableHeaderText}>Family</Text>
            <Text style={styles.tableHeaderText}>Points</Text>
          </View>
        </View>
      </>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header
          title={selectedMarathon?.title || 'Leaderboard'}
          subtitle={selectedMarathon?.description}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.purple[1]} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title={selectedMarathon?.title || 'Leaderboard'}
        subtitle={selectedMarathon?.description}
      />

      <FlatList
        data={leaderboardData.slice(3)}
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
  scrollView: {
    flex: 1,
    padding: Spacing.md,
  } as ViewStyle,
  dateContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.large,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: 'center',
  } as ViewStyle,
  podiumContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  } as ViewStyle,
  podiumItem: {
    alignItems: "center",
  } as ViewStyle,
  podiumCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: -30,
    zIndex: 1,
    borderWidth: 3,
    borderColor: Colors.white,
  } as ViewStyle,
  podiumEmoji: {
    fontSize: 24,
    textAlign: 'center',
  } as TextStyle,
  podiumBase: {
    width: 80,
    borderRadius: BorderRadius.medium,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 35,
  } as ViewStyle,
  podiumPosition: {
    fontSize: Font.sizes.h2,
    fontWeight: "700",
    color: Colors.white,
    marginBottom: Spacing.xs,
  } as TextStyle,
  podiumFamily: {
    fontSize: Font.sizes.caption,
    color: Colors.white,
    fontWeight: "500",
  } as TextStyle,
  podiumPoints: {
    fontSize: Font.sizes.caption,
    color: Colors.white,
  } as TextStyle,
  leaderboardContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.large,
    overflow: "hidden",
    flex: 1,
  } as ViewStyle,
  tableHeader: {
    flexDirection: "row",
    backgroundColor: Colors.purple[2],
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  } as ViewStyle,
  tableHeaderText: {
    flex: 1,
    fontSize: Font.sizes.body,
    fontWeight: "700",
    color: Colors.white,
    textAlign: "center",
  } as TextStyle,
  leaderboardItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.cardBorder,
  } as ViewStyle,
  rankCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
    backgroundColor: Colors.purple[1],
  } as ViewStyle,
  rankText: {
    fontSize: Font.sizes.body,
    fontWeight: "700",
    color: Colors.white,
  } as TextStyle,
  familyInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  } as ViewStyle,
  familyAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: Spacing.md,
  } as ImageStyle,
  familyDetails: {
    flex: 1,
  } as ViewStyle,
  familyName: {
    fontSize: Font.sizes.body,
    fontWeight: "700",
    color: Colors.light.textPrimary,
  } as TextStyle,
  familyPoints: {
    fontSize: Font.sizes.body,
    fontWeight: "700",
    color: Colors.purple[2],
  } as TextStyle,
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  } as ViewStyle,
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.large,
    padding: Spacing.lg,
    width: "100%",
    maxHeight: "80%",
  } as ViewStyle,
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  } as ViewStyle,
  modalTitle: {
    fontSize: Font.sizes.h2,
    fontWeight: "700",
    color: Colors.purple[2],
  } as TextStyle,
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.cardBorder,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  closeButtonText: {
    fontSize: 18,
    color: Colors.light.textSecondary,
  } as TextStyle,
  totalPointsCard: {
    backgroundColor: Colors.purple[0],
    borderRadius: BorderRadius.medium,
    padding: Spacing.lg,
    alignItems: "center",
    marginBottom: Spacing.lg,
  } as ViewStyle,
  totalPointsLabel: {
    fontSize: Font.sizes.caption,
    color: Colors.purple[3],
    marginBottom: Spacing.xs,
  } as TextStyle,
  totalPointsValue: {
    fontSize: 32,
    fontWeight: "700",
    color: Colors.purple[3],
  } as TextStyle,
  podiumAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  } as ImageStyle,
  matchCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.large,
    paddingTop: Spacing.lg,
    padding: Spacing.md,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: Colors.purple[1],
    borderRightWidth: 4,
    borderRightColor: Colors.purple[1],
  } as ViewStyle,
  versus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  } as ViewStyle,
  vsContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: Spacing.xs,
  } as ViewStyle,
  teamButton: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: BorderRadius.medium,
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
  } as ViewStyle,
  teamName: {
    fontSize: Font.sizes.body,
    fontWeight: "600",
    textAlign: "center",
    color: Colors.light.textPrimary,
  } as TextStyle,
  winnerTeam: {
    backgroundColor: Colors.purple[0],
    borderColor: Colors.purple[1],
  } as ViewStyle,
  winnerText: {
    color: Colors.purple[3],
  } as TextStyle,
  vsText: {
    fontSize: Font.sizes.caption,
    color: Colors.purple[3],
    fontWeight: "700",
  } as TextStyle,
  resultBadge: {
    backgroundColor: Colors.purple[0],
    borderRadius: BorderRadius.small,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    alignSelf: 'center',
    marginTop: Spacing.xs,
  } as ViewStyle,
  resultText: {
    fontSize: Font.sizes.caption,
    color: Colors.purple[3],
    fontWeight: "700",
    textAlign: "center",
  } as TextStyle,
  adminHint: {
    fontSize: Font.sizes.caption,
    color: Colors.light.textSecondary,
    textAlign: "center",
    marginTop: Spacing.xs,
    fontStyle: "italic",
  } as TextStyle,
  weekSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.cardBorder,
  } as ViewStyle,
  weekButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.medium,
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
  } as ViewStyle,
  selectedWeekButton: {
    backgroundColor: Colors.purple[2],
    borderColor: Colors.purple[2],
  } as ViewStyle,
  weekButtonText: {
    fontSize: Font.sizes.caption,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  } as TextStyle,
  selectedWeekText: {
    color: Colors.white,
  } as TextStyle,
  matchesContainer: {
    padding: Spacing.lg,
  } as ViewStyle,
  sectionTitle: {
    marginBottom: Spacing.md,
    color: Colors.purple[2],
  } as TextStyle,
  noMatchesContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.large,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.purple[0],
    borderStyle: 'dashed',
  } as ViewStyle,
  noMatchesText: {
    color: Colors.light.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  } as TextStyle,
  statsCard: {
    backgroundColor: Colors.white,
    margin: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.large,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderTopWidth: 4,
    borderTopColor: Colors.purple[1],
  } as ViewStyle,
  statsTitle: {
    marginBottom: Spacing.md,
    textAlign: "center",
    color: Colors.purple[2],
  } as TextStyle,
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.cardBorder,
  } as ViewStyle,
  statLabel: {
    color: Colors.light.textSecondary,
  } as TextStyle,
  statValue: {
    color: Colors.purple[2],
  } as TextStyle,
  statusBadge: {
    backgroundColor: Colors.purple[0],
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.medium,
  } as ViewStyle,
  statusText: {
    color: Colors.purple[3],
    textTransform: 'capitalize',
  } as TextStyle,
  noTournamentText: {
    fontSize: Font.sizes.body,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xl,
  } as TextStyle,
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%',
  } as ViewStyle,
  dates: {
    fontSize: Font.sizes.caption,
    color: Colors.light.textSecondary,
    textAlign: "center",
  } as TextStyle,
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
});

