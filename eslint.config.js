/* ESLint flat config. Run with: npx eslint js tests */
'use strict';

const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  navigator: 'readonly',
  location: 'readonly',
  localStorage: 'readonly',
  performance: 'readonly',
  requestAnimationFrame: 'readonly',
  cancelAnimationFrame: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  console: 'readonly',
  Image: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  File: 'readonly',
  Node: 'readonly',
  ResizeObserver: 'readonly',
  matchMedia: 'readonly',
  globalThis: 'readonly'
};

const nodeGlobals = {
  require: 'readonly',
  module: 'writable',
  process: 'readonly',
  __dirname: 'readonly',
  console: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  globalThis: 'readonly',
  URL: 'readonly'
};

const rules = {
  'no-undef': 'error',
  'no-unused-vars': ['error', { args: 'after-used', argsIgnorePattern: '^_', caughtErrors: 'none' }],
  'no-unreachable': 'error',
  'no-dupe-keys': 'error',
  'no-duplicate-case': 'error',
  'no-redeclare': 'error',
  'no-shadow-restricted-names': 'error',
  'no-self-assign': 'error',
  'no-self-compare': 'error',
  'no-unsafe-finally': 'error',
  'no-unsafe-negation': 'error',
  'no-use-before-define': ['error', { functions: false, classes: true, variables: true }],
  'no-constant-condition': ['error', { checkLoops: false }],
  'no-fallthrough': 'error',
  'no-empty': ['error', { allowEmptyCatch: false }],
  'no-implicit-globals': 'error',
  'no-var': 'error',
  'prefer-const': 'error',
  eqeqeq: ['error', 'always'],
  curly: ['error', 'multi-line'],
  'no-eval': 'error',
  'no-implied-eval': 'error',
  'no-new-func': 'error',
  'no-throw-literal': 'error',
  'no-useless-escape': 'error',
  'no-unmodified-loop-condition': 'error',
  'no-promise-executor-return': 'off',
  'valid-typeof': 'error',
  'use-isnan': 'error'
};

module.exports = [
  {
    files: ['js/**/*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: browserGlobals },
    rules
  },
  {
    files: ['js/config.js'],
    rules: { 'no-var': 'off', 'no-unused-vars': 'off', 'no-implicit-globals': 'off' }
  },
  {
    files: ['tests/**/*.js', 'eslint.config.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs', globals: nodeGlobals },
    rules
  },
  {
    /* Playwright callbacks run inside the page. */
    files: ['tests/e2e/**/*.js'],
    languageOptions: {
      globals: {
        ...nodeGlobals,
        LQ: 'readonly',
        document: 'readonly',
        window: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        getComputedStyle: 'readonly',
        Event: 'readonly'
      }
    }
  }
];
