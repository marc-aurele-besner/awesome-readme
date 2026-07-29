const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const { walkDirectory, flattenDirectories, DEFAULT_MAX_DEPTH } = require('../dist/walk');

const options = (overrides = {}) => ({
  ignore_gitFiles: true,
  ignore_gitIgnoreFiles: true,
  ignore_files: [],
  ignore_defaults: true,
  max_depth: DEFAULT_MAX_DEPTH,
  ...overrides
});

// `a/b/c/d` with one file at every level, which is two levels deeper than the
// old hand-unrolled walk could reach.
const makeDeepProject = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'awesome-readme-walk-'));
  fs.writeFileSync(path.join(root, 'root.txt'), '');
  let current = root;
  for (const name of ['a', 'b', 'c', 'd']) {
    current = path.join(current, name);
    fs.mkdirSync(current);
    fs.writeFileSync(path.join(current, `${name}.txt`), '');
  }
  return root;
};

test('walkDirectory descends past the two levels the generator used to cover', () => {
  const root = makeDeepProject();

  try {
    const tree = walkDirectory(root, options());

    assert.deepStrictEqual(tree.files, ['root.txt']);
    const a = tree.directories[0];
    const b = a.directories[0];
    const c = b.directories[0];
    const d = c.directories[0];
    assert.deepStrictEqual(
      [a.name, b.name, c.name, d.name],
      ['a', 'b', 'c', 'd']
    );
    assert.deepStrictEqual([a.depth, b.depth, c.depth, d.depth], [1, 2, 3, 4]);
    assert.deepStrictEqual(d.files, ['d.txt']);
    assert.deepStrictEqual(d.directories, []);
    assert.strictEqual(d.truncated, false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('walkDirectory separates files from directories at every level', () => {
  const root = makeDeepProject();

  try {
    const tree = walkDirectory(root, options());

    for (const node of flattenDirectories(tree)) {
      assert.ok(
        node.files.every((file) => !fs.statSync(path.join(node.path, file)).isDirectory()),
        `${node.name} listed a directory as a file`
      );
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('walkDirectory applies the ignore rules at every depth', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'awesome-readme-walk-ignore-'));
  fs.mkdirSync(path.join(root, 'src', 'deep'), { recursive: true });
  // Default ignores (node_modules/) three levels down, not just at the root.
  fs.mkdirSync(path.join(root, 'src', 'deep', 'node_modules'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src', 'deep', 'keep.ts'), '');
  fs.writeFileSync(path.join(root, 'src', 'deep', 'debug.log'), '');
  // A `.gitignore` living in a subdirectory applies to that subdirectory.
  fs.writeFileSync(path.join(root, 'src', '.gitignore'), 'secret.ts\n');
  fs.writeFileSync(path.join(root, 'src', 'secret.ts'), '');

  try {
    const tree = walkDirectory(root, options({ ignore_files: ['*.log'] }));

    const src = tree.directories.find((node) => node.name === 'src');
    assert.ok(src, 'src should be walked');
    assert.strictEqual(src.files.includes('secret.ts'), false, 'subdirectory .gitignore should apply');
    const deep = src.directories.find((node) => node.name === 'deep');
    assert.deepStrictEqual(deep.files, ['keep.ts']);
    assert.deepStrictEqual(deep.directories, [], 'node_modules should be ignored at depth');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('walkDirectory stops at max_depth and flags the truncated directories', () => {
  const root = makeDeepProject();

  try {
    const tree = walkDirectory(root, options({ max_depth: 2 }));

    const a = tree.directories[0];
    const b = a.directories[0];
    assert.strictEqual(b.name, 'b');
    assert.deepStrictEqual(b.directories, [], 'c is past max_depth');
    assert.strictEqual(b.truncated, true);
    // The levels above the limit are complete, so they are not flagged.
    assert.strictEqual(a.truncated, false);
    assert.strictEqual(tree.truncated, false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('max_depth: 0 keeps the walk at the root', () => {
  const root = makeDeepProject();

  try {
    const tree = walkDirectory(root, options({ max_depth: 0 }));

    assert.deepStrictEqual(tree.files, ['root.txt']);
    assert.deepStrictEqual(tree.directories, []);
    assert.strictEqual(tree.truncated, true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('walkDirectory terminates on a symlink cycle', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'awesome-readme-walk-cycle-'));
  fs.mkdirSync(path.join(root, 'src'));
  fs.writeFileSync(path.join(root, 'src', 'index.ts'), '');
  try {
    // Windows CI without developer mode cannot create directory symlinks.
    fs.symlinkSync(root, path.join(root, 'src', 'loop'), 'dir');
  } catch {
    fs.rmSync(root, { recursive: true, force: true });
    t.skip('symlinks are not supported on this platform');
    return;
  }

  try {
    const tree = walkDirectory(root, options());

    const src = tree.directories.find((node) => node.name === 'src');
    const loop = src.directories.find((node) => node.name === 'loop');
    assert.ok(loop, 'the symlink is still reported as a directory');
    assert.deepStrictEqual(loop.directories, [], 'the cycle is not followed');
    assert.strictEqual(loop.truncated, true);
    // Terminating through the cycle guard rather than max_depth means the
    // tree stays shallow instead of unrolling ten identical levels.
    assert.strictEqual(flattenDirectories(tree).length, 3);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('flattenDirectories lists every directory root-first', () => {
  const root = makeDeepProject();

  try {
    const names = flattenDirectories(walkDirectory(root, options())).map((node) => node.name);

    assert.deepStrictEqual(names.slice(1), ['a', 'b', 'c', 'd']);
    assert.strictEqual(names[0], path.basename(root));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
