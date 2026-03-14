import { describe, test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { readJsonFile } from '../src/loaders.js';
import { validateAgainstSchema } from '../src/schema-validator.js';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

// 7 specified tests
describe('author-artifact schema', () => {
  const schemaPath = path.join(ROOT, 'schemas', 'author-artifact.schema.json');

  test('author-artifact schema file exists and is valid JSON', () => {
    assert.ok(fs.existsSync(schemaPath), 'schemas/author-artifact.schema.json missing');
    const raw = fs.readFileSync(schemaPath, 'utf8');
    const schema = JSON.parse(raw);
    assert.strictEqual(schema.type, 'object');
  });

  test('requires standard artifact envelope fields', () => {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    const envelope = ['phase', 'role', 'run_id', 'created_at', 'sources', 'status', 'loop_number'];
    for (const field of envelope) {
      assert.ok(schema.required.includes(field), `missing envelope field: ${field}`);
    }
  });

  test('requires author-specific content fields', () => {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    const authorFields = [
      'microcopy', 'i18n_keys', 'seed_data', 'terminology',
      'asset_metadata', 'state_coverage', 'notifications',
      'editorial_constraints', 'coverage_matrix',
    ];
    for (const field of authorFields) {
      assert.ok(schema.required.includes(field), `missing author field: ${field}`);
    }
  });

  test('constrains phase to author and role to author', () => {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    assert.strictEqual(schema.properties.phase.const, 'author');
    assert.strictEqual(schema.properties.role.const, 'author');
  });

  test('microcopy, i18n_keys, seed_data, terminology, asset_metadata, notifications, and coverage_matrix are arrays', () => {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    const arrayFields = [
      'microcopy', 'i18n_keys', 'seed_data', 'terminology',
      'asset_metadata', 'notifications', 'coverage_matrix',
    ];
    for (const field of arrayFields) {
      assert.strictEqual(schema.properties[field].type, 'array', `${field} must be array`);
    }
  });

  test('state_coverage and editorial_constraints are objects', () => {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    assert.strictEqual(schema.properties.state_coverage.type, 'object', 'state_coverage must be object');
    assert.strictEqual(schema.properties.editorial_constraints.type, 'object', 'editorial_constraints must be object');
  });

  test('author example validates against author schema', () => {
    const schema = readJsonFile(schemaPath);
    const example = readJsonFile(path.join(ROOT, 'templates', 'examples', 'author.example.json'));
    const result = validateAgainstSchema(schema, example);
    assert.strictEqual(result.valid, true, result.errors.join('\n'));
  });
});

// 2 specified tests
describe('author artifact templates', () => {
  test('author markdown template exists with required sections', () => {
    const mdPath = path.join(ROOT, 'templates', 'artifacts', 'author.md');
    assert.ok(fs.existsSync(mdPath), 'templates/artifacts/author.md missing');
    const content = fs.readFileSync(mdPath, 'utf8');
    assert.ok(content.startsWith('---'), 'missing YAML frontmatter');
    assert.ok(content.includes('artifact_type: author'), 'missing artifact_type in frontmatter');
    assert.ok(content.includes('## Microcopy'), 'missing Microcopy section');
    assert.ok(content.includes('## i18n Keys'), 'missing i18n Keys section');
    assert.ok(content.includes('## Seed Data'), 'missing Seed Data section');
    assert.ok(content.includes('## Terminology'), 'missing Terminology section');
    assert.ok(content.includes('## Asset Metadata'), 'missing Asset Metadata section');
    assert.ok(content.includes('## State Coverage'), 'missing State Coverage section');
    assert.ok(content.includes('## Notifications'), 'missing Notifications section');
    assert.ok(content.includes('## Editorial Constraints'), 'missing Editorial Constraints section');
    assert.ok(content.includes('## Coverage Matrix'), 'missing Coverage Matrix section');
  });

  test('author JSON template exists with envelope and content fields', () => {
    const jsonPath = path.join(ROOT, 'templates', 'artifacts', 'author.template.json');
    assert.ok(fs.existsSync(jsonPath), 'templates/artifacts/author.template.json missing');
    const template = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    assert.strictEqual(template.phase, 'author');
    assert.strictEqual(template.role, 'author');
    assert.ok(Array.isArray(template.microcopy), 'microcopy must be array');
    assert.ok(Array.isArray(template.i18n_keys), 'i18n_keys must be array');
    assert.ok(Array.isArray(template.seed_data), 'seed_data must be array');
    assert.ok(Array.isArray(template.terminology), 'terminology must be array');
    assert.ok(Array.isArray(template.asset_metadata), 'asset_metadata must be array');
    assert.ok(typeof template.state_coverage === 'object', 'state_coverage must be object');
    assert.ok(Array.isArray(template.notifications), 'notifications must be array');
    assert.ok(typeof template.editorial_constraints === 'object', 'editorial_constraints must be object');
    assert.ok(Array.isArray(template.coverage_matrix), 'coverage_matrix must be array');
  });
});
