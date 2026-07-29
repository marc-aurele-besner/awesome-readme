import * as fs from 'fs';
import * as path from 'path';

/**
 * How a README should be emitted.
 *
 * - `write`   : write the file to disk (default behaviour)
 * - `dry-run` : report what would be written, touch nothing (`--dry-run`)
 * - `skip`    : produce nothing at all, used by `--root-only` for the
 *               subdirectory walk whose directory tree is still needed by the
 *               root README even though no sub-README should be created
 */
export type ReadmeWriteMode = 'write' | 'dry-run' | 'skip';

/**
 * Markers delimiting the generated region of a README. Anything outside of
 * them is hand-written content and is preserved across regenerations, so a
 * README can mix generated sections with custom prose, badges or docs.
 */
export const MARKER_START = '<!-- awesome-readme:start -->';
export const MARKER_END = '<!-- awesome-readme:end -->';

export interface ReadmeWriteOptions {
  mode?: ReadmeWriteMode;
  /**
   * Never touch a README that already exists (`--if-missing`). Used to fill in
   * the gaps of a project whose READMEs are otherwise hand-maintained.
   */
  ifMissing?: boolean;
  /**
   * Replace the whole file, markers and hand-written content included
   * (`--force`). This is the old, destructive behaviour, now opt-in.
   */
  force?: boolean;
}

/**
 * What `writeReadmeFile` did (or would do in `dry-run`). Returned so the
 * behaviour can be asserted without inspecting stdout.
 */
export type ReadmeWriteAction = 'created' | 'merged' | 'overwritten' | 'skipped';

/** Wrap freshly generated content in the preservation markers. */
export const wrapGeneratedContent = (contents: string): string => `${MARKER_START}\n${contents}\n${MARKER_END}\n`;

/**
 * Replace the marked region of `existing` with `contents`, keeping everything
 * outside the markers untouched. Returns `undefined` when the file has no
 * usable marker pair, which tells the caller it is dealing with a fully
 * hand-written README.
 */
export const mergeGeneratedContent = (existing: string, contents: string): string | undefined => {
  const start = existing.indexOf(MARKER_START);
  if (start === -1) return undefined;
  const end = existing.indexOf(MARKER_END, start + MARKER_START.length);
  if (end === -1) return undefined;

  const before = existing.slice(0, start + MARKER_START.length);
  const after = existing.slice(end);
  return `${before}\n${contents}\n${after}`;
};

/**
 * Single place where README files reach the filesystem, so `--dry-run` cannot
 * be bypassed by one of the two generators forgetting to check it.
 *
 * Writing is non-destructive by default:
 *
 * - no README yet            → create one, generated content wrapped in markers
 * - README with markers      → only the marked region is regenerated
 * - README without markers   → left alone, with a warning telling the user how
 *                              to opt in (`--force`, or add the markers)
 * - `--force`                → replace the whole file, markers included
 * - `--if-missing`           → never touch an existing README
 */
export const writeReadmeFile = (directoryPath: string, contents: string, options: ReadmeWriteMode | ReadmeWriteOptions = 'write'): ReadmeWriteAction => {
  // The mode used to be the third positional argument; accept both shapes so
  // existing callers (and downstream users of the exported helper) keep working.
  const { mode = 'write', ifMissing = false, force = false } = typeof options === 'string' ? ({ mode: options } as ReadmeWriteOptions) : options;

  if (mode === 'skip') return 'skipped';

  const target = path.join(directoryPath, 'README.md');
  const exists = fs.existsSync(target);
  const existing = exists ? fs.readFileSync(target, 'utf8') : '';

  // Decide *what* would happen first, then either report it (`dry-run`) or do
  // it, so the two paths can never disagree.
  let action: ReadmeWriteAction;
  let nextContents = '';
  let notice = '';

  if (!exists) {
    action = 'created';
    nextContents = wrapGeneratedContent(contents);
  } else if (force) {
    action = 'overwritten';
    nextContents = wrapGeneratedContent(contents);
  } else if (ifMissing) {
    action = 'skipped';
    notice = `${target} already exists, skipped (--if-missing)`;
  } else {
    const merged = mergeGeneratedContent(existing, contents);
    if (merged !== undefined) {
      action = 'merged';
      nextContents = merged;
    } else {
      // A README with no markers is assumed to be hand-written: overwriting it
      // would silently destroy the user's content, so require an explicit opt-in.
      action = 'skipped';
      notice = `${target} has no ${MARKER_START} / ${MARKER_END} markers, left untouched. Add the markers to regenerate part of it, or pass --force to overwrite the whole file.`;
    }
  }

  if (action === 'skipped') {
    console.log('\x1b[33m%s\x1b[0m', `${mode === 'dry-run' ? '[dry-run] ' : ''}${notice}`);
    return action;
  }

  if (mode === 'dry-run') {
    const detail = action === 'merged' ? 'update the generated section of' : action === 'overwritten' ? 'overwrite' : 'create';
    console.log('\x1b[33m%s\x1b[0m', `[dry-run] Would ${detail} ${target} (${Buffer.byteLength(nextContents, 'utf8')} bytes)`);
    return action;
  }

  fs.writeFileSync(target, nextContents);
  const verb = action === 'merged' ? 'generated section updated in' : action === 'overwritten' ? 'overwritten in' : 'created in';
  console.log('\x1b[32m%s\x1b[0m', `README.md ${verb} ${directoryPath}`);
  return action;
};

export default writeReadmeFile;
