/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/__tests__/components'],
  moduleNameMapper: {
    // Intercept both alias and relative supabase/logger imports
    '.*constants/supabaseClient': '<rootDir>/__tests__/__mocks__/supabaseClient.ts',
    '.*utils/logger':             '<rootDir>/__tests__/__mocks__/logger.ts',
    // Component-specific mocks
    '^react-i18next$':                       '<rootDir>/__tests__/components/__mocks__/react-i18next.ts',
    '^@/context/AuthContext$':               '<rootDir>/__tests__/components/__mocks__/AuthContext.ts',
    '^@/hooks/useMarathonTheme$':            '<rootDir>/__tests__/components/__mocks__/useMarathonTheme.ts',
    '^@/components/ThemedText$':             '<rootDir>/__tests__/components/__mocks__/ThemedText.tsx',
    '^@/components/ThemedView$':             '<rootDir>/__tests__/components/__mocks__/ThemedView.tsx',
    '^@expo/vector-icons$':                  '<rootDir>/__tests__/components/__mocks__/vectorIcons.tsx',
    '^expo-linear-gradient$':                '<rootDir>/__tests__/components/__mocks__/linearGradient.tsx',
    // Alias fallback
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFiles: ['<rootDir>/__tests__/setup.ts'],
  clearMocks: true,
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/components/__mocks__/'],
};
