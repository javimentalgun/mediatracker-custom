const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const NEW_NAME = 'MediaTOC';
const TAGLINE = 'a media tracker for the obsessively organised';

const fresh = 'Wy=function(){var e=Ap().configuration;return r.createElement(r.Fragment,null,' +
  'r.createElement("div",null,' +
    'r.createElement("strong",null,"' + NEW_NAME + '"),' +
    '" ",e.version,' +
    'r.createElement("span",{style:{marginLeft:"0.75rem",fontSize:"0.85em",color:"#888",fontStyle:"italic"}},"' + TAGLINE + '")' +
  '),' +
  'r.createElement("div",{style:{marginTop:"1.5rem",fontSize:"0.9em",color:"#888"}},' +
    'r.createElement("a",{href:"https://github.com/javimentallab/mediatoc",target:"_blank",rel:"noopener noreferrer",className:"underline"},"github.com/javimentallab/mediatoc")' +
  ')' +
')}';

// Already at the latest version → nothing to do
if (c.includes('"MediaTOC"') && c.includes('obsessively organised')) {
  console.log('about thanks: already injected (current version)');
  process.exit(0);
}

// Replace any existing Wy=function block (patched or unpatched) with the fresh one.
// Anchor end on the next minified declaration `,Ny=function` to avoid greedy/short-match drift.
const re = /Wy=function\(\)\{var e=Ap\(\)\.configuration;return r\.createElement\(r\.Fragment,null,[^]*?\}(?=,Ny=function)/;
const m = c.match(re);
if (!m) { console.error('about thanks: anchor not found'); process.exit(1); }
c = c.replace(re, fresh);
fs.writeFileSync(bundlePath, c);
console.log('about thanks: rewrote /about page (' + m[0].length + ' → ' + fresh.length + ' bytes)');
