/**
 * Normalise `package.json`'s `repository` field into a plain URL.
 *
 * `package.json` accepts both a shorthand string and a `{ type, url }` object,
 * and shorthand strings frequently start with `git+` and end with `.git`.
 * Both forms point at the same remote once those decorations are stripped.
 * Anything other than a string or a `{ url }` object yields an empty string
 * so callers can skip the badge step entirely.
 */
export const deriveRepositoryUrl = (repository: unknown): string => {
  if (typeof repository === 'string') {
    if (repository.startsWith('git+')) return repository.replace('git+', '').replace('.git', '');
    return repository;
  }
  if (typeof repository === 'object' && repository !== null) {
    const url = (repository as { url?: unknown }).url;
    if (typeof url === 'string') {
      // The shorthand `{ "url": "git+...git" }` form carries the same
      // `git+`/`.git` decorations as the string form. Strip them so the
      // resulting URL can be fed straight into the slug detector.
      const stripped = url.startsWith('git+') ? url.replace('git+', '') : url;
      return stripped.endsWith('.git') ? stripped.slice(0, -'.git'.length) : stripped;
    }
  }
  return '';
};

/**
 * Reduce a repository URL to its `owner/repo` slug.
 *
 * The README badges hardcode `img.shields.io/github/license/<slug>.svg`, so a
 * missing or unparseable slug should produce an empty string rather than a
 * half-built URL pointing at the wrong project.
 */
export const deriveRepositorySlug = (url: string): string => {
  if (!url) return '';
  const cleaned = url
    .replace(/^git\+/, '')
    .replace(/\.git$/, '')
    .replace(/\/+$/, '');
  // SSH-style: `git@github.com:owner/repo` matches after the colon;
  // HTTPS-style: `https://github.com/owner/repo` matches after the slash.
  const sshMatch = cleaned.match(/[/:]([^/]+\/[^/]+)$/);
  if (sshMatch) return sshMatch[1];
  return '';
};

/**
 * Build the Markdown license badge for the README header.
 *
 * The image target is the Shields.io GitHub license endpoint, which only
 * resolves `owner/repo` slugs correctly. A malformed slug (e.g. one parsed
 * from a non-GitHub URL) would point the badge at a 404, so the helper
 * refuses anything that does not match the `owner/repo` shape and returns an
 * empty string. The template's `{{#if}}` then skips the badge line entirely.
 */
export const buildLicenseBadge = (slug: string, license: string): string => {
  if (!slug || !/^[^/]+\/[^/]+$/.test(slug)) return '';
  return `[![license](https://img.shields.io/github/license/${slug}.svg)](https://opensource.org/licenses/${license})`;
};
