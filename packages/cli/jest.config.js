module.exports = {
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
  // ts-jest needs the classic TS compiler API (createLanguageService,
  // ModuleKind, ...), which TypeScript 7's native compiler doesn't expose
  // (see https://github.com/kulshekhar/ts-jest -- no fix published yet).
  // @swc/jest only transpiles (no type-checking), which `tsc --noEmit`
  // already covers separately in this package's own build/CI step.
  transform: {
    '^.+\\.tsx?$': ['@swc/jest', {
      jsc: {
        parser: { syntax: 'typescript' },
        target: 'es2020',
      },
      module: { type: 'commonjs' },
    }],
  },
  testTimeout: 15000,
  verbose: true,
};
