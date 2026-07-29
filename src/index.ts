#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';

import figletLib from 'figlet';

import buildReadme, { toTreeNodes } from './buildReadme';
import { parseCliOptions, usage, type CliOptions } from './cli';
import { renderTreeLines } from './tree';
import type { ExtraData } from './types';
import { walkDirectory, flattenDirectories, DEFAULT_MAX_DEPTH, type DirectoryNode } from './walk';
import { writeReadmeFile, type ReadmeWriteMode, type ReadmeWriteOptions } from './writeReadme';

const DEFAULT_CONFIG_FILE = 'awesome-readme.config.js';

export type BuildOptions = Omit<CliOptions, 'help'>;

const buildMainReadme = (options: Partial<BuildOptions> = {}): void => {
  // Everything is resolved against the requested root instead of the process
  // cwd so `--path` can point at any directory.
  const currentPath = path.resolve(options.path ?? '.');
  const dryRun = options.dryRun === true;
  const rootOnly = options.rootOnly === true;
  const rootMode: ReadmeWriteMode = dryRun ? 'dry-run' : 'write';
  // `--root-only` still walks subdirectories because the root directory tree is
  // built from their listings; it just never emits their READMEs.
  const subMode: ReadmeWriteMode = rootOnly ? 'skip' : rootMode;
  // Content-preservation flags apply to every README the run touches, root and
  // subdirectories alike.
  const rootWriteOptions: ReadmeWriteOptions = { mode: rootMode, force: options.force === true, ifMissing: options.ifMissing === true };
  const subWriteOptions: ReadmeWriteOptions = { ...rootWriteOptions, mode: subMode };

  if (!fs.existsSync(currentPath) || !fs.statSync(currentPath).isDirectory()) throw new Error(`Project path not found: ${currentPath}`);

  // verify the repository value of package.json
  const packageJsonPath = path.join(currentPath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) throw new Error(`No package.json found in ${currentPath}`);
  const packageJson = fs.readFileSync(packageJsonPath, 'utf8');
  const packageJsonData = JSON.parse(packageJson);
  const repository: string | { url: string } = packageJsonData.repository;
  const repositoryName: string = packageJsonData.name;
  const repositoryLicensee: string = packageJsonData.license;
  const extraData: ExtraData = {
    root_license: '',
    root_header: '',
    root_body: '',
    root_footer: '',
    sub_license: '',
    sub_header: '',
    sub_body: '',
    sub_footer: '',
    ignore_gitFiles: true,
    ignore_gitIgnoreFiles: true,
    ignore_files: [],
    // Built-in defaults (`node_modules/`, `dist/`, `coverage/`, `build/`) are
    // merged with `ignore_files` unless the config opts out via
    // `ignore_defaults: false`.
    ignore_defaults: true,
    // Safety limit for the recursive walk; overridable with `max_depth`.
    max_depth: DEFAULT_MAX_DEPTH
  };
  // The banner used to ship as a hand-authored "awesome-readme" string. It now
  // starts empty so the auto-generation step below can render a banner from
  // the project name whenever nothing else supplies one, and so opting out
  // leaves a blank banner rather than a hardcoded one.
  let figlet = '';
  // `figlet_auto` defaults to true so a freshly generated README gets a banner
  // derived from `package.json` `name`. Setting it to false in the config keeps
  // the banner empty.
  let figletAuto = true;
  // `figlet_font` selects the font used by both `figlet_text` and the
  // auto-generated banner so the two paths stay consistent.
  let figletFont = 'Standard';
  // An explicit `--config` must exist; the default file stays optional.
  const configPath = options.config ? path.resolve(options.config) : path.join(currentPath, DEFAULT_CONFIG_FILE);
  if (options.config && !fs.existsSync(configPath)) throw new Error(`Config file not found: ${configPath}`);
  if (fs.existsSync(configPath)) {
    // if exists, read the file
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const config = require(configPath);
    if (config.figlet) {
      figlet = `
\`\`\`
${config.figlet}
\`\`\``;
      console.log('\x1b[33m', 'Using your figlet', '\x1b[34m', config.figlet);
    }
    if (config.root_license) extraData.root_license = config.root_license;
    if (config.root_header) extraData.root_header = config.root_header;
    if (config.root_body) extraData.root_body = config.root_body;
    if (config.root_footer) extraData.root_footer = config.root_footer;
    if (config.sub_license) extraData.sub_license = config.sub_license;
    if (config.sub_header) extraData.sub_header = config.sub_header;
    if (config.sub_body) extraData.sub_body = config.sub_body;
    if (config.sub_footer) extraData.sub_footer = config.sub_footer;
    if (config.ignore_gitFiles !== undefined) extraData.ignore_gitFiles = config.ignore_gitFiles;
    if (config.ignore_gitIgnoreFiles !== undefined) extraData.ignore_gitIgnoreFiles = config.ignore_gitIgnoreFiles;
    if (config.ignore_files !== undefined && config.ignore_files.length > 0) extraData.ignore_files = config.ignore_files;
    if (config.ignore_defaults !== undefined) extraData.ignore_defaults = config.ignore_defaults;
    // `max_depth` caps how far the recursive walk descends. Anything that is
    // not a finite, non-negative number is a config mistake rather than a
    // request to disable the limit, so the default stays in place.
    if (typeof config.max_depth === 'number' && Number.isFinite(config.max_depth) && config.max_depth >= 0) extraData.max_depth = Math.floor(config.max_depth);
    // `figlet_auto` opt-out. Defaults to true above; explicit `false` keeps
    // the banner empty even when nothing else supplies one.
    if (config.figlet_auto !== undefined) figletAuto = config.figlet_auto !== false;
    // `figlet_font` shared by `figlet_text` and the auto-generated banner so a
    // font choice applies consistently to both paths.
    if (typeof config.figlet_font === 'string' && config.figlet_font.length > 0) figletFont = config.figlet_font;
    // When `figlet_text` is provided, render it with the figlet package so the
    // user does not have to hand-author the ASCII art. Pre-rendered `figlet`
    // strings still win so existing configs keep working.
    if (config.figlet_text !== undefined) {
      try {
        const rendered = figletLib.textSync(String(config.figlet_text), { font: figletFont });
        figlet = `
\`\`\`
${rendered}
\`\`\``;
        console.log('\x1b[33m', 'Generated figlet from figlet_text using font "' + figletFont + '"', '\x1b[0m');
      } catch (err) {
        console.log('\x1b[31m', 'Failed to generate figlet for "' + String(config.figlet_text) + '" with font "' + figletFont + '":', '\x1b[0m', err);
      }
    }
  }
  // Auto-generate the banner from `package.json` `name` when no other source
  // supplied one. Runs once whether or not a config file exists, so the
  // zero-config path also benefits.
  if (figlet === '' && figletAuto && repositoryName) {
    try {
      const rendered = figletLib.textSync(String(repositoryName), { font: figletFont });
      figlet = `
\`\`\`
${rendered}
\`\`\``;
      console.log('\x1b[33m', 'Auto-generated figlet from package.json "name" using font "' + figletFont + '"', '\x1b[0m');
    } catch (err) {
      console.log('\x1b[31m', 'Failed to auto-generate figlet for "' + String(repositoryName) + '" with font "' + figletFont + '":', '\x1b[0m', err);
    }
  }
  let repositoryUrl = '';
  if (typeof repository === 'string')
    if (repository.startsWith('git+')) repositoryUrl = repository.replace('git+', '').replace('.git', '');
    else repositoryUrl = repository;
  else if (typeof repository === 'object') {
    repositoryUrl = repository.url.substring(4);
    repositoryUrl = repositoryUrl.substring(0, repositoryUrl.length - 4);
  }
  // Derive the GitHub "owner/repo" slug from the repository URL so license
  // badges point at the actual project instead of a hardcoded third-party
  // repo. Accepts https and ssh-style URLs, and falls back to an empty string
  // when no slug can be derived (e.g. non-GitHub remotes or missing metadata).
  const deriveRepositorySlug = (url: string): string => {
    if (!url) return '';
    const cleaned = url
      .replace(/^git\+/, '')
      .replace(/\.git$/, '')
      .replace(/\/+$/, '');
    // SSH-style: git@github.com:owner/repo  → matches after the colon
    const sshMatch = cleaned.match(/[/:]([^/]+\/[^/]+)$/);
    if (sshMatch) return sshMatch[1];
    return '';
  };
  const repositorySlug = deriveRepositorySlug(repositoryUrl);
  const licenseBadge = repositorySlug
    ? `[![license](https://img.shields.io/github/license/${repositorySlug}.svg)](https://opensource.org/licenses/${repositoryLicensee})`
    : '';
  // List of all the files in the current directory, with the shared ignore
  // rules applied. The same helper is used for every subdirectory walk so a
  // file ignored here cannot reappear in a sub-README or subdirectory tree.
  if (extraData.ignore_gitIgnoreFiles && fs.existsSync(path.join(currentPath, '.gitignore')))
    console.log('\x1b[33m', 'Using .gitignore to ignore files', '\x1b[0m');
  if (extraData.ignore_gitFiles) console.log('\x1b[33m', 'Ignoring .git files', '\x1b[0m');
  if (extraData.ignore_files.length > 0) console.log('\x1b[33m', 'Ignoring files: ', '\x1b[0m', extraData.ignore_files.toString());
  if (extraData.ignore_defaults) console.log('\x1b[33m', 'Ignoring default directories: node_modules/, dist/, coverage/, build/', '\x1b[0m');

  const tree = walkDirectory(currentPath, extraData);
  const truncated = flattenDirectories(tree).filter((node) => node.truncated);
  if (truncated.length > 0)
    console.log(
      '\x1b[33m',
      `Stopped descending at ${truncated.length} director${truncated.length === 1 ? 'y' : 'ies'} (max_depth: ${extraData.max_depth}). Raise max_depth in the config to go deeper.`,
      '\x1b[0m'
    );

  let directoryFileList = '';
  let currentFilesList = '';
  tree.directories.forEach((child) => {
    directoryFileList += ` - [${child.name}/](./${child.name}/)\r`;
  });
  tree.files.forEach((file) => {
    currentFilesList += ` - [${file}](./${file})\n`;
  });

  /**
   * Emit one README per directory, at any depth.
   *
   * The walk used to be unrolled by hand for exactly two levels, so a
   * `src/a/b/` directory never got a README and never showed up in a tree.
   * Recursing over the walked nodes means depth is bounded by `max_depth`
   * alone.
   */
  const emitSubReadmes = (parent: DirectoryNode, parentTitle: string): void => {
    parent.directories.forEach((child) => {
      const title = `${parentTitle} / ${child.name}`;
      buildReadme({
        node: child,
        title,
        figlet,
        licenseBadge,
        // Direct children link back to the repository; deeper directories link
        // to their parent's README, which is the actual "previous" page.
        previousUrl: child.depth === 1 ? repositoryUrl : '../README.md',
        prefix: '   ',
        extraData,
        writeOptions: subWriteOptions
      });
      emitSubReadmes(child, title);
    });
  };
  emitSubReadmes(tree, repositoryName);

  // One renderer, one walked tree: the root README and every subdirectory
  // README now draw the same structure, so connectors, ordering and nesting
  // cannot drift apart between them at any depth.
  const treeLines: string[] = [`${repositoryName}/`, ...renderTreeLines(toTreeNodes(tree))];
  const directoryTree = `\`\`\`\n${treeLines.join('\n')}\n\`\`\``;
  const buildReadmeData = `
${licenseBadge}${licenseBadge ? '\n' : ''}${extraData.root_license}

# ${repositoryName}
${figlet}
${extraData.root_header}
${directoryFileList ? '## Directories\n' + directoryFileList + '\n' : ''}
${currentFilesList ? currentFilesList : ''}
${extraData.root_body}
${directoryTree ? '## Directory Tree\n' + directoryTree : ''}
${extraData.root_footer}
`;
  writeReadmeFile(currentPath, buildReadmeData, rootWriteOptions);
};

/**
 * Binary entry point. Returns the process exit code so the behaviour can be
 * asserted in tests without spawning a shell.
 */
export const main = (argv: string[] = []): number => {
  let options: CliOptions;
  try {
    options = parseCliOptions(argv);
  } catch (err) {
    console.error('\x1b[31m%s\x1b[0m', (err as Error).message);
    console.error(usage);
    return 1;
  }

  if (options.help) {
    console.log(usage);
    return 0;
  }

  try {
    buildMainReadme(options);
  } catch (err) {
    console.error('\x1b[31m%s\x1b[0m', (err as Error).message);
    return 1;
  }

  return 0;
};

if (require.main === module) process.exitCode = main(process.argv.slice(2));

export { buildMainReadme };
export default main;
