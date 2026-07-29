import * as path from 'path';

import type { ExtraData } from './types';
import type { DirectoryNode } from './walk';

/**
 * Per-directory overrides for the eight text fields of an `ExtraData` object.
 *
 * `ignore_gitFiles`, `ignore_gitIgnoreFiles`, `ignore_files`,
 * `ignore_defaults` and `max_depth` are deliberately not overridable here:
 * they govern the walker itself, and letting them drift per directory would
 * produce inconsistent trees between READMEs.
 */
export type DirectoryOverride = Partial<
  Pick<ExtraData, 'root_license' | 'root_header' | 'root_body' | 'root_footer' | 'sub_license' | 'sub_header' | 'sub_body' | 'sub_footer'>
>;

const TEXT_FIELDS = ['root_license', 'root_header', 'root_body', 'root_footer', 'sub_license', 'sub_header', 'sub_body', 'sub_footer'] as const;

type TextField = (typeof TEXT_FIELDS)[number];

/**
 * Normalize a raw `directories` key into a project-root-relative POSIX path.
 *
 * Rejects values that would escape the project root (`..`, leading `/`,
 * Windows `\` separators, absolute POSIX paths) and the empty string. A `null`
 * return signals the caller should throw with the original key so the error
 * message names the user's input rather than the normalized form.
 */
const normalizeKey = (raw: string): string | null => {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  // Windows-style separators are never valid in a POSIX key. This keeps the
  // matching identical across platforms and prevents `..\..\etc` slips.
  if (trimmed.includes('\\')) return null;
  const normalized = path.posix.normalize(trimmed).replace(/\/+$/, '');
  if (normalized === '' || normalized === '.' || normalized.startsWith('..') || path.posix.isAbsolute(normalized)) return null;
  return normalized;
};

/**
 * Parse the raw `directories` value of `awesome-readme.config.js` into a
 * keyed map of overrides.
 *
 * Throws on the first invalid input — empty / null / array containers, bad
 * keys (escaping the project root, Windows separators, empty strings) and
 * bad values (anything other than a plain object). The throw is caught by
 * `main` so a bad config exits 1 with a descriptive message, matching the
 * behaviour of `--path` / `--config` validation.
 *
 * Unknown fields on each override object are silently ignored so future
 * versions can add new overridable fields without breaking old configs.
 */
export const parseDirectoryOverrides = (raw: unknown, _projectRoot: string): Map<string, DirectoryOverride> => {
  if (raw === undefined) return new Map();
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('config.directories must be an object mapping POSIX paths to overrides');
  const out = new Map<string, DirectoryOverride>();
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const normalized = normalizeKey(key);
    if (normalized === null) throw new Error(`config.directories: invalid key "${key}" (expected a project-root-relative POSIX path)`);
    if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(`config.directories["${normalized}"] must be an object`);
    const override: DirectoryOverride = {};
    const record = value as Record<string, unknown>;
    for (const field of TEXT_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(record, field) && typeof record[field] === 'string') {
        // An empty string is a legitimate "clear this section" override, so
        // we have to test for key presence rather than truthiness.
        (override as Record<TextField, string>)[field] = record[field] as string;
      }
    }
    out.set(normalized, override);
  }
  return out;
};

/**
 * Compute the project-root-relative POSIX key for a walked directory node.
 *
 * The root node returns `''` so callers can use a `Map.get('')` lookup for
 * root-README overrides (the current implementation never populates one,
 * but the seam is left in place). Any node that escapes the project root —
 * through a symlink or a manual walk — also returns `''`, which silently
 * falls back to the global `ExtraData`.
 */
export const getDirectoryKey = (node: DirectoryNode, projectRoot: string): string => {
  if (node.path === projectRoot) return '';
  const rel = path.relative(projectRoot, node.path);
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) return '';
  return rel.split(path.sep).join('/');
};

/**
 * Return a copy of `base` with every text field present in `override`
 * replaced. Other fields (`ignore_*`, `max_depth`) are left untouched so
 * traversal cannot drift between directories.
 *
 * Returns the original reference when no override is supplied — callers
 * iterate thousands of directories and most have no entry, so a fresh
 * object would be wasted work.
 */
export const mergeOverride = (base: ExtraData, override: DirectoryOverride | undefined): ExtraData => {
  if (!override) return base;
  const next: ExtraData = { ...base };
  const record = override as Record<TextField, string>;
  for (const field of TEXT_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(override, field)) next[field] = record[field];
  }
  return next;
};
