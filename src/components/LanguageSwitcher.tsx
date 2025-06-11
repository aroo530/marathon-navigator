import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <TouchableOpacity onPress={toggleLanguage} style={styles.container}>
      <View style={styles.content}>
        <MaterialIcons 
          name="language" 
          size={24} 
          color="#333" 
        />
        <Text style={styles.text}>
          {i18n.language === 'en' ? 'العربية' : 'English'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontSize: 16,
    color: '#333',
  },
});

export default LanguageSwitcher; 