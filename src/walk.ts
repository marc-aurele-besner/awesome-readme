import * as fs from 'fs';
import * as path from 'path';

import { listFilteredFiles } from './filterFiles';
import type { ExtraData } from './types';

/**
 * Safety limit applied when the config does not set `max_depth`.
 *
 * The walker recurses into every subdirectory, so a bound is needed to keep a
 * pathological tree (or a symlink loop the realpath guard cannot catch) from
 * running away. Ten levels is far deeper than the two levels the generator
 * used to cover and still finishes instantly on real projects.
 */
export const DEFAULT_MAX_DEPTH = 10;

/**
 * One directory of the walked project.
 *
 * Files and subdirectories are kept apart because every consumer needs them
 * separately: the README file list only wants files, the directory list and
 * the recursive README emission only want directories, and the tree renderer
 * draws the two groups as separate batches.
 */
export interface DirectoryNode {
  /** Directory name (the project root uses the name of its own folder). */
  name: string;
  /** Absolute path to the directory, without a trailing separator. */
  path: string;
  /** Distance from the walked root; the root itself is 0. */
  depth: number;
  /** Names of the non-directory entries left after the ignore rules ran. */
  files: string[];
  /** Subdirectories, already walked. */
  directories: DirectoryNode[];
  /**
   * True when the directory has children the walk refused to descend into,
   * either because `max_depth` was reached or because following it would have
   * revisited a directory already seen through a symlink.
   */
  truncated: boolean;
}

export interface WalkOptions {
  /** Overrides `extraData.max_depth` / `DEFAULT_MAX_DEPTH`. */
  maxDepth?: number;
}

/**
 * Recursively read a directory tree, applying the shared ignore rules at
 * every level.
 *
 * The root walk in `src/index.ts` and the subdirectory walk in
 * `src/buildReadme.ts` each used to read the filesystem on their own, which
 * capped the generator at two levels (root → child → grandchild) and made it
 * easy for the two paths to disagree about what "ignored" means. Everything
 * now goes through this walker, so ignore handling, ordering and depth
 * limiting live in exactly one place.
 *
 * Directories reached twice through symlinks are recorded once and not
 * descended into a second time, so a `link -> ..` cycle terminates instead of
 * spinning until `max_depth`.
 */
export const walkDirectory = (currentPath: string, extraData: ExtraData, options: WalkOptions = {}): DirectoryNode => {
  const configuredDepth = options.maxDepth ?? extraData.max_depth;
  const maxDepth = typeof configuredDepth === 'number' && configuredDepth >= 0 ? configuredDepth : DEFAULT_MAX_DEPTH;
  const rootPath = path.resolve(currentPath);
  // Real paths (symlinks resolved) of every directory already walked, so a
  // cycle is detected by identity rather than by exhausting `max_depth`.
  const visited = new Set<string>();

  const resolveRealPath = (target: string): string => {
    try {
      return fs.realpathSync(target);
    } catch {
      // A broken symlink cannot be walked anyway; fall back to the literal
      // path so the entry is still reported as a (childless) directory.
      return target;
    }
  };

  const walk = (directoryPath: string, name: string, depth: number): DirectoryNode => {
    const node: DirectoryNode = { name, path: directoryPath, depth, files: [], directories: [], truncated: false };
    visited.add(resolveRealPath(directoryPath));

    const entries = listFilteredFiles(directoryPath, extraData);
    const childDirectories: string[] = [];
    for (const entry of entries) {
      const entryPath = path.join(directoryPath, entry);
      let isDirectory = false;
      try {
        isDirectory = fs.statSync(entryPath).isDirectory();
      } catch {
        // Dangling symlinks and races (a file removed mid-walk) should not
        // abort the whole generation; treat the entry as a plain file.
        isDirectory = false;
      }
      if (isDirectory) childDirectories.push(entry);
      else node.files.push(entry);
    }

    if (childDirectories.length === 0) return node;
    if (depth >= maxDepth) {
      node.truncated = true;
      return node;
    }

    for (const childName of childDirectories) {
      const childPath = path.join(directoryPath, childName);
      if (visited.has(resolveRealPath(childPath))) {
        // Symlink pointing back into a directory already walked. Keep it in
        // the tree as an empty directory instead of recursing forever.
        node.directories.push({ name: childName, path: childPath, depth: depth + 1, files: [], directories: [], truncated: true });
        continue;
      }
      node.directories.push(walk(childPath, childName, depth + 1));
    }

    return node;
  };

  return walk(rootPath, path.basename(rootPath), 0);
};

/**
 * Every directory of a walked tree, root first, in depth-first order.
 *
 * Callers that need to act on each directory (emitting one README per
 * directory, counting truncations, …) iterate this instead of writing their
 * own recursion.
 */
export const flattenDirectories = (node: DirectoryNode): DirectoryNode[] => {
  const nodes: DirectoryNode[] = [node];
  for (const child of node.directories) nodes.push(...flattenDirectories(child));
  return nodes;
};

export default walkDirectory;
