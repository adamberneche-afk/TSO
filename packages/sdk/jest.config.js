/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    // The package's own tsconfig.json sets "types": [] (it targets a
    // browser/Electron runtime, not Node) so jest's globals wouldn't
    // otherwise resolve -- override just for the test compile.
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { types: ['jest', 'node'] } }],
  },
  testTimeout: 15000,
  verbose: true,
};
