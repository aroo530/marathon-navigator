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
import { getCurrentFamily } from '@/services/familyService';
import {
    Participant,
    createParticipant,
    deleteParticipant,
    fetchParticipantsByFamilyId,
    updateParticipant,
} from '@/services/userService';

const ROLE_PARTICIPANT = 'participant' as const;

type ModalMode = 'create' | 'edit' | null;

export default function ParticipantsScreen() {
    const { t } = useTranslation();
    const { marathonId } = useLocalSearchParams();
    const { selectedMarathon } = useMarathon();
    const currentMarathonId = Number(marathonId ?? selectedMarathon?.id);

    const { userProfile } = useAuth();
    const { currentFamily, setCurrentFamily } = useFamily();

    const [participants, setParticipants] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
    const [formData, setFormData] = useState({ name: '' });
    const [submitting, setSubmitting] = useState(false);

    const fetchParticipants = useCallback(async () => {
        if (!currentFamily?.id) return;
        try {
            setLoading(true);
            const list = await fetchParticipantsByFamilyId(currentFamily.id);
            setParticipants(list);
        } catch (error) {
            console.error('Error fetching participants:', error);
            showToast('error', t('users.errorLoadingParticipants'));
        } finally {
            setLoading(false);
        }
    }, [currentFamily?.id, t]);

    // Fetch current family and participants when screen focuses
    useFocusEffect(
        useCallback(() => {
            let active = true;

            async function loadAll() {
                // 1) Ensure we have family
                if (userProfile?.id && !currentFamily) {
                    try {
                        const fam = await getCurrentFamily(currentMarathonId, userProfile.id);
                        if (active && fam) setCurrentFamily(fam);
                    } catch (e) {
                        console.error('Failed to load family', e);
                    }
                }
                // 2) Then load participants
                if (currentFamily) {
                    await fetchParticipants();
                }
            }

            loadAll();
            return () => { active = false; };
        }, [
            userProfile?.id,
            currentFamily,
            currentMarathonId,
            setCurrentFamily,
            fetchParticipants,
        ])
    );

    const onRefresh = useCallback(async () => {
        if (!currentFamily) return;
        setRefreshing(true);
        try {
            await fetchParticipants();
        } finally {
            setRefreshing(false);
        }
    }, [currentFamily, fetchParticipants]);

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
            await fetchParticipants();
        } catch (error) {
            console.error('Error saving participant:', error);
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

        // For web, we'll use a simple confirm dialog
        if (window.confirm(t('users.deleteConfirmation', { name: p.full_name }))) {
            (async () => {
                try {
                    await deleteParticipant(p.id);
                    showToast('success', t('users.participantDeleted'));
                    await fetchParticipants();
                } catch (error) {
                    console.error('Error deleting participant:', error);
                    showToast('error', t('users.errorDeletingParticipant'));
                }
            })();
        }
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
                    <Text style={styles.role}>{item.role}</Text>
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
                    <ActivityIndicator size="large" color={Colors.purple[2]} />
                    <Text style={styles.loadingText}>{t('users.loadingParticipants')}</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Header title={t('users.participants')} />

            {/* List */}
            <FlatList
                data={participants}
                keyExtractor={(i) => i.id.toString()}
                renderItem={renderParticipant}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.purple[2]]} />
                }
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="people-outline" size={64} color={Colors.light.textSecondary} />
                        <Text style={styles.emptyTitle}>{t('users.noParticipants')}</Text>
                        <Text style={styles.emptyText}>{t('users.getStartedMessage')}</Text>
                        <TouchableOpacity onPress={() => openModal('create')} style={styles.emptyBtn}>
                            <Text style={styles.emptyBtnText}>{t('users.addParticipant')}</Text>
                        </TouchableOpacity>
                    </View>
                }
                contentContainerStyle={styles.listContent}
            />

            {/* Add Button */}
            <TouchableOpacity onPress={() => openModal('create')} style={styles.addBtn}>
                <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>

            {/* Modal */}
            <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeModal}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
                    <SafeAreaView style={styles.modal}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={closeModal} style={styles.modalButton}>
                                <Text style={styles.modalCancel}>{t('users.cancel')}</Text>
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>
                                {modalMode === 'create' ? t('users.addParticipant') : t('users.editParticipant')}
                            </Text>
                            <TouchableOpacity
                                onPress={handleSubmit}
                                disabled={submitting}
                                style={[styles.modalButton, styles.modalSaveButton]}
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
});
