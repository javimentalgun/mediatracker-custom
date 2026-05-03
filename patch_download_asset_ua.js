// Bugfix: utils.downloadAsset() calls axios.get(url, { responseType: 'arraybuffer' })
// with no headers. Wikimedia Commons (and several other CDNs) require a
// non-empty User-Agent and return 403 Forbidden otherwise — which means our
// Wikidata-sourced theater posters never download.
//
// Patch the axios.get call inside downloadAsset to include a UA + Accept.

const fs = require('fs');
const path = '/app/build/utils.js';
let c = fs.readFileSync(path, 'utf8');

const marker = '// mt-fork: download-asset-ua';
if (c.includes(marker)) {
  console.log('download-asset-ua: already patched');
  process.exit(0);
}

const old = `const response = await _axios.default.get(url, {
    responseType: 'arraybuffer'
  });`;
const _new = `const response = await _axios.default.get(url, {
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': 'MediaTrackerCustom/0.1 (+image-fetch)',
      'Accept': 'image/webp,image/jpeg,image/png,image/*;q=0.8,*/*;q=0.5'
    },
    timeout: 30000,
    maxRedirects: 5
  });`;

if (!c.includes(old)) {
  console.error('download-asset-ua: anchor not found in utils.js (downloadAsset layout changed?)');
  process.exit(1);
}
c = c.replace(old, _new);
c = '// ' + marker.replace('// ', '') + '\n' + c;
fs.writeFileSync(path, c);
console.log('download-asset-ua: added UA + Accept headers to downloadAsset');

try {
  delete require.cache[require.resolve(path)];
  require(path);
  console.log('download-asset-ua: syntax OK');
} catch (e) {
  console.error('download-asset-ua: SYNTAX ERROR -> ' + e.message.slice(0, 300));
  process.exit(1);
}
