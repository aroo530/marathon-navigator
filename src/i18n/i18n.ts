import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n, { LanguageDetectorAsyncModule } from 'i18next';
import { initReactI18next } from 'react-i18next';

import ar from './locales/ar.json';
import en from './locales/en.json';

const LANGUAGE_DETECTOR: LanguageDetectorAsyncModule = {
  type: 'languageDetector',
  async: true,
  detect: () => {
    return AsyncStorage.getItem('user-language')
      .then((savedLanguage) => savedLanguage || Localization.locale.split('-')[0])
      .catch(() => 'en');
  },
  init: () => { },
  cacheUserLanguage: async (lng: string) => {
    try {
      await AsyncStorage.setItem('user-language', lng);
    } catch (error) {
      console.error('Error saving language', error);
    }
  }
};

i18n
  .use(LANGUAGE_DETECTOR)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar }
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false
    }
  });

export default i18n;
