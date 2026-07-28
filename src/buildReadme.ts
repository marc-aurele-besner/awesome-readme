import * as fs from 'fs';

import { listFilteredFiles } from './filterFiles';
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
    const directory: string[] = [];
    const currentFiles: string[] = [];

    let directoryFileList = '';
    let currentFilesList = '';
    let directoryTree = '';

    // identify if the files are directories or files
    files.map((file) => {
      const filePath = currentPath + '/' + file;
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        directory.push(file);
        directoryFileList += ` - [${file}/](./${file}/)\r`;
      } else {
        currentFiles.push(file);
        currentFilesList += ` - [${file}](./${file})\r`;
      }
    });
    currentFiles.forEach((element) => {
      directoryTree += '   ' + `│   ${element}\n`;
    });
    directory.forEach((element) => {
      directoryTree += '   ' + `└─── ${element}/\n`;
    });
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
${directoryTree ? '## Directory Tree\n[<- Previous](' + repositoryUrl + ')\n' + directoryTreePrefix + directoryTree + directoryTreeSuffix : ''}
${extraData.sub_footer}
`;
    writeReadmeFile(currentPath, buildReadme, mode);
    return directoryTree;
  }
};

export default buildReadme;
