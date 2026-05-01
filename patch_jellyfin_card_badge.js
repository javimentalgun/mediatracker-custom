const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// 1. Inject _JFB (Jellyfin Badge) + _JFLLib helper before _v card declarator
const compDef =
  '_JFLLib=function(){' +
    'if(window.__jfLib)return Promise.resolve(window.__jfLib);' +
    'if(window.__jfLibPromise)return window.__jfLibPromise;' +
    'try{' +
      'var _last=Number(localStorage.getItem("jfSyncDownloadedAt"))||0;' +
      'if(Date.now()-_last>3600000){' +
        'fetch("/api/jellyfin/sync-downloaded",{method:"POST",credentials:"same-origin"})' +
          '.then(function(){localStorage.setItem("jfSyncDownloadedAt",String(Date.now()))})' +
          '.catch(function(){});' +
      '}' +
    '}catch(e){}' +
    'window.__jfLibPromise=fetch("/api/jellyfin/library-ids",{credentials:"same-origin"})' +
      '.then(function(r){return r.json()})' +
      '.then(function(d){window.__jfLib={tmdb:new Set(d.tmdb||[]),imdb:new Set(d.imdb||[]),tvdb:new Set(d.tvdb||[])};return window.__jfLib})' +
      '.catch(function(){window.__jfLib={tmdb:new Set(),imdb:new Set(),tvdb:new Set()};return window.__jfLib});' +
    'return window.__jfLibPromise' +
  '},' +
  '_JFB=function(props){' +
    'var t=props.item;' +
    'var s=r.useState(false),inJ=s[0],setInJ=s[1];' +
    'r.useEffect(function(){' +
      '_JFLLib().then(function(lib){' +
        'var hit=(t.tmdbId&&lib.tmdb.has(String(t.tmdbId)))||' +
                '(t.imdbId&&lib.imdb.has(String(t.imdbId)))||' +
                '(t.tvdbId&&lib.tvdb.has(String(t.tvdbId)));' +
        'if(hit)setInJ(true)' +
      '})' +
    '},[t.id]);' +
    'if(!inJ)return null;' +
    'return r.createElement("div",{className:"absolute pointer-events-auto",style:{top:"50%",left:"4px",transform:"translateY(-50%)"}},' +
      'r.createElement("span",{' +
        'className:"flex material-icons",' +
        'style:{color:"#a855f7",fontSize:"1.75rem",textShadow:"0 0 4px rgba(0,0,0,0.9)"},' +
        'title:xo._("Available on Jellyfin")' +
      '},"play_circle")' +
    ')' +
  '},';

const cardAnchor = '_v=function(e){';
if (c.includes('_JFB=function(props){var t=props.item')) {
  console.log('jellyfin card badge: _JFB already injected');
} else if (!c.includes(cardAnchor)) {
  console.error('jellyfin card badge: _v anchor not found'); process.exit(1);
} else {
  c = c.replace(cardAnchor, compDef + cardAnchor);
  console.log('jellyfin card badge: injected _JFB + _JFLLib');
}

// 2. Mount _JFB on each card. Anchor: the watchlist toggle that's at bottom-1 left-1.
// We inject the badge BEFORE it so it renders into the same children array.
const mountAnchor = 'm&&Wo(t)&&r.createElement("div",{className:"absolute pointer-events-auto bottom-1 left-1"}';
const mountPatched = 'r.createElement(_JFB,{item:t}),' + mountAnchor;
if (c.includes('r.createElement(_JFB,{item:t}),')) {
  console.log('jellyfin card badge: badge already mounted');
} else if (!c.includes(mountAnchor)) {
  console.error('jellyfin card badge: card mount anchor not found'); process.exit(1);
} else {
  c = c.replace(mountAnchor, mountPatched);
  console.log('jellyfin card badge: mounted _JFB on cards');
}

fs.writeFileSync(bundlePath, c);
console.log('jellyfin card badge: complete');
