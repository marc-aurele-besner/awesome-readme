import * as fs from 'fs';
import * as path from 'path';

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
 * Apply the ignore rules to an already-read list of entry names.
 *
 * `gitignore` is the raw contents of the `.gitignore` that applies to the
 * directory being scanned, or `undefined` when there is none. The matching is
 * still a substring check against the raw contents, which is the pre-existing
 * behaviour; proper gitignore pattern matching is tracked separately in #76.
 */
export const filterFiles = (files: string[], options: FilterOptions, gitignore?: string): string[] => {
  let filtered = files;

  if (gitignore !== undefined && options.ignore_gitIgnoreFiles) {
    filtered = filtered.filter((file) => !gitignore.includes(file));
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
 * Read a directory and return its entries with the ignore rules applied.
 *
 * The `.gitignore` used is the one living in the directory being scanned, so
 * subdirectory walks no longer read the project root's file by mistake.
 */
export const listFilteredFiles = (currentPath: string, extraData: ExtraData): string[] => {
  const files = fs.readdirSync(currentPath);
  const gitignorePath = path.join(currentPath, '.gitignore');
  const gitignore = files.includes('.gitignore') && fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : undefined;

  return filterFiles(files, extraData, gitignore);
};

export default listFilteredFiles;
