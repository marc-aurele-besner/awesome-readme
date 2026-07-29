const js = require('@eslint/js');

// NOTE ON TYPESCRIPT SOURCES (see issue #79)
//
// `src/**/*.ts` is intentionally NOT linted by ESLint. This project builds with
// TypeScript 7, and typescript-eslint refuses to load against the TS 7 API:
//
//   "typescript-eslint does not support TS 7.0."
//
// The guard lives in @typescript-eslint/parser itself, so every route into it
// (flat config preset, bare parser, type-aware rules) throws at require time.
// Upstream tracking: https://github.com/typescript-eslint/typescript-eslint/issues/10940
//
// Until that lands, type safety for `src/` is enforced by `npm run typecheck`
// (`tsc --noEmit`) in CI, not by ESLint. Once typescript-eslint supports TS >=7.1,
// drop the ignore below and extend it with `tseslint.configs.recommended`.

module.exports = [
  {
    ignores: ['node_modules/**', 'dist/**', 'src/**/*.ts']
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'writable',
        exports: 'writable',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        console: 'readonly',
        Buffer: 'readonly'
      }
    },
    rules: {
      // A CLI writes to stdout by design.
      'no-console': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  }
];
