# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Rewrote the root `README.md` as clear, hand-authored product documentation
  covering installation, usage, CLI options, configuration, preservation
  markers, and examples. The documentation now lives outside the generated
  region so regeneration keeps it intact, and the duplicated config reference
  was removed from `awesome-readme.config.js`. Addresses #91.
- Renovate now only automerges patch-level bumps of `devDependencies`.
  The previous rule mixed update types into `matchDepTypes`, which made
  it effectively allow every devDep bump of every severity; minor and
  major toolchain bumps now open a normal PR for review instead of
  landing silently. The policy is documented in `CONTRIBUTING.md`.

## [0.2.0] - 2026-07-28

### Added

- Per-directory config overrides via a top-level `directories` block in
  `awesome-readme.config.js`. Keys are project-root-relative POSIX paths;
  matching is exact (no cascade), so an override for `src` does not apply
  to `src/internal`. The walker and ignore rules stay global so the tree
  stays consistent across READMEs.
- Recursive directory walk to arbitrary depth, backed by a single shared
  recursion so root and subdirectory READMEs agree on which entries to
  visit.
- Preserve hand-written README content across regenerations. Generated
  content now lives between `<!-- awesome-readme:start -->` and
  `<!-- awesome-readme:end -->` markers; only that region is rewritten
  on subsequent runs. A README without markers is left untouched unless
  `--force` is passed.
- Auto-generate the figlet banner from `package.json` `name` via the
  new `figlet_auto` option (defaults to `true` when neither `figlet`
  nor `figlet_text` is set).
- Render the banner from a `figlet_text` string via the `figlet`
  package, with `figlet_font` for picking a font.
- Glob patterns and sensible defaults in `ignore_files`. A small set of
  defaults (`node_modules/`, `dist/`, `coverage/`, `build/`) is merged
  in automatically; set `ignore_defaults: false` to opt out.
- CLI flags: `--help`, `--dry-run`, `--path`, `--config`, `--root-only`,
  `--force`, `--if-missing`.
- Checked-in example projects under `examples/` demonstrating the
  common usage patterns.

### Changed

- CI runs on a Node 20 / 22 / 24 matrix and `engines.node` is aligned to
  `>=20`.
- `npm test` runs the suite on every supported Node version rather
  than only on the CI host.
- Lint covers the real sources; type errors are gated in CI via
  `npm run typecheck`.
- Package metadata cleaned up: the unused `fs` runtime dependency is
  dropped, the broken `browser` field is removed, and `engines.node` is
  bumped.
- `.gitignore` parsing now uses real gitignore semantics (via the
  `ignore` package).
- The root and subdirectory READMEs share one tree renderer so the
  rendered output is consistent.

### Fixed

- Stop publishing TypeScript sources to npm via `.npmignore`.
- Derive the license badge from `package.json` repository metadata.
- Apply `ignore_files` (and the gitignore-derived rules) when generating
  subdirectory READMEs, not only the root one.
- Subdirectory tree connectors: nested entries now render under their
  parent directory instead of being flattened into the root.

### Dependencies

- Added `ignore` as a runtime dependency (updated to v7).

## [0.1.0] - 2025-XX-XX

Initial TypeScript rewrite with `sub_license`, `sub_header`, `sub_body`,
and `sub_footer` config options for per-directory READMEs, plus a fix
for nested subdirectory tree rendering.