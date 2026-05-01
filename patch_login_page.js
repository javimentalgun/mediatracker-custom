const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// Always redirect unauthenticated users to /login
const routerOld = 'to:i.noUsers?"/register":"/login"';
if (!c.includes(routerOld)) {
  console.log('login page: router redirect already patched');
} else {
  c = c.replace(routerOld, 'to:"/login"');
  console.log('login page: router now always redirects to /login');
}

// Always register /login route (remove !noUsers condition so it exists even with no users)
const loginRouteOld = '!i.noUsers&&r.createElement(Q,{path:"/login",element:r.createElement(Vv,{key:"/login"})})';
const loginRouteNew = 'r.createElement(Q,{path:"/login",element:r.createElement(Vv,{key:"/login"})})';
if (!c.includes(loginRouteOld)) {
  console.log('login page: /login route condition already patched');
} else {
  c = c.replace(loginRouteOld, loginRouteNew);
  console.log('login page: /login route now always registered');
}

// Login page: move Register button ABOVE the form (after the Login title heading)
// Include trailing comma in removal pattern to avoid double-comma syntax error
const regBtnOld_cond = 'Boolean(null==m?void 0:m.enableRegistration)&&r.createElement(ie,{to:"/register"},r.createElement("button",{className:"w-full mt-4"},r.createElement(Xe,{id:"Register"}))),';
const regBtnOld_uncond = 'r.createElement(ie,{to:"/register"},r.createElement("button",{className:"w-full mt-4"},r.createElement(Xe,{id:"Register"}))),';
const regBtnAboveAnchor = 'r.createElement("div",{className:"mb-10 text-5xl"},r.createElement(Xe,{id:"Login"})),r.createElement("form"';
const regBtnAbovePatched = 'r.createElement("div",{className:"mb-10 text-5xl"},r.createElement(Xe,{id:"Login"})),r.createElement(ie,{to:"/register"},r.createElement("button",{className:"w-full mb-6 text-lg"},r.createElement(Xe,{id:"Register"}))),r.createElement("form"';

if (c.includes(regBtnAbovePatched)) {
  console.log('login page: register button above form already done');
} else {
  // Remove from below form first
  if (c.includes(regBtnOld_cond)) {
    c = c.replace(regBtnOld_cond, '');
    console.log('login page: removed conditional register button from below form');
  } else if (c.includes(regBtnOld_uncond)) {
    c = c.replace(regBtnOld_uncond, '');
    console.log('login page: removed unconditional register button from below form');
  }
  // Add above form
  if (!c.includes(regBtnAboveAnchor)) {
    console.error('login page: login title anchor not found'); process.exit(1);
  }
  c = c.replace(regBtnAboveAnchor, regBtnAbovePatched);
  console.log('login page: Register button moved ABOVE login form');
}

fs.writeFileSync(bundlePath, c);
console.log('login page: complete');
