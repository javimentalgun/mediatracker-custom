const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// 1. Remove the "Last read at X" / "Last listened at X" block from the detail page
//    (it remains accessible via the Reading History link)
const lastSeenBlock = 'a.lastSeenAt>0&&r.createElement("div",{className:"mt-3"},jo(a)&&r.createElement(Xe,{id:"Last listened at {0}",values:{0:new Date(a.lastSeenAt).toLocaleString()}}),Do(a)&&r.createElement(Xe,{id:"Last read at {0}",values:{0:new Date(a.lastSeenAt).toLocaleString()}}),(Io(a)||Ro(a))&&r.createElement(Xe,{id:"Last seen at {0}",values:{0:new Date(a.lastSeenAt).toLocaleString()}}),Ao(a)&&r.createElement(Xe,{id:"Last played at {0}",values:{0:new Date(a.lastSeenAt).toLocaleString()}})),';

if (c.includes(lastSeenBlock)) {
  c = c.replace(lastSeenBlock, '');
  console.log('hide seen summary: removed "Last read at" block from detail page');
} else {
  console.log('hide seen summary: lastSeen block already removed (or anchor not found)');
}

// 2. Remove the "Read 1 time" / "Listened N times" inner div, but keep the history link
const timesBlock = 'r.createElement("div",null,jo(a)&&r.createElement(Xe,{id:"{0, plural, one {Listened 1 time} other {Listened # times}}",values:{0:a.seenHistory.length}}),Do(a)&&r.createElement(Xe,{id:"{0, plural, one {Read 1 time} other {Read # times}}",values:{0:a.seenHistory.length}}),(Io(a)||Ro(a))&&r.createElement(Xe,{id:"{0, plural, one {Seen 1 time} other {Seen # times}}",values:{0:a.seenHistory.length}}),Ao(a)&&r.createElement(Xe,{id:"{0, plural, one {Played 1 time} other {Played # times}}",values:{0:a.seenHistory.length}})),';

if (c.includes(timesBlock)) {
  c = c.replace(timesBlock, '');
  console.log('hide seen summary: removed "Read 1 time" inner div from detail page');
} else {
  console.log('hide seen summary: times block already removed (or anchor not found)');
}

fs.writeFileSync(bundlePath, c);
console.log('hide seen summary: complete');
