const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    ignores: ['node_modules/**', 'dist/**']
  },
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        console: 'readonly'
      }
    },
    rules: {
      'no-console': 0,
      'no-unused-vars': 0,
      'no-undef': 0,
      'no-debugger': 0,
      'no-alert': 0,
      'no-empty': 0,
      'no-extra-semi': 0
    }
  }
];
