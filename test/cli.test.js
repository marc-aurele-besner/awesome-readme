const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const { parseCliOptions, usage } = require('../dist/cli');
const { main } = require('../dist/index');

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
