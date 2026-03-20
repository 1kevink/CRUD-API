/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      diagnostics: false,
      tsconfig: {
        target: 'ES2020',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        strict: true,
      }
    }],
  },
}

module.exports = config
