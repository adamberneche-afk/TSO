/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  // Coverage was collected and uploaded to Codecov but nothing ever
  // enforced it -- a PR that deleted tests or added a pile of untested
  // code would never fail CI over it. These thresholds are a floor set a
  // few points under the actual current coverage (statements 33.96%,
  // branches 19.88%, functions 29.51%, lines 34.13% as of 2026-09-07), not
  // an aspirational target: the goal is catching a real regression below
  // where the suite already is, not blocking every PR until coverage
  // reaches some arbitrary number nobody's written tests for yet.
  coverageThreshold: {
    global: {
      statements: 33,
      branches: 19,
      functions: 29,
      lines: 33,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testTimeout: 30000,
  verbose: true,
  maxWorkers: 1,
  forceExit: true,
  detectOpenHandles: true,
};