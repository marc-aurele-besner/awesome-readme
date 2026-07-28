
[![license](https://img.shields.io/github/license/marc-aurele-besner/awesome-readme.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/awesome-readme.svg)](https://badge.fury.io/js/awesome-readme)

# awesome-readme

```

 .d8b.  db   d8b   db d88888b .d8888.  .d88b.  .88b  d88. d88888b        d8888b. d88888b  .d8b.  d8888b. .88b  d88. d88888b
d8' '8b 88   I8I   88 88'     88'  YP .8P  Y8. 88'YbdP'88 88'            88  '8D 88'     d8' '8b 88  '8D 88'YbdP'88 88'
88ooo88 88   I8I   88 88ooooo '8bo.   88    88 88  88  88 88ooooo        88oobY' 88ooooo 88ooo88 88   88 88  88  88 88ooooo
88~~~88 Y8   I8I   88 88~~~~~   'Y8b. 88    88 88  88  88 88~~~~~ C8888D 88'8b   88~~~~~ 88~~~88 88   88 88  88  88 88~~~~~
88   88 '8b d8'8b d8' 88.     db   8D '8b  d8' 88  88  88 88.            88 '88. 88.     88   88 88  .8D 88  88  88 88.
YP   YP  '8b8' '8d8'  Y88888P '8888Y'  'Y88P'  YP  YP  YP Y88888P        88   YD Y88888P YP   YP Y8888D' YP  YP  YP Y88888P 
```


## Install Awesome-Readme

```
npm i awesome-readme
```

Or

```
npm i awesome-readme -g
```

## Use Awesome-Readme

```
npx awesome-readme
```

## CLI options

```
Usage: awesome-readme [options]

Options:
  -h, --help            Show this help message and exit
      --dry-run         Print what would be written without writing any file
  -p, --path <dir>      Project root to generate READMEs for (default: current directory)
  -c, --config <file>   Path to the config file (default: <path>/awesome-readme.config.js)
      --root-only       Only write the root README, skip subdirectory READMEs
```

Preview the output before touching your files:

```
npx awesome-readme --dry-run
```

Generate for another project, with a config living elsewhere:

```
npx awesome-readme --path ./packages/core --config ./readme.config.js
```

## Directories
 - [.vscode/](./.vscode/) - [src/](./src/) - [test/](./test/)

 - [.npmignore](./.npmignore)
 - [.prettierrc](./.prettierrc)
 - [CONTRIBUTING.md](./CONTRIBUTING.md)
 - [LICENSE](./LICENSE)
 - [README.md](./README.md)
 - [awesome-readme.config.js](./awesome-readme.config.js)
 - [eslint.config.js](./eslint.config.js)
 - [package-lock.json](./package-lock.json)
 - [package.json](./package.json)
 - [tsconfig.json](./tsconfig.json)



## Configuration with awesome-readme.config.js

```
module.exports = {
    // Set figlet_text to a plain string and the tool will render it with the
    // figlet package at build time (no need to hand-author ASCII art). Use
    // figlet_font to pick a different font (defaults to "Standard"). Leave the
    // pre-rendered figlet below in place if you want to use that instead.
    // figlet_text: 'awesome-readme',
    // figlet_font: 'Standard',
    figlet: `
    .d8b.  db   d8b   db d88888b .d8888.  .d88b.  .88b  d88. d88888b        d8888b. d88888b  .d8b.  d8888b. .88b  d88. d88888b
    d8' '8b 88   I8I   88 88'     88'  YP .8P  Y8. 88'YbdP'88 88'            88  '8D 88'     d8' '8b 88  '8D 88'YbdP'88 88'
    88ooo88 88   I8I   88 88ooooo '8bo.   88    88 88  88  88 88ooooo        88oobY' 88ooooo 88ooo88 88   88 88  88  88 88ooooo
    88~~~88 Y8   I8I   88 88~~~~~   'Y8b. 88    88 88  88  88 88~~~~~ C8888D 88'8b   88~~~~~ 88~~~88 88   88 88  88  88 88~~~~~
    88   88 '8b d8'8b d8' 88.     db   8D '8b  d8' 88  88  88 88.            88 '88. 88.     88   88 88  .8D 88  88  88 88.
    YP   YP  '8b8' '8d8'  Y88888P '8888Y'  'Y88P'  YP  YP  YP Y88888P        88   YD Y88888P YP   YP Y8888D' YP  YP  YP Y88888P`,
    root_license: `[![npm version](https://badge.fury.io/js/awesome-readme.svg)](https://badge.fury.io/js/awesome-readme)`,
    root_header: `
    ## Install Awesome-Readme
    ```
    npm i awesome-readme
    ```
    ## Use Awesome-Readme
    ```
    npx awesome-readme
    ````,
    root_body: `## Configuration with awesome-readme.config.js`,
    root_footer: `## Don't hesitate to contribute to this project.`,
    sub_license: `[![license](https://img.shields.io/badge/license-MIT-green.svg)](https://opensource.org/licenses/MIT)`,
    sub_header: `## About this directory`,
    sub_body: `This directory is part of the awesome-readme project.`,
    sub_footer: `## Don't hesitate to contribute to this project.`,
    ignore_gitFiles: true,
    ignore_gitIgnoreFiles: true,
    ignore_files: ['.prettierignore']
}
```

## Directory Tree
```
awesome-readme/
│   .npmignore
│   .prettierrc
│   CONTRIBUTING.md
│   LICENSE
│   README.md
│   awesome-readme.config.js
│   eslint.config.js
│   package-lock.json
│   package.json
│   tsconfig.json
├─── .vscode/
│   │   README.md
│   │   extensions.json
│   │   settings.json
├─── src/
│   │   README.md
│   │   buildReadme.ts
│   │   cli.ts
│   │   filterFiles.ts
│   │   index.ts
│   │   types.ts
│   │   writeReadme.ts
└─── test/
    │   README.md
    │   cli.test.js
    │   filterFiles.test.js
```
## Don't hesitate to contribute to this project.
