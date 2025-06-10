import { Header } from '@/components/Header';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { BorderRadius, Colors, Font, Spacing } from '@/constants/Theme';
import { useAuth } from "@/context/AuthContext";
import { useMarathon } from '@/context/MarathonContext'; // Assuming path to your marathon hook
import * as challengeService from '@/services/challenges';
import { Family, GameChallenge, GameScoreEntry, RecentGameEntry } from '@/services/challenges';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    ScrollView,
    StyleSheet,
    TextStyle,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';


export default function Games() {
    // --- Live data from hooks ---
    const { marathonId } = useLocalSearchParams();
    const { selectedMarathon } = useMarathon();
    const { userProfile } = useAuth();
    const currentMarathonId = Number(marathonId ?? selectedMarathon?.id);

    // --- State updated to use types from the service ---
    const [families, setFamilies] = useState<Family[]>([]);
    const [gameChallenges, setGameChallenges] = useState<GameChallenge[]>([]);
    const [selectedFamily, setSelectedFamily] = useState<number | null>(null);
    const [selectedChallengeId, setSelectedChallengeId] = useState<number | null>(null);
    const [recent, setRecent] = useState<RecentGameEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormDisabled, setIsFormDisabled] = useState(true);

    useEffect(() => {
        // --- Check user permissions from live user data ---
        const userCanManage = challengeService.canManageGames(userProfile?.role);
        setIsFormDisabled(!userCanManage);

        // --- Initial data fetching if we have a valid marathon ID ---
        if (currentMarathonId) {
            fetchInitialData();
        } else {
            setLoading(false); // No marathon ID, so stop loading
        }
    }, [currentMarathonId, userProfile?.role]); // Refetch if marathon or user role changes

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // --- Fetch families and game challenges concurrently ---
            const [familiesData, challengesData, recentEntriesData] = await Promise.all([
                challengeService.fetchMarathonFamilies(currentMarathonId),
                challengeService.fetchGameChallenges(currentMarathonId),
                fetchRecentEntries(), // This function is defined below
            ]);
            setFamilies(familiesData);
            setGameChallenges(challengesData);
            setRecent(recentEntriesData);

        } catch (error) {
            console.error('Error fetching initial data:', error);
            Alert.alert('Error', 'Failed to load game data.');
        } finally {
            setLoading(false);
        }
    };

    const fetchRecentEntries = async (): Promise<RecentGameEntry[]> => {
        if (!currentMarathonId) return [];
        try {
            const entries: GameScoreEntry[] = await challengeService.fetchRecentGameEntries(currentMarathonId, 10);
            // --- Transform data for the UI using the service helper ---
            return challengeService.transformToRecentEntries(entries);
        } catch (error) {
            console.error('Error fetching recent entries:', error);
            return []; // Return empty on error
        }
    };

    const handleRefreshRecent = async () => {
        const updatedRecent = await fetchRecentEntries();
        setRecent(updatedRecent);
    };

    const onSubmit = async () => {
        const selectedChallenge = gameChallenges.find(c => c.id === selectedChallengeId);

        if (!userProfile?.id) {
            Alert.alert('Authentication Error', 'Could not identify user. Please try again.');
            return;
        }

        if (!selectedFamily || !selectedChallenge) {
            Alert.alert('Missing Information', 'Please select a family and a game.');
            return;
        }

        setLoading(true);
        try {
            // --- Use the new service function to add the score ---
            await challengeService.addGameScore(
                selectedFamily,
                selectedChallenge.id,
                selectedChallenge.points, // Points are now from the challenge object
                userProfile.id
            );

            // --- Reset form ---
            setSelectedFamily(null);
            setSelectedChallengeId(null);

            // --- Refresh recent entries ---
            await handleRefreshRecent();

            Alert.alert('Success', `${selectedChallenge.points} points added successfully!`);
        } catch (error: any) {

            if (error.code === 'P0001' && error.message?.includes('Cannot have more than 3 game scores')) {
                Alert.alert(
                    'Limit Reached',
                    'You cannot add more than 3 game scores for this family in the current marathon.'
                );
            } else {
                console.error('Error adding score:', error);

                Alert.alert('Error', 'Failed to add score. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const selectedChallenge = gameChallenges.find(c => c.id === selectedChallengeId);

    if (loading) {
        return (
            <ThemedView style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.purple[2]} />
                <ThemedText>Loading Game Data...</ThemedText>
            </ThemedView>
        );
    }

    if (!currentMarathonId) {
        return (
            <ThemedView style={styles.centered}>
                <ThemedText style={styles.emptyText}>No marathon selected.</ThemedText>
                <ThemedText style={styles.emptyText}>Please select a marathon to manage games.</ThemedText>
            </ThemedView>
        )
    }

    return (
        <ThemedView style={styles.container}>
            <Header title="Manage Games" />
            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Card */}
                <View style={styles.headerCard}>

                    <View style={styles.headerTextContainer}>
                        <ThemedText style={styles.headerTitle}>Game Manager</ThemedText>
                        <ThemedText style={styles.headerSubtitle}>Assign scores to families for game challenges</ThemedText>
                    </View>
                </View>

                {/* Add Game Score Card */}
                <View style={styles.card}>
                    <ThemedText style={styles.title}>Add Game Score</ThemedText>

                    {isFormDisabled && (
                        <View style={styles.disabledOverlay}>
                            <Ionicons name="lock-closed" size={24} color={Colors.light.textSecondary} />
                            <ThemedText style={styles.disabledText}>You do not have permission to add scores.</ThemedText>
                        </View>
                    )}

                    <ThemedText style={styles.label}>Select Family</ThemedText>
                    <View style={styles.pickerWrapper}>
                        <Picker
                            selectedValue={selectedFamily}
                            onValueChange={(val) => setSelectedFamily(val)}
                            enabled={!loading && !isFormDisabled}
                        >
                            <Picker.Item label="Choose a family..." value={null} />
                            {families.map((f) => (
                                <Picker.Item key={f.id} label={f.name} value={f.id} />
                            ))}
                        </Picker>
                    </View>

                    <ThemedText style={styles.label}>Select Game Challenge</ThemedText>
                    {gameChallenges.length === 0 && !loading ? (
                        <ThemedText style={styles.emptyText}>No active games found for this marathon.</ThemedText>
                    ) : (
                        gameChallenges.map((challenge) => (
                            <TouchableOpacity
                                key={challenge.id}
                                style={[
                                    styles.gameOption,
                                    selectedChallengeId === challenge.id && styles.gameOptionSelected,
                                ]}
                                onPress={() => setSelectedChallengeId(challenge.id)}
                                disabled={loading || isFormDisabled}
                            >
                                <View style={styles.radioButton}>
                                    {selectedChallengeId === challenge.id && <View style={styles.radioButtonInner} />}
                                </View>
                                <ThemedText style={styles.gameLabel}>{challenge.title}</ThemedText>
                                <ThemedText style={styles.gamePoints}>+{challenge.points} pts</ThemedText>
                            </TouchableOpacity>
                        ))
                    )}

                    {selectedChallenge && (
                        <View style={styles.pointsDisplay}>
                            <ThemedText style={styles.pointsDisplayLabel}>Points to Award:</ThemedText>
                            <ThemedText style={styles.pointsDisplayValue}>{selectedChallenge.points}</ThemedText>
                        </View>
                    )}

                    <TouchableOpacity
                        style={[styles.button, (loading || isFormDisabled) && styles.buttonDisabled]}
                        onPress={onSubmit}
                        disabled={loading || isFormDisabled || !selectedFamily || !selectedChallengeId}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color={Colors.white} />
                        ) : (
                            <Ionicons name="add" size={20} color={Colors.white} />
                        )}
                        <ThemedText style={styles.buttonText}>
                            {loading ? 'Adding Score...' : 'Add Score to Family'}
                        </ThemedText>
                    </TouchableOpacity>
                </View>

                {/* Recent Entries Card */}
                <View style={styles.recentCard}>
                    <View style={styles.recentHeader}>
                        <ThemedText style={styles.recentTitle}>Recent Entries</ThemedText>
                    </View>
                    <View style={styles.recentContent}>
                        {recent.length === 0 ? (
                            <ThemedText style={styles.emptyText}>No recent entries</ThemedText>
                        ) : (
                            <FlatList
                                data={recent}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <View style={styles.entry}>
                                        <View style={styles.entryLeft}>

                                            <View>
                                                <ThemedText style={styles.entryFamily}>{item.family}</ThemedText>
                                                <ThemedText style={styles.entryGame}>{item.game}</ThemedText>
                                            </View>
                                        </View>
                                        <View style={styles.entryRight}>
                                            <ThemedText style={styles.entryPoints}>+{item.pts}</ThemedText>
                                            <ThemedText style={styles.entryAgo}>{item.ago}</ThemedText>
                                        </View>
                                    </View>
                                )}
                                scrollEnabled={false}
                            />
                        )}
                    </View>
                </View>
            </ScrollView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.light.background } as ViewStyle,
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    } as ViewStyle,
    content: { padding: Spacing.md, paddingBottom: Spacing.xl } as ViewStyle,
    headerCard: {
        backgroundColor: Colors.orange[2],
        borderRadius: BorderRadius.medium,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
    } as ViewStyle,
    headerIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    } as ViewStyle,
    headerTextContainer: { flex: 1 } as ViewStyle,
    headerTitle: {
        ...Font.heading,
        fontSize: Font.sizes.h2,
        color: Colors.white,
        marginBottom: 2,
    } as TextStyle,
    headerSubtitle: {
        ...Font.body,
        fontSize: Font.sizes.caption,
        color: Colors.white,
        opacity: 0.9,
    } as TextStyle,
    card: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.medium,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
        shadowColor: Colors.purple[3],
        shadowOpacity: 0.1,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        position: 'relative',
    } as ViewStyle,
    title: {
        ...Font.heading,
        fontSize: Font.sizes.h2,
        marginBottom: Spacing.md,
        color: Colors.purple[2],
    } as TextStyle,
    label: {
        ...Font.body,
        fontSize: Font.sizes.body,
        marginTop: Spacing.sm,
        marginBottom: Spacing.xs,
        color: Colors.light.textSecondary,
        fontWeight: '600',
    } as TextStyle,
    pickerWrapper: {
        borderWidth: 1,
        borderColor: Colors.light.cardBorder,
        borderRadius: BorderRadius.small,
        overflow: 'hidden',
        marginBottom: Spacing.md,
    } as ViewStyle,
    gameOption: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.light.cardBorder,
        borderRadius: BorderRadius.small,
        padding: Spacing.sm,
        marginBottom: Spacing.sm,
    } as ViewStyle,
    gameOptionSelected: {
        borderColor: Colors.purple[2],
        backgroundColor: 'rgba(128, 90, 213, 0.05)',
    } as ViewStyle,
    radioButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: Colors.light.cardBorder,
        marginRight: Spacing.sm,
        justifyContent: 'center',
        alignItems: 'center',
    } as ViewStyle,
    radioButtonInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.purple[2],
    } as ViewStyle,
    gameIcon: { marginRight: Spacing.sm },
    gameLabel: {
        ...Font.body,
        fontSize: Font.sizes.body,
        flex: 1,
    } as TextStyle,
    gamePoints: {
        ...Font.body,
        fontSize: Font.sizes.caption,
        fontWeight: 'bold',
        color: Colors.purple[2],
    } as TextStyle,
    pointsDisplay: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.light.background,
        padding: Spacing.sm,
        borderRadius: BorderRadius.small,
        marginVertical: Spacing.md,
    } as ViewStyle,
    pointsDisplayLabel: {
        ...Font.body,
        color: Colors.light.textSecondary,
    } as TextStyle,
    pointsDisplayValue: {
        ...Font.heading,
        fontSize: Font.sizes.body,
        color: Colors.green[2],
    } as TextStyle,
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.green[2],
        borderRadius: BorderRadius.large,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        marginTop: Spacing.sm,
    } as ViewStyle,
    buttonDisabled: { opacity: 0.6, backgroundColor: Colors.light.textSecondary },
    buttonText: {
        ...Font.body,
        fontSize: Font.sizes.body,
        color: Colors.white,
        marginLeft: Spacing.sm,
        fontWeight: '600',
    } as TextStyle,
    recentCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.medium,
        overflow: 'hidden',
        shadowColor: Colors.purple[3],
        shadowOpacity: 0.1,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    } as ViewStyle,
    recentHeader: {
        backgroundColor: Colors.purple[2],
        padding: Spacing.md,
    } as ViewStyle,
    recentTitle: {
        ...Font.heading,
        fontSize: Font.sizes.h2,
        color: Colors.white,
    } as TextStyle,
    recentContent: { padding: Spacing.md },
    entry: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.cardBorder,
    } as ViewStyle,
    entryLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    } as ViewStyle,
    entryIcon: { marginRight: Spacing.sm },
    entryFamily: {
        ...Font.body,
        fontSize: Font.sizes.body,
        fontWeight: '600',
        color: Colors.light.textPrimary,
    } as TextStyle,
    entryGame: {
        ...Font.body,
        fontSize: Font.sizes.caption,
        color: Colors.light.textSecondary,
        marginTop: 2,
    } as TextStyle,
    entryRight: { alignItems: 'flex-end' } as ViewStyle,
    entryPoints: {
        ...Font.body,
        fontSize: Font.sizes.body,
        fontWeight: 'bold',
        color: Colors.green[2],
    } as TextStyle,
    entryAgo: {
        ...Font.body,
        fontSize: Font.sizes.caption,
        color: Colors.light.textSecondary,
        marginTop: 2,
    } as TextStyle,
    emptyText: {
        ...Font.body,
        fontSize: Font.sizes.body,
        color: Colors.light.textSecondary,
        textAlign: 'center',
        paddingVertical: Spacing.sm,
    } as TextStyle,
    disabledOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: BorderRadius.medium,
        zIndex: 10,
    } as ViewStyle,
    disabledText: {
        marginTop: Spacing.xs,
        color: Colors.light.textSecondary,
        fontWeight: '600'
    } as TextStyle,
});
