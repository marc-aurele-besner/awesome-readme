import * as fs from 'fs';

import { listFilteredFiles } from './filterFiles';
import { renderTreeRows, type TreeEntry } from './tree';
import type { ExtraData } from './types';
import { writeReadmeFile, type ReadmeWriteMode } from './writeReadme';

const buildReadme = (
  file: string,
  currentPath: string,
  title: string,
  figlet: string,
  licenseBadge: string,
  description: string,
  repositoryUrl: string,
  prefix = '',
  extraData: ExtraData,
  // The directory tree is returned to the caller regardless of the mode, so
  // `--root-only` and `--dry-run` still render a complete root README.
  mode: ReadmeWriteMode = 'write'
): string | undefined => {
  if (currentPath) {
    // Shared with the root walk so `ignore_files`, `.git*` and `.gitignore`
    // rules are applied consistently at every depth.
    const files = listFilteredFiles(currentPath, extraData);
    const entries: TreeEntry[] = files.map((name) => {
      const filePath = currentPath + '/' + name;
      const stats = fs.statSync(filePath);
      return { name, isDirectory: stats.isDirectory() };
    });

    let directoryFileList = '';
    let currentFilesList = '';
    entries.forEach((entry) => {
      if (entry.isDirectory) directoryFileList += ` - [${entry.name}/](./${entry.name}/)\r`;
      else currentFilesList += ` - [${entry.name}](./${entry.name})\r`;
    });
    // Subdirectory children are rendered with `├───`/`└───` connectors and
    // indented one level under the parent (`prefix`), so the tree still
    // looks like a proper tree when it is read on its own in the sub-README.
    const treeLines = renderTreeRows(entries).map((line) => `${prefix}${line}`);
    const directoryTree = treeLines.join('\n');
    const directoryTreePrefix = `\`\`\`\n${file}/\n`;
    const directoryTreeSuffix = `\`\`\``;
    const buildReadme = `
${licenseBadge ? licenseBadge + '\n\n' : ''}${extraData.sub_license}
# ${title ? title : 'Awesome-Readme'}
${figlet}
${description ? description : ''}
${extraData.sub_header}
${directoryFileList ? '## Directories\n' + directoryFileList + '\n' : ''}
${currentFilesList ? currentFilesList : ''}
${extraData.sub_body}
${directoryTree ? '## Directory Tree\n[<- Previous](' + repositoryUrl + ')\n' + directoryTreePrefix + directoryTree + '\n' + directoryTreeSuffix : ''}
${extraData.sub_footer}
`;
    writeReadmeFile(currentPath, buildReadme, mode);
    return directoryTree;
  }
};

export default buildReadme;
