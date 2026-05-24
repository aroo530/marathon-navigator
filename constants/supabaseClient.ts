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

const auth: Parameters<typeof createClient>[2]['auth'] = {
  autoRefreshToken: true,
  persistSession: true,
  ...(isWeb ? {} : { storage: secureStorage }),
};

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth
  }
);
