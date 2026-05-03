// Inline YouTube watched stats into /api/statistics/summary so the homepage
// gets {movie, tv, book, video_game, audiobook, youtube} in a single request.
// Without this patch, _YTHome makes its own fetch to /api/youtube/watched-stats
// in a useEffect, which fires AFTER the rest of the summary has rendered — that
// staircase is what the user sees as "YouTube tarda más".
//
// Adds ~ms to the summary call (one JSON file read + reduce). The YouTube page
// still uses /api/youtube/watched-stats independently; that endpoint is left
// alone.

const fs = require('fs');
const path = '/app/build/controllers/statisticsController.js';
let c = fs.readFileSync(path, 'utf8');

const marker = '/* mt-fork: youtube-stats-in-summary */';
if (c.includes(marker)) {
  console.log('youtube stats in summary: already patched');
  process.exit(0);
}

// 1. Insert YouTube stats lookup right before the final lodash chain.
const beforeReturnAnchor = "  return (0, _lodash.default)(res).keyBy('mediaType').mapValues";
if (!c.includes(beforeReturnAnchor)) {
  console.error('youtube stats in summary: pre-return anchor not found'); process.exit(1);
}
const ytLookup =
  "  " + marker + "\n" +
  "  let _ytStats = { count: 0, totalSeconds: 0, totalMinutes: 0 };\n" +
  "  try {\n" +
  "    const _fsYT = require('fs');\n" +
  "    const _dataYT = JSON.parse(_fsYT.readFileSync('/storage/youtube-' + userId + '.json', 'utf8'));\n" +
  "    const _arrYT = Array.isArray(_dataYT.watched) ? _dataYT.watched : [];\n" +
  "    const _totalYT = _arrYT.reduce(function (s, w) { return s + (Number(w.durationSeconds) || 0); }, 0);\n" +
  "    _ytStats = { count: _arrYT.length, totalSeconds: _totalYT, totalMinutes: Math.round(_totalYT / 60) };\n" +
  "  } catch (_) {}\n";
c = c.replace(beforeReturnAnchor, ytLookup + beforeReturnAnchor);

// 2. Convert `return <chain>.value();` into a statement that we can extend with .youtube.
const valueClose = ').value();\n};';
if (!c.includes(valueClose)) {
  console.error('youtube stats in summary: value() close anchor not found'); process.exit(1);
}
c = c.replace(
  beforeReturnAnchor,
  "  const _summaryByType = (0, _lodash.default)(res).keyBy('mediaType').mapValues"
);
c = c.replace(
  valueClose,
  ').value();\n  _summaryByType.youtube = _ytStats;\n  return _summaryByType;\n};'
);

fs.writeFileSync(path, c);
console.log('youtube stats in summary: added .youtube to summary response');

// Sanity check: require the file to catch syntax errors at build time.
try {
  delete require.cache[require.resolve(path)];
  require(path);
  console.log('youtube stats in summary: syntax OK');
} catch (e) {
  console.error('youtube stats in summary: SYNTAX ERROR ->', e.message.slice(0, 300));
  process.exit(1);
}
