import { parseArgs } from 'node:util';

/**
 * Command line options accepted by the `awesome-readme` binary.
 *
 * `path` and `config` are left undefined when the flag is absent so the caller
 * can apply its own defaults (the current working directory and
 * `awesome-readme.config.js` inside the project root respectively).
 */
export interface CliOptions {
  help: boolean;
  dryRun: boolean;
  rootOnly: boolean;
  /** Overwrite existing READMEs wholesale instead of preserving their content. */
  force: boolean;
  /** Only generate READMEs for directories that do not have one yet. */
  ifMissing: boolean;
  path?: string;
  config?: string;
}

export const usage = `Usage: awesome-readme [options]

Generate README.md files for a project and its subdirectories.

Existing READMEs are never clobbered: generated content lives between
<!-- awesome-readme:start --> and <!-- awesome-readme:end --> markers and only
that region is regenerated. A README without markers is left untouched unless
--force is passed.

Options:
  -h, --help            Show this help message and exit
      --dry-run         Print what would be written without writing any file
  -p, --path <dir>      Project root to generate READMEs for (default: current directory)
  -c, --config <file>   Path to the config file (default: <path>/awesome-readme.config.js)
      --root-only       Only write the root README, skip subdirectory READMEs
      --force           Overwrite existing READMEs entirely, discarding their content
      --if-missing      Only create READMEs for directories that do not have one

Examples:
  awesome-readme
  awesome-readme --dry-run
  awesome-readme --path ./packages/core --config ./readme.config.js
  awesome-readme --root-only
  awesome-readme --if-missing
  awesome-readme --force`;

/**
 * Parse `process.argv.slice(2)` into `CliOptions`.
 *
 * Parsing is strict: unknown flags, missing values and stray positional
 * arguments all throw so the binary can print the usage text and exit non-zero
 * instead of silently generating READMEs the user did not ask for.
 */
export const parseCliOptions = (argv: string[]): CliOptions => {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      strict: true,
      allowPositionals: false,
      options: {
        help: { type: 'boolean', short: 'h', default: false },
        'dry-run': { type: 'boolean', default: false },
        'root-only': { type: 'boolean', default: false },
        force: { type: 'boolean', default: false },
        'if-missing': { type: 'boolean', default: false },
        path: { type: 'string', short: 'p' },
        config: { type: 'string', short: 'c' }
      }
    });
  } catch (err) {
    throw new Error((err as Error).message);
  }

  const values = parsed.values as {
    help?: boolean;
    'dry-run'?: boolean;
    'root-only'?: boolean;
    force?: boolean;
    'if-missing'?: boolean;
    path?: string;
    config?: string;
  };

  // `--path` / `--config` with an empty value is a user mistake rather than a
  // request to use the default, so reject it instead of silently falling back.
  if (values.path !== undefined && values.path.trim() === '') throw new Error('Option --path requires a directory.');
  if (values.config !== undefined && values.config.trim() === '') throw new Error('Option --config requires a file path.');
  // `--force` overwrites everything and `--if-missing` refuses to touch any
  // existing file: asking for both is a contradiction, not a precedence puzzle.
  if (values.force === true && values['if-missing'] === true) throw new Error('Options --force and --if-missing cannot be combined.');

  return {
    help: values.help === true,
    dryRun: values['dry-run'] === true,
    rootOnly: values['root-only'] === true,
    force: values.force === true,
    ifMissing: values['if-missing'] === true,
    path: values.path,
    config: values.config
  };
};

export default parseCliOptions;
