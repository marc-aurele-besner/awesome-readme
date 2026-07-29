# Releasing

This document describes how to cut a release of `awesome-readme`. For day-to-day
contribution instructions, see [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## Versioning

This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html):

- **MAJOR** for incompatible API or behavior changes (config option removals,
  output-format breaking changes, Node.js major bumps).
- **MINOR** for new features in a backward-compatible way (new config options,
  new CLI flags, new examples).
- **PATCH** for backward-compatible bug fixes and dependency bumps.

Anything tagged `@internal`, `@experimental`, or hidden behind a feature flag is
fair game for breaking changes within a minor.

## Release process

Releases are fully driven by Git tags. The workflow lives in
[`.github/workflows/release.yml`](./.github/workflows/release.yml) and runs on
any tag matching `v*.*.*`. There is no release branch.

### 1. Land the changes

Open a PR (or a series of PRs) that introduces the changes you want to ship.
Each PR must leave `main` green: lint, format check, typecheck, build, and test
all run on the Node 20 / 22 / 24 matrix in CI.

### 2. Update the CHANGELOG

Add an entry to the `[Unreleased]` section of [`CHANGELOG.md`](./CHANGELOG.md)
that summarizes the user-visible changes for the upcoming release. Group them
under `Added`, `Changed`, `Fixed`, `Removed`, and `Dependencies`, in that order.
Keep entries short and link to the PR or issue when relevant.

### 3. Bump the version

In `package.json`, set `version` to the new semver string. Open a PR titled
`chore: bump version to <X.Y.Z>` that contains only this one-line change plus
the CHANGELOG move in step 4. Wait for it to merge before tagging.

### 4. Move the Unreleased entry into a dated section

In `CHANGELOG.md`:

1. Rename the `[Unreleased]` section to `[X.Y.Z] - YYYY-MM-DD`, where the date
   is the day you are tagging (UTC).
2. Add a fresh, empty `[Unreleased]` section above it.
3. Add the comparison links at the bottom of the file for the new release and
   the previous `Unreleased` placeholder (see the existing file for the format).

Open this in the same version-bump PR as step 3.

### 5. Tag the release

From a clean `main`:

```bash
git checkout main
git pull --ff-only origin main
git tag -s vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

The `-s` flag signs the tag with your GPG/SSH key, which npm uses to verify
provenance. If you have not configured signing yet, omit `-s`; provenance will
still work via the workflow's OIDC token, but signed tags are preferred.

Pushing the tag triggers `.github/workflows/release.yml`, which:

- Runs the full CI matrix (lint, format check, typecheck, build, test) on
  Node 20 / 22 / 24.
- Runs `npm publish --provenance --access public` on Node 24 if every check
  passes.

### 6. Verify

After the workflow completes:

- Confirm the new version on
  [npm](https://www.npmjs.com/package/awesome-readme).
- Confirm the GitHub release page lists the tag (creating it from the tag UI
  is optional; the workflow does not do it automatically to keep the action
  surface small).
- Confirm the `Unreleased` link in `CHANGELOG.md` and `README.md` still
  resolve.

## Publishing authentication

The release workflow uses [npm trusted publishing](https://docs.npmjs.com/generating-provenance-statements#publishing-packages-with-provenance-via-github-actions)
(OIDC) for `--provenance`. Configure it once per npm package:

1. On npmjs.com, go to **Package settings → Publishing access → Trusted
   publishers** and add a trusted publisher for this repository with the
   workflow filename `.github/workflows/release.yml` and the environment name
   `npm` (optional but recommended).

If trusted publishing is not yet configured, set a fallback `NPM_TOKEN` secret
on the repository (Settings → Secrets and variables → Actions) and the workflow
will pick it up automatically. Rotate the token if a maintainer leaves the
team.