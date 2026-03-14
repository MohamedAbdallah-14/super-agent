import { describe, test } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { readJsonFile, readYamlFile } from '../src/loaders.js';
import { validateAgainstSchema } from '../src/schema-validator.js';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

const EXAMPLE_CASES = [
  ['templates/examples/superagent-manifest.example.yaml', 'schemas/superagent-manifest.schema.json', 'yaml'],
  ['templates/examples/run-manifest.example.json', 'schemas/run-manifest.schema.json', 'json'],
  ['templates/examples/clarification.example.json', 'schemas/clarification.schema.json', 'json'],
  ['templates/examples/research.example.json', 'schemas/research.schema.json', 'json'],
  ['templates/examples/spec.example.json', 'schemas/spec.schema.json', 'json'],
  ['templates/examples/spec-challenge.example.json', 'schemas/spec-challenge.schema.json', 'json'],
  ['templates/examples/implementation-plan.example.json', 'schemas/implementation-plan.schema.json', 'json'],
  ['templates/examples/verification-proof.example.json', 'schemas/verification-proof.schema.json', 'json'],
  ['templates/examples/review.example.json', 'schemas/review.schema.json', 'json'],
  ['templates/examples/proposed-learning.example.json', 'schemas/proposed-learning.schema.json', 'json'],
  ['templates/examples/accepted-learning.example.json', 'schemas/accepted-learning.schema.json', 'json'],
  ['templates/examples/host-export-package.example.json', 'schemas/host-export-package.schema.json', 'json'],
  ['templates/examples/export-manifest.example.json', 'schemas/export-manifest.schema.json', 'json'],
  ['templates/examples/docs-claim.example.json', 'schemas/docs-claim.schema.json', 'json'],
  ['templates/examples/author.example.json', 'schemas/author-artifact.schema.json', 'json'],
];

function loadExample(examplePath, kind) {
  const absolutePath = path.join(ROOT, examplePath);
  return kind === 'yaml' ? readYamlFile(absolutePath) : readJsonFile(absolutePath);
}

describe('schema-backed examples', () => {
  for (const [examplePath, schemaPath, kind] of EXAMPLE_CASES) {
    test(`${examplePath} validates against ${schemaPath}`, () => {
      const schema = readJsonFile(path.join(ROOT, schemaPath));
      const example = loadExample(examplePath, kind);
      const result = validateAgainstSchema(schema, example);

      assert.strictEqual(result.valid, true, result.errors.join('\n'));
    });
  }
});
