const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const { filterFiles, filterEntries, listFilteredFiles, mergeIgnorePatterns } = require('../dist/filterFiles');

const options = (overrides = {}) => ({
  ignore_gitFiles: true,
  ignore_gitIgnoreFiles: true,
  ignore_files: [],
  // Tests opt out of the built-in defaults so the existing gitignore-only
  // assertions cannot collide with `node_modules/`, `dist/`, etc. The default
  // behaviour is covered by the dedicated tests at the bottom of this file.
  ignore_defaults: false,
  ...overrides
});

test('filterFiles removes entries listed in ignore_files', () => {
  const files = ['index.ts', 'secret.txt', 'README.md'];

  assert.deepStrictEqual(filterFiles(files, options({ ignore_files: ['secret.txt'] })), ['index.ts', 'README.md']);
});

test('filterFiles keeps everything when ignore_files is empty', () => {
  const files = ['index.ts', 'README.md'];

  assert.deepStrictEqual(filterFiles(files, options()), files);
});

test('filterFiles removes .git* entries only when ignore_gitFiles is on', () => {
  const files = ['.gitignore', '.github', 'index.ts'];

  assert.deepStrictEqual(filterFiles(files, options()), ['index.ts']);
  assert.deepStrictEqual(filterFiles(files, options({ ignore_gitFiles: false })), files);
});

test('filterFiles honours .gitignore contents only when ignore_gitIgnoreFiles is on', () => {
  const files = ['dist', 'src'];

  assert.deepStrictEqual(filterFiles(files, options(), 'dist\n'), ['src']);
  assert.deepStrictEqual(filterFiles(files, options({ ignore_gitIgnoreFiles: false }), 'dist\n'), files);
});

// Proper gitignore matching: the previous substring check would skip a file
// referenced only by a wildcard pattern, e.g. `*.log` never contained the
// literal substring `app.log`.
test('filterFiles honours gitignore glob patterns', () => {
  const files = ['app.log', 'main.ts', 'debug.log'];

  assert.deepStrictEqual(filterFiles(files, options(), '*.log\n'), ['main.ts']);
});

test('filterFiles ignores blank lines and comments inside .gitignore', () => {
  const files = ['dist', 'src', 'keep.txt'];

  const gitignore = ['# build output', '', 'dist', '   ', '# trailing comment'].join('\n');

  assert.deepStrictEqual(filterFiles(files, options(), gitignore), ['src', 'keep.txt']);
});

test('filterFiles honours negation patterns in .gitignore', () => {
  const files = ['dist', 'dist-keep.md'];

  assert.deepStrictEqual(filterFiles(files, options(), 'dist*\n!dist-keep.md\n'), ['dist-keep.md']);
});

// `filterEntries` is the type-aware variant used by the directory walk so
// patterns like `dist/` (directory-only) match the right entries.
test('filterEntries ignores directories when a pattern ends with a slash', () => {
  const entries = [
    { name: 'dist', isDirectory: true },
    { name: 'dist', isDirectory: false },
    { name: 'src', isDirectory: true }
  ];

  assert.deepStrictEqual(filterEntries(entries, options(), 'dist/\n'), ['dist', 'src']);
});

test('filterEntries ignores files when a bare pattern matches a file', () => {
  const entries = [
    { name: 'dist', isDirectory: true },
    { name: 'dist', isDirectory: false },
    { name: 'src', isDirectory: true }
  ];

  assert.deepStrictEqual(filterEntries(entries, options(), 'dist\n'), ['src']);
});

// Regression test for #77: `ignore_files` used to be applied to the root
// listing only, so an ignored file still showed up in subdirectory listings
// and trees.
test('listFilteredFiles applies ignore_files inside a subdirectory', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'awesome-readme-'));
  const subDirectory = path.join(root, 'src');
  fs.mkdirSync(subDirectory);
  fs.writeFileSync(path.join(subDirectory, 'index.ts'), '');
  fs.writeFileSync(path.join(subDirectory, '.prettierignore'), '');

  try {
    const files = listFilteredFiles(subDirectory, options({ ignore_files: ['.prettierignore'] }));

    assert.deepStrictEqual(files, ['index.ts']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// The subdirectory walk used to read the project root's `.gitignore` instead
// of the one belonging to the directory being scanned.
test('listFilteredFiles reads the .gitignore of the directory being scanned', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'awesome-readme-'));
  const subDirectory = path.join(root, 'src');
  fs.mkdirSync(subDirectory);
  fs.writeFileSync(path.join(root, '.gitignore'), 'index.ts\n');
  fs.writeFileSync(path.join(subDirectory, '.gitignore'), 'generated.ts\n');
  fs.writeFileSync(path.join(subDirectory, 'index.ts'), '');
  fs.writeFileSync(path.join(subDirectory, 'generated.ts'), '');

  try {
    const files = listFilteredFiles(subDirectory, options());

    assert.deepStrictEqual(files, ['index.ts']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// End-to-end coverage for #76: a directory listed in `.gitignore` with a
// trailing slash should be filtered out of the listing, and a same-named file
// should not be wrongly matched.
test('listFilteredFiles honours directory-only gitignore patterns against the filesystem', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'awesome-readme-'));
  fs.writeFileSync(path.join(root, '.gitignore'), 'dist/\n');
  fs.mkdirSync(path.join(root, 'dist'));
  fs.writeFileSync(path.join(root, 'dist', 'bundle.js'), '');
  fs.writeFileSync(path.join(root, 'README.md'), '');
  // Sibling file whose name happens to match the directory pattern, so the
  // filter has to distinguish directories from files.
  fs.writeFileSync(path.join(root, 'dist.txt'), '');

  try {
    const files = listFilteredFiles(root, options());

    assert.deepStrictEqual(files.sort(), ['README.md', 'dist.txt']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('listFilteredFiles honours gitignore glob patterns against the filesystem', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'awesome-readme-'));
  fs.writeFileSync(path.join(root, '.gitignore'), '*.log\n');
  fs.writeFileSync(path.join(root, 'app.log'), '');
  fs.writeFileSync(path.join(root, 'debug.log'), '');
  fs.writeFileSync(path.join(root, 'README.md'), '');

  try {
    const files = listFilteredFiles(root, options());

    assert.deepStrictEqual(files, ['README.md']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// Coverage for #87: `ignore_files` is supposed to accept gitignore-style
// globs (`*.log`, `dist/`) rather than only exact filenames.
test('filterFiles accepts glob patterns in ignore_files', () => {
  const files = ['app.log', 'main.ts', 'debug.log'];

  assert.deepStrictEqual(filterFiles(files, options({ ignore_files: ['*.log'] })), ['main.ts']);
});

// Directory-only patterns should only match directories, so a same-named
// file stays in the listing. `listFilteredFiles` is the entry point used by
// the rest of the CLI so it is exercised here.
test('listFilteredFiles honours directory-only patterns from ignore_files', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'awesome-readme-'));
  fs.mkdirSync(path.join(root, 'dist'));
  fs.writeFileSync(path.join(root, 'dist', 'bundle.js'), '');
  // Sibling file whose name happens to match the directory pattern, so the
  // filter has to distinguish directories from files.
  fs.writeFileSync(path.join(root, 'dist.txt'), '');
  fs.writeFileSync(path.join(root, 'README.md'), '');

  try {
    const files = listFilteredFiles(root, options({ ignore_files: ['dist/'] }));

    assert.deepStrictEqual(files.sort(), ['README.md', 'dist.txt']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// Negation in `ignore_files` should also work: a `!foo` pattern re-includes
// an entry that an earlier glob would have excluded.
test('filterFiles honours negation patterns in ignore_files', () => {
  const files = ['dist', 'dist-keep.md'];

  assert.deepStrictEqual(filterFiles(files, options({ ignore_files: ['dist*', '!dist-keep.md'] })), ['dist-keep.md']);
});

// Built-in defaults: with `ignore_defaults: true` (the production default),
// common build/deps directories are filtered out automatically. Tests opt
// out of defaults via the `options()` helper so the assertions above stay
// focused on the rule under test.
test('filterFiles applies the built-in defaults when ignore_defaults is true', () => {
  const files = ['node_modules', 'dist', 'coverage', 'build', 'src', 'README.md'];

  assert.deepStrictEqual(filterFiles(files, options({ ignore_defaults: true })).sort(), ['README.md', 'src']);
});

// Opt-out: `ignore_defaults: false` skips the built-in list, leaving only
// the user-provided `ignore_files` patterns.
test('filterFiles honours ignore_defaults: false', () => {
  const files = ['node_modules', 'dist', 'secret.txt', 'README.md'];

  assert.deepStrictEqual(
    filterFiles(files, options({ ignore_defaults: false, ignore_files: ['secret.txt'] })).sort(),
    ['README.md', 'dist', 'node_modules']
  );
});

// End-to-end coverage: a generated README should not list `node_modules`
// when the project has no `.gitignore` and no explicit `ignore_files`. This
// is the user-facing behaviour the issue calls out.
test('listFilteredFiles filters out node_modules by default', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'awesome-readme-'));
  fs.mkdirSync(path.join(root, 'node_modules'));
  fs.writeFileSync(path.join(root, 'node_modules', 'pkg.js'), '');
  fs.writeFileSync(path.join(root, 'README.md'), '');

  try {
    const files = listFilteredFiles(root, options({ ignore_defaults: true }));

    assert.deepStrictEqual(files, ['README.md']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// `mergeIgnorePatterns` deduplicates and keeps the user list on top.
test('mergeIgnorePatterns combines user patterns with defaults without duplicates', () => {
  const merged = mergeIgnorePatterns(['.prettierignore', 'dist/'], true);

  assert.deepStrictEqual(merged, ['.prettierignore', 'dist/', 'node_modules/', 'coverage/', 'build/']);
});

test('mergeIgnorePatterns returns only the user list when defaults are disabled', () => {
  const merged = mergeIgnorePatterns(['.prettierignore'], false);

  assert.deepStrictEqual(merged, ['.prettierignore']);
});

test('mergeIgnorePatterns deduplicates overlapping patterns', () => {
  const merged = mergeIgnorePatterns(['dist/', 'dist/'], true);

  assert.deepStrictEqual(merged, ['dist/', 'node_modules/', 'coverage/', 'build/']);
});
