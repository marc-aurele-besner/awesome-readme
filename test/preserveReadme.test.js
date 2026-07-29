const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const { main } = require('../dist/index');
const { MARKER_START, MARKER_END, mergeGeneratedContent, wrapGeneratedContent, writeReadmeFile } = require('../dist/writeReadme');

// Coverage for #86: generating a README must never silently destroy content a
// user wrote by hand. The generated region is delimited by markers; anything
// outside of them survives regeneration, and a marker-less README is left
// alone unless `--force` is passed.

const captureOutput = (fn) => {
  const stdout = [];
  const originalLog = console.log;
  console.log = (...args) => stdout.push(args.join(' '));
  try {
    const result = fn();
    return { result, stdout: stdout.join('\n') };
  } finally {
    console.log = originalLog;
  }
};

const makeProject = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'awesome-readme-preserve-'));
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

const withProject = (fn) => {
  const root = makeProject();
  try {
    fn(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
};

test('a freshly created README wraps its generated content in markers', () => {
  withProject((root) => {
    const { result } = captureOutput(() => main(['--path', root]));

    assert.strictEqual(result, 0);
    const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
    assert.ok(readme.startsWith(MARKER_START), 'generated README should open with the start marker');
    assert.ok(readme.trimEnd().endsWith(MARKER_END), 'generated README should close with the end marker');
    assert.match(readme, /# demo/);
    // Subdirectory READMEs get the same treatment.
    const subReadme = fs.readFileSync(path.join(root, 'src', 'README.md'), 'utf8');
    assert.ok(subReadme.startsWith(MARKER_START));
    assert.ok(subReadme.trimEnd().endsWith(MARKER_END));
  });
});

test('hand-written content outside the markers survives regeneration', () => {
  withProject((root) => {
    captureOutput(() => main(['--path', root]));

    // Simulate a user adding custom prose above and below the generated block.
    const readmePath = path.join(root, 'README.md');
    const generated = fs.readFileSync(readmePath, 'utf8');
    fs.writeFileSync(readmePath, `# Hand-written title\n\nCUSTOM-INTRO\n\n${generated}\nCUSTOM-OUTRO\n`);

    const { result, stdout } = captureOutput(() => main(['--path', root]));

    assert.strictEqual(result, 0);
    assert.match(stdout, /generated section updated in/);
    const updated = fs.readFileSync(readmePath, 'utf8');
    assert.match(updated, /# Hand-written title/);
    assert.match(updated, /CUSTOM-INTRO/);
    assert.match(updated, /CUSTOM-OUTRO/);
    // And the generated part is still there, exactly once.
    assert.strictEqual(updated.split(MARKER_START).length - 1, 1);
    assert.match(updated, /## Directory Tree/);
  });
});

test('regenerating is idempotent: markers and structure are preserved across runs', () => {
  withProject((root) => {
    captureOutput(() => main(['--path', root]));
    // Manually stick the README.md back as a plain file so subsequent runs do
    // not change the file listing (the freshly generated README is itself part
    // of the tree on the first run, which is the only legitimate source of
    // growth). This isolates the preservation guarantee from that side effect.
    fs.writeFileSync(path.join(root, 'README.md'), `${MARKER_START}\nplaceholder\n${MARKER_END}\n`);

    captureOutput(() => main(['--path', root]));
    const first = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
    captureOutput(() => main(['--path', root]));
    const second = fs.readFileSync(path.join(root, 'README.md'), 'utf8');

    // The marked region is regenerated in place; the surrounding bytes are
    // unchanged. Byte-for-byte equality is the whole point of #86.
    assert.strictEqual(second, first);
  });
});

test('a README without markers is left untouched and the user is told why', () => {
  withProject((root) => {
    const readmePath = path.join(root, 'README.md');
    fs.writeFileSync(readmePath, '# My own README\n\nNothing generated here.\n');

    const { result, stdout } = captureOutput(() => main(['--path', root]));

    assert.strictEqual(result, 0);
    assert.strictEqual(fs.readFileSync(readmePath, 'utf8'), '# My own README\n\nNothing generated here.\n');
    assert.match(stdout, /has no <!-- awesome-readme:start --> \/ <!-- awesome-readme:end --> markers, left untouched/);
    assert.match(stdout, /--force/);
    // The subdirectory had no README, so it is still created.
    assert.strictEqual(fs.existsSync(path.join(root, 'src', 'README.md')), true);
  });
});

test('--force overwrites a marker-less README entirely', () => {
  withProject((root) => {
    const readmePath = path.join(root, 'README.md');
    fs.writeFileSync(readmePath, '# My own README\n\nGOODBYE-CONTENT\n');

    const { result, stdout } = captureOutput(() => main(['--path', root, '--force']));

    assert.strictEqual(result, 0);
    const readme = fs.readFileSync(readmePath, 'utf8');
    assert.ok(!readme.includes('GOODBYE-CONTENT'), '--force should discard the previous content');
    assert.match(readme, /# demo/);
    assert.ok(readme.startsWith(MARKER_START));
    assert.match(stdout, /overwritten in/);
  });
});

test('--force also discards content outside the markers', () => {
  withProject((root) => {
    captureOutput(() => main(['--path', root]));
    const readmePath = path.join(root, 'README.md');
    const generated = fs.readFileSync(readmePath, 'utf8');
    fs.writeFileSync(readmePath, `CUSTOM-INTRO\n\n${generated}`);

    captureOutput(() => main(['--path', root, '--force']));

    const readme = fs.readFileSync(readmePath, 'utf8');
    assert.ok(!readme.includes('CUSTOM-INTRO'), '--force is the documented escape hatch and replaces everything');
  });
});

test('--if-missing only creates READMEs that do not exist yet', () => {
  withProject((root) => {
    const readmePath = path.join(root, 'README.md');
    fs.writeFileSync(readmePath, '# Keep me\n');

    const { result, stdout } = captureOutput(() => main(['--path', root, '--if-missing']));

    assert.strictEqual(result, 0);
    assert.strictEqual(fs.readFileSync(readmePath, 'utf8'), '# Keep me\n');
    assert.match(stdout, /already exists, skipped \(--if-missing\)/);
    // The missing subdirectory README is still generated.
    assert.strictEqual(fs.existsSync(path.join(root, 'src', 'README.md')), true);
  });
});

test('--if-missing does not update even a marker-bearing README', () => {
  withProject((root) => {
    captureOutput(() => main(['--path', root]));
    const readmePath = path.join(root, 'README.md');
    // Shrink the generated region so a regeneration would visibly change it.
    fs.writeFileSync(readmePath, `${MARKER_START}\nPLACEHOLDER\n${MARKER_END}\n`);

    captureOutput(() => main(['--path', root, '--if-missing']));

    assert.strictEqual(fs.readFileSync(readmePath, 'utf8'), `${MARKER_START}\nPLACEHOLDER\n${MARKER_END}\n`);
  });
});

test('--force and --if-missing cannot be combined', () => {
  const stderr = [];
  const originalError = console.error;
  console.error = (...args) => stderr.push(args.join(' '));
  try {
    const result = main(['--force', '--if-missing']);
    assert.strictEqual(result, 1);
    assert.match(stderr.join('\n'), /--force and --if-missing cannot be combined/);
  } finally {
    console.error = originalError;
  }
});

test('--dry-run reports a merge without writing, and preserves the file', () => {
  withProject((root) => {
    captureOutput(() => main(['--path', root]));
    const readmePath = path.join(root, 'README.md');
    const before = fs.readFileSync(readmePath, 'utf8');

    const { result, stdout } = captureOutput(() => main(['--path', root, '--dry-run']));

    assert.strictEqual(result, 0);
    assert.match(stdout, /\[dry-run\] Would update the generated section of/);
    assert.strictEqual(fs.readFileSync(readmePath, 'utf8'), before);
  });
});

test('--dry-run reports the skip for a marker-less README', () => {
  withProject((root) => {
    fs.writeFileSync(path.join(root, 'README.md'), '# Mine\n');

    const { stdout } = captureOutput(() => main(['--path', root, '--dry-run']));

    assert.match(stdout, /\[dry-run\] .*left untouched/);
  });
});

test('mergeGeneratedContent replaces only the marked region', () => {
  const existing = `TOP\n${MARKER_START}\nold\n${MARKER_END}\nBOTTOM\n`;
  const merged = mergeGeneratedContent(existing, 'new');

  assert.strictEqual(merged, `TOP\n${MARKER_START}\nnew\n${MARKER_END}\nBOTTOM\n`);
});

test('mergeGeneratedContent returns undefined when a marker is missing', () => {
  assert.strictEqual(mergeGeneratedContent('no markers here', 'new'), undefined);
  assert.strictEqual(mergeGeneratedContent(`${MARKER_START}\nunclosed`, 'new'), undefined);
  // An end marker appearing before the start marker is not a usable pair.
  assert.strictEqual(mergeGeneratedContent(`${MARKER_END}\n${MARKER_START}`, 'new'), undefined);
});

test('wrapGeneratedContent surrounds the content with both markers', () => {
  assert.strictEqual(wrapGeneratedContent('body'), `${MARKER_START}\nbody\n${MARKER_END}\n`);
});

test('writeReadmeFile still accepts a bare mode string and reports its action', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'awesome-readme-write-'));
  try {
    assert.strictEqual(captureOutput(() => writeReadmeFile(directory, 'body', 'skip')).result, 'skipped');
    assert.strictEqual(fs.existsSync(path.join(directory, 'README.md')), false);

    assert.strictEqual(captureOutput(() => writeReadmeFile(directory, 'body', 'dry-run')).result, 'created');
    assert.strictEqual(fs.existsSync(path.join(directory, 'README.md')), false);

    assert.strictEqual(captureOutput(() => writeReadmeFile(directory, 'body', 'write')).result, 'created');
    assert.strictEqual(captureOutput(() => writeReadmeFile(directory, 'body2', 'write')).result, 'merged');
    assert.match(fs.readFileSync(path.join(directory, 'README.md'), 'utf8'), /body2/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
