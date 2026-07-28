import * as fs from 'fs';
import * as path from 'path';

/**
 * How a README should be emitted.
 *
 * - `write`   : write the file to disk (default behaviour)
 * - `dry-run` : report what would be written, touch nothing (`--dry-run`)
 * - `skip`    : produce nothing at all, used by `--root-only` for the
 *               subdirectory walk whose directory tree is still needed by the
 *               root README even though no sub-README should be created
 */
export type ReadmeWriteMode = 'write' | 'dry-run' | 'skip';

/**
 * Single place where README files reach the filesystem, so `--dry-run` cannot
 * be bypassed by one of the two generators forgetting to check it.
 */
export const writeReadmeFile = (directoryPath: string, contents: string, mode: ReadmeWriteMode = 'write'): void => {
  if (mode === 'skip') return;

  const target = path.join(directoryPath, 'README.md');

  if (mode === 'dry-run') {
    const action = fs.existsSync(target) ? 'overwrite' : 'create';
    console.log('\x1b[33m%s\x1b[0m', `[dry-run] Would ${action} ${target} (${Buffer.byteLength(contents, 'utf8')} bytes)`);
    return;
  }

  fs.writeFileSync(target, contents);
  console.log('\x1b[32m%s\x1b[0m', 'README.md created in ' + directoryPath, '\x1b[0m');
};

export default writeReadmeFile;
