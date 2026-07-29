# Examples

Small, self-contained projects you can point `awesome-readme` at to see how
the generator behaves under different layouts and configurations.

Each example ships with a pre-generated `README.md` so the output can be
inspected on GitHub without running anything. To regenerate from scratch
from the repository root:

```
npm run build
npx awesome-readme --path examples/<name> --force
```

Add `--dry-run` to preview what would be written without touching the files.

## `minimal/`

The smallest possible input: one `package.json` and one source file under
`src/`. Demonstrates the zero-config path — the figlet banner is
auto-generated from `package.json` `name` and the root tree shows both the
file and the directory.

## `nested/`

A monorepo-style layout with `src/lib/` two levels deep and a parallel
`test/` directory. Exercises the recursive directory walk: every level gets
its own README and the root tree nests the subtrees under their parent
directories.

## `with-config/`

Shows how an `awesome-readme.config.js` reshapes the generated README:

- `figlet_text` + `figlet_font` instead of the auto-generated banner
- Custom `root_header` and `root_footer`
- An `ignore_files` glob (`build/`) that hides the build output without
  needing a `.gitignore`

Run it with the explicit `--config` flag if you want to point at a config
living elsewhere:

```
npx awesome-readme --path examples/with-config --config examples/with-config/awesome-readme.config.js
```

## Keeping the generated files in sync

The checked-in `README.md` files are produced by the generator, not
maintained by hand. Feel free to delete them and regenerate when the
renderer changes — diffs in the output are the whole point of having
checked-in examples. The hand-written intro above lives outside the
generated markers so it survives regeneration.

<!-- awesome-readme:start -->

[![license](https://img.shields.io/github/license/marc-aurele-besner/awesome-readme.svg)](https://opensource.org/licenses/MIT)

[![license](https://img.shields.io/badge/license-MIT-green.svg)](https://opensource.org/licenses/MIT)
# awesome-readme / examples

```

 .d8b.  db   d8b   db d88888b .d8888.  .d88b.  .88b  d88. d88888b        d8888b. d88888b  .d8b.  d8888b. .88b  d88. d88888b
d8' '8b 88   I8I   88 88'     88'  YP .8P  Y8. 88'YbdP'88 88'            88  '8D 88'     d8' '8b 88  '8D 88'YbdP'88 88'
88ooo88 88   I8I   88 88ooooo '8bo.   88    88 88  88  88 88ooooo        88oobY' 88ooooo 88ooo88 88   88 88  88  88 88ooooo
88~~~88 Y8   I8I   88 88~~~~~   'Y8b. 88    88 88  88  88 88~~~~~ C8888D 88'8b   88~~~~~ 88~~~88 88   88 88  88  88 88~~~~~
88   88 '8b d8'8b d8' 88.     db   8D '8b  d8' 88  88  88 88.            88 '88. 88.     88   88 88  .8D 88  88  88 88.
YP   YP  '8b8' '8d8'  Y88888P '8888Y'  'Y88P'  YP  YP  YP Y88888P        88   YD Y88888P YP   YP Y8888D' YP  YP  YP Y88888P 
```

## About this directory
## Directories
 - [minimal/](./minimal/) - [nested/](./nested/) - [with-config/](./with-config/)

 - [README.md](./README.md)
This directory is part of the awesome-readme project.
## Directory Tree
[<- Previous](https://github.com/marc-aurele-besner/awesome-readme)
```
examples/
   └─── README.md
   ├─── minimal/
   │   ├─── README.md
   │   └─── package.json
   │   └─── src/
   │       ├─── README.md
   │       └─── index.js
   ├─── nested/
   │   ├─── README.md
   │   └─── package.json
   │   ├─── src/
   │   │   ├─── README.md
   │   │   └─── index.js
   │   │   └─── lib/
   │   │       ├─── README.md
   │   │       ├─── format.js
   │   │       └─── math.js
   │   └─── test/
   │       ├─── README.md
   │       └─── smoke.test.js
   └─── with-config/
       ├─── README.md
       ├─── awesome-readme.config.js
       └─── package.json
       └─── src/
           ├─── README.md
           └─── index.js
```
## Don't hesitate to contribute to this project.

<!-- awesome-readme:end -->