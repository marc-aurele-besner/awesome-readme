const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const { parseDirectoryOverrides, getDirectoryKey, mergeOverride } = require('../dist/directoryOverrides');
const { main } = require('../dist/index');

// Coverage for #89: per-directory config overrides. `directories` is a
// project-root-relative POSIX map whose values patch the eight text fields
// of `ExtraData` for the matching directory only — matching is exact and
// does not cascade, unspecified directories keep the global defaults.

// Capture stdout/stderr so tests can assert on logs and exit codes without
// spawning a shell. Mirrors the helper used in test/cli.test.js so the
// patterns stay familiar.
const captureOutput = (fn) => {
  const stdout = [];
  const stderr = [];
  const originalLog = console.log;
  const originalError = console.error;
  console.log = (...args) => stdout.push(args.join(' '));
  console.error = (...args) => stderr.push(args.join(' '));
  try {
    const result = fn();
    return { result, stdout: stdout.join('\n'), stderr: stderr.join('\n') };
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
};

const baseExtraData = () => ({
  root_license: '',
  root_header: '',
  root_body: '',
  root_footer: '',
  sub_license: '',
  sub_header: 'GLOBAL-SUB-HEADER',
  sub_body: 'GLOBAL-SUB-BODY',
  sub_footer: 'GLOBAL-SUB-FOOTER',
  ignore_gitFiles: true,
  ignore_gitIgnoreFiles: true,
  ignore_files: [],
  ignore_defaults: true,
  max_depth: 10
});

// `makeProject` builds a tiny project: a `src/` directory with one file, a
// `.vscode/` directory, and an `src/hooks/` directory. Each one is a
// realistic candidate for an override in `awesome-readme.config.js`.
const makeProject = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'awesome-readme-overrides-'));
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({
      name: 'demo',
      license: 'MIT',
      repository: { type: 'git', url: 'git+https://github.com/demo/demo.git' }
    })
  );
  fs.mkdirSync(path.join(root, 'src'));
  fs.mkdirSync(path.join(root, 'src', 'hooks'));
  fs.mkdirSync(path.join(root, '.vscode'));
  fs.writeFileSync(path.join(root, 'src', 'index.js'), '');
  fs.writeFileSync(path.join(root, 'src', 'hooks', 'pre.js'), '');
  fs.writeFileSync(path.join(root, '.vscode', 'settings.json'), '');
  return root;
};

test('parseDirectoryOverrides returns an empty map when directories is absent', () => {
  assert.deepStrictEqual(parseDirectoryOverrides(undefined, '/project'), new Map());
});

test('parseDirectoryOverrides accepts a small, valid override map', () => {
  const result = parseDirectoryOverrides(
    {
      src: { sub_header: 'A' },
      '.vscode': { sub_header: 'B', sub_footer: 'C' },
      'src/hooks': { sub_header: '' }
    },
    '/project'
  );

  assert.strictEqual(result.size, 3);
  assert.deepStrictEqual(result.get('src'), { sub_header: 'A' });
  assert.deepStrictEqual(result.get('.vscode'), { sub_header: 'B', sub_footer: 'C' });
  // An empty-string override is a legitimate "clear this section" value and
  // must be preserved verbatim instead of being dropped by truthiness.
  assert.deepStrictEqual(result.get('src/hooks'), { sub_header: '' });
});

test('parseDirectoryOverrides ignores unknown fields and trailing slashes on keys', () => {
  // Trailing slash and `./` are stripped during normalization; the same
  // canonical key therefore collapses multiple forms into one entry. The
  // last one wins (insertion order is preserved in `Map`), so a value
  // without an unknown field is checked explicitly first.
  const result = parseDirectoryOverrides(
    {
      'src/': { sub_header: 'A', not_a_field: 'ignored' },
      './src': { sub_header: 'A' }
    },
    '/project'
  );

  assert.strictEqual(result.size, 1);
  assert.deepStrictEqual(result.get('src'), { sub_header: 'A' });
});

test('parseDirectoryOverrides preserves unknown fields as no-ops', () => {
  // A value with only unknown fields is still a valid override object — it
  // simply contributes nothing to the renderer.
  const result = parseDirectoryOverrides({ src: { not_a_field: 'ignored', another: 42 } }, '/project');
  assert.strictEqual(result.size, 1);
  assert.deepStrictEqual(result.get('src'), {});
});

test('parseDirectoryOverrides rejects non-object containers', () => {
  assert.throws(() => parseDirectoryOverrides(null, '/project'), /config.directories must be an object/);
  assert.throws(() => parseDirectoryOverrides([], '/project'), /config.directories must be an object/);
  assert.throws(() => parseDirectoryOverrides('nope', '/project'), /config.directories must be an object/);
});

test('parseDirectoryOverrides rejects keys that escape the project root', () => {
  assert.throws(() => parseDirectoryOverrides({ '/abs': { sub_header: 'A' } }, '/project'), /invalid key/);
  assert.throws(() => parseDirectoryOverrides({ '..': { sub_header: 'A' } }, '/project'), /invalid key/);
  assert.throws(() => parseDirectoryOverrides({ '../escape': { sub_header: 'A' } }, '/project'), /invalid key/);
  assert.throws(() => parseDirectoryOverrides({ 'src\\..\\x': { sub_header: 'A' } }, '/project'), /invalid key/);
  assert.throws(() => parseDirectoryOverrides({ '': { sub_header: 'A' } }, '/project'), /invalid key/);
  assert.throws(() => parseDirectoryOverrides({ '   ': { sub_header: 'A' } }, '/project'), /invalid key/);
});

test('parseDirectoryOverrides rejects non-object values', () => {
  assert.throws(() => parseDirectoryOverrides({ src: null }, '/project'), /must be an object/);
  assert.throws(() => parseDirectoryOverrides({ src: 'header' }, '/project'), /must be an object/);
  assert.throws(() => parseDirectoryOverrides({ src: ['header'] }, '/project'), /must be an object/);
});

test('getDirectoryKey returns the POSIX path relative to the project root', () => {
  const projectRoot = path.resolve('/project');
  assert.strictEqual(getDirectoryKey({ name: 'project', path: projectRoot, depth: 0, files: [], directories: [], truncated: false }, projectRoot), '');
  assert.strictEqual(getDirectoryKey({ name: 'src', path: path.join(projectRoot, 'src'), depth: 1, files: [], directories: [], truncated: false }, projectRoot), 'src');
  assert.strictEqual(getDirectoryKey({ name: 'hooks', path: path.join(projectRoot, 'src', 'hooks'), depth: 2, files: [], directories: [], truncated: false }, projectRoot), 'src/hooks');
});

test('mergeOverride leaves the base untouched when no override is supplied', () => {
  const base = baseExtraData();
  const merged = mergeOverride(base, undefined);
  assert.strictEqual(merged, base);
});

test('mergeOverride only patches fields that are present in the override', () => {
  const base = baseExtraData();
  const merged = mergeOverride(base, { sub_header: 'OVERRIDE' });
  assert.strictEqual(merged.sub_header, 'OVERRIDE');
  assert.strictEqual(merged.sub_body, 'GLOBAL-SUB-BODY');
  // The original reference must stay intact so the root README keeps using it.
  assert.strictEqual(base.sub_header, 'GLOBAL-SUB-HEADER');
  assert.notStrictEqual(merged, base);
});

test('mergeOverride ignores override fields that the type does not allow', () => {
  const base = baseExtraData();
  // `ignore_files` is intentionally not overridable per-directory; the type
  // prevents the field but the runtime must also keep ignoring it.
  const merged = mergeOverride(base, { sub_header: 'X' });
  assert.strictEqual(merged.ignore_files, base.ignore_files);
  assert.strictEqual(merged.max_depth, base.max_depth);
});

test('the root README never receives an override', () => {
  // The root README draws from the `root_*` fields, so a `sub_header`
  // override for `src` must never bleed into the root. We seed the root
  // with a unique `root_body` so the assertion is on what the root README
  // actually contains.
  const root = makeProject();
  fs.writeFileSync(
    path.join(root, 'awesome-readme.config.js'),
    "module.exports = { root_body: 'ROOT-ONLY-MARKER', directories: { src: { root_body: 'OVERRIDE-FOR-SRC' } } };\n"
  );

  try {
    captureOutput(() => main(['--path', root, '--force']));

    const rootReadme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
    assert.match(rootReadme, /ROOT-ONLY-MARKER/);
    assert.doesNotMatch(rootReadme, /OVERRIDE-FOR-SRC/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('an empty key or "." key is rejected to keep the root un-overridable', () => {
  const root = makeProject();
  fs.writeFileSync(path.join(root, 'awesome-readme.config.js'), "module.exports = { directories: { '.': { sub_header: 'OVERRIDE' } } };\n");

  try {
    const { result, stderr } = captureOutput(() => main(['--path', root, '--force']));
    assert.strictEqual(result, 1);
    assert.match(stderr, /config\.directories: invalid key "\."/);
    // Nothing should have been written because the bad config aborted the run.
    assert.strictEqual(fs.existsSync(path.join(root, 'README.md')), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('a per-directory override applies only to the matching directory', () => {
  const root = makeProject();
  fs.writeFileSync(
    path.join(root, 'awesome-readme.config.js'),
    "module.exports = { sub_header: 'GLOBAL-DEFAULT', directories: { src: { sub_header: 'OVERRIDE-FOR-SRC' } } };\n"
  );

  try {
    captureOutput(() => main(['--path', root, '--force']));

    const srcReadme = fs.readFileSync(path.join(root, 'src', 'README.md'), 'utf8');
    assert.match(srcReadme, /OVERRIDE-FOR-SRC/);
    assert.doesNotMatch(srcReadme, /GLOBAL-DEFAULT/);

    const hooksReadme = fs.readFileSync(path.join(root, 'src', 'hooks', 'README.md'), 'utf8');
    // The descendant must NOT inherit the `src` override — exact match only.
    assert.match(hooksReadme, /GLOBAL-DEFAULT/);
    assert.doesNotMatch(hooksReadme, /OVERRIDE-FOR-SRC/);

    const vscodeReadme = fs.readFileSync(path.join(root, '.vscode', 'README.md'), 'utf8');
    // A sibling of `src` keeps the global defaults.
    assert.match(vscodeReadme, /GLOBAL-DEFAULT/);
    assert.doesNotMatch(vscodeReadme, /OVERRIDE-FOR-SRC/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('multiple overrides compose and exact matching still wins', () => {
  const root = makeProject();
  fs.writeFileSync(
    path.join(root, 'awesome-readme.config.js'),
    "module.exports = { sub_header: 'GLOBAL-DEFAULT', directories: { src: { sub_header: 'OVERRIDE-SRC' }, 'src/hooks': { sub_header: 'OVERRIDE-HOOKS' } } };\n"
  );

  try {
    captureOutput(() => main(['--path', root, '--force']));

    assert.match(fs.readFileSync(path.join(root, 'src', 'README.md'), 'utf8'), /OVERRIDE-SRC/);
    assert.match(fs.readFileSync(path.join(root, 'src', 'hooks', 'README.md'), 'utf8'), /OVERRIDE-HOOKS/);
    assert.match(fs.readFileSync(path.join(root, '.vscode', 'README.md'), 'utf8'), /GLOBAL-DEFAULT/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('an empty-string override clears the section in the targeted README only', () => {
  const root = makeProject();
  fs.writeFileSync(
    path.join(root, 'awesome-readme.config.js'),
    "module.exports = { sub_header: 'GLOBAL-DEFAULT', directories: { src: { sub_header: '' } } };\n"
  );

  try {
    captureOutput(() => main(['--path', root, '--force']));

    const srcReadme = fs.readFileSync(path.join(root, 'src', 'README.md'), 'utf8');
    assert.doesNotMatch(srcReadme, /GLOBAL-DEFAULT/);
    assert.doesNotMatch(srcReadme, /## About this directory/);

    const hooksReadme = fs.readFileSync(path.join(root, 'src', 'hooks', 'README.md'), 'utf8');
    assert.match(hooksReadme, /GLOBAL-DEFAULT/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('invalid directories keys exit non-zero with a descriptive message', () => {
  const root = makeProject();
  fs.writeFileSync(path.join(root, 'awesome-readme.config.js'), "module.exports = { directories: { '/abs': { sub_header: 'A' } } };\n");

  try {
    const { result, stderr } = captureOutput(() => main(['--path', root, '--force']));
    assert.strictEqual(result, 1);
    assert.match(stderr, /config\.directories: invalid key "\/abs"/);
    // Nothing should have been written because the bad config aborted the run.
    assert.strictEqual(fs.existsSync(path.join(root, 'README.md')), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('non-object values exit non-zero with a descriptive message', () => {
  const root = makeProject();
  fs.writeFileSync(path.join(root, 'awesome-readme.config.js'), "module.exports = { directories: { src: 'header' } };\n");

  try {
    const { result, stderr } = captureOutput(() => main(['--path', root, '--force']));
    assert.strictEqual(result, 1);
    assert.match(stderr, /config\.directories\["src"\] must be an object/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('existing tree and walker behaviour is unaffected by an empty override map', () => {
  // Snapshot-style assertion: declaring an empty `directories` block must
  // not change anything the existing #82 fixture tests pin down, so the
  // walker stays untouched when overrides are added.
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'awesome-readme-overrides-snapshot-'));
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({
      name: 'demo',
      license: 'MIT',
      repository: { type: 'git', url: 'git+https://github.com/demo/demo.git' }
    })
  );
  fs.writeFileSync(path.join(root, 'README.md'), '');
  fs.writeFileSync(path.join(root, 'LICENSE'), '');
  fs.writeFileSync(path.join(root, 'awesome-readme.config.js'), "module.exports = { directories: {} };\n");
  fs.mkdirSync(path.join(root, 'alpha'));
  fs.mkdirSync(path.join(root, 'beta'));
  fs.writeFileSync(path.join(root, 'alpha', 'a.txt'), '');
  fs.writeFileSync(path.join(root, 'beta', 'b.txt'), '');

  try {
    captureOutput(() => main(['--path', root, '--force']));

    const rootReadme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
    assert.match(rootReadme, /├─── alpha\//);
    assert.match(rootReadme, /└─── beta\//);
    assert.match(rootReadme, /│ {3}└─── a\.txt/);

    const alphaReadme = fs.readFileSync(path.join(root, 'alpha', 'README.md'), 'utf8');
    assert.match(alphaReadme, /└─── a\.txt/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});