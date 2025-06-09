// utils/universalStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

export const universalStorage = {
    getItem: async (key: string) => {
        return isWeb ? await AsyncStorage.getItem(key) : await SecureStore.getItemAsync(key);
    },
    setItem: async (key: string, value: string) => {
        return isWeb ? await AsyncStorage.setItem(key, value) : await SecureStore.setItemAsync(key, value);
    },
    removeItem: async (key: string) => {
        return isWeb ? await AsyncStorage.removeItem(key) : await SecureStore.deleteItemAsync(key);
    },
};
