import { I18nManager } from 'react-native';

export const applyRTL = (language: string): void => {
  const isRTL = language === 'ar';
  if (I18nManager.isRTL !== isRTL) {
    I18nManager.allowRTL(isRTL);
    I18nManager.forceRTL(isRTL);
  }
};
