const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// Inject `_EP` component (per-episode progress slider) before _v card definition.
// Standard hack: add it as another comma-separated declarator inside `var Ov,Lv,Hv,_v=...`
// On mount + when episode prop changes, sync local state to episode.progress.
// When seenHistory length changes (Visto / No visto clicked), reset progress to 0.
const compDef = `_EP=function(e){` +
  `var _ep=e.episode;` +
  `var _s=r.useState(Math.round(100*(_ep.progress||0))),_p=_s[0],_setP=_s[1];` +
  `var _seenLen=(_ep.seenHistory&&_ep.seenHistory.length)||0;` +
  `var _prevSeen=r.useRef(_seenLen);` +
  `r.useEffect(function(){_setP(Math.round(100*(_ep.progress||0)))},[_ep.id,_ep.progress]);` +
  `r.useEffect(function(){` +
    `if(_seenLen!==_prevSeen.current){` +
      `_prevSeen.current=_seenLen;` +
      `if(_p>0){fetch("/api/episode-progress?episodeId="+_ep.id+"&progress=0",{method:"PUT",credentials:"same-origin"});_setP(0)}` +
    `}` +
  `},[_seenLen]);` +
  // Auto-fetch runtimes once per show per session if any episode is missing runtime
  `r.useEffect(function(){` +
    `if(!_ep.runtime&&_ep.tvShowId){` +
      `var k="rtm_"+_ep.tvShowId;` +
      `if(typeof sessionStorage!=="undefined"&&!sessionStorage.getItem(k)){` +
        `sessionStorage.setItem(k,"1");` +
        `fetch("/api/episodes/fetch-runtimes?mediaItemId="+_ep.tvShowId,{method:"POST",credentials:"same-origin"}).then(function(r){return r.json()}).then(function(d){if(d&&d.ok&&typeof HW!=="undefined"&&typeof en!=="undefined"){HW.refetchQueries(en(_ep.tvShowId));HW.refetchQueries(["items"])}}).catch(function(){})` +
      `}` +
    `}` +
  `},[_ep.tvShowId,_ep.runtime]);` +
  `var _save=function(v){` +
    `_setP(v);` +
    `fetch("/api/episode-progress?episodeId="+_ep.id+"&progress="+(v/100),{method:"PUT",credentials:"same-origin"}).catch(function(){});` +
  `};` +
  `return r.createElement("div",{className:"flex items-center",style:{minWidth:"8rem"}},` +
    `r.createElement("input",{type:"range",min:0,max:100,value:_p,style:{width:"5rem"},onChange:function(e){_save(Number(e.currentTarget.value))}}),` +
    `r.createElement("span",{className:"text-xs ml-1 text-gray-400",style:{minWidth:"2.5rem"}},_p,"%")` +
  `)` +
`},`;

const cardAnchor = '_v=function(e){';
if (c.includes('_EP=function(e){var _ep=e.episode')) {
  console.log('episode-progress frontend: _EP component already injected');
} else if (!c.includes(cardAnchor)) {
  console.error('episode-progress frontend: _v anchor not found'); process.exit(1);
} else {
  c = c.replace(cardAnchor, compDef + cardAnchor);
  console.log('episode-progress frontend: injected _EP component');
}

// Insert duration column + per-episode "Progreso" button into the Iy (episode
// row) component. The button opens the same Rp modal used by the show-level
// Progreso button, but with `episode:i` so it targets this specific episode
// (Rp's _tvEp falls back to e.episode || firstUnwatchedEpisode).
const rowAnchor = 'r.createElement("div",{className:"flex w-10 md:justify-center"},(Wo(i)||!No(a))&&r.createElement(Yo,{mediaItem:a,episode:i}))';
const rowPatched = rowAnchor +
  ',r.createElement("div",{className:"text-sm text-gray-400 ml-2",style:{minWidth:"3.5rem"}},i.runtime?i.runtime+" min":"")' +
  ',r.createElement("div",{className:"ml-2"},r.createElement(mo,{openModal:function(open){return r.createElement("div",{className:"text-xs text-green-500 btn",onClick:function(){return open()}},"Progreso")}},function(close){return r.createElement(Rp,{mediaItem:a,episode:i,closeModal:close})}))';

if (c.includes('r.createElement(Rp,{mediaItem:a,episode:i')) {
  console.log('episode-progress frontend: per-episode Progreso button already added to Iy');
} else if (!c.includes(rowAnchor)) {
  console.error('episode-progress frontend: Iy row anchor not found'); process.exit(1);
} else {
  c = c.replace(rowAnchor, rowPatched);
  console.log('episode-progress frontend: added duration column + per-episode Progreso button to each episode row');
}

fs.writeFileSync(bundlePath, c);
console.log('episode-progress frontend: complete');
