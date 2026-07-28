const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const { filterFiles, filterEntries, listFilteredFiles } = require('../dist/filterFiles');

const options = (overrides = {}) => ({
  ignore_gitFiles: true,
  ignore_gitIgnoreFiles: true,
  ignore_files: [],
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
