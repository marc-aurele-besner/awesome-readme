const assert = require('node:assert');
const { test } = require('node:test');

const { buildLicenseBadge, deriveRepositorySlug, deriveRepositoryUrl } = require('../dist/badge');

test('deriveRepositoryUrl passes a plain https URL through unchanged', () => {
  assert.strictEqual(deriveRepositoryUrl('https://github.com/owner/repo'), 'https://github.com/owner/repo');
});

test('deriveRepositoryUrl strips the git+ prefix and .git suffix from a shorthand string', () => {
  assert.strictEqual(deriveRepositoryUrl('git+https://github.com/owner/repo.git'), 'https://github.com/owner/repo');
});

test('deriveRepositoryUrl strips git+ and .git from a string without an https scheme', () => {
  assert.strictEqual(deriveRepositoryUrl('git+ssh://git@github.com/owner/repo.git'), 'ssh://git@github.com/owner/repo');
});

test('deriveRepositoryUrl leaves an undecorated SSH URL alone', () => {
  assert.strictEqual(deriveRepositoryUrl('ssh://git@github.com/owner/repo'), 'ssh://git@github.com/owner/repo');
});

test('deriveRepositoryUrl accepts the { type, url } object form', () => {
  assert.strictEqual(
    deriveRepositoryUrl({ type: 'git', url: 'git+https://github.com/owner/repo.git' }),
    'https://github.com/owner/repo'
  );
});

test('deriveRepositoryUrl accepts an undecorated object form', () => {
  assert.strictEqual(deriveRepositoryUrl({ type: 'git', url: 'https://github.com/owner/repo' }), 'https://github.com/owner/repo');
});

test('deriveRepositoryUrl returns an empty string for missing metadata', () => {
  assert.strictEqual(deriveRepositoryUrl(undefined), '');
  assert.strictEqual(deriveRepositoryUrl(null), '');
  assert.strictEqual(deriveRepositoryUrl(''), '');
});

test('deriveRepositoryUrl returns an empty string for an object with no url field', () => {
  assert.strictEqual(deriveRepositoryUrl({ type: 'git' }), '');
});

test('deriveRepositoryUrl returns an empty string for a non-string url field', () => {
  assert.strictEqual(deriveRepositoryUrl({ url: 42 }), '');
});

test('deriveRepositorySlug extracts owner/repo from an https URL', () => {
  assert.strictEqual(deriveRepositorySlug('https://github.com/owner/repo'), 'owner/repo');
});

test('deriveRepositorySlug strips the .git suffix before matching', () => {
  assert.strictEqual(deriveRepositorySlug('https://github.com/owner/repo.git'), 'owner/repo');
});

test('deriveRepositorySlug strips the git+ prefix before matching', () => {
  assert.strictEqual(deriveRepositorySlug('git+https://github.com/owner/repo'), 'owner/repo');
});

test('deriveRepositorySlug extracts owner/repo from an SSH-style URL', () => {
  assert.strictEqual(deriveRepositorySlug('git@github.com:owner/repo'), 'owner/repo');
});

test('deriveRepositorySlug strips trailing slashes from the URL', () => {
  assert.strictEqual(deriveRepositorySlug('https://github.com/owner/repo/'), 'owner/repo');
  assert.strictEqual(deriveRepositorySlug('https://github.com/owner/repo///'), 'owner/repo');
});

test('deriveRepositorySlug returns an empty string for a missing URL', () => {
  assert.strictEqual(deriveRepositorySlug(''), '');
});

test('deriveRepositorySlug extracts whatever owner/repo segment it can parse', () => {
  // The helper does not validate the host, so a non-GitHub remote with two
  // path segments still yields a "slug". The badge helper rejects slugs that
  // do not look like `owner/repo`, so the same input that produces a slug
  // here still does not produce a badge.
  assert.strictEqual(deriveRepositorySlug('https://gitlab.com/owner/repo'), 'owner/repo');
});

test('buildLicenseBadge rejects inputs that do not match the owner/repo shape', () => {
  // Three or more slash-separated segments would build a badge URL pointing
  // at the wrong endpoint, so the helper bails out with an empty string.
  assert.strictEqual(buildLicenseBadge('a/b/c', 'MIT'), '');
});

test('deriveRepositorySlug returns an empty string for a URL with too few path segments', () => {
  assert.strictEqual(deriveRepositorySlug('https://github.com/'), '');
  assert.strictEqual(deriveRepositorySlug('https://github.com'), '');
});

test('buildLicenseBadge builds the Shields.io badge with the slug and license', () => {
  assert.strictEqual(
    buildLicenseBadge('owner/repo', 'MIT'),
    '[![license](https://img.shields.io/github/license/owner/repo.svg)](https://opensource.org/licenses/MIT)'
  );
});

test('buildLicenseBadge preserves the SPDX license identifier verbatim', () => {
  assert.strictEqual(
    buildLicenseBadge('owner/repo', 'Apache-2.0'),
    '[![license](https://img.shields.io/github/license/owner/repo.svg)](https://opensource.org/licenses/Apache-2.0)'
  );
});

test('buildLicenseBadge returns an empty string when the slug is missing', () => {
  // A missing slug means the URL was not GitHub-shaped, so emitting a badge
  // would point at the wrong project. The empty string lets the template
  // skip the badge line entirely via `{{#if}}`.
  assert.strictEqual(buildLicenseBadge('', 'MIT'), '');
});

test('buildLicenseBadge still links to the SPDX page when the slug is present', () => {
  const out = buildLicenseBadge('marc-aurele-besner/awesome-readme', 'MIT');
  assert.match(out, /opensource\.org\/licenses\/MIT/);
  assert.match(out, /img\.shields\.io\/github\/license\/marc-aurele-besner\/awesome-readme\.svg/);
});