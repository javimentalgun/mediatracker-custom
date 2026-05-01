const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// 1. Slider for audiobooks/movies: max comes from `maxD` state (editable below); fallback Ip default
const oldSlider = '(jo(t)||Io(t))&&t.runtime&&r.createElement(Ip,{max:t.runtime,progress:i,setProgress:o,mediaType:t.mediaType})';
const newSlider = '(jo(t)||Io(t)&&t.runtime)&&r.createElement(Ip,{max:maxD,progress:i,setProgress:o,mediaType:t.mediaType})';

if (!c.includes(oldSlider) && !c.includes(newSlider)) {
  console.error('audiobook progress: slider anchor not found'); process.exit(1);
}
if (c.includes(newSlider)) {
  console.log('audiobook progress: slider already patched');
} else {
  c = c.replace(oldSlider, newSlider);
  console.log('audiobook progress: slider now uses maxD state');
}

// 1b. Add maxD/maxP state declarations to the Rp modal (right after existing state)
const stateOld = 'a=s((0,r.useState)(100*t.progress||0),2),i=a[0],o=a[1],u=s((0,r.useState)(0),2),l=u[0],d=u[1];';
const stateNew = 'a=s((0,r.useState)(100*t.progress||0),2),i=a[0],o=a[1],u=s((0,r.useState)(0),2),l=u[0],d=u[1],mu=s((0,r.useState)(t.runtime||600),2),maxD=mu[0],setMaxD=mu[1],pu=s((0,r.useState)(t.numberOfPages||200),2),maxP=pu[0],setMaxP=pu[1];';
if (!c.includes(stateOld) && !c.includes(stateNew)) {
  console.error('audiobook progress: state anchor not found'); process.exit(1);
}
if (c.includes(stateNew)) {
  console.log('audiobook progress: maxD/maxP state already added');
} else {
  c = c.replace(stateOld, stateNew);
  console.log('audiobook progress: added maxD and maxP state');
}

// 1c. Pages slider (books): use maxP state instead of t.numberOfPages
const pagesOld = 'Do(t)&&t.numberOfPages&&r.createElement(Ip,{max:t.numberOfPages,progress:i,setProgress:o,mediaType:t.mediaType})';
const pagesNew = 'Do(t)&&r.createElement(Ip,{max:maxP,progress:i,setProgress:o,mediaType:t.mediaType})';
if (c.includes(pagesOld)) {
  c = c.replace(pagesOld, pagesNew);
  console.log('audiobook progress: pages slider now uses maxP state');
} else if (c.includes(pagesNew)) {
  console.log('audiobook progress: pages slider already uses maxP');
}

// 2. Replace original duration block with: "Establecer total" + duration H+M + slider (all editable, all in sync)
//    For audiobooks: total in H+M -> sets maxD. For books: total pages input -> sets maxP.
//    The slider goes 0..maxD (audiobook) or is the existing pages slider (book), both already updated above.
//    Inline styles for spacing/widths because Tailwind purges gap-2 / w-20.
const oldDurFull = '(Ao(t)||Do(t))&&r.createElement("div",{className:"mb-4"},r.createElement("div",{className:"text-lg"},r.createElement(Xe,{id:"Duration"}),":"),r.createElement("label",null,r.createElement("input",{type:"number",min:0,value:l,onChange:function(e){return d(Number(e.currentTarget.value))}})," ",r.createElement(Xe,{id:"{duration, plural, one {minute} other {minutes}}",values:{duration:l}})))';
const newDurFull = '(Ao(t)||Do(t)||jo(t))&&r.createElement(r.Fragment,null,' +
  // Total max — books: pages, audiobooks/games: H+M
  'Do(t)&&r.createElement("div",{className:"mb-2"},r.createElement("div",{className:"text-lg"},"Establecer total páginas:"),r.createElement("input",{type:"number",min:1,value:maxP,style:{width:"6rem"},onChange:function(e){return setMaxP(Math.max(1,Number(e.currentTarget.value)))}})),' +
  '(jo(t)||Ao(t))&&r.createElement("div",{className:"mb-2"},r.createElement("div",{className:"text-lg"},"Establecer duración total:"),r.createElement("div",{style:{display:"flex",alignItems:"center",gap:"0.5rem"}},r.createElement("input",{type:"number",min:0,value:Math.floor(maxD/60),style:{width:"4rem"},onChange:function(e){return setMaxD(Math.max(1,Number(e.currentTarget.value)*60+(maxD%60)))}}),r.createElement("span",null,"h"),r.createElement("input",{type:"number",min:0,max:59,value:maxD%60,style:{width:"4rem"},onChange:function(e){return setMaxD(Math.max(1,Math.floor(maxD/60)*60+Number(e.currentTarget.value)))}}),r.createElement("span",null,"min"))),' +
  // Duration spent in this session
  'r.createElement("div",{className:"mb-4"},r.createElement("div",{className:"text-lg"},r.createElement(Xe,{id:"Duration"}),":"),r.createElement("div",{style:{display:"flex",alignItems:"center",gap:"0.5rem"}},r.createElement("input",{type:"number",min:0,value:Math.floor(l/60),style:{width:"4rem"},onChange:function(e){return d(Number(e.currentTarget.value)*60+(l%60))}}),r.createElement("span",null,"h"),r.createElement("input",{type:"number",min:0,max:59,value:l%60,style:{width:"4rem"},onChange:function(e){return d(Math.floor(l/60)*60+Number(e.currentTarget.value))}}),r.createElement("span",null,"min")),r.createElement("input",{type:"range",min:0,max:Do(t)?maxP:maxD,value:l,style:{width:"100%",marginTop:"0.5rem"},onChange:function(e){return d(Number(e.currentTarget.value))}}))' +
  ')';

if (!c.includes(oldDurFull) && !c.includes(newDurFull)) {
  console.error('audiobook progress: duration field anchor not found'); process.exit(1);
}
if (c.includes(newDurFull)) {
  console.log('audiobook progress: duration field already H+M for audiobooks');
} else {
  c = c.replace(oldDurFull, newDurFull);
  console.log('audiobook progress: duration field now H+M, includes audiobooks');
}

fs.writeFileSync(bundlePath, c);
console.log('audiobook progress: complete');
