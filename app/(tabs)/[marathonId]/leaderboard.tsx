import Header from "@/components/Header";
import { BorderRadius, Colors, Font, Spacing } from "@/constants/Theme";
import { getLeaderboardData } from "@/services/leaderboard";
import { useLocalSearchParams } from "expo-router/build/hooks";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  ImageStyle,
  Modal,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
  const { marathonId } = useLocalSearchParams();
  const { selectedMarathon } = useMarathon();
  const [leaderboardData, setLeaderboardData] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);

  const handleFamilyPress = (family: Family) => {
    setSelectedFamily(family);
    setModalVisible(true);
  };

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      setLoading(true);
      const data = await getLeaderboardData(Number(marathonId) || 0);
      setLeaderboardData(data);
      setLoading(false);
    };
    fetchLeaderboardData();
  }, [marathonId]);

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Leaderboard" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{selectedMarathon?.title || 'Leaderboard'}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Time Remaining</Text>
              <Text style={styles.statValue}>
                {Math.ceil((new Date(selectedMarathon?.end_date || '').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} Days
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Families</Text>
              <Text style={styles.statValue}>{selectedMarathon?.family_count || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Your Rank</Text>
              <Text style={styles.statValue}>#4</Text>
            </View>
          </View>
        </View>

        {!loading && leaderboardData.length >= 3 && (
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
        )}

        <View style={styles.leaderboardContainer}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderText}>Rank</Text>
            <Text style={styles.tableHeaderText}>Family</Text>
            <Text style={styles.tableHeaderText}>Points</Text>
          </View>

          <FlatList
            data={remaining}
            renderItem={renderLeaderboardItem}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
          />
        </View>

        <FamilyBreakdownModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          family={selectedFamily}
        />
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  } as ViewStyle,
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    padding: Spacing.md,
  } as ViewStyle,
  header: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.large,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  } as ViewStyle,
  title: {
    fontSize: Font.sizes.h1,
    fontWeight: "700",
    color: Colors.teal[2],
    textAlign: "center",
    marginBottom: Spacing.lg,
  } as TextStyle,
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  } as ViewStyle,
  statItem: {
    alignItems: "center",
  } as ViewStyle,
  statLabel: {
    fontSize: Font.sizes.caption,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xs,
  } as TextStyle,
  statValue: {
    fontSize: Font.sizes.h2,
    fontWeight: "700",
    color: Colors.orange[1],
  } as TextStyle,
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
    backgroundColor: Colors.teal[2],
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
    color: Colors.light.textPrimary,
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
    color: Colors.light.textPrimary,
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
    backgroundColor: Colors.blue[0],
    borderRadius: BorderRadius.medium,
    padding: Spacing.lg,
    alignItems: "center",
    marginBottom: Spacing.lg,
  } as ViewStyle,
  totalPointsLabel: {
    fontSize: Font.sizes.caption,
    color: Colors.blue[3],
    marginBottom: Spacing.xs,
  } as TextStyle,
  totalPointsValue: {
    fontSize: 32,
    fontWeight: "700",
    color: Colors.blue[3],
  } as TextStyle,
  podiumAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  } as ImageStyle,
});

