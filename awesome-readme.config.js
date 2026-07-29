module.exports = {
  // `figlet_text` is rendered with the figlet package at build time so the
  // ASCII art does not have to be hand-authored. `figlet_font` (optional)
  // selects the font (defaults to "Standard"). Pre-rendered `figlet` strings
  // still win, so existing configs keep working.
  // figlet_text: 'awesome-readme',
  // figlet_font: 'Standard',
  // `figlet_auto` (defaults to true) makes the renderer auto-generate a
  // banner from `package.json` `name` whenever `figlet` and `figlet_text`
  // are both unset. Set to false to keep the banner empty.
  // figlet_auto: true,
  figlet: `
 .d8b.  db   d8b   db d88888b .d8888.  .d88b.  .88b  d88. d88888b        d8888b. d88888b  .d8b.  d8888b. .88b  d88. d88888b
d8' '8b 88   I8I   88 88'     88'  YP .8P  Y8. 88'YbdP'88 88'            88  '8D 88'     d8' '8b 88  '8D 88'YbdP'88 88'
88ooo88 88   I8I   88 88ooooo '8bo.   88    88 88  88  88 88ooooo        88oobY' 88ooooo 88ooo88 88   88 88  88  88 88ooooo
88~~~88 Y8   I8I   88 88~~~~~   'Y8b. 88    88 88  88  88 88~~~~~ C8888D 88'8b   88~~~~~ 88~~~88 88   88 88  88  88 88~~~~~
88   88 '8b d8'8b d8' 88.     db   8D '8b  d8' 88  88  88 88.            88 '88. 88.     88   88 88  .8D 88  88  88 88.
YP   YP  '8b8' '8d8'  Y88888P '8888Y'  'Y88P'  YP  YP  YP Y88888P        88   YD Y88888P YP   YP Y8888D' YP  YP  YP Y88888P `,
  root_license: `[![npm version](https://badge.fury.io/js/awesome-readme.svg)](https://badge.fury.io/js/awesome-readme)`,
  root_header: `

## Install Awesome-Readme

\`\`\`
npm i awesome-readme
\`\`\`

Or

\`\`\`
npm i awesome-readme -g
\`\`\`

## Use Awesome-Readme

\`\`\`
npx awesome-readme
\`\`\`

## CLI options

\`\`\`
Usage: awesome-readme [options]

Options:
  -h, --help            Show this help message and exit
      --dry-run         Print what would be written without writing any file
  -p, --path <dir>      Project root to generate READMEs for (default: current directory)
  -c, --config <file>   Path to the config file (default: <path>/awesome-readme.config.js)
      --root-only       Only write the root README, skip subdirectory READMEs
      --force           Overwrite existing READMEs entirely, discarding their content
      --if-missing      Only create READMEs for directories that do not have one
\`\`\`

Existing READMEs are never clobbered: generated content lives between
\`<!-- awesome-readme:start -->\` and \`<!-- awesome-readme:end -->\` markers
and only that region is regenerated on the next run. A README without markers
is left untouched unless \`--force\` is passed. To regenerate part of a
hand-written README, wrap the section you want the tool to own with the two
markers.

Preview the output before touching your files:

\`\`\`
npx awesome-readme --dry-run
\`\`\`

Generate for another project, with a config living elsewhere:

\`\`\`
npx awesome-readme --path ./packages/core --config ./readme.config.js
\`\`\`

Add the markers to a hand-written README to opt into partial regeneration:

\`\`\`
<!-- awesome-readme:start -->
<!-- awesome-readme:end -->
\`\`\`

Fill the gap with anything you want the tool to own (a tree, a badge list, an
auto-generated file index, etc.) and the next run will refresh that block
without touching the rest of the file.
`,
  root_body: `

## Configuration with awesome-readme.config.js

\`\`\`
module.exports = {
    // Set figlet_text to a plain string and the tool will render it with the
    // figlet package at build time (no need to hand-author ASCII art). Use
    // figlet_font to pick a different font (defaults to "Standard"). Leave the
    // pre-rendered figlet below in place if you want to use that instead.
    // figlet_text: 'awesome-readme',
    // figlet_font: 'Standard',
    // By default a banner is auto-generated from \`package.json\` \`name\` when
    // neither \`figlet\` nor \`figlet_text\` is set. Set \`figlet_auto\` to
    // false to keep the banner blank, or to true to force auto-generation
    // even when \`figlet_text\` is unset.
    // figlet_auto: true,
    figlet: \`
    .d8b.  db   d8b   db d88888b .d8888.  .d88b.  .88b  d88. d88888b        d8888b. d88888b  .d8b.  d8888b. .88b  d88. d88888b
    d8' '8b 88   I8I   88 88'     88'  YP .8P  Y8. 88'YbdP'88 88'            88  '8D 88'     d8' '8b 88  '8D 88'YbdP'88 88'
    88ooo88 88   I8I   88 88ooooo '8bo.   88    88 88  88  88 88ooooo        88oobY' 88ooooo 88ooo88 88   88 88  88  88 88ooooo
    88~~~88 Y8   I8I   88 88~~~~~   'Y8b. 88    88 88  88  88 88~~~~~ C8888D 88'8b   88~~~~~ 88~~~88 88   88 88  88  88 88~~~~~
    88   88 '8b d8'8b d8' 88.     db   8D '8b  d8' 88  88  88 88.            88 '88. 88.     88   88 88  .8D 88  88  88 88.
    YP   YP  '8b8' '8d8'  Y88888P '8888Y'  'Y88P'  YP  YP  YP Y88888P        88   YD Y88888P YP   YP Y8888D' YP  YP  YP Y88888P\`,
    root_license: \`[![npm version](https://badge.fury.io/js/awesome-readme.svg)](https://badge.fury.io/js/awesome-readme)\`,
    root_header: \`
    ## Install Awesome-Readme
    \`\`\`
    npm i awesome-readme
    \`\`\`
    ## Use Awesome-Readme
    \`\`\`
    npx awesome-readme
    \`\`\`\`,
    root_body: \`## Configuration with awesome-readme.config.js\`,
    root_footer: \`## Don't hesitate to contribute to this project.\`,
    sub_license: \`[![license](https://img.shields.io/badge/license-MIT-green.svg)](https://opensource.org/licenses/MIT)\`,
    sub_header: \`## About this directory\`,
    sub_body: \`This directory is part of the awesome-readme project.\`,
    sub_footer: \`## Don't hesitate to contribute to this project.\`,
    ignore_gitFiles: true,
    ignore_gitIgnoreFiles: true,
    // \`ignore_files\` accepts gitignore-style globs (\`*.log\`, \`dist/\`). On top of
    // what is listed here, a small set of defaults (node_modules/, dist/,
    // coverage/, build/) is merged in automatically; set \`ignore_defaults\` to
    // false to opt out.
    ignore_files: ['.prettierignore'],
    ignore_defaults: true,
    // \`directories\` patches the eight text fields for the matching directory
    // only. Keys are project-root-relative POSIX paths and matching is exact
    // (no cascade). The walker and ignore rules stay global, so the tree
    // stays consistent across READMEs.
    // directories: {
    //   src: { sub_header: 'Source code' },
    //   'src/internal': { sub_header: 'Internal helpers' }
    // }
}
\`\`\`

### Per-directory overrides

For monorepos and multi-package trees where different directories deserve
their own copy, add a top-level \`directories\` block to the config. Keys
are project-root-relative POSIX paths and matching is exact: an entry for
\`src\` does **not** cascade to \`src/internal\`. Each value patches only
the eight text fields (\`root_/sub_ license/header/body/footer\`) for the
matching directory; ignore rules and \`max_depth\` stay global so the
walker cannot drift between READMEs.

\`\`\`
module.exports = {
    sub_header: 'Default intro for every README',
    sub_body: 'Default body',
    directories: {
        src: { sub_header: 'Source code' },
        '.vscode': { sub_header: 'Editor settings' },
        'src/hooks': { sub_header: 'Hooks', sub_body: 'Lifecycle scripts' }
    }
};
\`\`\`

Rules:

- Keys must be project-root-relative POSIX paths. \`src\`, \`.vscode\`
  and \`packages/api\` are valid; leading slashes, backslashes, \`..\`
  segments and the empty string are rejected.
- Matching is **exact**. Unspecified directories keep the global
  \`sub_*\` defaults — an override for \`src\` does not apply to
  \`src/hooks\`.
- The root README is never overridden. There is no empty-key form.
- Empty-string values (e.g. \`sub_footer: ''\`) clear the section in the
  targeted README only.
- See \`examples/with-overrides/\` for a runnable demo.

`,
  root_footer: `## Don't hesitate to contribute to this project.`,
  sub_license: `[![license](https://img.shields.io/badge/license-MIT-green.svg)](https://opensource.org/licenses/MIT)`,
  sub_header: `## About this directory`,
  sub_body: `This directory is part of the awesome-readme project.`,
  sub_footer: `## Don't hesitate to contribute to this project.`,
  ignore_gitFiles: true,
  ignore_gitIgnoreFiles: true,
  // `ignore_files` accepts gitignore-style globs (`*.log`, `dist/`). On top of
  // what is listed here, a small set of defaults (node_modules/, dist/,
  // coverage/, build/) is merged in automatically; set `ignore_defaults` to
  // false to opt out.
  ignore_files: ['.prettierignore'],
  ignore_defaults: true,
  // `directories` patches the eight text fields (`root_/sub_ license/header/
  // body/footer`) for the matching directory only. Matching is exact and
  // does not cascade: an entry for `src` does NOT apply to `src/internal`;
  // that directory either has its own entry or falls back to the global
  // `sub_*` defaults. See `examples/with-overrides/` for a runnable demo
  // and `README.md` for the full rules.
  // directories: {
  //   src: { sub_header: 'Source code' },
  //   'src/internal': { sub_header: 'Internal helpers' }
  // }
};
