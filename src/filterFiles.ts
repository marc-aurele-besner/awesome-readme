import * as fs from 'fs';
import * as path from 'path';

import ignoreLib from 'ignore';

import type { ExtraData } from './types';

/**
 * Ignore rules shared by the root listing and every subdirectory listing.
 *
 * Both walks used to filter files independently, which meant `ignore_files`
 * was only honoured at the root and a file ignored there could still show up
 * in a sub-README or subdirectory tree. Everything that lists files now goes
 * through this module so the rules stay in sync.
 */
export interface FilterOptions {
  ignore_gitFiles: boolean;
  ignore_gitIgnoreFiles: boolean;
  ignore_files: string[];
}

/**
 * Parse the raw contents of a `.gitignore` into an `ignore` instance.
 *
 * Blank lines and `#` comments are skipped so the patterns that reach the
 * library are exactly the ones that would apply to a real `.gitignore`.
 */
const compileGitignore = (contents: string): ReturnType<typeof ignoreLib> => {
  const patterns = contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  return ignoreLib().add(patterns);
};

/**
 * Whether a single entry is ignored by the compiled `.gitignore` patterns.
 *
 * Directory-only patterns like `dist/` only fire when the entry is a directory
 * and the path is supplied with a trailing slash, so the filter tests both
 * forms rather than guessing what the user meant.
 */
const isIgnoredByGitignore = (name: string, isDirectory: boolean, ig: ReturnType<typeof ignoreLib>): boolean => {
  if (isDirectory) return ig.ignores(`${name}/`) || ig.ignores(name);
  return ig.ignores(name);
};

/**
 * Apply the ignore rules to an already-read list of entry names.
 *
 * `gitignore` is the raw contents of the `.gitignore` that applies to the
 * directory being scanned, or `undefined` when there is none. The match is
 * delegated to the `ignore` package, so `.gitignore` patterns (`*`, `dist/`,
 * negation, etc.) are honoured instead of being reduced to a substring check.
 *
 * Directory-only patterns still need to be matched against entry types, so
 * callers that know whether each entry is a file or directory should prefer
 * `listFilteredFiles`, which routes through `filterEntries` for the
 * type-aware check.
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
  if (options.ignore_files.length > 0) {
    filtered = filtered.filter((file) => !options.ignore_files.includes(file));
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
    filtered = filtered.filter((entry) => !isIgnoredByGitignore(entry.name, entry.isDirectory, ig));
  }
  if (options.ignore_gitFiles) {
    filtered = filtered.filter((entry) => !entry.name.startsWith('.git'));
  }
  if (options.ignore_files.length > 0) {
    filtered = filtered.filter((entry) => !options.ignore_files.includes(entry.name));
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
