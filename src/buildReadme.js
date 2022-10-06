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
\`\`\`
${figlet ? figlet : `
.d8b.  db   d8b   db d88888b .d8888.  .d88b.  .88b  d88. d88888b        d8888b. d88888b  .d8b.  d8888b. .88b  d88. d88888b 
d8' '8b 88   I8I   88 88'     88'  YP .8P  Y8. 88'YbdP'88 88'            88  '8D 88'     d8' '8b 88  '8D 88'YbdP'88 88'     
88ooo88 88   I8I   88 88ooooo '8bo.   88    88 88  88  88 88ooooo        88oobY' 88ooooo 88ooo88 88   88 88  88  88 88ooooo 
88~~~88 Y8   I8I   88 88~~~~~   'Y8b. 88    88 88  88  88 88~~~~~ C8888D 88'8b   88~~~~~ 88~~~88 88   88 88  88  88 88~~~~~ 
88   88 '8b d8'8b d8' 88.     db   8D '8b  d8' 88  88  88 88.            88 '88. 88.     88   88 88  .8D 88  88  88 88.     
YP   YP  '8b8' '8d8'  Y88888P '8888Y'  'Y88P'  YP  YP  YP Y88888P        88   YD Y88888P YP   YP Y8888D' YP  YP  YP Y88888P`}
\`\`\`
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