import { logger } from '@/utils/logger';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TextStyle,
    TouchableOpacity,
    View,
    ViewStyle
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { Header } from '@/components/Header';
import { BorderRadius, Colors, Font, Spacing } from '@/constants/Theme';
import { useAuth } from '@/context/AuthContext';
import { useFamily } from '@/context/FamilyContext';
import { useMarathon } from '@/context/MarathonContext';
import { useMarathonTheme } from '@/hooks/useMarathonTheme';
import { getCurrentFamily } from '@/services/familyService';
import { fetchMarathonFamilies, type Family } from '@/services/challenges';
import {
    Participant,
    createParticipant,
    deleteParticipant,
    fetchParticipantsByFamilyId,
    updateParticipant,
} from '@/services/userService';

type ModalMode = 'create' | 'edit' | 'delete' | null;

export default function ParticipantsScreen() {
    const { t } = useTranslation();
    const { marathonId } = useLocalSearchParams();
    const { selectedMarathon } = useMarathon();
    const currentMarathonId = Number(marathonId ?? selectedMarathon?.id);

    const marathonTheme = useMarathonTheme();
    const { userProfile } = useAuth();
    const { currentFamily, setCurrentFamily } = useFamily();

    const canPickFamily =
        selectedMarathon?.show_family_picker === true &&
        (userProfile?.role === 'admin' || userProfile?.role === 'leader');

    const [allFamilies, setAllFamilies] = useState<Family[]>([]);
    const [activeFamilyId, setActiveFamilyId] = useState<number | null>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const [participants, setParticipants] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
    const [formData, setFormData] = useState({ name: '' });
    const [submitting, setSubmitting] = useState(false);

    const [confirmationModal, setConfirmationModal] = useState<{
        visible: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        visible: false,
        title: '',
        message: '',
        onConfirm: () => {},
    });

    const fetchParticipants = useCallback(async (familyId: number) => {
        try {
            setLoading(true);
            const list = await fetchParticipantsByFamilyId(familyId);
            setParticipants(list);
        } catch (error) {
            logger.error('Error fetching participants:', error);
            showToast('error', t('users.errorLoadingParticipants'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useFocusEffect(
        useCallback(() => {
            let active = true;

            async function init() {
                if (!userProfile?.id) return;

                let fam = currentFamily;
                if (!fam) {
                    try {
                        fam = await getCurrentFamily(currentMarathonId, userProfile.id);
                        if (active && fam) setCurrentFamily(fam);
                    } catch (e) {
                        logger.error('Failed to load family', e);
                    }
                }

                if (canPickFamily && currentMarathonId) {
                    try {
                        const families = await fetchMarathonFamilies(currentMarathonId);
                        if (active) {
                            setAllFamilies(families);
                            setActiveFamilyId(prev => prev ?? fam?.id ?? families[0]?.id ?? null);
                        }
                    } catch (e) {
                        logger.error('Failed to load families', e);
                    }
                } else if (fam && active) {
                    setActiveFamilyId(fam.id);
                }
            }

            init();
            return () => { active = false; };
        }, [userProfile?.id, currentFamily, canPickFamily, currentMarathonId, setCurrentFamily])
    );

    useFocusEffect(
        useCallback(() => {
            if (activeFamilyId != null) fetchParticipants(activeFamilyId);
        }, [activeFamilyId, fetchParticipants])
    );

    const onRefresh = useCallback(async () => {
        if (activeFamilyId == null) return;
        setRefreshing(true);
        try {
            await fetchParticipants(activeFamilyId);
        } finally {
            setRefreshing(false);
        }
    }, [activeFamilyId, fetchParticipants]);

    const openModal = (mode: ModalMode, participant?: Participant) => {
        setModalMode(mode);
        setSelectedParticipant(participant ?? null);
        setFormData({
            name: participant?.full_name ?? '',
        });
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
        setModalMode(null);
        setSelectedParticipant(null);
        setFormData({ name: '' });
    };

    const showToast = (type: 'success' | 'error', message: string) => {
        Toast.show({
            type,
            text1: message,
            position: 'bottom',
            visibilityTime: 3000,
        });
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            showToast('error', t('users.nameRequired'));
            return;
        }

        setSubmitting(true);
        try {
            if (modalMode === 'create') {
                if (!currentFamily?.id) {
                    throw new Error('No family ID available');
                }
                await createParticipant('', formData.name, currentFamily.id);
                showToast('success', t('users.participantCreated'));
            } else if (modalMode === 'edit') {
                if (!selectedParticipant?.id) {
                    throw new Error('No participant selected for editing');
                }
                await updateParticipant(selectedParticipant.id, { full_name: formData.name });
                showToast('success', t('users.participantUpdated'));
            }
            closeModal();
            if (activeFamilyId != null) await fetchParticipants(activeFamilyId);
        } catch (error) {
            logger.error('Error saving participant:', error);
            showToast('error', error instanceof Error ? error.message : t('users.errorSavingParticipant'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = (p: Participant) => {
        if (!p?.id) {
            showToast('error', t('users.invalidParticipant'));
            return;
        }

        setConfirmationModal({
            visible: true,
            title: t('users.deleteParticipant'),
            message: t('users.deleteConfirmation', { name: p.full_name }),
            onConfirm: async () => {
                try {
                    await deleteParticipant(p.id);
                    showToast('success', t('users.participantDeleted'));
                    if (activeFamilyId != null) await fetchParticipants(activeFamilyId);
                } catch (error) {
                    logger.error('Error deleting participant:', error);
                    showToast('error', t('users.errorDeletingParticipant'));
                } finally {
                    setConfirmationModal(prev => ({ ...prev, visible: false }));
                }
            },
        });
    };

    const renderParticipant = ({ item }: { item: Participant }) => {
        if (!item?.id) return null;

        return (
            <View style={styles.card}>
                <View style={styles.actions}>
                    <TouchableOpacity onPress={() => openModal('edit', item)} style={[styles.btn, styles.edit]}>
                        <Ionicons name="pencil" size={16} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item)} style={[styles.btn, styles.delete]}>
                        <Ionicons name="trash" size={16} color="#fff" />
                    </TouchableOpacity>
                </View>
                <View style={styles.info}>
                    <Text style={styles.name}>{item.full_name}</Text>
                    <Text style={[styles.role, { color: marathonTheme.primary }]}>{item.role}</Text>
                    <Text style={styles.date}>
                        {t('users.created')}: {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <Header title={t('users.participants')} />
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={marathonTheme.primary} />
                    <Text style={styles.loadingText}>{t('users.loadingParticipants')}</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Header title={t('users.participants')} />

            {/* Family context bar */}
            {canPickFamily && allFamilies.length > 0 && (
                <View style={styles.contextBar}>
                    <TouchableOpacity
                        style={styles.familyDropdownTrigger}
                        onPress={() => setDropdownOpen(o => !o)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.contextLabel}>CURRENTLY MANAGING</Text>
                        <View style={styles.familyNameRow}>
                            <View style={styles.activeDot} />
                            <Text style={styles.familyNameText}>
                                {allFamilies.find(f => f.id === activeFamilyId)?.name ?? '—'}
                            </Text>
                            <Ionicons name="chevron-down-outline" size={16} color={Colors.light.textPrimary} />
                        </View>
                    </TouchableOpacity>
                </View>
            )}

            {/* Family dropdown */}
            {canPickFamily && dropdownOpen && (
                <View style={styles.dropdown}>
                    {allFamilies.map(family => (
                        <TouchableOpacity
                            key={family.id}
                            style={[
                                styles.dropdownItem,
                                activeFamilyId === family.id && styles.dropdownItemActive,
                            ]}
                            onPress={() => {
                                setActiveFamilyId(family.id);
                                setDropdownOpen(false);
                            }}
                        >
                            <Text style={[
                                styles.dropdownItemText,
                                activeFamilyId === family.id && styles.dropdownItemTextActive,
                            ]}>
                                {family.name}
                            </Text>
                            {activeFamilyId === family.id && (
                                <Ionicons name="checkmark" size={16} color={Colors.teal[2]} />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* List */}
            <FlatList
                data={participants}
                keyExtractor={(i) => i.id.toString()}
                renderItem={renderParticipant}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[marathonTheme.primary]} />
                }
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="people-outline" size={64} color={Colors.light.textSecondary} />
                        <Text style={styles.emptyTitle}>{t('users.noParticipants')}</Text>
                        <Text style={styles.emptyText}>{t('users.getStartedMessage')}</Text>
                        <TouchableOpacity onPress={() => openModal('create')} style={[styles.emptyBtn, { backgroundColor: marathonTheme.primary }]}>
                            <Text style={styles.emptyBtnText}>{t('users.addParticipant')}</Text>
                        </TouchableOpacity>
                    </View>
                }
                contentContainerStyle={styles.listContent}
            />

            {/* Add Button */}
            <TouchableOpacity onPress={() => openModal('create')} style={[styles.addBtn, { backgroundColor: marathonTheme.primary }]}>
                <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>

            {/* Edit/Create Modal */}
            <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeModal}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
                    <SafeAreaView style={styles.modal}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={closeModal} style={styles.modalButton}>
                                <Text style={[styles.modalCancel, { color: marathonTheme.primary }]}>{t('users.cancel')}</Text>
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>
                                {modalMode === 'create' ? t('users.addParticipant') : t('users.editParticipant')}
                            </Text>
                            <TouchableOpacity
                                onPress={handleSubmit}
                                disabled={submitting}
                                style={[styles.modalButton, styles.modalSaveButton, { backgroundColor: marathonTheme.primary }]}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.modalSave}>
                                        {modalMode === 'create' ? t('users.create') : t('users.save')}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                        <View style={styles.modalContent}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('users.name')} *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder={t('users.enterName')}
                                    value={formData.name}
                                    onChangeText={(name) => setFormData((f) => ({ ...f, name }))}
                                />
                            </View>
                        </View>
                    </SafeAreaView>
                </KeyboardAvoidingView>
            </Modal>

            {/* Confirmation Modal */}
            <Modal
                visible={confirmationModal.visible}
                transparent
                animationType="fade"
                onRequestClose={() => setConfirmationModal(prev => ({ ...prev, visible: false }))}
            >
                <View style={styles.confirmationOverlay}>
                    <View style={styles.confirmationModal}>
                        <Text style={styles.confirmationTitle}>{confirmationModal.title}</Text>
                        <Text style={styles.confirmationMessage}>{confirmationModal.message}</Text>
                        <View style={styles.confirmationActions}>
                            <TouchableOpacity
                                style={[styles.confirmationButton, styles.confirmationCancelButton]}
                                onPress={() => setConfirmationModal(prev => ({ ...prev, visible: false }))}
                            >
                                <Text style={styles.confirmationCancelText}>{t('users.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmationButton, styles.confirmationConfirmButton]}
                                onPress={confirmationModal.onConfirm}
                            >
                                <Text style={styles.confirmationConfirmText}>{t('users.delete')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.background
    } as ViewStyle,
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    } as ViewStyle,
    loadingText: {
        marginTop: Spacing.md,
        fontSize: Font.sizes.body,
        color: Colors.light.textSecondary
    } as TextStyle,
    card: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: Spacing.md,
        margin: Spacing.sm,
        backgroundColor: Colors.light.cardBackground,
        borderRadius: BorderRadius.medium,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    } as ViewStyle,
    info: {
        flex: 1,
        marginLeft: Spacing.md,
    } as ViewStyle,
    name: {
        fontSize: Font.sizes.body,
        marginBottom: Spacing.xs,
        color: Colors.light.textPrimary,
    } as TextStyle,
    role: {
        fontSize: Font.sizes.caption,
        color: Colors.purple[2],
        marginBottom: Spacing.xs,
        textTransform: 'capitalize',
    } as TextStyle,
    date: {
        fontSize: Font.sizes.caption,
        color: Colors.light.textSecondary
    } as TextStyle,
    actions: {
        flexDirection: 'row',
        gap: Spacing.sm,
        alignItems: 'center',
    } as ViewStyle,
    btn: {
        padding: Spacing.sm,
        borderRadius: BorderRadius.small,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    } as ViewStyle,
    edit: { backgroundColor: Colors.blue[2] } as ViewStyle,
    delete: { backgroundColor: Colors.red[1] } as ViewStyle,
    empty: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg
    } as ViewStyle,
    emptyTitle: {
        fontSize: Font.sizes.h2,
        marginVertical: Spacing.md,
        color: Colors.light.textPrimary,
    } as TextStyle,
    emptyText: {
        fontSize: Font.sizes.body,
        color: Colors.light.textSecondary,
        textAlign: 'center',
        marginBottom: Spacing.lg
    } as TextStyle,
    emptyBtn: {
        backgroundColor: Colors.purple[2],
        padding: Spacing.md,
        borderRadius: BorderRadius.medium,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    } as ViewStyle,
    emptyBtnText: {
        color: '#fff',
        fontSize: Font.sizes.body
    } as TextStyle,
    addBtn: {
        position: 'absolute',
        bottom: Spacing.lg,
        right: Spacing.lg,
        backgroundColor: Colors.purple[2],
        padding: Spacing.md,
        borderRadius: BorderRadius.large,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    } as ViewStyle,
    modalContainer: {
        flex: 1,
        backgroundColor: Colors.light.background,
    } as ViewStyle,
    modal: {
        flex: 1,
        backgroundColor: Colors.light.background
    } as ViewStyle,
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderColor: Colors.light.cardBorder,
        backgroundColor: Colors.light.background,
    } as ViewStyle,
    modalTitle: {
        fontSize: Font.sizes.h2,
        color: Colors.light.textPrimary,
    } as TextStyle,
    modalButton: {
        padding: Spacing.sm,
        minWidth: 60,
        alignItems: 'center',
    } as ViewStyle,
    modalSaveButton: {
        backgroundColor: Colors.purple[2],
        borderRadius: BorderRadius.medium,
    } as ViewStyle,
    modalCancel: {
        color: Colors.purple[2],
        fontSize: Font.sizes.body
    } as TextStyle,
    modalSave: {
        color: '#fff',
        fontSize: Font.sizes.body
    } as TextStyle,
    modalContent: {
        padding: Spacing.md
    } as ViewStyle,
    inputGroup: {
        marginBottom: Spacing.md
    } as ViewStyle,
    label: {
        marginBottom: Spacing.sm,
        fontSize: Font.sizes.body,
        color: Colors.light.textPrimary,
    } as TextStyle,
    input: {
        borderWidth: 1,
        borderColor: Colors.light.cardBorder,
        borderRadius: BorderRadius.medium,
        padding: Spacing.md,
        backgroundColor: Colors.light.cardBackground,
        color: Colors.light.textPrimary,
    } as TextStyle,
    listContent: {
        flexGrow: 1,
        paddingBottom: Spacing.lg,
    } as ViewStyle,
    confirmationOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    } as ViewStyle,
    confirmationModal: {
        backgroundColor: Colors.light.background,
        borderRadius: BorderRadius.medium,
        padding: Spacing.lg,
        width: '100%',
        maxWidth: 400,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    } as ViewStyle,
    confirmationTitle: {
        fontSize: Font.sizes.h2,
        color: Colors.light.textPrimary,
        marginBottom: Spacing.md,
        textAlign: 'center',
    } as TextStyle,
    confirmationMessage: {
        fontSize: Font.sizes.body,
        color: Colors.light.textSecondary,
        marginBottom: Spacing.lg,
        textAlign: 'center',
    } as TextStyle,
    confirmationActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: Spacing.md,
    } as ViewStyle,
    confirmationButton: {
        flex: 1,
        padding: Spacing.md,
        borderRadius: BorderRadius.medium,
        alignItems: 'center',
    } as ViewStyle,
    confirmationCancelButton: {
        backgroundColor: Colors.light.cardBackground,
        borderWidth: 1,
        borderColor: Colors.light.cardBorder,
    } as ViewStyle,
    confirmationConfirmButton: {
        backgroundColor: Colors.red[1],
    } as ViewStyle,
    confirmationCancelText: {
        color: Colors.light.textPrimary,
        fontSize: Font.sizes.body,
    } as TextStyle,
    confirmationConfirmText: {
        color: '#fff',
        fontSize: Font.sizes.body,
    } as TextStyle,
    contextBar: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.cardBorder,
        backgroundColor: Colors.light.background,
    } as ViewStyle,
    familyDropdownTrigger: {
        flex: 1,
    } as ViewStyle,
    contextLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: Colors.light.textSecondary,
        letterSpacing: 0.8,
        marginBottom: 2,
    } as TextStyle,
    familyNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    } as ViewStyle,
    activeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.teal[2],
    } as ViewStyle,
    familyNameText: {
        fontSize: Font.sizes.h2,
        fontWeight: '700',
        color: Colors.light.textPrimary,
    } as TextStyle,
    dropdown: {
        position: 'absolute',
        top: 120,
        left: Spacing.lg,
        right: Spacing.lg,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.large,
        borderWidth: 1,
        borderColor: Colors.light.cardBorder,
        zIndex: 100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 8,
    } as ViewStyle,
    dropdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.cardBorder,
    } as ViewStyle,
    dropdownItemActive: {
        backgroundColor: Colors.teal[0],
    } as ViewStyle,
    dropdownItemText: {
        fontSize: Font.sizes.body,
        color: Colors.light.textPrimary,
    } as TextStyle,
    dropdownItemTextActive: {
        color: Colors.teal[3],
        fontWeight: '600',
    } as TextStyle,
});
