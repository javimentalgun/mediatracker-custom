// Add a "Teatro" block to the homepage summary, mirroring the existing Books
// block. Renders only when the user has at least one play (o.theater?.plays > 0).
// Goes between Books and YouTube blocks.

const fs = require('fs');
const child = require('child_process');
const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/*mt-fork:home-theater*/';
if (c.includes(marker)) {
  console.log('home theater block: already patched');
  process.exit(0);
}

// Anchor: the closing of the Books block, just before the YouTube block.
// The Books block ends with `}}}}))),` (closing of Books div + the mt-fork:yt-home marker on the next element).
const anchor = '/*mt-fork:yt-home*/r.createElement(_YTHome';
if (!c.includes(anchor)) {
  console.error('home theater block: yt-home anchor not found'); process.exit(1);
}

// Theater block: same shape as Books. Show count + total runtime if available.
const block = marker +
  '(o.theater&&(o.theater.items||0)>0)&&' +
  'r.createElement("div",{className:"mb-6 mr-6"},' +
    'r.createElement("div",{className:"text-lg font-bold"},r.createElement(Xe,{id:"Theater"})),' +
    'r.createElement("div",null,"(",r.createElement("b",null,o.theater.items||0)," ",xo._("Theater"),")"' +
      '),' +
    '(o.theater.duration>0)&&r.createElement("div",{className:"whitespace-nowrap"},r.createElement(Cp,{milliseconds:60*o.theater.duration*1e3}))' +
  '),';

c = c.replace(anchor, block + anchor);
fs.writeFileSync(bundlePath, c);
console.log('home theater block: inserted Teatro block before YouTube');
