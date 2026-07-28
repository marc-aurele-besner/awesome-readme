import * as fs from 'fs';
import type { ExtraData } from './types';

const buildReadme = (
  file: string,
  currentPath: string,
  title: string,
  figlet: string,
  licenseBadge: string,
  description: string,
  repositoryUrl: string,
  prefix = '',
  extraData: ExtraData
): string | undefined => {
  if (currentPath) {
    let files = fs.readdirSync(currentPath);

    // Detect if a .gitignore file exists
    if (files.includes('.gitignore') && extraData.ignore_gitIgnoreFiles) {
      // List the files and patterns in the .gitignore file
      const gitignore = fs.readFileSync('.gitignore', 'utf8');
      // filter out the files in the current directory that are in the .gitignore file
      files = files.filter((file) => !gitignore.includes(file));
    }
    if (extraData.ignore_gitFiles) {
      // ignore any file that starts with a .git
      files = files.filter((file) => !file.startsWith('.git'));
    }
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
    fs.writeFileSync(currentPath + '/README.md', buildReadme);
    console.log('\x1b[32m%s\x1b[0m', 'README.md created in ' + currentPath, '\x1b[0m');
    return directoryTree;
  }
};

export default buildReadme;
