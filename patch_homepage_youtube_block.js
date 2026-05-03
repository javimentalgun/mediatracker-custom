const fs = require('fs');
const child = require('child_process');

// Add a YouTube block to the homepage summary. Renders only when the user has
// marked at least one video as watched. Layout matches the other media-type
// blocks (mb-6 mr-6 + text-lg font-bold title + whitespace-nowrap duration row).
//
// Mounts where the audiobook block used to live — patch_homepage_remove_audiobooks.js
// must run first to leave behind the marker we anchor on.

const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/*mt-fork:yt-home*/';
if (c.includes(marker)) {
  console.log('homepage youtube block: already patched');
  process.exit(0);
}

// Component definition. Cp is the existing milliseconds-to-duration formatter,
// available globally in the bundle scope. Receives stats as a prop from the
// homepage scope (where `o = useQuery(/api/statistics/summary)`), so it renders
// in lockstep with the rest of the summary blocks — no separate fetch.
// patch_youtube_stats_in_summary.js inlines o.youtube into the summary response.
const ytHomeDef = '_YTHome=function(e){' +
  'var s=e&&e.stats;' +
  'if(!s)return null;' +
  'var totalSeconds=Number(s.totalSeconds)||0;' +
  'var count=Number(s.count)||0;' +
  'return r.createElement("div",{className:"mb-6 mr-6"},' +
    'r.createElement("div",{className:"text-lg font-bold"},"YouTube"),' +
    'r.createElement("div",{className:"whitespace-nowrap"},' +
      'r.createElement("b",null,r.createElement(Cp,{milliseconds:totalSeconds*1e3}))," viendo"' +
    '),' +
    'r.createElement("div",null,r.createElement("b",null,count)," videos")' +
  ')' +
'},';

// Inject the component definition right before _v (same anchor used by other patches).
const compAnchor = '_v=function(e){';
if (c.includes('_YTHome=function(){')) {
  console.log('homepage youtube block: _YTHome already injected');
} else if (!c.includes(compAnchor)) {
  console.error('homepage youtube block: _v anchor not found'); process.exit(1);
} else {
  c = c.replace(compAnchor, ytHomeDef + compAnchor);
  console.log('homepage youtube block: injected _YTHome component');
}

// Mount the component as a sibling of the audiobook block. We anchor on the
// audiobook-removal marker so this patch is order-dependent (must run after
// patch_homepage_remove_audiobooks.js). Pass `o.youtube` as the `stats` prop —
// `o` is the homepage scope's summary object (from /api/statistics/summary).
const mountAnchor = '/*mt-fork:no-audiobook-summary*/false&&';
const mountPatched = marker + 'r.createElement(_YTHome,{stats:o.youtube}),' + mountAnchor;
if (!c.includes(mountAnchor)) {
  console.error('homepage youtube block: mount anchor not found — did patch_homepage_remove_audiobooks.js run first?');
  process.exit(1);
}
c = c.replace(mountAnchor, mountPatched);
fs.writeFileSync(bundlePath, c);
console.log('homepage youtube block: mounted _YTHome in summary (replaces former audiobook slot)');
