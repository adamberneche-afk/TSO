module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // ts-jest needs the classic TS compiler API (createLanguageService,
  // ModuleKind, ...), which TypeScript 7's native compiler doesn't expose
  // (see https://github.com/kulshekhar/ts-jest -- no fix published yet).
  // @swc/jest only transpiles (no type-checking), which `tsc --noEmit`
  // already covers separately in this package's own build/CI step.
  transform: {
    '^.+\\.tsx?$': ['@swc/jest', {
      jsc: {
        parser: { syntax: 'typescript' },
        target: 'es2022',
      },
      module: { type: 'commonjs' },
    }],
  },
  testTimeout: 15000,
  verbose: true,
};
