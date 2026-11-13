module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/tests/navigation/**/*.spec.tsx'],
  setupFilesAfterEnv: ['<rootDir>/tests/navigation/setup.ts'],
  clearMocks: true,
};
