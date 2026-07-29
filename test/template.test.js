const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const { renderTemplate, DEFAULT_ROOT_TEMPLATE, DEFAULT_SUB_TEMPLATE, loadTemplateFile } = require('../dist/template');

test('renderTemplate substitutes a single variable', () => {
  assert.strictEqual(renderTemplate('Hello, {{name}}!', { name: 'world' }), 'Hello, world!');
});

test('renderTemplate substitutes the same variable multiple times', () => {
  assert.strictEqual(renderTemplate('{{x}} and {{x}}', { x: 'yo' }), 'yo and yo');
});

test('renderTemplate renders missing variables as empty strings', () => {
  assert.strictEqual(renderTemplate('[{{missing}}]', {}), '[]');
});

test('renderTemplate renders null and undefined variables as empty strings', () => {
  assert.strictEqual(renderTemplate('[{{a}}|{{b}}]', { a: null, b: undefined }), '[|]');
});

test('renderTemplate stringifies numbers and booleans', () => {
  assert.strictEqual(renderTemplate('count={{n}} ok={{ok}} off={{off}}', { n: 3, ok: true, off: false }), 'count=3 ok=true off=');
});

test('renderTemplate {{#if}} renders the body only when the value is truthy', () => {
  const truthy = renderTemplate('{{#if name}}hi {{name}}{{/if}}', { name: 'alice' });
  const falsy = renderTemplate('{{#if name}}hi {{name}}{{/if}}', { name: '' });
  const undef = renderTemplate('{{#if name}}hi {{name}}{{/if}}', {});
  assert.strictEqual(truthy, 'hi alice');
  assert.strictEqual(falsy, '');
  assert.strictEqual(undef, '');
});

test('renderTemplate {{#if}} treats non-empty arrays as truthy', () => {
  assert.strictEqual(renderTemplate('{{#if items}}has items{{/if}}', { items: ['a'] }), 'has items');
  assert.strictEqual(renderTemplate('{{#if items}}full{{/if}}', { items: [] }), '');
});

test('renderTemplate {{#if}} treats zero as falsy', () => {
  assert.strictEqual(renderTemplate('{{#if n}}non-zero{{/if}}', { n: 0 }), '');
  assert.strictEqual(renderTemplate('{{#if n}}non-zero{{/if}}', { n: 1 }), 'non-zero');
});

test('renderTemplate {{#each}} renders the body once per entry', () => {
  const out = renderTemplate('{{#each items}}- {{this}}\n{{/each}}', { items: ['a', 'b', 'c'] });
  assert.strictEqual(out, '- a\n- b\n- c\n');
});

test('renderTemplate {{#each}} exposes object fields by name alongside {{this}}', () => {
  const out = renderTemplate('{{#each users}}{{name}}={{this.role}};{{/each}}', {
    users: [{ name: 'alice', role: 'admin' }, { name: 'bob', role: 'user' }]
  });
  assert.strictEqual(out, 'alice=admin;bob=user;');
});

test('renderTemplate {{#each}} renders nothing for a non-array', () => {
  assert.strictEqual(renderTemplate('{{#each x}}{{this}}{{/each}}', { x: 'scalar' }), '');
  assert.strictEqual(renderTemplate('{{#each x}}{{this}}{{/each}}', {}), '');
});

test('renderTemplate resolves nested {{#if}} and {{var}} inside {{#each}}', () => {
  const out = renderTemplate('{{#each items}}{{#if active}}*{{name}}{{/if}}{{/each}}', {
    items: [
      { name: 'a', active: true },
      { name: 'b', active: false },
      { name: 'c', active: true }
    ]
  });
  assert.strictEqual(out, '*a*c');
});

test('renderTemplate preserves whitespace around placeholders verbatim', () => {
  // The newline between `{{#if name}}` and the body is part of the rendered
  // output, so authors can drop in a heading without manually joining it to
  // the surrounding content.
  const out = renderTemplate('A{{#if name}}\nB\n{{/if}}C', { name: 'x' });
  assert.strictEqual(out, 'A\nB\nC');
});

test('DEFAULT_ROOT_TEMPLATE renders all the standard sections', () => {
  // Minimal variables covering every placeholder used by the default root
  // template. The output is the section-by-section composition, not a
  // exact-byte snapshot, so the assertion is "every section is present and
  // in the right order" rather than a string equality. Whitespace rules
  // changed when the template replaced the inline string-concatenation;
  // each section's *presence* is what matters here.
  const out = renderTemplate(DEFAULT_ROOT_TEMPLATE, {
    name: 'demo',
    licenseBadge: '[![license](https://example.test/license.svg)](https://example.test/license)',
    license: '[![npm](https://example.test/npm.svg)](https://example.test/npm)',
    figlet: '\n```\nASCII\n```',
    header: '## Welcome',
    directories: ' - [src/](./src/)\n',
    files: ' - [README.md](./README.md)\n',
    body: 'Body text.',
    tree: '```\ndemo/\n└─── src/\n```',
    footer: '## Bye',
    previousUrl: '',
    description: ''
  });
  assert.match(out, /# demo/);
  assert.match(out, /## Welcome/);
  assert.match(out, /\[!\[\w+\]\([^)]+\)\]\([^)]+\)/);
  assert.match(out, /\[src\/\]\(\.\/src\/\)/);
  assert.match(out, /\[README\.md\]\(\.\/README\.md\)/);
  assert.match(out, /Body text\./);
  assert.match(out, /## Directory Tree/);
  assert.match(out, /demo\/\n└─── src\//);
  assert.match(out, /## Bye/);
  // The order is enforced by relative positions, not exact spacing.
  assert.ok(out.indexOf('# demo') < out.indexOf('## Welcome'), 'heading precedes header');
  assert.ok(out.indexOf('## Welcome') < out.indexOf('## Directories'), 'header precedes directories');
  assert.ok(out.indexOf('## Directories') < out.indexOf('## Directory Tree'), 'directories precede tree');
  assert.ok(out.indexOf('## Directory Tree') < out.indexOf('## Bye'), 'tree precedes footer');
});

test('DEFAULT_SUB_TEMPLATE renders the [<- Previous] link inside the tree section', () => {
  const out = renderTemplate(DEFAULT_SUB_TEMPLATE, {
    name: 'parent / child',
    licenseBadge: '',
    license: '',
    figlet: '',
    header: '',
    directories: '',
    files: '',
    body: '',
    tree: '```\nchild/\n└─── file.txt\n```',
    footer: '',
    previousUrl: '../README.md',
    description: ''
  });
  assert.match(out, /# parent \/ child/);
  assert.match(out, /\[<- Previous\]\(\.\.\/README\.md\)/);
  // The previous link is rendered inside the tree section, so it has to
  // appear before the actual tree fence.
  const linkIndex = out.indexOf('[<- Previous]');
  const fenceIndex = out.indexOf('```');
  assert.ok(linkIndex !== -1 && fenceIndex !== -1 && linkIndex < fenceIndex, 'Previous link must precede the tree fence');
});

test('DEFAULT_SUB_TEMPLATE renders {{description}} when supplied', () => {
  const out = renderTemplate(DEFAULT_SUB_TEMPLATE, {
    name: 'demo',
    licenseBadge: '',
    license: '',
    figlet: '',
    header: '',
    directories: '',
    files: '',
    body: '',
    tree: '',
    footer: '',
    previousUrl: '',
    description: 'A short paragraph.'
  });
  assert.match(out, /A short paragraph\./);
});

test('DEFAULT_SUB_TEMPLATE renders nothing extra when every section is empty', () => {
  // With nothing to render except the title, the output should still
  // contain the heading and nothing more — no stray badge, no spurious
  // previous link, no phantom "## " headings.
  const out = renderTemplate(DEFAULT_SUB_TEMPLATE, {
    name: 'demo',
    licenseBadge: '',
    license: '',
    figlet: '',
    header: '',
    directories: '',
    files: '',
    body: '',
    tree: '',
    footer: '',
    previousUrl: '',
    description: ''
  });
  assert.match(out, /# demo/);
  assert.doesNotMatch(out, /\[!/);
  assert.doesNotMatch(out, /\[<- Previous\]/);
  assert.doesNotMatch(out, /^## /m);
});

test('loadTemplateFile reads a UTF-8 template from disk', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'awesome-readme-tpl-'));
  const file = path.join(dir, 'root.md');
  fs.writeFileSync(file, '# {{name}}');
  try {
    assert.strictEqual(loadTemplateFile(file), '# {{name}}');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('loadTemplateFile throws with the resolved path when the file is missing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'awesome-readme-tpl-missing-'));
  const missing = path.join(dir, 'nope.md');
  try {
    assert.throws(() => loadTemplateFile(missing), /Template file not found/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
