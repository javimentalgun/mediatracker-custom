const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// Replace the entire Rp modal body with a redesigned version that has two sections:
// "Terminé de leerlo" (books) and "Terminé de escucharlo" (audiobooks), each with its own
// "Marcar como completado" button. Other types fall back to a simpler view.

const startMarker = 'Rp=function(e){';
const endMarker = ',Ap=';
const startIdx = c.indexOf(startMarker);
const endIdx = c.indexOf(endMarker, startIdx);
if (startIdx < 0 || endIdx < 0) { console.error('progress redesign: anchors not found'); process.exit(1); }

const oldFunction = c.slice(startIdx, endIdx);
if (oldFunction.includes('e.mode==="listen"')) { console.log('progress redesign: already applied'); process.exit(0); }

const newFunction =
`Rp=function(e){` +
  `var t=e.mediaItem,n=e.closeModal,_mode=e.mode;` +
  `var _tvEp=Ro(t)&&t.firstUnwatchedEpisode?t.firstUnwatchedEpisode:null;` +
  // Source of truth for the progress slider:
  //   TV → firstUnwatchedEpisode.progress
  //   audiobook (or explicit listen mode) → audioProgress
  //   else → progress
  `var _useAudio=jo(t)||_mode==="listen";` +
  `var _initI=_tvEp?100*(_tvEp.progress||0):(_useAudio?100*(t.audioProgress||0):100*(t.progress||0));` +
  `var a=s((0,r.useState)(_initI),2),i=a[0],o=a[1];` +
  `var u=s((0,r.useState)(0),2),l=u[0],d=u[1];` +
  `var mu=s((0,r.useState)(t.runtime||600),2),maxD=mu[0],setMaxD=mu[1];` +
  `var pu=s((0,r.useState)(t.numberOfPages||200),2),maxP=pu[0],setMaxP=pu[1];` +
  `var hu=s((0,r.useState)(null),2),hltb=hu[0],setHltb=hu[1];` +
  `r.useEffect(function(){if(Ao(t)){fetch("/api/hltb?mediaItemId="+t.id,{credentials:"same-origin"}).then(function(r){return r.json()}).then(setHltb).catch(function(){})}},[t.id]);` +
  `var _markCompleted=function(){` +
    `var _go=function(autoDur){` +
      `var url="/api/seen?mediaItemId="+t.id+"&lastSeenAt=now";` +
      `if(_tvEp){url+="&episodeId="+_tvEp.id}` +
      `if(autoDur)url+="&duration="+autoDur;` +
      `var promises=[fetch(url,{method:"PUT",credentials:"same-origin"})];` +
      // For non-TV: update ONLY the field that matches the active mode.
      //   audiobook OR listen modal → audioProgress
      //   else (read modal / movie / game) → progress
      `if(!_tvEp){` +
        `if(_useAudio){` +
          `promises.push(fetch("/api/audio-progress?mediaItemId="+t.id+"&progress=1",{method:"PUT",credentials:"same-origin"}));` +
        `}else{` +
          `un({mediaItemId:t.id,progress:1,duration:l||autoDur||0});` +
        `}` +
      `}` +
      `Promise.all(promises).finally(function(){HW.refetchQueries(en(t.id));HW.refetchQueries(["items"]);n()});` +
    `};` +
    `if(Ao(t)){` +
      `var _src=hltb||null;` +
      `if(_src){_go((_src.completely||_src.normally||_src.hastily)||0)}` +
      `else{fetch("/api/hltb?mediaItemId="+t.id,{credentials:"same-origin"}).then(function(r){return r.json()}).then(function(d){_go((d&&(d.completely||d.normally||d.hastily))||0)}).catch(function(){_go(0)})}` +
    `}else{_go(0)}` +
  `};` +
  `var _save=function(e){e.preventDefault();` +
    `if(_tvEp){` +
      `fetch("/api/episode-progress?episodeId="+_tvEp.id+"&progress="+(i/100),{method:"PUT",credentials:"same-origin"}).then(function(){HW.refetchQueries(en(t.id));HW.refetchQueries(["items"])});` +
    `}else if(_useAudio){` +
      `fetch("/api/audio-progress?mediaItemId="+t.id+"&progress="+(i/100),{method:"PUT",credentials:"same-origin"}).then(function(){HW.refetchQueries(en(t.id));HW.refetchQueries(["items"])});` +
    `}else{un({mediaItemId:t.id,progress:i/100,duration:l});setTimeout(function(){HW.refetchQueries(en(t.id));HW.refetchQueries(["items"])},150);}` +
    `n();` +
  `};` +
  `var _showRead=_mode==="read"||(!_mode&&Do(t));` +
  `var _showListen=_mode==="listen"||(!_mode&&jo(t));` +
  `var _showFallback=!_mode&&!Do(t)&&!jo(t);` +
  `var _sectionStyle={border:"1px solid rgba(148,163,184,0.4)",borderRadius:"0.5rem",padding:"0.75rem",marginBottom:"0.75rem"};` +
  `var _btnStyle={padding:"0.4rem 0.8rem",borderRadius:"0.25rem",cursor:"pointer",border:"0",fontWeight:"600"};` +
  // Render
  `return r.createElement("div",{className:"p-3"},` +
    `r.createElement("div",{className:"my-1 text-3xl font-bold text-center"},"Progreso"),` +
    `r.createElement("form",{className:"flex flex-col mt-4",onSubmit:_save},` +

      // === BOOKS section (Reading) ===
      `_showRead&&r.createElement("div",{style:_sectionStyle},` +
                `r.createElement("div",{className:"text-lg mt-2"},xo._("Set total pages")+":"),` +
        `r.createElement("div",{style:{display:"flex",alignItems:"center",gap:"0.5rem"}},` +
          `r.createElement("input",{type:"number",min:1,value:maxP,style:{width:"6rem"},onChange:function(e){return setMaxP(Math.max(1,Number(e.currentTarget.value)))}}),` +
          `r.createElement("span",null,xo._("pages"))` +
        `),` +
        `r.createElement("div",{className:"text-lg mt-3"},"Progreso:"),` +
        `r.createElement(Ip,{max:maxP,progress:i,setProgress:o,mediaType:t.mediaType}),` +
        `r.createElement("div",{className:"flex items-center mt-2"},` +
          `r.createElement("input",{className:"w-full my-2 mr-2",type:"range",value:i,min:0,max:100,onChange:function(e){o(Number(e.currentTarget.value))}}),` +
          `r.createElement("span",{className:"w-10 text-right"},Math.round(i),"%")` +
        `)` +
      `),` +

      // === AUDIOBOOKS section (Listening) ===
      `_showListen&&r.createElement("div",{style:_sectionStyle},` +
        `r.createElement("div",{className:"text-xl font-bold mb-2"},xo._("I finished listening")),` +
                // Set total duration (H+M with green tick)
        `r.createElement("div",{className:"text-lg mt-2"},xo._("Set duration in hours and minutes")+":"),` +
        `r.createElement("div",{style:{display:"flex",alignItems:"center",gap:"0.5rem"}},` +
          `r.createElement("input",{type:"number",min:0,value:Math.floor(maxD/60),style:{width:"4rem"},onChange:function(e){return setMaxD(Math.max(1,Number(e.currentTarget.value)*60+(maxD%60)))}}),` +
          `r.createElement("span",null,"h"),` +
          `r.createElement("input",{type:"number",min:0,max:59,value:maxD%60,style:{width:"4rem"},onChange:function(e){return setMaxD(Math.max(1,Math.floor(maxD/60)*60+Number(e.currentTarget.value)))}}),` +
          `r.createElement("span",null,"min"),` +
          `r.createElement("span",{title:"Aplicado",style:{color:"#4ade80",fontSize:"1.5rem",marginLeft:"0.5rem"}},"✓")` +
        `),` +
        // Progress slider — H+M label tracks the slider value (time, not percent)
        `r.createElement("input",{className:"w-full my-3",type:"range",min:0,max:maxD,value:Math.round(i*maxD/100),onChange:function(e){o(Math.min(100,Number(e.currentTarget.value)/maxD*100))}}),` +
        `r.createElement("div",{className:"text-center text-lg"},Math.floor(Math.round(i*maxD/100)/60),"h ",Math.round(i*maxD/100)%60,"min ",r.createElement("span",{className:"text-sm text-gray-500"},"(",Math.round(i),"%)"))` +
      `),` +

      // === FALLBACK for non-book/non-audiobook (movies, tv, games) ===
      `_showFallback&&r.createElement(r.Fragment,null,` +
        // For TV with current episode: show episode info + runtime
        `_tvEp&&r.createElement("div",{style:_sectionStyle},` +
          `r.createElement("div",{className:"text-sm font-semibold mb-1"},"Episodio actual:"),` +
          `r.createElement("div",{className:"text-base"},"S"+String(_tvEp.seasonNumber).padStart(2,"0")+"E"+String(_tvEp.episodeNumber).padStart(2,"0")+(_tvEp.title?" — "+_tvEp.title:"")),` +
          `_tvEp.runtime&&r.createElement("div",{className:"text-sm text-gray-400"},xo._("Duration")+": "+_tvEp.runtime+" min")` +
        `),` +
        // For games: HLTB time estimates panel
        `Ao(t)&&r.createElement("div",{style:_sectionStyle},` +
          `r.createElement("div",{className:"text-sm font-semibold mb-1"},"How Long To Beat (IGDB):"),` +
          `hltb===null?r.createElement("div",{className:"text-xs text-gray-400"},"Cargando..."):` +
          `(hltb.count===0||(!hltb.hastily&&!hltb.normally&&!hltb.completely))?r.createElement("div",{className:"text-xs text-gray-400"},"Sin datos"):` +
          `r.createElement("div",{style:{display:"flex",justifyContent:"space-between",fontSize:"0.9rem"}},` +
            `r.createElement("div",null,r.createElement("b",null,xo._("Quick")+": "),hltb.hastily?Math.round(hltb.hastily/60*10)/10+" h":"-"),` +
            `r.createElement("div",null,r.createElement("b",null,"Normal: "),hltb.normally?Math.round(hltb.normally/60*10)/10+" h":"-"),` +
            `r.createElement("div",null,r.createElement("b",null,"Completo: "),hltb.completely?Math.round(hltb.completely/60*10)/10+" h":"-")` +
          `)` +
        `),` +
        // For movies with runtime: existing time slider
        `(Io(t)&&t.runtime)&&r.createElement(Ip,{max:maxD,progress:i,setProgress:o,mediaType:t.mediaType}),` +
        // Always: percentage slider
        `r.createElement("div",{className:"text-lg mt-2"},"Progreso:"),` +
        `r.createElement("div",{className:"flex items-center mb-4"},` +
          `r.createElement("input",{className:"w-full my-2 mr-2",type:"range",value:i,min:0,max:100,onChange:function(e){o(Number(e.currentTarget.value))}}),` +
          `r.createElement("span",{className:"w-10 text-right"},Math.round(i),"%")` +
        `)` +
      `),` +

      `r.createElement("button",{className:"w-full btn"},"Guardar progreso")` +
    `),` +
    `r.createElement("div",{className:"w-full mt-3 btn-blue",style:{background:"#16a34a",color:"white"},onClick:_markCompleted},_tvEp?"Marcar episodio como completado":"Marcar como completado"),` +
    `r.createElement("div",{className:"w-full mt-3 btn-red",onClick:function(){return n()}},r.createElement(Xe,{id:"Cancel"}))` +
  `)` +
`}`;

c = c.replace(oldFunction, newFunction);
fs.writeFileSync(bundlePath, c);
console.log('progress redesign: rewrote Rp modal with two sections (leerlo/escucharlo)');
