/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@ephotspot/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/index.ts'],
};
