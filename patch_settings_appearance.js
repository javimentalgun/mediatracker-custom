const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// Inject _UD component (user dropdown):
//   Trigger: [⚙️ {user.name}] clickable block
//   Dropdown menu items: dark/light toggle, Settings, Logout
const compDef = `_UD=function(e){` +
  `var _t=e.user,_logout=e.logout;` +
  `var _x=Ne(),_dark=_x.darkMode,_setDark=_x.setDarkMode;` +
  `var _s=r.useState(false),_open=_s[0],_setOpen=_s[1];` +
  `return r.createElement("div",{style:{position:"relative",display:"inline-block"}},` +
    `r.createElement("div",{className:"flex items-center cursor-pointer select-none",onClick:function(){_setOpen(!_open)}},` +
      `r.createElement("span",{className:"material-icons text-2xl pr-1"},"settings"),` +
      `r.createElement("span",null,_t.name)` +
    `),` +
    `_open&&r.createElement("div",{style:{position:"absolute",top:"100%",right:0,zIndex:50,background:"#1e293b",border:"1px solid #475569",borderRadius:"0.25rem",padding:"0.5rem",minWidth:"12rem"},onMouseLeave:function(){_setOpen(false)}},` +
      // Dark/light toggle row
      `r.createElement("div",{className:"flex items-center justify-between py-1 px-2 cursor-pointer text-white hover:bg-slate-700",onClick:function(){_setDark(!_dark)}},` +
        `r.createElement("span",null,_dark?"Modo oscuro":"Modo claro"),` +
        `r.createElement("span",{className:"material-icons"},_dark?"light_mode":"mode_night")` +
      `),` +
      // Settings link
      `r.createElement(oe,{to:"/settings",className:function(o){return Be("block py-1 px-2 text-white hover:bg-slate-700",o.isActive&&"underline")},onClick:function(){_setOpen(false)}},"Configuración"),` +
      // Logout
      `r.createElement("a",{href:"/logout",onClick:function(e){e.preventDefault();_setOpen(false);_logout()},className:"block py-1 px-2 text-white hover:bg-slate-700"},r.createElement(Xe,{id:"Logout"}))` +
    `)` +
  `)` +
`},`;

const cardAnchor = '_v=function(e){';
if (c.includes('_UD=function(e){var _t=e.user')) {
  console.log('user dropdown: _UD already injected');
} else if (!c.includes(cardAnchor)) {
  console.error('user dropdown: anchor not found'); process.exit(1);
} else {
  c = c.replace(cardAnchor, compDef + cardAnchor);
  console.log('user dropdown: injected _UD component');
}

// Replace the top-nav user controls block with _UD
// Match either the original (with dark toggle) OR our previous gear-replacement variant
const original = 'r.createElement("span",{onClick:function(){return o(!i)},className:"pr-2 cursor-pointer select-none material-icons"},i?r.createElement(r.Fragment,null,"light_mode"):r.createElement(r.Fragment,null,"mode_night")),r.createElement("a",{href:"#/settings"},t.name),r.createElement("span",{className:"px-1"},"|"),r.createElement("a",{href:"/logout",onClick:function(e){e.preventDefault(),n()}},r.createElement(Xe,{id:"Logout"}))';
const previousGear = 'r.createElement("a",{href:"#/settings/appearance",className:"pr-2 cursor-pointer select-none material-icons text-2xl",title:"Configuración"},"settings"),r.createElement("a",{href:"#/settings"},t.name),r.createElement("span",{className:"px-1"},"|"),r.createElement("a",{href:"/logout",onClick:function(e){e.preventDefault(),n()}},r.createElement(Xe,{id:"Logout"}))';
const replacement = 'r.createElement(_UD,{user:t,logout:n})';

if (c.includes(replacement)) {
  console.log('user dropdown: top nav already replaced');
} else if (c.includes(original)) {
  c = c.replace(original, replacement);
  console.log('user dropdown: top nav replaced (from base)');
} else if (c.includes(previousGear)) {
  c = c.replace(previousGear, replacement);
  console.log('user dropdown: top nav replaced (from previous gear variant)');
} else {
  console.error('user dropdown: top nav anchor not found'); process.exit(1);
}

// Remove the standalone Apariencia tab from settings (we revert that part)
const oldAP = ',r.createElement(Q,{path:"appearance",element:r.createElement(_AP,null)})';
if (c.includes(oldAP)) {
  c = c.replace(oldAP, '');
  console.log('user dropdown: removed /settings/appearance route');
}
const oldAPMenu = ',{path:"appearance",name:"Apariencia"}';
if (c.includes(oldAPMenu)) {
  c = c.replace(oldAPMenu, '');
  console.log('user dropdown: removed Apariencia from settings menu');
}

fs.writeFileSync(bundlePath, c);
console.log('user dropdown: complete');
