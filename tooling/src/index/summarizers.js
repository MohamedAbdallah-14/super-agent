/**
 * Heuristic summarizers for L0/L1 file-level and symbol-level summaries.
 * All functions are pure: input is indexed data, output is a string.
 */

const BOM_UTF16_LE = '\xFF\xFE';
const BOM_UTF16_BE = '\xFE\xFF';
const BOM_UTF32_LE = '\xFF\xFE\x00\x00';
const BOM_UTF32_BE = '\x00\x00\xFE\xFF';

const BINARY_CHECK_LIMIT = 8192;
const L0_CAP = 400;
const L1_CAP = 8000;
const SYMBOL_L1_CODE_CAP = 2000;
const SYMBOL_L1_DATA_CAP = 800;
const KEY_VALUE_PREVIEW_CAP = 200;
const MAX_IMPORTS = 10;

const CODE_LANGUAGES = new Set([
  'javascript', 'typescript', 'python', 'go', 'rust', 'java', 'sql',
]);

const STRUCTURED_DATA_LANGUAGES = new Set(['json', 'yaml']);

/**
 * Detect binary content with BOM guard.
 * Checks for UTF-16/UTF-32 BOMs first (return false if found),
 * then checks for null bytes in the first 8192 characters.
 *
 * @param {string} content - File content read as UTF-8 string.
 * @returns {boolean} True if content appears to be binary.
 */
export function isBinaryContent(content) {
  if (content.length === 0) return false;

  // Check for UTF-32 BOMs first (4-byte, must check before 2-byte)
  if (content.length >= 4) {
    if (content.startsWith(BOM_UTF32_LE)) return false;
    if (content.startsWith(BOM_UTF32_BE)) return false;
  }

  // Check for UTF-16 BOMs (2-byte)
  if (content.length >= 2) {
    if (content.startsWith(BOM_UTF16_LE)) return false;
    if (content.startsWith(BOM_UTF16_BE)) return false;
  }

  // Check for null bytes in first BINARY_CHECK_LIMIT characters
  const limit = Math.min(content.length, BINARY_CHECK_LIMIT);
  return content.slice(0, limit).includes('\0');
}

/**
 * Extract top-level keys from JSON content.
 * @param {string} content
 * @returns {string[]}
 */
function extractJsonTopLevelKeys(content) {
  const keys = [];
  for (const line of content.split('\n')) {
    const match = line.match(/^\s*"([^"]+)"\s*:/);
    if (match) keys.push(match[1]);
  }
  return keys;
}

/**
 * Extract top-level keys from YAML content.
 * @param {string} content
 * @returns {string[]}
 */
function extractYamlTopLevelKeys(content) {
  const keys = [];
  for (const line of content.split('\n')) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*/);
    if (match) keys.push(match[1]);
  }
  return keys;
}

/**
 * Generate a file-level L0 summary (single-line abstract, capped at 400 chars).
 *
 * @param {string} language - Detected language (javascript, markdown, json, etc.)
 * @param {number} lineCount - Number of lines in the file.
 * @param {Array<{name: string, kind: string}>} symbols - Extracted symbols.
 * @param {string} content - File content.
 * @returns {string}
 */
export function generateFileL0(language, lineCount, symbols, content) {
  if (lineCount === 0) return `${language} file (empty)`;
  if (lineCount === 1) return `${language} file (1 line) -- ${content.trim().slice(0, 80)}`.slice(0, L0_CAP);

  if (language === 'markdown') {
    return generateMarkdownL0(content);
  }

  if (STRUCTURED_DATA_LANGUAGES.has(language)) {
    return generateStructuredDataL0(language, lineCount, content);
  }

  return generateCodeL0(language, lineCount, symbols, content);
}

function generateMarkdownL0(content) {
  const lines = content.split('\n');
  const heading = lines.find((l) => /^#{1,6}\s+/.test(l));
  const headingText = heading ? heading.replace(/^#{1,6}\s+/, '').trim() : '';
  const firstParagraph = lines.find((l) => l.trim().length > 0 && !/^#/.test(l));
  const parts = [headingText, firstParagraph?.trim()].filter(Boolean);
  return parts.join(' -- ').slice(0, L0_CAP);
}

function generateStructuredDataL0(language, lineCount, content) {
  const keys = language === 'json'
    ? extractJsonTopLevelKeys(content)
    : extractYamlTopLevelKeys(content);

  if (keys.length === 0) {
    const firstLine = content.split('\n').find((l) => l.trim().length > 0) || '';
    return `${language} file (${lineCount} lines) -- ${firstLine.trim().slice(0, 80)}`.slice(0, L0_CAP);
  }

  return `${language} file (${lineCount} lines) -- keys: ${keys.join(', ')}`.slice(0, L0_CAP);
}

function generateCodeL0(language, lineCount, symbols, content) {
  const topNames = symbols
    .filter((s) => s.kind === 'function' || s.kind === 'class' || s.kind === 'type')
    .slice(0, 5)
    .map((s) => s.name);

  if (topNames.length > 0) {
    return `${language} file (${lineCount} lines) -- ${topNames.join(', ')}`.slice(0, L0_CAP);
  }

  const firstLine = content.split('\n').find((l) => l.trim().length > 0) || '';
  return `${language} file (${lineCount} lines) -- ${firstLine.trim().slice(0, 80)}`.slice(0, L0_CAP);
}

/**
 * Generate a file-level L1 summary (detailed overview, capped at 8000 chars).
 *
 * @param {string} language - Detected language.
 * @param {Array<{name: string, kind: string, signature: string}>} symbols - Extracted symbols.
 * @param {string} content - File content.
 * @returns {string}
 */
export function generateFileL1(language, symbols, content) {
  if (language === 'markdown') return generateMarkdownL1(content);
  if (STRUCTURED_DATA_LANGUAGES.has(language)) return generateStructuredDataL1(language, content);
  return generateCodeL1(symbols, content);
}

function generateCodeL1(symbols, content) {
  const lines = content.split('\n');
  const parts = [];

  const imports = lines
    .filter((l) => /^\s*(import\s|from\s|require\(|use\s)/.test(l))
    .slice(0, MAX_IMPORTS);
  if (imports.length > 0) parts.push('## Imports\n' + imports.join('\n'));

  const sigs = symbols.map((s) => `${s.kind} ${s.name}: ${s.signature}`);
  if (sigs.length > 0) parts.push('## Symbols\n' + sigs.join('\n'));

  return parts.join('\n\n').slice(0, L1_CAP);
}

function generateMarkdownL1(content) {
  const lines = content.split('\n');
  const headings = lines.filter((l) => /^#{1,6}\s+/.test(l));
  return headings.join('\n').slice(0, L1_CAP);
}

function generateStructuredDataL1(language, content) {
  const lines = content.split('\n');
  const parts = [];

  for (const line of lines) {
    const jsonMatch = line.match(/^\s*"([^"]+)"\s*:\s*(.*)/);
    const yamlMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)/);
    const match = jsonMatch || yamlMatch;

    if (match) {
      const key = match[1];
      const valuePreview = match[2].trim().slice(0, 200);
      parts.push(`${key}: ${valuePreview}`);
    }
  }

  return parts.join('\n').slice(0, L1_CAP);
}

/**
 * Generate a symbol-level L0 summary (single line, capped at 400 chars).
 *
 * @param {{name: string, kind: string, signature: string}} symbol
 * @returns {string}
 */
export function generateSymbolL0(symbol) {
  const prefix = symbol.kind === 'key' ? 'key' : symbol.kind;
  const firstLine = symbol.signature.split('\n')[0];
  return `${prefix} ${symbol.name} -- ${firstLine}`.slice(0, L0_CAP);
}

/**
 * Generate a symbol-level L1 summary.
 * Code symbols: full signature + first comment block, capped at 2000 chars.
 * JSON/YAML key symbols: key name + value preview, capped at 800 chars.
 *
 * @param {{name: string, kind: string, signature: string, line_start: number, line_end: number}} symbol
 * @param {string} fileContent - Full file content.
 * @returns {string}
 */
export function generateSymbolL1(symbol, fileContent) {
  if (symbol.kind === 'key') {
    return generateKeySymbolL1(symbol);
  }
  return generateCodeSymbolL1(symbol, fileContent);
}

function generateCodeSymbolL1(symbol, fileContent) {
  const lines = fileContent.split('\n');
  const parts = [];

  // Look backward from line_start for a comment block (/** ... */ or # ...)
  const commentBlock = extractCommentBlock(lines, symbol.line_start - 1);
  if (commentBlock) parts.push(commentBlock);

  parts.push(symbol.signature);

  return parts.join('\n').slice(0, SYMBOL_L1_CODE_CAP);
}

function extractCommentBlock(lines, symbolLineIndex) {
  const commentLines = [];
  // Walk backward from the line before the symbol definition
  for (let i = symbolLineIndex - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();
    // JSDoc/block comment lines
    if (trimmed.startsWith('*') || trimmed.startsWith('/**') || trimmed.startsWith('*/') || trimmed.startsWith('*')) {
      commentLines.unshift(lines[i]);
      if (trimmed.startsWith('/**') || trimmed === '/*') break;
    // Hash comment lines (Python, etc.)
    } else if (trimmed.startsWith('#') && !trimmed.startsWith('#!')) {
      commentLines.unshift(lines[i]);
    // Empty line between comments and symbol is ok if we already have comments
    } else if (trimmed === '' && commentLines.length === 0) {
      continue;
    } else {
      break;
    }
  }
  return commentLines.length > 0 ? commentLines.join('\n') : null;
}

function generateKeySymbolL1(symbol) {
  const valuePreview = symbol.signature.slice(0, KEY_VALUE_PREVIEW_CAP);
  return `key ${symbol.name}\n${valuePreview}`.slice(0, SYMBOL_L1_DATA_CAP);
}
