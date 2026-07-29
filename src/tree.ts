/**
 * Render a directory tree as a list of plain-text lines.
 *
 * The root README in `src/index.ts` and the per-subdirectory READMEs in
 * `src/buildReadme.ts` used to maintain their own tree strings, which let
 * the two paths drift apart (the subdirectory path hard-coded every
 * directory connector to `└───` and walked children with a slightly
 * different ordering). This helper is the single source of truth for both
 * callers so the connectors, last-child logic and child indent stay in
 * lock-step.
 *
 * Each call renders one level of siblings. Files and directories are
 * treated as siblings (both draw `├───`/`└───` connectors), which removes
 * the visual `│   │   file` collision that the previous `│   ` continuation
 * column produced when the subtree was nested under a non-last parent.
 */

/**
 * One entry to render in a tree.
 *
 * The caller is responsible for stat-ing each entry so `isDirectory`
 * reflects the actual filesystem entry. The tree renderer does not touch
 * the filesystem so it stays cheap and easy to test.
 */
export interface TreeEntry {
  name: string;
  isDirectory: boolean;
}

/**
 * Render a list of sibling entries into tree lines.
 *
 * Each line is prefixed with `├───` (or `└───` for the last child) and
 * directories are suffixed with `/`. The function does not draw the parent
 * line or any leading continuation indent — the caller prepends those.
 *
 * Returning an array (instead of a joined string) keeps the call sites
 * honest about where each line boundary lives, so the parent can prepend
 * its own per-line child indent when nesting.
 */
export const renderTreeRows = (entries: TreeEntry[]): string[] => {
  const lines: string[] = [];
  entries.forEach((entry, index) => {
    const isLast = index === entries.length - 1;
    const connector = isLast ? '└───' : '├───';
    const suffix = entry.isDirectory ? '/' : '';
    lines.push(`${connector} ${entry.name}${suffix}`);
  });
  return lines;
};

/**
 * An entry that may carry its own children, so a whole tree can be rendered
 * in one call instead of the caller stitching level-by-level output together.
 */
export interface TreeNode extends TreeEntry {
  children?: TreeNode[];
}

/**
 * Render a tree of arbitrary depth.
 *
 * Files are emitted first, then directories, each group closing on its own
 * `└───` — that is the layout the root README has always produced, and it is
 * now applied at every level so a subdirectory tree looks the same whether it
 * is read in the root README or in its own README.
 *
 * A directory's children are indented by the continuation column of their
 * parent: `│   ` while more directories follow at that level, `    ` once the
 * parent is the last one, so the vertical bars stop where the branch ends.
 * The nesting used to be done by hand in `src/index.ts` for exactly one level,
 * which is why deeper directories never made it into the tree.
 */
export const renderTreeLines = (nodes: TreeNode[]): string[] => {
  const files = nodes.filter((node) => !node.isDirectory);
  const directories = nodes.filter((node) => node.isDirectory);
  const lines: string[] = [...renderTreeRows(files)];
  const directoryRows = renderTreeRows(directories);

  directories.forEach((directory, index) => {
    const isLast = index === directories.length - 1;
    const childIndent = isLast ? '    ' : '│   ';
    lines.push(directoryRows[index]);
    renderTreeLines(directory.children ?? []).forEach((line) => lines.push(`${childIndent}${line}`));
  });

  return lines;
};

export default renderTreeRows;
