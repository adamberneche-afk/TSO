/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    // chalk 6 is ESM-only; Jest's own CJS module loader (unlike Node's
    // native require(), which handles this fine) can't parse it. Real
    // runtime and build both use chalk unmocked -- only the test runner
    // needs a stand-in, since these tests don't assert on ANSI output.
    '^chalk$': '<rootDir>/test/chalkMock.js',
  },
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  testTimeout: 15000,
  verbose: true,
};
