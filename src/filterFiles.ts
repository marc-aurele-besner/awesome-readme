import * as fs from 'fs';
import * as path from 'path';

import ignoreLib from 'ignore';

import type { ExtraData } from './types';

/**
 * Built-in ignore patterns applied on top of the user's `ignore_files` list
 * unless `ignore_defaults` is set to false.
 *
 * Patterns are gitignore-style so directory-only entries (the trailing slash
 * form) only match directories when the matching helper is given entry types.
 * `node_modules` and `dist` are the common cases that pollute generated
 * README trees; `coverage` and `build` cover the usual test/CI outputs.
 */
export const DEFAULT_IGNORE_PATTERNS: readonly string[] = ['node_modules/', 'dist/', 'coverage/', 'build/'];

/**
 * Ignore rules shared by the root listing and every subdirectory listing.
 *
 * Both walks used to filter files independently, which meant `ignore_files`
 * was only honoured at the root and a file ignored there could still show up
 * in a sub-README or subdirectory tree. Everything that lists files now goes
 * through this module so the rules stay in sync.
 *
 * `ignore_files` patterns are matched through the `ignore` library so users
 * can write gitignore-style globs (`*.log`, `dist/`, negation, etc.) instead
 * of having to list every exact filename. Defaults from
 * `DEFAULT_IGNORE_PATTERNS` are merged in unless `ignore_defaults` is false.
 */
export interface FilterOptions {
  ignore_gitFiles: boolean;
  ignore_gitIgnoreFiles: boolean;
  ignore_files: string[];
  ignore_defaults: boolean;
}

/**
 * Parse a list of raw gitignore-style patterns into an `ignore` instance.
 *
 * Blank lines and `#` comments are skipped so the patterns that reach the
 * library are exactly the ones that would apply to a real `.gitignore`.
 * The empty list short-circuits to `undefined` so callers can cheaply skip
 * the matching step when no patterns were requested.
 */
const compilePatterns = (patterns: string[]): ReturnType<typeof ignoreLib> | undefined => {
  const cleaned = patterns.filter((line) => line.length > 0 && !line.trim().startsWith('#'));
  if (cleaned.length === 0) return undefined;
  return ignoreLib().add(cleaned);
};

/**
 * Parse the raw contents of a `.gitignore` file into an `ignore` instance.
 *
 * Splits on newlines (including `\r\n`) so multi-pattern files compile the
 * same way they would when handed straight to `git status`. Comments and
 * blank lines are filtered out before the patterns reach the library.
 */
const compileGitignore = (contents: string): ReturnType<typeof ignoreLib> | undefined => {
  return compilePatterns(contents.split(/\r?\n/));
};

/**
 * Whether a single entry is ignored by the compiled patterns, without
 * knowing whether the name refers to a file or a directory.
 *
 * Tests both forms (`name` and `name/`) so directory-only patterns like
 * `dist/` still match a bare directory name when the caller cannot tell
 * the type. This is the path taken by `filterFiles`, which only receives a
 * flat list of entry names from the public API.
 */
const matchesAnyForm = (name: string, ig: ReturnType<typeof ignoreLib>): boolean => {
  return ig.ignores(name) || ig.ignores(`${name}/`);
};

/**
 * Whether a single entry is ignored by the compiled patterns when its type
 * is known.
 *
 * Directory-only patterns (`dist/`) only fire when the entry is a directory
 * and the path is supplied with a trailing slash, so the filter tests both
 * forms for directories and only the bare form for files. This is the path
 * taken by `filterEntries`, which receives entries stat'd against the
 * filesystem.
 */
const isIgnoredByPatterns = (name: string, isDirectory: boolean, ig: ReturnType<typeof ignoreLib>): boolean => {
  if (isDirectory) return ig.ignores(`${name}/`) || ig.ignores(name);
  return ig.ignores(name);
};

/**
 * Merge the user's `ignore_files` patterns with the built-in defaults.
 *
 * Duplicates are stripped (preserving the first occurrence so the user's
 * patterns are listed first in any debug output) and the result keeps
 * `ignore_files` on top so it is obvious what was configured vs. what
 * came from the tool. When `ignore_defaults` is false, only the user's
 * patterns are returned.
 */
export const mergeIgnorePatterns = (userPatterns: string[], applyDefaults: boolean): string[] => {
  const merged: string[] = [];
  const seen = new Set<string>();
  for (const pattern of userPatterns) {
    if (seen.has(pattern)) continue;
    seen.add(pattern);
    merged.push(pattern);
  }
  if (!applyDefaults) return merged;
  for (const pattern of DEFAULT_IGNORE_PATTERNS) {
    if (seen.has(pattern)) continue;
    seen.add(pattern);
    merged.push(pattern);
  }
  return merged;
};

/**
 * Apply the ignore rules to an already-read list of entry names.
 *
 * `gitignore` is the raw contents of the `.gitignore` that applies to the
 * directory being scanned, or `undefined` when there is none. The match is
 * delegated to the `ignore` package, so `.gitignore` patterns (`*`, `dist/`,
 * negation, etc.) are honoured instead of being reduced to a substring check.
 *
 * `ignore_files` is matched the same way, which means patterns can use
 * gitignore globs (`*.log`, `dist/`) rather than having to spell out exact
 * filenames. Directory-only patterns still need to be matched against entry
 * types, so callers that know whether each entry is a file or directory
 * should prefer `listFilteredFiles`, which routes through `filterEntries`
 * for the type-aware check.
 */
export const filterFiles = (files: string[], options: FilterOptions, gitignore?: string): string[] => {
  let filtered = files;
  const ig = gitignore !== undefined ? compileGitignore(gitignore) : undefined;

  if (ig !== undefined && options.ignore_gitIgnoreFiles) {
    // Without a directory flag we fall back to the bare-name match, which
    // covers the common patterns used in tests and keeps the public API
    // backward compatible.
    filtered = filtered.filter((file) => !ig.ignores(file));
  }
  if (options.ignore_gitFiles) {
    filtered = filtered.filter((file) => !file.startsWith('.git'));
  }
  const mergedPatterns = mergeIgnorePatterns(options.ignore_files, options.ignore_defaults);
  const patternsIg = compilePatterns(mergedPatterns);
  if (patternsIg !== undefined) {
    filtered = filtered.filter((file) => !matchesAnyForm(file, patternsIg));
  }

  return filtered;
};

/**
 * Entry metadata passed to `filterEntries` so directory-only gitignore
 * patterns can be matched against the actual file type.
 */
export interface FilterEntry {
  name: string;
  isDirectory: boolean;
}

/**
 * Type-aware variant of `filterFiles`.
 *
 * Same rule set as `filterFiles`, but with directory information attached so
 * `.gitignore` patterns that distinguish files from directories (the trailing
 * slash form, e.g. `dist/`) are honoured. `listFilteredFiles` produces the
 * entries, so the actual filesystem walk stays in one place.
 */
export const filterEntries = (entries: FilterEntry[], options: FilterOptions, gitignore?: string): string[] => {
  let filtered = entries;
  const ig = gitignore !== undefined ? compileGitignore(gitignore) : undefined;

  if (ig !== undefined && options.ignore_gitIgnoreFiles) {
    filtered = filtered.filter((entry) => !isIgnoredByPatterns(entry.name, entry.isDirectory, ig));
  }
  if (options.ignore_gitFiles) {
    filtered = filtered.filter((entry) => !entry.name.startsWith('.git'));
  }
  const mergedPatterns = mergeIgnorePatterns(options.ignore_files, options.ignore_defaults);
  const patternsIg = compilePatterns(mergedPatterns);
  if (patternsIg !== undefined) {
    filtered = filtered.filter((entry) => !isIgnoredByPatterns(entry.name, entry.isDirectory, patternsIg));
  }

  return filtered.map((entry) => entry.name);
};

/**
 * Read a directory and return its entries with the ignore rules applied.
 *
 * The `.gitignore` used is the one living in the directory being scanned, so
 * subdirectory walks no longer read the project root's file by mistake, and
 * each entry is stat'd so directory-only patterns can be matched correctly.
 */
export const listFilteredFiles = (currentPath: string, extraData: ExtraData): string[] => {
  const files = fs.readdirSync(currentPath);
  const gitignorePath = path.join(currentPath, '.gitignore');
  const gitignore = files.includes('.gitignore') && fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : undefined;
  const entries: FilterEntry[] = files.map((name) => {
    const stats = fs.statSync(path.join(currentPath, name));
    return { name, isDirectory: stats.isDirectory() };
  });

  return filterEntries(entries, extraData, gitignore);
};

export default listFilteredFiles;
