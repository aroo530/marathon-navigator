// constants/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
// import { universalStorage } from './universalStorage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// storage.ts
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';
const secureStorage = {
  getItem: SecureStore.getItemAsync,
  setItem: SecureStore.setItemAsync,
  removeItem: SecureStore.deleteItemAsync,
};

let auth: any = {
  autoRefreshToken: true,
  persistSession: true,
}
if (!isWeb) {
  auth['storage'] = secureStorage;
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth
  }
);
