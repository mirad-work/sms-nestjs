module.exports = {
  root: true,
  env: {
    node: true,
    jest: true,
    es2020: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  ignorePatterns: ['.eslintrc.js', 'dist/', 'node_modules/', '*.js', 'babel.config.js'],
  rules: {
    'no-console': 'warn',
    'no-unused-vars': 'off', // Disabled in favor of TypeScript checking
    'prefer-const': 'error',
  },
};
