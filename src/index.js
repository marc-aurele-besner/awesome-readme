#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

const buildReadme = require("./buildReadme");

const buildMainReadme = (currentPath = path.resolve()) => {
    // verjft the repository value of package.json
    const packageJson = fs.readFileSync("package.json", "utf8");
    const packageJsonData = JSON.parse(packageJson);
    const repository = packageJsonData.repository;
    const repositoryName = packageJsonData.name;
    let figlet = `
\`\`\`
.d8b.  db   d8b   db d88888b .d8888.  .d88b.  .88b  d88. d88888b        d8888b. d88888b  .d8b.  d8888b. .88b  d88. d88888b 
d8' '8b 88   I8I   88 88'     88'  YP .8P  Y8. 88'YbdP'88 88'            88  '8D 88'     d8' '8b 88  '8D 88'YbdP'88 88'     
88ooo88 88   I8I   88 88ooooo '8bo.   88    88 88  88  88 88ooooo        88oobY' 88ooooo 88ooo88 88   88 88  88  88 88ooooo 
88~~~88 Y8   I8I   88 88~~~~~   'Y8b. 88    88 88  88  88 88~~~~~ C8888D 88'8b   88~~~~~ 88~~~88 88   88 88  88  88 88~~~~~ 
88   88 '8b d8'8b d8' 88.     db   8D '8b  d8' 88  88  88 88.            88 '88. 88.     88   88 88  .8D 88  88  88 88.     
YP   YP  '8b8' '8d8'  Y88888P '8888Y'  'Y88P'  YP  YP  YP Y88888P        88   YD Y88888P YP   YP Y8888D' YP  YP  YP Y88888P 
\`\`\``
    // verify if awesome-readme.config.js exists
    if (fs.existsSync("awesome-readme.config.js")) {
        // if exists, read the file
        const config = require(path.resolve("awesome-readme.config.js"));
        // if the config file has a figlet property, use it
        figlet = config.figlet ? config.figlet : figlet;
    }
    let repositoryUrl = '';
    if (typeof(repository) === 'string')
        repositoryUrl = repository;
    else if (typeof(repository) === 'object') {
        repositoryUrl = repository.url.substring(4);
        repositoryUrl = repositoryUrl.substring(0, repositoryUrl.length - 4);
    }
    // List of all the files in the current directory
    let files = fs.readdirSync(currentPath);

    // Detect if a .gitignore file exists
    const gitignoreExists = files.includes(".gitignore");
    if (gitignoreExists) {
        // List the files and patterns in the .gitignore file
        const gitignore = fs.readFileSync(".gitignore", "utf8");
        // filter out the files in the current directory that are in the .gitignore file
        files = files.filter(file => !gitignore.includes(file));
        // ignore any file that starts with a .git
        files = files.filter(file => !file.startsWith(".git"));
    }
    const directory = [];
    const currentFiles = [];

    let directoryFileList = '';
    let currentFilesList = '';
    let directoryTree = `\`\`\`\n` + repositoryName + '\n';
    let subDirectoryTree = [];

    // identify if the files are directories or files
    files.map(file => {
        const filePath = path.resolve(file);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
            directory.push(file);
            directoryFileList += ` - [${file}/](./${file}/)\r`
            const addToTree = buildReadme(filePath + '/', repositoryName + ' / ' + file, figlet, '[![license](https://img.shields.io/github/license/jamesisaac/react-native-background-task.svg)](https://opensource.org/licenses/MIT)', '', repositoryUrl, '   ');
            subDirectoryTree += addToTree;
            let subDirectoryFiles = fs.readdirSync(filePath + '/');
            if (subDirectoryFiles.length > 0)
                subDirectoryFiles.map(subDirectoryFile => {
                    const subDirectoryPath = path.resolve(filePath + '/' + subDirectoryFile);
                    const subDirectoryPathStats = fs.statSync(subDirectoryPath);
                    if (subDirectoryPathStats.isDirectory()) {
                        buildReadme(filePath + '/' + subDirectoryFile + '/', repositoryName + ' / ' + file + ' / ' + subDirectoryFile, figlet, '[![license](https://img.shields.io/github/license/jamesisaac/react-native-background-task.svg)](https://opensource.org/licenses/MIT)', '', repositoryUrl, '   ');
                        
                    }
                })
        } else {
            currentFiles.push(file);
            currentFilesList += ` - [${file}](./${file})\r`
        }
        return { file, type: stats.isDirectory() ? "directory" : "file"};
    });
    currentFiles.forEach(element => {
        directoryTree += `│   ${element}/\n`
    });
    directory.forEach(element => {
        directoryTree += `└─── ${element}/\n`
    });
    directoryTree += subDirectoryTree + `\`\`\``
    const buildReadmeData = `
[![license](https://img.shields.io/github/license/jamesisaac/react-native-background-task.svg)](https://opensource.org/licenses/MIT)

# Awesome-Readme
${figlet}
${directoryFileList ? "## Directories\n" + directoryFileList + "\n" : ""}
${currentFilesList ? currentFilesList : ""}
${directoryTree ? "## Directory Tree\n" + directoryTree : ""}
`
    fs.writeFileSync(currentPath + "/README.md", buildReadmeData);
}

module.exports = buildMainReadme()