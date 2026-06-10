import { logger } from '@/utils/logger';
import { Header } from '@/components/Header';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { BorderRadius, Colors, Font, Spacing } from '@/constants/Theme';
import { useAuth } from "@/context/AuthContext";
import { useMarathon } from '@/context/MarathonContext';
import { useMarathonTheme } from '@/hooks/useMarathonTheme';
import * as challengeService from '@/services/challenges';
import { Family, GameChallenge, GameScoreEntry, RecentGameEntry } from '@/services/challenges';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    ScrollView,
    StyleSheet,
    TextInput,
    TextStyle,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';
import { Button, Menu } from 'react-native-paper';
import Toast from 'react-native-toast-message';

export default function Games() {
    const { t } = useTranslation();
    // --- Live data from hooks ---
    const { marathonId } = useLocalSearchParams();
    const { selectedMarathon } = useMarathon();
    const { userProfile } = useAuth();
    const marathonTheme = useMarathonTheme();
    const currentMarathonId = Number(marathonId ?? selectedMarathon?.id);
    const [visible, setVisible] = useState(false);

    // --- State updated to use types from the service ---
    const [families, setFamilies] = useState<Family[]>([]);
    const [gameChallenges, setGameChallenges] = useState<GameChallenge[]>([]);
    const [selectedFamily, setSelectedFamily] = useState<number | null>(null);
    const [selectedChallengeId, setSelectedChallengeId] = useState<number | null>(null);
    const [recent, setRecent] = useState<RecentGameEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormDisabled, setIsFormDisabled] = useState(true);
    const [manualPoints, setManualPoints] = useState<string>('');
    const [existingScore, setExistingScore] = useState<GameScoreEntry | null>(null);

    // 1) Permissions + initial data fetch
    useFocusEffect(
        React.useCallback(() => {
            let isActive = true;

            const init = async () => {
                // permissions
                const userCanManage = challengeService.canManageGames(userProfile?.role);
                if (isActive) setIsFormDisabled(!userCanManage);

                // fetch initial data
                if (currentMarathonId) {
                    await fetchInitialData();
                } else if (isActive) {
                    setLoading(false);
                }
            };

            init();

            return () => {
                isActive = false;
            };
        }, [currentMarathonId, userProfile?.role])
    );

    // 2) Re-evaluate form-disabled whenever inputs or role change
    useFocusEffect(
        React.useCallback(() => {
            // no async work here, just immediate checks
            const userCanManage = challengeService.canManageGames(userProfile?.role);
            if (!userProfile?.id || !userCanManage) {
                setIsFormDisabled(true);
                return;
            }

            const hasValidFamily = selectedFamily !== null;
            const hasValidChallenge = selectedChallengeId !== null;
            const hasValidPoints = manualPoints
                ? !isNaN(+manualPoints) && +manualPoints > 0
                : true;

            setIsFormDisabled(!(hasValidFamily && hasValidChallenge && hasValidPoints));
        }, [selectedFamily, selectedChallengeId, manualPoints, userProfile?.role])
    );

    // 3) Check for existing score on focus
    useFocusEffect(
        React.useCallback(() => {
            let isActive = true;

            const check = async () => {
                if (!selectedFamily || !selectedChallengeId || !currentMarathonId) {
                    if (isActive) setExistingScore(null);
                    return;
                }

                try {
                    const score = await challengeService.getExistingScore(
                        currentMarathonId,
                        selectedFamily,
                        selectedChallengeId
                    );
                    if (isActive) {
                        setExistingScore(score);
                        if (score) setManualPoints(score.points_awarded.toString());
                    }
                } catch (err) {
                    logger.error('Error checking existing score:', err);
                    if (isActive) setExistingScore(null);
                }
            };

            check();
            return () => { isActive = false; };
        }, [selectedFamily, selectedChallengeId, currentMarathonId])
    );

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
            logger.error('Error fetching initial data:', error);
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
            logger.error('Error fetching recent entries:', error);
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
            showToast('error', 'Authentication Error', 'Could not identify user. Please try again.');
            return;
        }

        if (!selectedFamily || !selectedChallenge) {
            showToast('error', 'Missing Information', 'Please select a family and a game.');
            return;
        }

        // Parse and validate manual points
        const pointsToAward = manualPoints ? parseInt(manualPoints, 10) : selectedChallenge.points;

        if (isNaN(pointsToAward) || pointsToAward <= 0) {
            Alert.alert('Invalid Points', 'Please enter a valid number of points.');
            return;
        }

        if (pointsToAward > selectedChallenge.points) {
            Alert.alert('Invalid Points', `Points cannot exceed the maximum of ${selectedChallenge.points} for this challenge.`);
            return;
        }

        setLoading(true);
        try {
            if (existingScore) {
                // Update existing score
                await challengeService.updateGameScore(
                    existingScore.id,
                    pointsToAward,
                    userProfile.id
                );
            } else {
                // Add new score
                await challengeService.addGameScore(
                    selectedFamily,
                    selectedChallenge.id,
                    pointsToAward,
                    userProfile.id
                );
            }

            // Reset form
            setSelectedFamily(null);
            setSelectedChallengeId(null);
            setManualPoints('');
            setExistingScore(null);

            // Refresh recent entries
            await handleRefreshRecent();

            // Alert.alert(
            //     'Success',
            //     existingScore
            //         ? `Score updated to ${pointsToAward} points!`
            //         : `${pointsToAward} points added successfully!`
            // );
            showToast('success', existingScore
                ? t('games.scoreUpdated', { points: pointsToAward })
                : t('games.scoreAdded', { points: pointsToAward }), '');

        } catch (error: any) {
            if (error.code === 'P0001' && error.message?.includes('Cannot have more than 3 game scores')) {
                showToast(
                    'error',
                    'Limit Reached',
                    t('games.limitReached', { limit: 3 })
                );
            } else {
                showToast('error', 'Error', 'Failed to save score. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const selectedChallenge = gameChallenges.find(c => c.id === selectedChallengeId);
    const showToast = (type: 'success' | 'error', title: string, message: string) => {
        Toast.show({
            type,
            text1: title,
            text2: message,
            position: 'top',
            topOffset: 100,
            visibilityTime: 3000,
            autoHide: true,
        });
    };

    if (loading) {
        return (
            <ThemedView style={styles.centered}>
                <ActivityIndicator size="large" color={marathonTheme.primary} />
                <ThemedText>{t('games.loadingGames')}</ThemedText>
            </ThemedView>
        );
    }

    if (!currentMarathonId) {
        return (
            <ThemedView style={styles.centered}>
                <ThemedText style={styles.emptyText}>{t('games.noMarathon')}</ThemedText>
                <ThemedText style={styles.emptyText}>{t('games.selectMarathon')}</ThemedText>
            </ThemedView>
        )
    }

    return (
        <ThemedView style={styles.container}>
            <Header title={t('games.title')} />
            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Card */}
                <View style={styles.headerCard}>
                    <View style={styles.headerTextContainer}>
                        <ThemedText style={styles.headerTitle}>{t('games.gameManager')}</ThemedText>
                        <ThemedText style={styles.headerSubtitle}>{t('games.assignScores')}</ThemedText>
                    </View>
                </View>

                {/* Add Game Score Card */}
                <View style={styles.card}>
                    <ThemedText style={[styles.title, { color: marathonTheme.primary }]}>{t('games.addGameScore')}</ThemedText>

                    <ThemedText style={styles.label}>{t('games.selectFamily')}</ThemedText>
                    <View style={styles.pickerWrapper}>
                        <Menu
                            visible={visible}
                            onDismiss={() => setVisible(false)}
                            anchor={
                                <Button mode="outlined" onPress={() => setVisible(true)}>
                                    {families.find((f) => f.id === selectedFamily)?.name || t('games.chooseFamily')}
                                </Button>
                            }
                        >
                            {families.map((f) => (
                                <Menu.Item
                                    key={f.id}
                                    onPress={() => {
                                        setSelectedFamily(f.id);
                                        setVisible(false);
                                    }}
                                    title={f.name}
                                />
                            ))}
                        </Menu>
                    </View>

                    <ThemedText style={styles.label}>{t('games.selectGame')}</ThemedText>
                    {gameChallenges.length === 0 && !loading ? (
                        <ThemedText style={styles.emptyText}>{t('games.noActiveGames')}</ThemedText>
                    ) : (
                        gameChallenges.map((challenge) => (
                            <TouchableOpacity
                                key={challenge.id}
                                style={[
                                    styles.gameOption,
                                    selectedChallengeId === challenge.id && [styles.gameOptionSelected, { borderColor: marathonTheme.primary }],
                                ]}
                                onPress={() => setSelectedChallengeId(challenge.id)}
                                disabled={loading}
                            >
                                <View style={styles.radioButton}>
                                    {selectedChallengeId === challenge.id && <View style={[styles.radioButtonInner, { backgroundColor: marathonTheme.primary }]} />}
                                </View>
                                <ThemedText style={styles.gameLabel}>{challenge.title}</ThemedText>
                                <ThemedText style={[styles.gamePoints, { color: marathonTheme.primary }]}>+{challenge.points} pts</ThemedText>
                            </TouchableOpacity>
                        ))
                    )}

                    {selectedChallenge && (
                        <View style={styles.pointsSection}>
                            <ThemedText style={styles.pointsDisplayLabel}>
                                {existingScore ? t('games.updatePoints') : t('games.pointsToAward')}
                            </ThemedText>
                            <View style={styles.pointsInputContainer}>
                                <TextInput
                                    style={styles.pointsInput}
                                    placeholder={t('games.enterPoints', { max: selectedChallenge.points })}
                                    keyboardType="numeric"
                                    value={manualPoints}
                                    onChangeText={(text) => {
                                        const numericValue = text.replace(/[^0-9]/g, '');
                                        setManualPoints(numericValue);
                                    }}
                                    maxLength={3}
                                    editable={!loading}
                                />
                                <ThemedText style={styles.pointsMaxLabel}>
                                    {t('games.max')}: {selectedChallenge.points}
                                </ThemedText>
                            </View>
                            {existingScore && (
                                <ThemedText style={styles.existingScoreNote}>
                                    {t('games.previousScore', { points: existingScore.points_awarded })}
                                </ThemedText>
                            )}
                        </View>
                    )}

                    <TouchableOpacity
                        style={[
                            styles.button,
                            (loading || isFormDisabled) && styles.buttonDisabled,
                            existingScore && styles.buttonUpdate
                        ]}
                        onPress={onSubmit}
                        disabled={loading || isFormDisabled || !selectedFamily || !selectedChallengeId}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color={Colors.white} />
                        ) : (
                            <Ionicons
                                name={existingScore ? "refresh" : "add"}
                                size={20}
                                color={Colors.white}
                            />
                        )}
                        <ThemedText style={styles.buttonText}>
                            {loading
                                ? (existingScore ? t('games.updating') : t('games.addingScore'))
                                : (existingScore ? t('games.updateScore') : t('games.addScore'))
                            }
                        </ThemedText>
                    </TouchableOpacity>
                </View>

                {/* Recent Entries Card */}
                <View style={styles.recentCard}>
                    <View style={[styles.recentHeader, { backgroundColor: marathonTheme.primary }]}>
                        <ThemedText style={styles.recentTitle}>{t('games.recentEntries')}</ThemedText>
                    </View>
                    <View style={styles.recentContent}>
                        {recent.length === 0 ? (
                            <ThemedText style={styles.emptyText}>{t('games.noRecentEntries')}</ThemedText>
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
        fontSize: Font.sizes.h2,
        color: Colors.white,
        marginBottom: 2,
    } as TextStyle,
    headerSubtitle: {
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
        fontSize: Font.sizes.h2,
        marginBottom: Spacing.md,
        color: Colors.purple[2],
    } as TextStyle,
    label: {
        fontSize: Font.sizes.body,
        marginTop: Spacing.sm,
        marginBottom: Spacing.xs,
        color: Colors.light.textSecondary,
        fontWeight: '600',
    } as TextStyle,
    pickerWrapper: {
        // borderWidth: 1,
        // borderColor: Colors.light.cardBorder,
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
        fontSize: Font.sizes.body,
        flex: 1,
    } as TextStyle,
    gamePoints: {
        fontSize: Font.sizes.caption,
        fontWeight: 'bold',
        color: Colors.purple[2],
    } as TextStyle,
    pointsSection: {
        backgroundColor: Colors.light.background,
        padding: Spacing.md,
        borderRadius: BorderRadius.small,
        marginVertical: Spacing.md,
    } as ViewStyle,
    pointsDisplayLabel: {
        fontSize: Font.sizes.body,
        color: Colors.light.textSecondary,
        marginBottom: Spacing.xs,
    } as TextStyle,
    pointsInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: Spacing.xs,
    } as ViewStyle,
    pointsInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: Colors.light.cardBorder,
        borderRadius: BorderRadius.small,
        padding: Spacing.sm,
        marginRight: Spacing.sm,
        ...Font.body,
        fontSize: Font.sizes.body,
    } as TextStyle,
    pointsMaxLabel: {
        fontSize: Font.sizes.caption,
        color: Colors.light.textSecondary,
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
    buttonDisabled: {
        backgroundColor: Colors.light.textSecondary,
        opacity: 0.5,
        transform: [{ scale: 0.98 }],
    } as ViewStyle,
    buttonUpdate: {
        backgroundColor: Colors.blue[2],
    } as ViewStyle,
    buttonText: {
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
        fontSize: Font.sizes.body,
        fontWeight: '600',
        color: Colors.light.textPrimary,
    } as TextStyle,
    entryGame: {
        fontSize: Font.sizes.caption,
        color: Colors.light.textSecondary,
        marginTop: 2,
    } as TextStyle,
    entryRight: { alignItems: 'flex-end' } as ViewStyle,
    entryPoints: {
        fontSize: Font.sizes.body,
        fontWeight: 'bold',
        color: Colors.green[2],
    } as TextStyle,
    entryAgo: {
        fontSize: Font.sizes.caption,
        color: Colors.light.textSecondary,
        marginTop: 2,
    } as TextStyle,
    emptyText: {
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
    existingScoreNote: {
        fontSize: Font.sizes.caption,
        color: Colors.blue[2],
        marginTop: Spacing.xs,
        fontStyle: 'italic',
    } as TextStyle,
});
