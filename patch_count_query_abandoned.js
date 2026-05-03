// Bugfix for the items count fast-path: getItemsKnexSql picks a separate
// `sqlCountQuery` based on the dominant filter (filter / onlyOnWatchlist /
// onlyWithProgress / …). None of those branches knows about `excludeAbandoned`
// or `onlyAbandoned`, so the header count and paginator on /abandonados,
// /in-progress, etc. were wrong:
//   - /abandonados: count fell through to `count(*)` over ALL mediaItem rows.
//   - /in-progress: count included abandoned items that the main query excluded.
// Fix: when either flag is present, derive the count from the main `query`
// (which already has the filters applied). countDistinct on mediaItem.id
// avoids inflated counts from the joins.

const fs = require('fs');
const path = '/app/build/knex/queries/items.js';
let c = fs.readFileSync(path, 'utf8');

const marker = '/* mt-fork: count-query-abandoned */';
if (c.includes(marker)) {
  console.log('count query abandoned: already patched');
  process.exit(0);
}

const anchor = '  let sqlCountQuery;\n  if (filter) {';
if (!c.includes(anchor)) {
  console.error('count query abandoned: anchor not found'); process.exit(1);
}

const replacement =
  '  let sqlCountQuery;\n' +
  '  ' + marker + '\n' +
  '  const _isAbnd = v => v === true || v === \'true\' || v === 1;\n' +
  '  const _hasAbandonedFlag = _isAbnd(excludeAbandoned) || _isAbnd(onlyAbandoned);\n' +
  '  if (_hasAbandonedFlag) {\n' +
  '    // No fast-path covers these — derive count from the filtered main query.\n' +
  '    sqlCountQuery = query.clone().clearOrder().clearSelect().countDistinct(\'mediaItem.id\', { as: \'count\' });\n' +
  '  } else if (filter) {';

c = c.replace(anchor, replacement);
fs.writeFileSync(path, c);
console.log('count query abandoned: count now respects excludeAbandoned/onlyAbandoned');

try {
  delete require.cache[require.resolve(path)];
  require(path);
  console.log('count query abandoned: syntax OK');
} catch (e) {
  console.error('count query abandoned: SYNTAX ERROR ->', e.message.slice(0, 300));
  process.exit(1);
}
