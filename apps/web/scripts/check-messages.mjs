/**
 * TypeScript only type-checks message keys against the source catalogue (ru.json),
 * so nothing stops a translation from silently missing a key or an ICU argument.
 * This script is that missing check. Run via `npm run check:messages`.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const MESSAGES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'messages');
const SOURCE = 'ru';

/** Flattens a catalogue to `{ 'a.b.c': 'message' }`. */
function flatten(node, prefix = '') {
  const out = {};
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object') Object.assign(out, flatten(value, path));
    else out[path] = value;
  }
  return out;
}

/** ICU argument names of a message: `{name}` and `{count, plural, ...}` alike. */
function args(message) {
  return new Set([...String(message).matchAll(/\{\s*(\w+)\s*[,}]/g)].map((m) => m[1]));
}

const catalogues = Object.fromEntries(
  readdirSync(MESSAGES_DIR)
    .filter((file) => file.endsWith('.json'))
    .map((file) => [file.replace(/\.json$/, ''), flatten(JSON.parse(readFileSync(join(MESSAGES_DIR, file), 'utf8')))])
);

const source = catalogues[SOURCE];
if (!source) throw new Error(`Missing source catalogue ${SOURCE}.json`);

const problems = [];
for (const [locale, messages] of Object.entries(catalogues)) {
  if (locale === SOURCE) continue;

  for (const key of Object.keys(source)) {
    if (!(key in messages)) problems.push(`${locale}: missing key "${key}"`);
  }
  for (const key of Object.keys(messages)) {
    if (!(key in source)) problems.push(`${locale}: extra key "${key}" (not in ${SOURCE}.json)`);
  }
  for (const key of Object.keys(source)) {
    if (!(key in messages)) continue;
    const expected = args(source[key]);
    const actual = args(messages[key]);
    for (const name of expected) {
      if (!actual.has(name)) problems.push(`${locale}: "${key}" is missing the {${name}} argument`);
    }
    for (const name of actual) {
      if (!expected.has(name)) problems.push(`${locale}: "${key}" has an unknown {${name}} argument`);
    }
  }
}

if (problems.length > 0) {
  console.error(`Message catalogues are out of sync:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  process.exit(1);
}

const locales = Object.keys(catalogues).join(', ');
console.log(`Message catalogues in sync: ${locales} (${Object.keys(source).length} keys)`);
