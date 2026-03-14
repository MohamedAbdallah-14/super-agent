import fs from 'node:fs';
import path from 'node:path';

const MANIFEST_FILE = 'superagent.manifest.yaml';

export function findProjectRoot(startDir = process.cwd()) {
  let currentDir = path.resolve(startDir);

  while (true) {
    if (fs.existsSync(path.join(currentDir, MANIFEST_FILE))) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);

    if (parentDir === currentDir) {
      throw new Error(`Could not find ${MANIFEST_FILE} from ${startDir}`);
    }

    currentDir = parentDir;
  }
}
