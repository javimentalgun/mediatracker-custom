// items.js v2: short-circuit the heavy episode subqueries when mediaType !== 'tv'.
// Each episode subquery scans the whole `episode` table even for book/movie/game listings.
// Adding `whereRaw('1=0')` when mediaType is not 'tv' makes SQLite return immediately and
// preserves the SELECT references (no "no such column" error).
const fs = require('fs');
const path = '/app/build/knex/queries/items.js';
let c = fs.readFileSync(path, 'utf8');

// Backup once
const bak = path + '.bak';
if (!fs.existsSync(bak)) { fs.writeFileSync(bak, c); }

if (c.includes('/* PERF_V2_APPLIED */')) { console.log('items v2: already patched'); process.exit(0); }

// Helper: extra clause to inject in each episode subquery
const skip = "${(mediaType && mediaType !== 'tv') ? '.whereRaw(\\'1=0\\')' : ''}";

// We need to patch each `from('episode')` chained subquery by injecting the skip clause
// after `from('episode')`. Use a regex.
const before = c.length;

// Find all `from('episode')` followed by chained calls. Inject `.whereRaw('1=0')` conditionally.
// Knex chains are normally on a single line in compiled output. Use a token marker to make patches idempotent.

// Approach: wrap each subquery callback to apply the where 1=0 conditionally.
// We do textual substitution on the raw code. Each pattern is `qb.<select|...>().from('episode')`
// and we add the conditional whereRaw after the from.

// Simpler textual injection: replace literal `.from('episode')` with `.from('episode')${skip}` template.
// But knex chains need actual JS, not template strings. So do a runtime version: wrap the subquery callbacks.

// Strategy: find each `qb => qb.select|count|min|max(...).from('episode').whereNot(...)`. Replace
// each `.from('episode').` with `.from('episode')${skip}.` where `${skip}` evaluates to either
// `whereRaw('1=0').` or empty.

const escapedSkip = ".modify(function(qq){if(typeof mediaType!=='undefined'&&mediaType&&mediaType!=='tv')qq.whereRaw('1=0')})";

const pattern = ".from('episode')";
const replacement = pattern + escapedSkip;

// Count occurrences and do a controlled replacement only inside the items() function context
// to avoid touching unrelated calls.
// Patch the getItemsKnexSql function only — that's where the heavy episode subqueries live.
const itemsFnStart = c.indexOf("const getItemsKnexSql = async");
if (itemsFnStart < 0) {
  console.error('items v2: getItemsKnexSql function not found');
  process.exit(1);
}
// End: find the `};` followed by `const generateColumnNames` (next top-level declaration)
const itemsFnEnd = c.indexOf("\nconst generateColumnNames", itemsFnStart);
if (itemsFnEnd < 0) {
  console.error('items v2: function end not found');
  process.exit(1);
}

const before2 = c.slice(0, itemsFnStart);
const fnBody = c.slice(itemsFnStart, itemsFnEnd);
const after2 = c.slice(itemsFnEnd);

const patchedFn = fnBody.split(pattern).join(replacement);
const replacements = patchedFn === fnBody ? 0 : (patchedFn.length - fnBody.length) / escapedSkip.length;

c = before2 + patchedFn + after2 + '\n/* PERF_V2_APPLIED */\n';
fs.writeFileSync(path, c);
console.log('items v2:', replacements, "subquery short-circuits added");

// Sanity check: file still loads as JS
try {
  delete require.cache[require.resolve(path)];
  require(path);
  console.log('items v2: syntax OK');
} catch (e) {
  console.error('items v2: SYNTAX ERROR ->', e.message.slice(0, 200));
  fs.writeFileSync(path, fs.readFileSync(bak, 'utf8'));
  console.error('items v2: rolled back to backup');
  process.exit(1);
}
