const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// 1. Replace i18n "Set progress" with literal "Progreso" — globally (modal title + card button)
const titleOld = 'r.createElement(Xe,{id:"Set progress"})';
const titleNew = '"Progreso"';
const before = c.length;
c = c.split(titleOld).join(titleNew);
const replaced = (before - c.length) / (titleOld.length - titleNew.length);
console.log('progress modal: replaced', replaced, '"Set progress" with "Progreso"');

// 2. Percentage slider section: full width + bottom margin to avoid overlap with the next field.
//    Original used fixed w-64 for the slider; widen to w-full and add mb-4 to the container.
const pctOld = 'r.createElement("div",{className:"flex items-center"},r.createElement("input",{className:"w-64 my-2",type:"range",value:i,min:0,max:100,onChange:function(e){o(Number(e.currentTarget.value))}}),r.createElement("span",{className:"w-10 text-right"},Math.round(i),"%"))';
const pctNew = 'r.createElement("div",{className:"flex items-center mb-4"},r.createElement("input",{className:"w-full my-2 mr-2",type:"range",value:i,min:0,max:100,onChange:function(e){o(Number(e.currentTarget.value))}}),r.createElement("span",{className:"w-10 text-right"},Math.round(i),"%"))';
if (c.includes(pctOld)) {
  c = c.replace(pctOld, pctNew);
  console.log('progress modal: percentage slider now full width, container has mb-4');
} else if (c.includes(pctNew)) {
  console.log('progress modal: percentage slider already patched');
} else {
  console.log('progress modal: percentage anchor not found');
}

fs.writeFileSync(bundlePath, c);
console.log('progress modal: complete');
