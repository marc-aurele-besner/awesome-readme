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
YP   YP  '8b8' '8d8'  Y88888P '8888Y'  'Y88P'  YP  YP  YP Y88888P        88   YD Y88888P YP   YP Y8888D' YP  YP  YP Y88888P`,
  root_license: `[![npm version](https://badge.fury.io/js/awesome-readme.svg)](https://badge.fury.io/js/awesome-readme)`,
  root_header: '',
  root_body: '',
  root_footer: '',
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
