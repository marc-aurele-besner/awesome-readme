# awesome-readme

[![npm version](https://badge.fury.io/js/awesome-readme.svg)](https://www.npmjs.com/package/awesome-readme)
[![license](https://img.shields.io/github/license/marc-aurele-besner/awesome-readme.svg)](https://opensource.org/licenses/MIT)

Generate consistent `README.md` files for a project and its subdirectories from one configuration. `awesome-readme` walks the directory tree, filters ignored files, renders directory links and trees, and preserves hand-written documentation between runs.

## Why awesome-readme?

- Keep root and subdirectory READMEs in sync from one command.
- Preserve custom prose while refreshing only marked generated sections.
- Respect `.gitignore`, `.npmignore`, custom gitignore-style patterns, and sensible default ignores.
- Customize content globally or for exact project-relative directories.
- Preview every operation with `--dry-run` before writing files.

## Install

Run without installing:

```sh
npx awesome-readme
```

Or add it to your project:

```sh
npm install --save-dev awesome-readme
npx awesome-readme
```

A global installation is also supported:

```sh
npm install --global awesome-readme
awesome-readme
```

Node.js 20 or newer is required.

## Usage

Generate READMEs from the current directory:

```sh
npx awesome-readme
```

Preview changes without writing files:

```sh
npx awesome-readme --dry-run
```

Generate only the root README for another project, using a custom config file:

```sh
npx awesome-readme --path ./packages/core --config ./readme.config.js --root-only
```

Create only missing READMEs:

```sh
npx awesome-readme --if-missing
```

### CLI options

| Option | Description |
| --- | --- |
| `-h`, `--help` | Show the help message and exit. |
| `--dry-run` | Print what would be written without changing files. |
| `-p`, `--path <dir>` | Set the project root. Defaults to the current directory. |
| `-c`, `--config <file>` | Set the config path. Defaults to `<path>/awesome-readme.config.js`. |
| `--root-only` | Write only the root README and skip subdirectory READMEs. |
| `--force` | Replace existing READMEs entirely, including hand-written content. |
| `--if-missing` | Create READMEs only in directories that do not already have one. |

`--force` and `--if-missing` cannot be combined.

## Preserve hand-written content

Generated content is delimited by these markers:

```markdown
<!-- awesome-readme:start\ -->
<!-- awesome-readme:end\ -->
```

On later runs, `awesome-readme` replaces only the content between the markers. Everything before and after them remains unchanged, so a README can combine generated sections with hand-written guides, examples, or badges.

An existing README without both markers is left untouched. Add the markers to opt into partial regeneration, pass `--force` to replace the entire file, or pass `--if-missing` to skip every existing README.

## Configuration

Create `awesome-readme.config.js` at the project root. Every field is optional:

```js
module.exports = {
  // Banner: a pre-rendered string wins over figlet_text and figlet_auto.
  figlet: '',
  figlet_text: 'My project',
  figlet_font: 'Standard',
  figlet_auto: true,

  // Content inserted into the generated root README region.
  root_license: '',
  root_header: '',
  root_body: '',
  root_footer: '',

  // Content inserted into every generated subdirectory README.
  sub_license: '',
  sub_header: '## About this directory',
  sub_body: '',
  sub_footer: '',

  // File filtering and traversal.
  ignore_gitFiles: true,
  ignore_gitIgnoreFiles: true,
  ignore_files: ['*.log', 'tmp/'],
  ignore_defaults: true,
  max_depth: 10,

  // Exact, project-relative overrides for selected directories.
  directories: {
    src: { sub_header: '## Source code' },
    'src/internal': {
      sub_header: '## Internal helpers',
      sub_body: 'Private implementation details.'
    }
  }
};
```

### Options

| Option | Description |
| --- | --- |
| `figlet` | Pre-rendered banner text. When set, it takes precedence over other banner options. |
| `figlet_text` | Text rendered as a banner by `figlet`. |
| `figlet_font` | Font used with `figlet_text`; defaults to `Standard`. |
| `figlet_auto` | Automatically render the package name when no explicit banner is configured; defaults to `true`. |
| `root_license`, `root_header`, `root_body`, `root_footer` | Content placed around the generated sections of the root README. |
| `sub_license`, `sub_header`, `sub_body`, `sub_footer` | Default content for generated subdirectory READMEs. |
| `ignore_gitFiles` | Apply patterns from `.gitignore`; defaults to `true`. |
| `ignore_gitIgnoreFiles` | Apply patterns from `.npmignore`; defaults to `true`. |
| `ignore_files` | Additional gitignore-style patterns, including globs, directory rules, and negations. |
| `ignore_defaults` | Ignore `node_modules/`, `dist/`, `coverage/`, and `build/`; defaults to `true`. |
| `max_depth` | Maximum directory depth to traverse; defaults to `10`. |
| `directories` | Exact per-directory patches for the eight `root_*` and `sub_*` content fields. |

Directory override keys must be project-root-relative POSIX paths such as `src` or `packages/api`. Matching is exact and does not cascade: an override for `src` does not apply to `src/internal`. The root README cannot be overridden, and walker or ignore settings remain global. Set a content field to an empty string to clear it for one directory.

## Examples

- [`examples/minimal`](./examples/minimal/) — the smallest runnable setup.
- [`examples/nested`](./examples/nested/) — nested directory generation.
- [`examples/with-config`](./examples/with-config/) — custom global content and filtering.
- [`examples/with-overrides`](./examples/with-overrides/) — exact per-directory content overrides.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the development workflow and required checks.

## License

[MIT](./LICENSE)

## Generated project overview

The following block is maintained by `awesome-readme` itself.

<!-- awesome-readme:start -->

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

## Directories
 - [.claude/](./.claude/) - [.vscode/](./.vscode/) - [examples/](./examples/) - [src/](./src/) - [test/](./test/)

 - [.npmignore](./.npmignore)
 - [.prettierrc](./.prettierrc)
 - [CHANGELOG.md](./CHANGELOG.md)
 - [CONTRIBUTING.md](./CONTRIBUTING.md)
 - [LICENSE](./LICENSE)
 - [README.md](./README.md)
 - [RELEASING.md](./RELEASING.md)
 - [awesome-readme.config.js](./awesome-readme.config.js)
 - [eslint.config.js](./eslint.config.js)
 - [package-lock.json](./package-lock.json)
 - [package.json](./package.json)
 - [tsconfig.json](./tsconfig.json)


## Directory Tree
```
awesome-readme/
├─── .npmignore
├─── .prettierrc
├─── CHANGELOG.md
├─── CONTRIBUTING.md
├─── LICENSE
├─── README.md
├─── RELEASING.md
├─── awesome-readme.config.js
├─── eslint.config.js
├─── package-lock.json
├─── package.json
└─── tsconfig.json
├─── .claude/
│   └─── worktrees/
├─── .vscode/
│   ├─── README.md
│   ├─── extensions.json
│   └─── settings.json
├─── examples/
│   └─── README.md
│   ├─── minimal/
│   │   ├─── README.md
│   │   └─── package.json
│   │   └─── src/
│   │       ├─── README.md
│   │       └─── index.js
│   ├─── nested/
│   │   ├─── README.md
│   │   └─── package.json
│   │   ├─── src/
│   │   │   ├─── README.md
│   │   │   └─── index.js
│   │   │   └─── lib/
│   │   │       ├─── README.md
│   │   │       ├─── format.js
│   │   │       └─── math.js
│   │   └─── test/
│   │       ├─── README.md
│   │       └─── smoke.test.js
│   ├─── with-config/
│   │   ├─── README.md
│   │   ├─── awesome-readme.config.js
│   │   └─── package.json
│   │   └─── src/
│   │       ├─── README.md
│   │       └─── index.js
│   └─── with-overrides/
│       ├─── README.md
│       ├─── awesome-readme.config.js
│       └─── package.json
│       ├─── .vscode/
│       │   ├─── README.md
│       │   └─── settings.json
│       └─── src/
│           ├─── README.md
│           └─── index.js
│           └─── hooks/
│               ├─── README.md
│               └─── pre-commit.js
├─── src/
│   ├─── README.md
│   ├─── buildReadme.ts
│   ├─── cli.ts
│   ├─── directoryOverrides.ts
│   ├─── filterFiles.ts
│   ├─── index.ts
│   ├─── tree.ts
│   ├─── types.ts
│   ├─── walk.ts
│   └─── writeReadme.ts
└─── test/
    ├─── README.md
    ├─── cli.test.js
    ├─── directoryOverrides.test.js
    ├─── filterFiles.test.js
    ├─── preserveReadme.test.js
    ├─── tree.test.js
    └─── walk.test.js
```


<!-- awesome-readme:end -->
