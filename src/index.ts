#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';

import figletLib from 'figlet';

import buildReadme from './buildReadme';
import { parseCliOptions, usage, type CliOptions } from './cli';
import { listFilteredFiles } from './filterFiles';
import { renderTreeRows, type TreeEntry } from './tree';
import type { ExtraData } from './types';
import { writeReadmeFile, type ReadmeWriteMode } from './writeReadme';

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
    ignore_files: []
  };
  let figlet = `
\`\`\`
.d8b.  db   d8b   db d88888b .d8888.  .d88b.  .88b  d88. d88888b        d8888b. d88888b  .d8b.  d8888b. .88b  d88. d88888b
d8' '8b 88   I8I   88 88'     88'  YP .8P  Y8. 88'YbdP'88 88'            88  '8D 88'     d8' '8b 88  '8D 88'YbdP'88 88'
88ooo88 88   I8I   88 88ooooo '8bo.   88    88 88  88  88 88ooooo        88oobY' 88ooooo 88ooo88 88   88 88  88  88 88ooooo
88~~~88 Y8   I8I   88 88~~~~~   'Y8b. 88    88 88  88  88 88~~~~~ C8888D 88'8b   88~~~~~ 88~~~88 88   88 88  88  88 88~~~~~
88   88 '8b d8'8b d8' 88.     db   8D '8b  d8' 88  88  88 88.            88 '88. 88.     88   88 88  .8D 88  88  88 88.
YP   YP  '8b8' '8d8'  Y88888P '8888Y'  'Y88P'  YP  YP  YP Y88888P        88   YD Y88888P YP   YP Y8888D' YP  YP  YP Y88888P
\`\`\``;

  console.log('\x1b[32m', figlet, '\x1b[0m');
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
    // When `figlet_text` is provided, render it with the figlet package so the
    // user does not have to hand-author the ASCII art. Pre-rendered `figlet`
    // strings still win so existing configs keep working.
    if (config.figlet_text !== undefined) {
      const font = typeof config.figlet_font === 'string' && config.figlet_font.length > 0 ? config.figlet_font : 'Standard';
      try {
        const rendered = figletLib.textSync(String(config.figlet_text), { font });
        figlet = `
\`\`\`
${rendered}
\`\`\``;
        console.log('\x1b[33m', 'Generated figlet from figlet_text using font "' + font + '"', '\x1b[0m');
      } catch (err) {
        console.log('\x1b[31m', 'Failed to generate figlet for "' + String(config.figlet_text) + '" with font "' + font + '":', '\x1b[0m', err);
      }
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

  const files = listFilteredFiles(currentPath, extraData);
  const entries: TreeEntry[] = files.map((file) => {
    const filePath = path.resolve(currentPath, file);
    const stats = fs.statSync(filePath);
    return { name: file, isDirectory: stats.isDirectory() };
  });
  const fileEntries = entries.filter((entry) => !entry.isDirectory);
  const directoryEntries = entries.filter((entry) => entry.isDirectory);
  // Map each subdirectory name to the nested lines from its own tree so they
  // can be inlined under the parent's directory entry rather than dumped at
  // the bottom of the root tree.
  const subDirectoryTreeMap: Record<string, string[]> = {};

  let directoryFileList = '';
  let currentFilesList = '';

  // Walk the same directory listing once, building the link list, the
  // subdirectory tree map and the grandchild README list in lock-step so
  // the rendering helpers stay the only place that knows about box-drawing
  // characters.
  directoryEntries.forEach((entry) => {
    const filePath = path.resolve(currentPath, entry.name);
    directoryFileList += ` - [${entry.name}/](./${entry.name}/)\r`;
    const subTree = buildReadme(
      entry.name,
      filePath + '/',
      repositoryName + ' / ' + entry.name,
      figlet,
      licenseBadge,
      '',
      repositoryUrl,
      '   ',
      extraData,
      subMode
    );
    // The subdirectory tree is rendered with a '   ' prefix so it sits one
    // level deep in isolation. Strip those three spaces here so the parent
    // can prepend its own continuation indent cleanly when nesting.
    subDirectoryTreeMap[entry.name] = (subTree ?? '')
      .split('\n')
      .filter((line) => line.length > 0)
      .map((line) => line.replace(/^ {3}/, ''));
    // Second-level walk: filter here too, otherwise an ignored directory
    // would still get a README generated for it.
    const subDirectoryFiles = listFilteredFiles(filePath + '/', extraData);
    if (subDirectoryFiles.length > 0)
      subDirectoryFiles.forEach((subDirectoryFile) => {
        const subDirectoryPath = path.resolve(filePath + '/' + subDirectoryFile);
        const subDirectoryPathStats = fs.statSync(subDirectoryPath);
        if (subDirectoryPathStats.isDirectory()) {
          buildReadme(
            subDirectoryFile,
            filePath + '/' + subDirectoryFile + '/',
            repositoryName + ' / ' + entry.name + ' / ' + subDirectoryFile,
            figlet,
            licenseBadge,
            '',
            repositoryUrl,
            '   ',
            extraData,
            subMode
          );
        }
      });
  });
  fileEntries.forEach((entry) => {
    currentFilesList += ` - [${entry.name}](./${entry.name})\n`;
  });
  // The root tree and the subdirectory trees share the same renderer, so
  // connectors and last-child logic stay consistent. Files are rendered
  // first to match the existing root layout, then directories with their
  // subtrees inlined under each one. The file and directory lists are
  // rendered as separate batches so each group closes on its own last
  // child (`└───`), which keeps the visual layout intact.
  const treeLines: string[] = [`${repositoryName}/`];
  renderTreeRows(fileEntries).forEach((line) => treeLines.push(line));
  const directoryLines = renderTreeRows(directoryEntries);
  directoryEntries.forEach((entry, index) => {
    const isLast = index === directoryEntries.length - 1;
    const childIndent = isLast ? '    ' : '│   ';
    treeLines.push(directoryLines[index]);
    const subTreeLines = subDirectoryTreeMap[entry.name] || [];
    subTreeLines.forEach((line) => treeLines.push(`${childIndent}${line}`));
  });
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
  writeReadmeFile(currentPath, buildReadmeData, rootMode);
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
