/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__/services'],
  moduleNameMapper: {
    // Match both @/ alias and relative imports for these two modules
    '.*constants/supabaseClient': '<rootDir>/__tests__/__mocks__/supabaseClient.ts',
    '.*utils/logger':             '<rootDir>/__tests__/__mocks__/logger.ts',
    '^@/(.*)$':                   '<rootDir>/$1',
  },
  setupFiles: ['<rootDir>/__tests__/setup.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: './tsconfig.test.json' }],
  },
  clearMocks: true,
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/helpers/', '/__tests__/__mocks__/', '/__tests__/setup\\.ts'],
};
