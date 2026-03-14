import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

export function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function readYamlFile(filePath) {
  return YAML.parse(fs.readFileSync(filePath, 'utf8'));
}

export function listYamlFiles(dirPath) {
  return fs.readdirSync(dirPath)
    .filter((entry) => entry.endsWith('.yaml') || entry.endsWith('.yml'))
    .sort()
    .map((entry) => path.join(dirPath, entry));
}
