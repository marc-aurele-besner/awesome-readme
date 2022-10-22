#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const buildReadme = require('./buildReadme');

const buildMainReadme = (currentPath = path.resolve()) => {
  // verjft the repository value of package.json
  const packageJson = fs.readFileSync('package.json', 'utf8');
  const packageJsonData = JSON.parse(packageJson);
  const repository = packageJsonData.repository;
  const repositoryName = packageJsonData.name;
  const repositoryLicensee = packageJsonData.license;
  let extraData = {
    root_license: '',
    root_header: '',
    root_body: '',
    root_footer: '',
    ignore_gitFiles: true,
    ignore_gitIgnoreFiles: true,
    ignore_files: []
  };
  let figlet = `
\`\`\`
.d8b.  db   d8b   db d88888b .d8888.  .d88b.  .88b  d88. d88888b        d8888b. d88888b  .d8b.  d8888b. .88b  d88. d88888b 
d8' '8b 88   I8I   88 88'     88'  YP .8P  Y8. 88'YbdP'88 88'            88  '8D 88'     d8' '8b 88  '8D 88'YbdP'88 88'     
88ooo88 88   I8I   88 88ooooo '8bo.   88    88 88  88  88 88ooooo        88oobY' 88ooooo 88ooo88 88   88 88  88  88 88ooooo 
88~~~88 Y8   I8I   88 88~~~~~   'Y8b. 88    88 88  88  88 88~~~~~ C8888D 88'8b   88~~~~~ 88~~~88 88   88 88  88  88 88~~~~~ 
88   88 '8b d8'8b d8' 88.     db   8D '8b  d8' 88  88  88 88.            88 '88. 88.     88   88 88  .8D 88  88  88 88.     
YP   YP  '8b8' '8d8'  Y88888P '8888Y'  'Y88P'  YP  YP  YP Y88888P        88   YD Y88888P YP   YP Y8888D' YP  YP  YP Y88888P 
\`\`\``;

  console.log('\x1b[32m', figlet, '\x1b[0m');
  // verify if awesome-readme.config.js exists
  if (fs.existsSync('awesome-readme.config.js')) {
    // if exists, read the file
    const config = require(path.resolve('awesome-readme.config.js'));
    if (config.figlet) {
      figlet = `
\`\`\`
${config.figlet}
\`\`\``;
      console.log('\x1b[33m', 'Using your figlet', '\x1b[34m', config.figlet);
    }
    if (config.root_license) extraData.root_license = config.root_license;
    if (config.root_header) extraData.root_header = config.root_header;
    if (config.root_body) extraData.root_body = config.root_body;
    if (config.root_footer) extraData.root_footer = config.root_footer;
    if (config.ignore_gitFiles !== undefined) extraData.ignore_gitFiles = config.ignore_gitFiles;
    if (config.ignore_gitIgnoreFiles !== undefined) extraData.ignore_gitIgnoreFiles = config.ignore_gitIgnoreFiles;
    if (config.ignore_files !== undefined && config.ignore_files.length > 0) extraData.ignore_files = config.ignore_files;
  }
  let repositoryUrl = '';
  if (typeof repository === 'string')
    if (repository.startsWith('git+')) repositoryUrl = repository.replace('git+', '').replace('.git', '');
    else repositoryUrl = repository;
  else if (typeof repository === 'object') {
    repositoryUrl = repository.url.substring(4);
    repositoryUrl = repositoryUrl.substring(0, repositoryUrl.length - 4);
  }
  // List of all the files in the current directory
  let files = fs.readdirSync(currentPath);

  // Detect if a .gitignore file exists
  const gitignoreExists = files.includes('.gitignore');
  if (gitignoreExists && extraData.ignore_gitIgnoreFiles) {
    console.log('\x1b[33m', 'Using .gitignore to ignore files', '\x1b[0m');
    // List the files and patterns in the .gitignore file
    const gitignore = fs.readFileSync('.gitignore', 'utf8');
    // filter out the files in the current directory that are in the .gitignore file
    files = files.filter((file) => !gitignore.includes(file));
  }
  if (extraData.ignore_gitFiles) {
    console.log('\x1b[33m', 'Ignoring .git files', '\x1b[0m');
    // ignore any file that starts with a .git
    files = files.filter((file) => !file.startsWith('.git'));
  }
  if (gitignoreExists && extraData.ignore_gitIgnoreFiles) {
    console.log('\x1b[33m', 'Ignoring files: ', '\x1b[0m', extraData.ignore_files.toString());
    // filter out the files in the current directory that are in the ignore_files array
    files = files.filter((file) => !extraData.ignore_files.includes(file));
  }
  const directory = [];
  const currentFiles = [];

  let directoryFileList = '';
  let currentFilesList = '';
  let directoryTree = `\`\`\`\n` + repositoryName + '/\n';
  let subDirectoryTree = [];

  // identify if the files are directories or files
  files.map((file) => {
    const filePath = path.resolve(file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      directory.push(file);
      directoryFileList += ` - [${file}/](./${file}/)\r`;
      const addToTree = buildReadme(
        file,
        filePath + '/',
        repositoryName + ' / ' + file,
        figlet,
        `[![license](https://img.shields.io/github/license/jamesisaac/react-native-background-task.svg)](https://opensource.org/licenses/${repositoryLicensee})`,
        '',
        repositoryUrl,
        '   ',
        extraData
      );
      subDirectoryTree += addToTree;
      let subDirectoryFiles = fs.readdirSync(filePath + '/');
      if (subDirectoryFiles.length > 0)
        subDirectoryFiles.map((subDirectoryFile) => {
          const subDirectoryPath = path.resolve(filePath + '/' + subDirectoryFile);
          const subDirectoryPathStats = fs.statSync(subDirectoryPath);
          if (subDirectoryPathStats.isDirectory()) {
            buildReadme(
              subDirectoryFile,
              filePath + '/' + subDirectoryFile + '/',
              repositoryName + ' / ' + file + ' / ' + subDirectoryFile,
              figlet,
              `[![license](https://img.shields.io/github/license/jamesisaac/react-native-background-task.svg)](https://opensource.org/licenses/${repositoryLicensee})`,
              '',
              repositoryUrl,
              '   ',
              extraData
            );
          }
        });
    } else {
      currentFiles.push(file);
      currentFilesList += ` - [${file}](./${file})\n`;
    }
    return { file, type: stats.isDirectory() ? 'directory' : 'file' };
  });
  currentFiles.forEach((element) => {
    directoryTree += `│   ${element}\n`;
  });
  directory.forEach((element) => {
    directoryTree += `└─── ${element}/\n`;
  });
  directoryTree += subDirectoryTree + `\`\`\``;
  const buildReadmeData = `
[![license](https://img.shields.io/github/license/jamesisaac/react-native-background-task.svg)](https://opensource.org/licenses/${repositoryLicensee})
${extraData.root_license}

# ${repositoryName}
${figlet}
${extraData.root_header}
${directoryFileList ? '## Directories\n' + directoryFileList + '\n' : ''}
${currentFilesList ? currentFilesList : ''}
${extraData.root_body}
${directoryTree ? '## Directory Tree\n' + directoryTree : ''}
${extraData.root_footer}
`;
  fs.writeFileSync(currentPath + '/README.md', buildReadmeData);
  console.log('\x1b[32m%s\x1b[0m', 'README.md created in ' + currentPath, '\x1b[0m');
};

module.exports = buildMainReadme();
