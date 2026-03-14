import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { getIndexDatabasePath } from '../state-root.js';
import {
  generateFileL0,
  generateFileL1,
  generateSymbolL0,
  generateSymbolL1,
  isBinaryContent,
} from './summarizers.js';

const INDEXABLE_EXTENSIONS = new Set([
  '.js',
  '.cjs',
  '.mjs',
  '.jsx',
  '.ts',
  '.tsx',
  '.py',
  '.go',
  '.rs',
  '.java',
  '.sql',
  '.json',
  '.yaml',
  '.yml',
  '.md',
  '.txt',
]);

const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.worktrees',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.next',
]);

function createId(parts) {
  return crypto.createHash('sha1').update(parts.join('::')).digest('hex').slice(0, 16);
}

export function hashContent(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function countLineOccurrences(line, needle) {
  return (line.match(new RegExp(`\\${needle}`, 'g')) ?? []).length;
}

function estimateBraceBlockEnd(lines, startIndex) {
  let depth = 0;
  let sawBrace = false;

  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];
    depth += countLineOccurrences(line, '{');
    depth -= countLineOccurrences(line, '}');

    if (line.includes('{')) {
      sawBrace = true;
    }

    if (sawBrace && depth <= 0 && index > startIndex) {
      return index + 1;
    }
  }

  return sawBrace ? lines.length : startIndex + 1;
}

function detectLanguage(relativePath) {
  const extension = path.extname(relativePath).toLowerCase();

  switch (extension) {
    case '.js':
    case '.cjs':
    case '.mjs':
    case '.jsx':
      return 'javascript';
    case '.ts':
    case '.tsx':
      return 'typescript';
    case '.py':
      return 'python';
    case '.go':
      return 'go';
    case '.rs':
      return 'rust';
    case '.java':
      return 'java';
    case '.sql':
      return 'sql';
    case '.json':
      return 'json';
    case '.yaml':
    case '.yml':
      return 'yaml';
    case '.md':
      return 'markdown';
    case '.txt':
      return 'text';
    default:
      return 'text';
  }
}

function extractMarkdownEntries(lines, relativePath) {
  const outlines = [];

  lines.forEach((line, index) => {
    const match = line.match(/^(#{1,6})\s+(.+?)\s*$/);

    if (!match) {
      return;
    }

    outlines.push({
      outline_id: createId([relativePath, 'heading', match[2], String(index + 1)]),
      label: match[2],
      kind: 'heading',
      level: match[1].length,
      line_start: index + 1,
      line_end: index + 1,
    });
  });

  return {
    outlines,
    symbols: [],
  };
}

function extractJsonEntries(lines, relativePath) {
  const outlines = [];
  const symbols = [];

  lines.forEach((line, index) => {
    const jsonMatch = line.match(/^\s*"([^"]+)"\s*:\s*/);
    const yamlMatch = line.match(/^([A-Za-z0-9_-]+):\s*/);
    const key = jsonMatch?.[1] ?? yamlMatch?.[1];

    if (!key) {
      return;
    }

    const entry = {
      label: key,
      kind: 'key',
      level: 1,
      line_start: index + 1,
      line_end: index + 1,
    };

    outlines.push({
      outline_id: createId([relativePath, 'outline', key, String(index + 1)]),
      ...entry,
    });
    symbols.push({
      symbol_id: createId([relativePath, 'symbol', key, 'key', String(index + 1)]),
      name: key,
      kind: 'key',
      signature: line.trim(),
      line_start: index + 1,
      line_end: index + 1,
    });
  });

  return {
    outlines,
    symbols,
  };
}

function extractCodeEntries(lines, relativePath, language) {
  const outlines = [];
  const symbols = [];
  const patterns = [
    { kind: 'function', regex: /^\s*export\s+async\s+function\s+([A-Za-z_$][\w$]*)\s*\(/ },
    { kind: 'function', regex: /^\s*export\s+function\s+([A-Za-z_$][\w$]*)\s*\(/ },
    { kind: 'function', regex: /^\s*async\s+function\s+([A-Za-z_$][\w$]*)\s*\(/ },
    { kind: 'function', regex: /^\s*function\s+([A-Za-z_$][\w$]*)\s*\(/ },
    { kind: 'function', regex: /^\s*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/ },
    { kind: 'class', regex: /^\s*export\s+class\s+([A-Za-z_$][\w$]*)\b/ },
    { kind: 'class', regex: /^\s*class\s+([A-Za-z_$][\w$]*)\b/ },
    { kind: 'function', regex: /^\s*def\s+([A-Za-z_][\w]*)\s*\(/ },
    { kind: 'class', regex: /^\s*class\s+([A-Za-z_][\w]*)\b/ },
    { kind: 'function', regex: /^\s*func\s+([A-Za-z_][\w]*)\s*\(/ },
    { kind: 'type', regex: /^\s*type\s+([A-Za-z_][\w]*)\s+(?:struct|interface)\b/ },
    { kind: 'function', regex: /^\s*pub\s+fn\s+([A-Za-z_][\w]*)\s*\(/ },
    { kind: 'function', regex: /^\s*fn\s+([A-Za-z_][\w]*)\s*\(/ },
    { kind: 'type', regex: /^\s*pub\s+(?:struct|enum|trait)\s+([A-Za-z_][\w]*)\b/ },
    { kind: 'type', regex: /^\s*(?:struct|enum|trait)\s+([A-Za-z_][\w]*)\b/ },
    { kind: 'type', regex: /^\s*public\s+(?:class|interface|enum|record)\s+([A-Za-z_][\w]*)\b/ },
    { kind: 'type', regex: /^\s*(?:class|interface|enum|record)\s+([A-Za-z_][\w]*)\b/ },
    { kind: 'sql', regex: /^\s*create\s+(?:or\s+replace\s+)?(?:table|view|function|procedure)\s+([A-Za-z_][\w]*)/i },
  ];

  lines.forEach((line, index) => {
    const pattern = patterns.find((candidate) => candidate.regex.test(line));

    if (!pattern) {
      return;
    }

    const match = line.match(pattern.regex);
    const name = match?.[1];

    if (!name) {
      return;
    }

    const lineEnd = ['javascript', 'typescript', 'go', 'rust', 'java'].includes(language)
      ? estimateBraceBlockEnd(lines, index)
      : index + 1;

    outlines.push({
      outline_id: createId([relativePath, 'outline', name, pattern.kind, String(index + 1)]),
      label: name,
      kind: pattern.kind,
      level: 1,
      line_start: index + 1,
      line_end: lineEnd,
    });
    symbols.push({
      symbol_id: createId([relativePath, 'symbol', name, pattern.kind, String(index + 1)]),
      name,
      kind: pattern.kind,
      signature: line.trim(),
      line_start: index + 1,
      line_end: lineEnd,
    });
  });

  return {
    outlines,
    symbols,
  };
}

function extractEntries(relativePath, content) {
  const language = detectLanguage(relativePath);
  const lines = content.split('\n');

  if (language === 'markdown') {
    return {
      language,
      ...extractMarkdownEntries(lines, relativePath),
    };
  }

  if (language === 'json' || language === 'yaml') {
    return {
      language,
      ...extractJsonEntries(lines, relativePath),
    };
  }

  if (language === 'text') {
    return {
      language,
      outlines: [],
      symbols: [],
    };
  }

  return {
    language,
    ...extractCodeEntries(lines, relativePath, language),
  };
}

function isStateRootInsideProject(projectRoot, stateRoot, absolutePath) {
  const normalizedStateRoot = path.resolve(stateRoot);
  const normalizedAbsolutePath = path.resolve(absolutePath);

  return normalizedAbsolutePath === normalizedStateRoot
    || normalizedAbsolutePath.startsWith(`${normalizedStateRoot}${path.sep}`);
}

function collectFiles(projectRoot, stateRoot) {
  const files = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entry.name)) {
          continue;
        }

        if (isStateRootInsideProject(projectRoot, stateRoot, absolutePath)) {
          continue;
        }

        walk(absolutePath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const relativePath = path.relative(projectRoot, absolutePath);
      const extension = path.extname(relativePath).toLowerCase();

      if (!INDEXABLE_EXTENSIONS.has(extension)) {
        continue;
      }

      files.push(relativePath);
    }
  }

  walk(projectRoot);
  files.sort();
  return files;
}

function ensureSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS files (
      file_id TEXT PRIMARY KEY,
      relative_path TEXT NOT NULL UNIQUE,
      language TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      line_count INTEGER NOT NULL,
      content_hash TEXT NOT NULL,
      indexed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS symbols (
      symbol_id TEXT PRIMARY KEY,
      file_id TEXT NOT NULL,
      relative_path TEXT NOT NULL,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      signature TEXT NOT NULL,
      line_start INTEGER NOT NULL,
      line_end INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS outlines (
      outline_id TEXT PRIMARY KEY,
      file_id TEXT NOT NULL,
      relative_path TEXT NOT NULL,
      label TEXT NOT NULL,
      kind TEXT NOT NULL,
      level INTEGER NOT NULL,
      line_start INTEGER NOT NULL,
      line_end INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS hashes (
      file_id TEXT PRIMARY KEY,
      content_hash TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ingestion_runs (
      run_id TEXT PRIMARY KEY,
      mode TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      file_count INTEGER NOT NULL,
      updated_file_count INTEGER NOT NULL,
      removed_file_count INTEGER NOT NULL,
      symbol_count INTEGER NOT NULL,
      outline_count INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS retrieval_logs (
      log_id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      query TEXT NOT NULL,
      result_count INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS summaries (
      summary_id   TEXT PRIMARY KEY,
      file_id      TEXT NOT NULL REFERENCES files(file_id) ON DELETE CASCADE,
      tier         TEXT NOT NULL CHECK (tier IN ('L0', 'L1')),
      content      TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      source_hash  TEXT NOT NULL,
      generator    TEXT NOT NULL,
      generated_at TEXT NOT NULL,
      UNIQUE(file_id, tier)
    );

    CREATE TABLE IF NOT EXISTS symbol_summaries (
      summary_id   TEXT PRIMARY KEY,
      symbol_id    TEXT NOT NULL REFERENCES symbols(symbol_id) ON DELETE CASCADE,
      file_id      TEXT NOT NULL REFERENCES files(file_id) ON DELETE CASCADE,
      tier         TEXT NOT NULL CHECK (tier IN ('L0', 'L1')),
      content      TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      source_hash  TEXT NOT NULL,
      generator    TEXT NOT NULL,
      generated_at TEXT NOT NULL,
      UNIQUE(symbol_id, tier)
    );

    CREATE INDEX IF NOT EXISTS idx_symbols_name ON symbols(name);
    CREATE INDEX IF NOT EXISTS idx_outlines_relative_path ON outlines(relative_path);
    CREATE INDEX IF NOT EXISTS idx_files_relative_path ON files(relative_path);
    CREATE INDEX IF NOT EXISTS idx_summaries_file_id ON summaries(file_id);
    CREATE INDEX IF NOT EXISTS idx_symbol_summaries_file_id ON symbol_summaries(file_id);
  `);
}

export function openIndexDatabase(stateRoot) {
  const databasePath = getIndexDatabasePath(stateRoot);
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath, { timeout: 5000 });
  ensureSchema(db);
  return db;
}

function getCounts(db) {
  return {
    file_count: db.prepare('SELECT COUNT(*) AS count FROM files').get().count,
    symbol_count: db.prepare('SELECT COUNT(*) AS count FROM symbols').get().count,
    outline_count: db.prepare('SELECT COUNT(*) AS count FROM outlines').get().count,
  };
}

function upsertFileIndex(db, record) {
  const insertFile = db.prepare(`
    INSERT INTO files (file_id, relative_path, language, size_bytes, line_count, content_hash, indexed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(relative_path) DO UPDATE SET
      file_id = excluded.file_id,
      language = excluded.language,
      size_bytes = excluded.size_bytes,
      line_count = excluded.line_count,
      content_hash = excluded.content_hash,
      indexed_at = excluded.indexed_at
  `);
  const insertHash = db.prepare(`
    INSERT INTO hashes (file_id, content_hash, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(file_id) DO UPDATE SET
      content_hash = excluded.content_hash,
      updated_at = excluded.updated_at
  `);
  const deleteSymbols = db.prepare('DELETE FROM symbols WHERE file_id = ?');
  const deleteOutlines = db.prepare('DELETE FROM outlines WHERE file_id = ?');
  const insertSymbol = db.prepare(`
    INSERT INTO symbols (symbol_id, file_id, relative_path, name, kind, signature, line_start, line_end)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertOutline = db.prepare(`
    INSERT INTO outlines (outline_id, file_id, relative_path, label, kind, level, line_start, line_end)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertFile.run(
    record.file_id,
    record.relative_path,
    record.language,
    record.size_bytes,
    record.line_count,
    record.content_hash,
    record.indexed_at,
  );
  insertHash.run(record.file_id, record.content_hash, record.indexed_at);
  deleteSymbols.run(record.file_id);
  deleteOutlines.run(record.file_id);

  for (const symbol of record.symbols) {
    insertSymbol.run(
      symbol.symbol_id,
      record.file_id,
      record.relative_path,
      symbol.name,
      symbol.kind,
      symbol.signature,
      symbol.line_start,
      symbol.line_end,
    );
  }

  for (const outline of record.outlines) {
    insertOutline.run(
      outline.outline_id,
      record.file_id,
      record.relative_path,
      outline.label,
      outline.kind,
      outline.level,
      outline.line_start,
      outline.line_end,
    );
  }
}

function deleteRemovedFiles(db, missingRelativePaths) {
  const selectFile = db.prepare('SELECT file_id FROM files WHERE relative_path = ?');
  const deleteSymbols = db.prepare('DELETE FROM symbols WHERE file_id = ?');
  const deleteOutlines = db.prepare('DELETE FROM outlines WHERE file_id = ?');
  const deleteHashes = db.prepare('DELETE FROM hashes WHERE file_id = ?');
  const deleteFile = db.prepare('DELETE FROM files WHERE file_id = ?');

  for (const relativePath of missingRelativePaths) {
    const row = selectFile.get(relativePath);

    if (!row) {
      continue;
    }

    deleteSymbols.run(row.file_id);
    deleteOutlines.run(row.file_id);
    deleteHashes.run(row.file_id);
    deleteFile.run(row.file_id);
  }
}

function readExistingHashes(db) {
  const rows = db.prepare('SELECT relative_path, content_hash FROM files').all();
  return new Map(rows.map((row) => [row.relative_path, row.content_hash]));
}

export function buildOrRefreshIndex(projectRoot, stateRoot, mode) {
  const db = openIndexDatabase(stateRoot);
  const runId = createId([mode, new Date().toISOString(), projectRoot]);
  const startedAt = new Date().toISOString();
  const filesToScan = collectFiles(projectRoot, stateRoot);
  const existingHashes = mode === 'refresh' ? readExistingHashes(db) : new Map();
  const seenPaths = new Set();
  let updatedFileCount = 0;

  db.exec('BEGIN');

  try {
    if (mode === 'build') {
      db.exec('DELETE FROM symbols; DELETE FROM outlines; DELETE FROM hashes; DELETE FROM files;');
    }

    for (const relativePath of filesToScan) {
      const absolutePath = path.join(projectRoot, relativePath);
      const content = fs.readFileSync(absolutePath, 'utf8');
      const contentHash = hashContent(content);
      seenPaths.add(relativePath);

      if (mode === 'refresh' && existingHashes.get(relativePath) === contentHash) {
        continue;
      }

      const extracted = extractEntries(relativePath, content);
      const fileId = createId([relativePath]);

      upsertFileIndex(db, {
        file_id: fileId,
        relative_path: relativePath,
        language: extracted.language,
        size_bytes: Buffer.byteLength(content),
        line_count: content.split('\n').length,
        content_hash: contentHash,
        indexed_at: new Date().toISOString(),
        symbols: extracted.symbols,
        outlines: extracted.outlines,
      });

      updatedFileCount += 1;
    }

    const missingRelativePaths = mode === 'refresh'
      ? [...existingHashes.keys()].filter((relativePath) => !seenPaths.has(relativePath))
      : [];

    deleteRemovedFiles(db, missingRelativePaths);

    const counts = getCounts(db);
    const completedAt = new Date().toISOString();
    db.prepare(`
      INSERT INTO ingestion_runs (
        run_id,
        mode,
        started_at,
        completed_at,
        file_count,
        updated_file_count,
        removed_file_count,
        symbol_count,
        outline_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      runId,
      mode,
      startedAt,
      completedAt,
      counts.file_count,
      updatedFileCount,
      missingRelativePaths.length,
      counts.symbol_count,
      counts.outline_count,
    );
    db.exec('COMMIT');

    return {
      run_id: runId,
      mode,
      file_count: counts.file_count,
      updated_file_count: updatedFileCount,
      removed_file_count: missingRelativePaths.length,
      symbol_count: counts.symbol_count,
      outline_count: counts.outline_count,
      database_path: getIndexDatabasePath(stateRoot),
    };
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  } finally {
    db.close();
  }
}

export function readIndexStats(stateRoot) {
  const db = openIndexDatabase(stateRoot);

  try {
    const stats = {
      ...getCounts(db),
      last_run: db.prepare(`
        SELECT run_id, mode, completed_at
        FROM ingestion_runs
        ORDER BY completed_at DESC
        LIMIT 1
      `).get() ?? null,
      database_path: getIndexDatabasePath(stateRoot),
    };

    const summaryCounts = readSummaryStats(db);
    if (summaryCounts) {
      stats.summary_counts = summaryCounts;
    }

    return stats;
  } finally {
    db.close();
  }
}

export function readFileOutline(stateRoot, relativePath) {
  const db = openIndexDatabase(stateRoot);

  try {
    const entries = db.prepare(`
      SELECT label, kind, level, line_start, line_end
      FROM outlines
      WHERE relative_path = ?
      ORDER BY line_start, label
    `).all(relativePath);

    return {
      relative_path: relativePath,
      entries,
    };
  } finally {
    db.close();
  }
}

export function searchSymbols(stateRoot, query) {
  const db = openIndexDatabase(stateRoot);

  try {
    const results = db.prepare(`
      SELECT symbol_id, relative_path, name, kind, signature, line_start, line_end
      FROM symbols
      WHERE LOWER(name) LIKE LOWER(?)
      ORDER BY CASE WHEN LOWER(name) = LOWER(?) THEN 0 ELSE 1 END, name, line_start
    `).all(`%${query}%`, query);

    db.prepare(`
      INSERT INTO retrieval_logs (log_id, type, query, result_count, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      createId(['search-symbols', query, new Date().toISOString()]),
      'search-symbols',
      query,
      results.length,
      new Date().toISOString(),
    );

    return {
      query,
      results,
    };
  } finally {
    db.close();
  }
}

export function findSymbol(stateRoot, query) {
  const db = openIndexDatabase(stateRoot);

  try {
    const exactId = db.prepare(`
      SELECT symbol_id, file_id, relative_path, name, kind, signature, line_start, line_end
      FROM symbols
      WHERE symbol_id = ?
      LIMIT 1
    `).get(query);

    if (exactId) {
      return exactId;
    }

    const exactName = db.prepare(`
      SELECT symbol_id, file_id, relative_path, name, kind, signature, line_start, line_end
      FROM symbols
      WHERE LOWER(name) = LOWER(?)
      ORDER BY line_start
      LIMIT 1
    `).get(query);

    if (exactName) {
      return exactName;
    }

    return db.prepare(`
      SELECT symbol_id, file_id, relative_path, name, kind, signature, line_start, line_end
      FROM symbols
      WHERE LOWER(name) LIKE LOWER(?)
      ORDER BY name, line_start
      LIMIT 1
    `).get(`%${query}%`) ?? null;
  } finally {
    db.close();
  }
}

export function readIndexedFile(stateRoot, relativePath) {
  const db = openIndexDatabase(stateRoot);

  try {
    return db.prepare(`
      SELECT file_id, relative_path, language, size_bytes, line_count, content_hash
      FROM files
      WHERE relative_path = ?
      LIMIT 1
    `).get(relativePath) ?? null;
  } finally {
    db.close();
  }
}

export function upsertFileSummary(dbOrStateRoot, fileId, tier, content, sourceHash, generator) {
  const ownConnection = typeof dbOrStateRoot === 'string';
  const db = ownConnection ? openIndexDatabase(dbOrStateRoot) : dbOrStateRoot;

  try {
    const summaryId = createId([fileId, tier]);
    const contentHash = hashContent(content);
    const generatedAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO summaries (summary_id, file_id, tier, content, content_hash, source_hash, generator, generated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(file_id, tier) DO UPDATE SET
        summary_id = excluded.summary_id,
        content = excluded.content,
        content_hash = excluded.content_hash,
        source_hash = excluded.source_hash,
        generator = excluded.generator,
        generated_at = excluded.generated_at
    `).run(summaryId, fileId, tier, content, contentHash, sourceHash, generator, generatedAt);
  } finally {
    if (ownConnection) db.close();
  }
}

export function readFileSummary(dbOrStateRoot, fileId, tier) {
  const ownConnection = typeof dbOrStateRoot === 'string';
  const db = ownConnection ? openIndexDatabase(dbOrStateRoot) : dbOrStateRoot;

  try {
    return db.prepare(`
      SELECT summary_id, file_id, tier, content, content_hash, source_hash, generator, generated_at
      FROM summaries
      WHERE file_id = ? AND tier = ?
    `).get(fileId, tier) ?? null;
  } finally {
    if (ownConnection) db.close();
  }
}

export function upsertSymbolSummary(dbOrStateRoot, symbolId, tier, content, sourceHash, generator) {
  const ownConnection = typeof dbOrStateRoot === 'string';
  const db = ownConnection ? openIndexDatabase(dbOrStateRoot) : dbOrStateRoot;

  try {
    const fileRow = db.prepare('SELECT file_id FROM symbols WHERE symbol_id = ?').get(symbolId);

    if (!fileRow) {
      throw new Error(`Symbol not found: ${symbolId}`);
    }

    const summaryId = createId([symbolId, tier]);
    const contentHash = hashContent(content);
    const generatedAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO symbol_summaries (summary_id, symbol_id, file_id, tier, content, content_hash, source_hash, generator, generated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(symbol_id, tier) DO UPDATE SET
        summary_id = excluded.summary_id,
        file_id = excluded.file_id,
        content = excluded.content,
        content_hash = excluded.content_hash,
        source_hash = excluded.source_hash,
        generator = excluded.generator,
        generated_at = excluded.generated_at
    `).run(summaryId, symbolId, fileRow.file_id, tier, content, contentHash, sourceHash, generator, generatedAt);
  } finally {
    if (ownConnection) db.close();
  }
}

export function readSymbolSummary(dbOrStateRoot, symbolId, tier) {
  const ownConnection = typeof dbOrStateRoot === 'string';
  const db = ownConnection ? openIndexDatabase(dbOrStateRoot) : dbOrStateRoot;

  try {
    return db.prepare(`
      SELECT summary_id, symbol_id, file_id, tier, content, content_hash, source_hash, generator, generated_at
      FROM symbol_summaries
      WHERE symbol_id = ? AND tier = ?
    `).get(symbolId, tier) ?? null;
  } finally {
    if (ownConnection) db.close();
  }
}

export function readSummaryStats(dbOrStateRoot) {
  const ownConnection = typeof dbOrStateRoot === 'string';
  const db = ownConnection ? openIndexDatabase(dbOrStateRoot) : dbOrStateRoot;

  try {
    const totalCount = db.prepare('SELECT COUNT(*) AS c FROM summaries').get().c
      + db.prepare('SELECT COUNT(*) AS c FROM symbol_summaries').get().c;

    if (totalCount === 0) {
      return null;
    }

    const fileTiers = db.prepare('SELECT tier, COUNT(*) AS c FROM summaries GROUP BY tier').all();
    const symTiers = db.prepare('SELECT tier, COUNT(*) AS c FROM symbol_summaries GROUP BY tier').all();

    const fileSummaries = { L0: 0, L1: 0 };
    for (const row of fileTiers) {
      fileSummaries[row.tier] = row.c;
    }

    const symbolSummaries = { L0: 0, L1: 0 };
    for (const row of symTiers) {
      symbolSummaries[row.tier] = row.c;
    }

    const genRows = db.prepare(`
      SELECT generator, COUNT(*) AS c FROM (
        SELECT generator FROM summaries
        UNION ALL
        SELECT generator FROM symbol_summaries
      ) GROUP BY generator
    `).all();

    const generators = {};
    for (const row of genRows) {
      generators[row.generator] = row.c;
    }

    return { file_summaries: fileSummaries, symbol_summaries: symbolSummaries, generators };
  } finally {
    if (ownConnection) db.close();
  }
}

export function listIndexedFiles(dbOrStateRoot) {
  const ownConnection = typeof dbOrStateRoot === 'string';
  const db = ownConnection ? openIndexDatabase(dbOrStateRoot) : dbOrStateRoot;

  try {
    return db.prepare(`
      SELECT file_id, relative_path, content_hash, language, line_count
      FROM files
      ORDER BY relative_path
    `).all();
  } finally {
    if (ownConnection) db.close();
  }
}

export function listSymbolsForFile(dbOrStateRoot, fileId) {
  const ownConnection = typeof dbOrStateRoot === 'string';
  const db = ownConnection ? openIndexDatabase(dbOrStateRoot) : dbOrStateRoot;

  try {
    return db.prepare(`
      SELECT symbol_id, file_id, relative_path, name, kind, signature, line_start, line_end
      FROM symbols
      WHERE file_id = ?
      ORDER BY line_start
    `).all(fileId);
  } finally {
    if (ownConnection) db.close();
  }
}

export function listFilesNeedingSummaries(dbOrStateRoot) {
  const ownConnection = typeof dbOrStateRoot === 'string';
  const db = ownConnection ? openIndexDatabase(dbOrStateRoot) : dbOrStateRoot;

  try {
    return db.prepare(`
      SELECT DISTINCT f.file_id, f.relative_path, f.content_hash
      FROM files f
      LEFT JOIN summaries s_l0 ON f.file_id = s_l0.file_id AND s_l0.tier = 'L0'
      LEFT JOIN summaries s_l1 ON f.file_id = s_l1.file_id AND s_l1.tier = 'L1'
      WHERE s_l0.summary_id IS NULL
         OR s_l1.summary_id IS NULL
         OR s_l0.source_hash != f.content_hash
         OR s_l1.source_hash != f.content_hash
      ORDER BY f.relative_path
    `).all();
  } finally {
    if (ownConnection) db.close();
  }
}

export function logRetrieval(stateRoot, type, query, resultCount) {
  const db = openIndexDatabase(stateRoot);

  try {
    db.prepare(`
      INSERT INTO retrieval_logs (log_id, type, query, result_count, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      createId([type, query, new Date().toISOString()]),
      type,
      query,
      resultCount,
      new Date().toISOString(),
    );
  } finally {
    db.close();
  }
}

export function summarizeIndex(projectRoot, stateRoot, options = {}) {
  const tier = options.tier ?? 'all';
  const refresh = options.refresh ?? false;
  const db = openIndexDatabase(stateRoot);

  let summarizedFiles = 0;
  let summarizedSymbols = 0;
  let skippedStale = 0;
  let skippedMissing = 0;
  let skippedBinary = 0;

  try {
    db.exec('BEGIN');

    const files = refresh
      ? listFilesNeedingSummaries(db)
      : listIndexedFiles(db);

    // In refresh mode, we need full file info (language, line_count) — listFilesNeedingSummaries only
    // returns file_id, relative_path, content_hash. Get full info for each file.
    const fileInfoMap = new Map();
    if (refresh) {
      const allFiles = listIndexedFiles(db);
      for (const f of allFiles) {
        fileInfoMap.set(f.file_id, f);
      }
    }

    for (const file of files) {
      const fileInfo = refresh ? (fileInfoMap.get(file.file_id) ?? file) : file;
      const absolutePath = path.join(projectRoot, fileInfo.relative_path);

      let content;
      try {
        content = fs.readFileSync(absolutePath, 'utf-8');
      } catch {
        skippedMissing += 1;
        continue;
      }

      const liveHash = hashContent(content);
      if (liveHash !== fileInfo.content_hash) {
        skippedStale += 1;
        continue;
      }

      if (isBinaryContent(content)) {
        skippedBinary += 1;
        continue;
      }

      const symbols = listSymbolsForFile(db, fileInfo.file_id);

      if (tier === 'L0' || tier === 'all') {
        const l0 = generateFileL0(fileInfo.language, fileInfo.line_count, symbols, content);
        upsertFileSummary(db, fileInfo.file_id, 'L0', l0, liveHash, 'heuristic');
      }

      if (tier === 'L1' || tier === 'all') {
        const l1 = generateFileL1(fileInfo.language, symbols, content);
        upsertFileSummary(db, fileInfo.file_id, 'L1', l1, liveHash, 'heuristic');
      }

      for (const symbol of symbols) {
        if (tier === 'L0' || tier === 'all') {
          const sl0 = generateSymbolL0(symbol);
          upsertSymbolSummary(db, symbol.symbol_id, 'L0', sl0, liveHash, 'heuristic');
        }

        if (tier === 'L1' || tier === 'all') {
          const sl1 = generateSymbolL1(symbol, content);
          upsertSymbolSummary(db, symbol.symbol_id, 'L1', sl1, liveHash, 'heuristic');
        }

        summarizedSymbols += 1;
      }

      summarizedFiles += 1;
    }

    db.exec('COMMIT');

    if (summarizedFiles === 0) {
      throw new Error("No files summarized. Run 'index refresh' first.");
    }

    return {
      summarized_files: summarizedFiles,
      summarized_symbols: summarizedSymbols,
      skipped_stale: skippedStale,
      skipped_missing: skippedMissing,
      skipped_binary: skippedBinary,
      total_files: files.length,
    };
  } catch (error) {
    try { db.exec('ROLLBACK'); } catch { /* already committed or no transaction */ }
    throw error;
  } finally {
    db.close();
  }
}
