import { renderTemplate, DEFAULT_SUB_TEMPLATE } from './template';
import { renderTreeLines, type TreeNode } from './tree';
import type { ExtraData } from './types';
import type { DirectoryNode } from './walk';
import { writeReadmeFile, type ReadmeWriteMode, type ReadmeWriteOptions } from './writeReadme';

/**
 * Everything a subdirectory README needs. The generator used to pass ten
 * positional arguments, which made the deep-nesting call sites unreadable;
 * an options object keeps them legible now that the walk is recursive.
 */
export interface SubReadmeOptions {
  /** The walked directory this README describes. */
  node: DirectoryNode;
  /** Heading of the README, e.g. `my-project / src / utils`. */
  title: string;
  figlet: string;
  licenseBadge: string;
  description?: string;
  /** Target of the `[<- Previous]` link, i.e. the parent README. */
  previousUrl: string;
  /** Indent prepended to every tree line so the block reads as a subtree. */
  prefix?: string;
  extraData: ExtraData;
  /**
   * The tree is rendered and returned whatever the mode is, so `--root-only`
   * and `--dry-run` still produce a complete root README. Accepts either a
   * bare mode or the full write options (`--force`, `--if-missing`).
   */
  writeOptions?: ReadmeWriteMode | ReadmeWriteOptions;
  /**
   * Template used to render this README. Resolved once in `src/index.ts`
   * (CLI flag → config → default) and threaded through the recursive walk so
   * every subdirectory shares the same layout.
   */
  template?: string;
}

/**
 * Turn a walked directory into the node list the tree renderer consumes.
 *
 * Exported so the root README in `src/index.ts` renders its tree from the
 * very same structure as every subdirectory README.
 */
export const toTreeNodes = (node: DirectoryNode): TreeNode[] => [
  ...node.files.map((name) => ({ name, isDirectory: false })),
  ...node.directories.map((child) => ({ name: child.name, isDirectory: true, children: toTreeNodes(child) }))
];

/**
 * Write the README of one subdirectory and return its rendered tree.
 *
 * The directory contents come from the shared walker rather than a local
 * `readdir`, so the ignore rules, the ordering and the nesting are identical
 * to the root README's and hold at any depth.
 */
const buildReadme = (options: SubReadmeOptions): string => {
  const {
    node,
    title,
    figlet,
    licenseBadge,
    description = '',
    previousUrl,
    prefix = '',
    extraData,
    writeOptions = 'write',
    template = DEFAULT_SUB_TEMPLATE
  } = options;

  let directoryFileList = '';
  let currentFilesList = '';
  node.directories.forEach((child) => {
    directoryFileList += ` - [${child.name}/](./${child.name}/)\r`;
  });
  node.files.forEach((file) => {
    currentFilesList += ` - [${file}](./${file})\r`;
  });

  // The whole subtree is rendered, not just the immediate children, so a
  // subdirectory README shows everything below it. `prefix` shifts the block
  // one level in so it still reads as a tree hanging off the directory name.
  const treeLines = renderTreeLines(toTreeNodes(node)).map((line) => `${prefix}${line}`);
  const directoryTree = `\`\`\`\n${node.name}/\n${treeLines.join('\n')}\n\`\`\``;
  const variables = {
    name: title || 'Awesome-Readme',
    licenseBadge,
    license: extraData.sub_license,
    figlet,
    header: extraData.sub_header,
    directories: directoryFileList,
    files: currentFilesList,
    body: extraData.sub_body,
    tree: directoryTree,
    footer: extraData.sub_footer,
    previousUrl,
    description
  };
  const readmeContents = renderTemplate(template, variables);
  writeReadmeFile(node.path, readmeContents, writeOptions);
  return directoryTree;
};

export default buildReadme;
