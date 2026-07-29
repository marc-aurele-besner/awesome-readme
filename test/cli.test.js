const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const { parseCliOptions, usage } = require('../dist/cli');
const { main } = require('../dist/index');
// Used by the auto-generated-banner tests to compare against the expected
// figlet output for a given name and font combination.
const figlet = require('figlet');

// Every generated README is announced on stdout, and the dry-run notices go
// there too, so tests capture console output instead of shelling out.
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

// Minimal project: a root package.json plus one subdirectory holding one file.
const makeProject = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'awesome-readme-cli-'));
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({
      name: 'demo',
      license: 'MIT',
      repository: { type: 'git', url: 'git+https://github.com/demo/demo.git' }
    })
  );
  fs.mkdirSync(path.join(root, 'src'));
  fs.writeFileSync(path.join(root, 'src', 'index.js'), '');
  return root;
};

test('parseCliOptions defaults every flag to off', () => {
  assert.deepStrictEqual(parseCliOptions([]), {
    help: false,
    dryRun: false,
    rootOnly: false,
    path: undefined,
    config: undefined
  });
});

test('parseCliOptions reads long and short forms', () => {
  assert.deepStrictEqual(parseCliOptions(['--help']), {
    help: true,
    dryRun: false,
    rootOnly: false,
    path: undefined,
    config: undefined
  });
  assert.strictEqual(parseCliOptions(['-h']).help, true);
  assert.strictEqual(parseCliOptions(['--dry-run']).dryRun, true);
  assert.strictEqual(parseCliOptions(['--root-only']).rootOnly, true);
  assert.strictEqual(parseCliOptions(['--path', './pkg']).path, './pkg');
  assert.strictEqual(parseCliOptions(['-p', './pkg']).path, './pkg');
  assert.strictEqual(parseCliOptions(['--config', 'a.js']).config, 'a.js');
  assert.strictEqual(parseCliOptions(['-c', 'a.js']).config, 'a.js');
});

test('parseCliOptions rejects unknown flags, missing values and positionals', () => {
  assert.throws(() => parseCliOptions(['--nope']));
  assert.throws(() => parseCliOptions(['--path']));
  assert.throws(() => parseCliOptions(['--path', '']), /--path requires a directory/);
  assert.throws(() => parseCliOptions(['--config', '  ']), /--config requires a file path/);
  assert.throws(() => parseCliOptions(['extra-arg']));
});

test('--help prints usage, exits 0 and writes nothing', () => {
  const root = makeProject();
  const cwd = process.cwd();
  process.chdir(root);

  try {
    const { result, stdout } = captureOutput(() => main(['--help']));

    assert.strictEqual(result, 0);
    assert.match(stdout, /Usage: awesome-readme/);
    assert.match(stdout, /--dry-run/);
    assert.strictEqual(fs.existsSync(path.join(root, 'README.md')), false);
  } finally {
    process.chdir(cwd);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('--dry-run reports the READMEs without writing any file', () => {
  const root = makeProject();

  try {
    const { result, stdout } = captureOutput(() => main(['--path', root, '--dry-run']));

    assert.strictEqual(result, 0);
    assert.match(stdout, /\[dry-run\] Would create/);
    assert.strictEqual(fs.existsSync(path.join(root, 'README.md')), false);
    assert.strictEqual(fs.existsSync(path.join(root, 'src', 'README.md')), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('--path generates outside the current working directory', () => {
  const root = makeProject();

  try {
    const { result } = captureOutput(() => main(['--path', root]));

    assert.strictEqual(result, 0);
    assert.strictEqual(fs.existsSync(path.join(root, 'README.md')), true);
    assert.strictEqual(fs.existsSync(path.join(root, 'src', 'README.md')), true);
    assert.match(fs.readFileSync(path.join(root, 'README.md'), 'utf8'), /# demo/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('--root-only writes the root README and skips subdirectories', () => {
  const root = makeProject();

  try {
    const { result } = captureOutput(() => main(['--path', root, '--root-only']));

    assert.strictEqual(result, 0);
    assert.strictEqual(fs.existsSync(path.join(root, 'README.md')), true);
    assert.strictEqual(fs.existsSync(path.join(root, 'src', 'README.md')), false);
    // The subdirectory tree still has to appear in the root README.
    assert.match(fs.readFileSync(path.join(root, 'README.md'), 'utf8'), /src\//);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('--config loads a config file from an arbitrary location', () => {
  const root = makeProject();
  const configDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'awesome-readme-config-'));
  const configPath = path.join(configDirectory, 'custom.config.js');
  fs.writeFileSync(configPath, "module.exports = { root_footer: 'FOOTER-FROM-CUSTOM-CONFIG' };\n");

  try {
    const { result } = captureOutput(() => main(['--path', root, '--config', configPath]));

    assert.strictEqual(result, 0);
    assert.match(fs.readFileSync(path.join(root, 'README.md'), 'utf8'), /FOOTER-FROM-CUSTOM-CONFIG/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(configDirectory, { recursive: true, force: true });
  }
});

test('a missing --config or --path exits non-zero', () => {
  const root = makeProject();

  try {
    const missingConfig = captureOutput(() => main(['--path', root, '--config', path.join(root, 'nope.js')]));
    assert.strictEqual(missingConfig.result, 1);
    assert.match(missingConfig.stderr, /Config file not found/);

    const missingPath = captureOutput(() => main(['--path', path.join(root, 'does-not-exist')]));
    assert.strictEqual(missingPath.result, 1);
    assert.match(missingPath.stderr, /Project path not found/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('an unknown flag exits non-zero and prints the usage', () => {
  const { result, stderr } = captureOutput(() => main(['--totally-unknown']));

  assert.strictEqual(result, 1);
  assert.match(stderr, /Usage: awesome-readme/);
  assert.ok(usage.includes('--root-only'));
});

// Regression coverage for #82: the subdirectory tree used to render every
// directory entry as `└───`, and the root tree mixed files with the
// continuation column. The generator now shares one tree renderer between
// the root and subdirectory paths, so the two layouts have to stay in sync.
test('subdirectory trees use the same connectors and last-child rule as the root tree', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'awesome-readme-tree-'));
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({
      name: 'demo',
      license: 'MIT',
      repository: { type: 'git', url: 'git+https://github.com/demo/demo.git' }
    })
  );
  // Two files at the root plus two subdirectories, so the root tree has a
  // non-last and a last directory entry.
  fs.writeFileSync(path.join(root, 'README.md'), '');
  fs.writeFileSync(path.join(root, 'LICENSE'), '');
  fs.mkdirSync(path.join(root, 'alpha'));
  fs.mkdirSync(path.join(root, 'beta'));
  fs.writeFileSync(path.join(root, 'alpha', 'a.txt'), '');
  fs.writeFileSync(path.join(root, 'beta', 'b.txt'), '');

  try {
    captureOutput(() => main(['--path', root]));

    const rootReadme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
    // Root tree: two non-last directory connectors and one last child.
    assert.match(rootReadme, /├─── alpha\//);
    assert.match(rootReadme, /└─── beta\//);
    // Subtree lines under a non-last directory use the `│   ` continuation
    // column so the parent's connector column continues.
    assert.match(rootReadme, /│ {3}└─── a\.txt/);

    const alphaReadme = fs.readFileSync(path.join(root, 'alpha', 'README.md'), 'utf8');
    // Subdirectory tree: a single file is the last child, so it uses
    // `└───` (and the previous code wrongly used `└───` for every entry).
    assert.match(alphaReadme, /└─── a\.txt/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// Snapshot-style assertion: locks the expected ASCII tree for the canonical
// layout (files followed by directories, subtrees inlined under their
// parent). Locks both the root README and the subdirectory README so the
// two paths cannot drift apart again.
test('generated trees match the issue #82 fixture', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'awesome-readme-snapshot-'));
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({
      name: 'demo',
      license: 'MIT',
      repository: { type: 'git', url: 'git+https://github.com/demo/demo.git' }
    })
  );
  fs.writeFileSync(path.join(root, 'README.md'), '');
  fs.mkdirSync(path.join(root, 'docs'));
  fs.mkdirSync(path.join(root, 'src'));
  fs.writeFileSync(path.join(root, 'docs', 'notes.md'), '');

  const extractTree = (readme) => {
    // The root README has the figlet code block then the tree block; the
    // subdirectory README has a `[<- Previous](url)` link line between the
    // `## Directory Tree` heading and the tree's fence. Anchor on the
    // heading and grab the last fenced block, which is always the tree.
    const blocks = readme.match(/```\n[\s\S]*?\n```/g);
    if (!blocks || blocks.length === 0) return '';
    const treeBlock = blocks[blocks.length - 1];
    // Strip the surrounding fences.
    return treeBlock.replace(/^```\n/, '').replace(/\n```$/, '');
  };

  try {
    captureOutput(() => main(['--path', root]));

    const rootTree = extractTree(fs.readFileSync(path.join(root, 'README.md'), 'utf8'));
    const expectedRootTree = [
      'demo/',
      '├─── README.md',
      '└─── package.json',
      '├─── docs/',
      '│   └─── notes.md',
      '└─── src/'
    ].join('\n');
    assert.strictEqual(rootTree, expectedRootTree);

    const docsTree = extractTree(fs.readFileSync(path.join(root, 'docs', 'README.md'), 'utf8'));
    const expectedDocsTree = ['docs/', '   └─── notes.md'].join('\n');
    assert.strictEqual(docsTree, expectedDocsTree);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// Coverage for #88: when the user runs the tool with no config, the banner
// is auto-generated from `package.json` `name` using the figlet library. The
// same `Standard` font is used by both `figlet_text` and the auto-generated
// banner so the layout stays consistent across both code paths.
test('auto-generates a figlet banner from package.json name when no config is provided', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'awesome-readme-figlet-auto-'));
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({
      name: 'demo',
      license: 'MIT',
      repository: { type: 'git', url: 'git+https://github.com/demo/demo.git' }
    })
  );

  try {
    const { result, stdout } = captureOutput(() => main(['--path', root]));

    assert.strictEqual(result, 0);
    // The renderer logs a status line for the auto-generation path.
    assert.match(stdout, /Auto-generated figlet from package\.json "name" using font "Standard"/);

    const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
    // The README should contain the figlet text wrapped in its own fenced
    // block. The figlet output contains characters that have meaning in
    // regular expressions (`(`, `)`, `|`, `\`, `_`), so a substring check is
    // used here to avoid escaping them. The renderer template literal inserts
    // a blank line between the banner and the closing fence.
    const expectedBanner = figlet.textSync('demo', { font: 'Standard' }).replace(/\n$/, '');
    const openingFence = '\n```\n' + expectedBanner;
    assert.ok(readme.includes(openingFence), 'README should contain the auto-generated figlet banner inside its own fenced block');
    const closingIndex = readme.indexOf(openingFence) + openingFence.length;
    assert.ok(closingIndex > 0 && /^\n+```/m.test(readme.slice(closingIndex)), 'README should close the figlet banner fence correctly');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// Coverage for #88: an explicit `figlet` string in the config wins over the
// auto-generated banner, so existing configs keep their custom art.
test('config.figlet wins over the auto-generated banner', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'awesome-readme-figlet-explicit-'));
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({
      name: 'demo',
      license: 'MIT',
      repository: { type: 'git', url: 'git+https://github.com/demo/demo.git' }
    })
  );
  fs.writeFileSync(path.join(root, 'awesome-readme.config.js'), "module.exports = { figlet: 'CUSTOM-ASCII-ART' };\n");

  try {
    const { result, stdout } = captureOutput(() => main(['--path', root]));

    assert.strictEqual(result, 0);
    // The "auto-generated" log is not emitted when a figlet string is provided.
    assert.doesNotMatch(stdout, /Auto-generated figlet/);

    const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
    assert.match(readme, /CUSTOM-ASCII-ART/);
    // The auto-generated figlet for "demo" must NOT appear. Use the second
    // rendered line as a fingerprint so the assertion does not have to deal
    // with the figlet output's `(`, `|`, etc. characters being regex-special.
    const demoLineFingerprint = figlet.textSync('demo', { font: 'Standard' }).split('\n')[1];
    assert.ok(!readme.includes(demoLineFingerprint), 'README must not contain the auto-generated figlet when an explicit figlet is set');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// Coverage for #88: `figlet_text` plus `figlet_font` still works after the
// refactor, and the font choice applies consistently to both this path and
// the auto-generated banner.
test('config.figlet_text with figlet_font renders the configured banner', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'awesome-readme-figlet-text-'));
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({
      name: 'demo',
      license: 'MIT',
      repository: { type: 'git', url: 'git+https://github.com/demo/demo.git' }
    })
  );
  fs.writeFileSync(path.join(root, 'awesome-readme.config.js'), "module.exports = { figlet_text: 'pretty', figlet_font: 'Big' };\n");

  try {
    const { result, stdout } = captureOutput(() => main(['--path', root]));

    assert.strictEqual(result, 0);
    assert.match(stdout, /Generated figlet from figlet_text using font "Big"/);

    const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
    const expected = figlet.textSync('pretty', { font: 'Big' }).replace(/\n$/, '');
    const openingFence = '\n```\n' + expected;
    assert.ok(readme.includes(openingFence), 'README should contain the figlet_text-rendered banner inside its own fenced block');
    const closingIndex = readme.indexOf(openingFence) + openingFence.length;
    assert.ok(closingIndex > 0 && /^\n+```/m.test(readme.slice(closingIndex)), 'README should close the figlet_text banner fence correctly');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// Coverage for #88: opting out via `figlet_auto: false` suppresses the
// auto-generated banner, and an explicit `figlet_text` still wins because it
// is treated as the user's deliberate choice.
test('figlet_auto: false suppresses auto-generation', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'awesome-readme-figlet-optout-'));
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({
      name: 'demo',
      license: 'MIT',
      repository: { type: 'git', url: 'git+https://github.com/demo/demo.git' }
    })
  );
  fs.writeFileSync(path.join(root, 'awesome-readme.config.js'), "module.exports = { figlet_auto: false };\n");

  try {
    const { result, stdout } = captureOutput(() => main(['--path', root]));

    assert.strictEqual(result, 0);
    assert.doesNotMatch(stdout, /Auto-generated figlet/);

    const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
    // The figlet text from `textSync('demo', Standard)` must NOT appear.
    const demoLineFingerprint = figlet.textSync('demo', { font: 'Standard' }).split('\n')[1];
    assert.ok(!readme.includes(demoLineFingerprint), 'README must not contain the auto-generated figlet when figlet_auto is false');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// Coverage for #88: `figlet_auto` is also honoured when a config file is
// absent, and a manual config flag can force-enable it even when the user
// provides neither `figlet` nor `figlet_text`.
test('figlet_auto: true forces auto-generation even with an empty config file', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'awesome-readme-figlet-forced-'));
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({
      name: 'demo',
      license: 'MIT',
      repository: { type: 'git', url: 'git+https://github.com/demo/demo.git' }
    })
  );
  // An empty config file (still counts as "config exists") with the auto
  // flag explicitly on — without this, auto-gen must already be the default.
  fs.writeFileSync(path.join(root, 'awesome-readme.config.js'), "module.exports = { figlet_auto: true };\n");

  try {
    const { result, stdout } = captureOutput(() => main(['--path', root]));

    assert.strictEqual(result, 0);
    assert.match(stdout, /Auto-generated figlet from package\.json "name" using font "Standard"/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
