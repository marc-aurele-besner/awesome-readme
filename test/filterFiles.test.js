const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const { filterFiles, listFilteredFiles } = require('../dist/filterFiles');

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
