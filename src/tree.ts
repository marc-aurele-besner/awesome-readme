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

export default renderTreeRows;
