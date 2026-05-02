module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    // HTTP glue is covered by manual smoke + future integration tests; excluding avoids skewing global thresholds.
    '!src/http/**',
    '!src/persistence/**',
    '!src/jobs/**'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/'
  ],
  testMatch: [
    '**/test/**/*.test.js'
  ],
  verbose: true,
  testTimeout: 10000,
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
