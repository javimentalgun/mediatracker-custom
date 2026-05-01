const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// 1. Inject _JFP (Jellyfin Play) component as a comma-separated declarator before _v
const compDef = '_JFP=function(e){' +
  'var t=e.mediaItem;' +
  'var _r=r.useState(null),_res=_r[0],_set=_r[1];' +
  'r.useEffect(function(){' +
    'if(!t||!t.id){return}' +
    'var p=[];' +
    'if(t.tmdbId)p.push("tmdbId="+t.tmdbId);' +
    'if(t.imdbId)p.push("imdbId="+encodeURIComponent(t.imdbId));' +
    'if(t.tvdbId)p.push("tvdbId="+t.tvdbId);' +
    'if(t.mediaType)p.push("mediaType="+encodeURIComponent(t.mediaType));' +
    'if(p.length===0){_set({found:false});return}' +
    'fetch("/api/jellyfin/lookup?"+p.join("&"),{credentials:"same-origin"})' +
      '.then(function(r){return r.json()})' +
      '.then(_set)' +
      '.catch(function(){_set({found:false})})' +
  '},[t&&t.id]);' +
  'if(!_res||!_res.found)return null;' +
  'return r.createElement("a",{' +
    'href:_res.deeplink,' +
    'target:"_blank",' +
    'rel:"noopener noreferrer",' +
    'className:"inline-flex items-center gap-2 px-4 py-2 mt-3 bg-purple-700 hover:bg-purple-800 text-white rounded shadow w-fit"' +
  '},' +
    'r.createElement("i",{className:"material-icons"},"play_circle"),' +
    'xo._("Play in Jellyfin")' +
  ')' +
'},';

const cardAnchor = '_v=function(e){';
if (c.includes('_JFP=function(e){var t=e.mediaItem;var _r=r.useState')) {
  console.log('jellyfin play: _JFP already injected');
} else if (!c.includes(cardAnchor)) {
  console.error('jellyfin play: _v anchor not found'); process.exit(1);
} else {
  c = c.replace(cardAnchor, compDef + cardAnchor);
  console.log('jellyfin play: injected _JFP component');
}

// 2. Mount on detail page (right after rating section, just like _LK)
// Same anchor as patch_links_frontend.js. Inject AFTER detailAnchor and BEFORE _LK so order is:
// rating → Jellyfin button → Links section
const detailAnchor = '(Wo(a)||!No(a))&&r.createElement(Zp,{userRating:a.userRating,mediaItem:a})';
const detailPatched = detailAnchor + ',r.createElement(_JFP,{mediaItem:a})';
if (c.includes(',r.createElement(_JFP,{mediaItem:a})')) {
  console.log('jellyfin play: already mounted in detail');
} else if (!c.includes(detailAnchor)) {
  console.error('jellyfin play: detail anchor not found'); process.exit(1);
} else {
  c = c.replace(detailAnchor, detailPatched);
  console.log('jellyfin play: added _JFP to detail page');
}

fs.writeFileSync(bundlePath, c);
console.log('jellyfin play: complete');
