const fs = require("fs")

const buildReadme = (
    currentPath,
    title,
    figlet,
    licenseBadge,
    description,
    repositoryUrl,
    prefix = ''
) => {
    if (currentPath) {
        let files = fs.readdirSync(currentPath);

        // Detect if a .gitignore file exists
        if (files.includes(".gitignore")) {
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
        let directoryTree = '';

        // identify if the files are directories or files
        files.map(file => {
            const filePath = currentPath + '/' + file;
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
                directory.push(file);
                directoryFileList += ` - [${file}/](./${file}/)\r`
            } else {
                currentFiles.push(file);
                currentFilesList += ` - [${file}](./${file})\r`
            }
        });
        currentFiles.forEach(element => {
            directoryTree += '   ' +  `│   ${element}/\n`
        });
        directory.forEach(element => {
            directoryTree += '   ' + `└─── ${element}/\n`
        });

        const buildReadme = `
${licenseBadge ? licenseBadge + "\n\n" : ''}
# ${title ? title : 'Awesome-Readme'}
${figlet}
${description ? description : ''}
${directoryFileList ? "## Directories\n" + directoryFileList + "\n" : ""}
${currentFilesList ? currentFilesList : ""}
${directoryTree ? "## Directory Tree\n[<- Previous](" + repositoryUrl + ")\n" + title + '\n' + directoryTree : ""}
`
        fs.writeFileSync(currentPath + "/README.md", buildReadme);
        return directoryTree
    }
}

module.exports = buildReadme