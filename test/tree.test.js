const assert = require('node:assert');
const { test } = require('node:test');

const { renderTreeRows } = require('../dist/tree');

test('renderTreeRows emits a single line per entry in the given order', () => {
  const entries = [
    { name: 'README.md', isDirectory: false },
    { name: 'src', isDirectory: true },
    { name: 'test', isDirectory: true }
  ];

  assert.deepStrictEqual(renderTreeRows(entries), [
    '├─── README.md',
    '├─── src/',
    '└─── test/'
  ]);
});

test('renderTreeRows uses ├─── for every non-last entry', () => {
  const entries = [
    { name: 'a', isDirectory: true },
    { name: 'b', isDirectory: true },
    { name: 'c', isDirectory: true }
  ];

  // The last child still closes the tree even when there are no files.
  assert.deepStrictEqual(renderTreeRows(entries), ['├─── a/', '├─── b/', '└─── c/']);
});

test('renderTreeRows closes on a single-entry list', () => {
  const entries = [{ name: 'only', isDirectory: true }];

  assert.deepStrictEqual(renderTreeRows(entries), ['└─── only/']);
});

test('renderTreeRows treats files and directories as siblings', () => {
  // Files and directories share the same `├───`/`└───` rule, so the caller
  // can hand the full entry list in one call and still get a balanced tree.
  const entries = [
    { name: 'README.md', isDirectory: false },
    { name: 'package.json', isDirectory: false },
    { name: 'docs', isDirectory: true }
  ];

  assert.deepStrictEqual(renderTreeRows(entries), [
    '├─── README.md',
    '├─── package.json',
    '└─── docs/'
  ]);
});

// Regression coverage for #82: the subdirectory tree used to render every
// directory entry as `└───`, which made the closing rule wrong even when
// there were multiple sibling directories.
test('renderTreeRows distinguishes non-last and last directories among siblings', () => {
  const entries = [
    { name: 'first', isDirectory: true },
    { name: 'second', isDirectory: true },
    { name: 'third', isDirectory: true }
  ];

  const lines = renderTreeRows(entries);

  // First two use the open connector, last uses the close connector.
  assert.strictEqual(lines[0], '├─── first/');
  assert.strictEqual(lines[1], '├─── second/');
  assert.strictEqual(lines[2], '└─── third/');
  // No line ends with `└───` for a non-last entry.
  assert.ok(lines.slice(0, -1).every((line) => line.startsWith('├─── ')));
});

test('renderTreeRows returns an empty array for no entries', () => {
  assert.deepStrictEqual(renderTreeRows([]), []);
});

// Snapshot of the canonical ASCII tree the README + sub-README should
// produce. This is the layout the issue calls for: `├───`/`└───` connectors
// for both files and directories, with the last child closing the bracket.
test('renderTreeRows matches the issue #82 fixture tree', () => {
  const entries = [
    { name: 'README.md', isDirectory: false },
    { name: 'package.json', isDirectory: false },
    { name: 'docs', isDirectory: true },
    { name: 'src', isDirectory: true },
    { name: 'test', isDirectory: true }
  ];

  const tree = renderTreeRows(entries).join('\n');
  const expected = [
    '├─── README.md',
    '├─── package.json',
    '├─── docs/',
    '├─── src/',
    '└─── test/'
  ].join('\n');

  assert.strictEqual(tree, expected);
});
