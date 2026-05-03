const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// 1. Bootstrap rewrite: prefer localStorage.uiLang over navigator.language.
// Original: OW=AW.includes(zW)?zW:"en"
// New:      OW=function(){try{var u=localStorage.getItem("uiLang");if(u&&AW.includes(u))return u}catch(_){}return AW.includes(zW)?zW:"en"}()
{
  const oldExpr = 'OW=AW.includes(zW)?zW:"en"';
  const newExpr = 'OW=function(){try{var u=localStorage.getItem("uiLang");if(u&&AW.includes(u))return u}catch(_){}return AW.includes(zW)?zW:"en"}()';
  if (c.includes(newExpr)) {
    console.log('ui-lang switcher: bootstrap already patched');
  } else if (!c.includes(oldExpr)) {
    console.error('ui-lang switcher: bootstrap anchor not found'); process.exit(1);
  } else {
    c = c.replace(oldExpr, newExpr);
    console.log('ui-lang switcher: bootstrap rewritten to honor localStorage.uiLang');
  }
}

// 2. Inject "UI language" dropdown immediately before the "Server language" one.
// Reuses the same `my` wrapper component and the same option list as Server language,
// plus a sentinel "Auto (browser)" empty value that clears localStorage.uiLang.
{
  const serverLangAnchor = 'r.createElement(my,{title:xo._("Server language")';
  const uiLangBlock =
    'r.createElement(my,{title:xo._("UI language")},' +
      'r.createElement("select",{' +
        'value:(function(){try{return localStorage.getItem("uiLang")||""}catch(_){return ""}})(),' +
        'onChange:function(e){' +
          'var v=e.currentTarget.value;' +
          'try{if(v){localStorage.setItem("uiLang",v)}else{localStorage.removeItem("uiLang")}}catch(_){}' +
          'location.reload()' +
        '}' +
      '},' +
        'r.createElement("option",{value:""},xo._("Auto (browser)")),' +
        'r.createElement("option",{value:"da"},"Danish"),' +
        'r.createElement("option",{value:"de"},"German"),' +
        'r.createElement("option",{value:"en"},"English"),' +
        'r.createElement("option",{value:"es"},"Spanish"),' +
        'r.createElement("option",{value:"fr"},"French"),' +
        'r.createElement("option",{value:"ko"},"Korean"),' +
        'r.createElement("option",{value:"pt"},"Portuguese")' +
      ')' +
    '),';

  // Idempotency: detect by the sentinel "Auto (browser)" wrapped in xo._
  if (c.includes('xo._("Auto (browser)")')) {
    console.log('ui-lang switcher: dropdown already injected');
  } else if (!c.includes(serverLangAnchor)) {
    console.error('ui-lang switcher: Server language anchor not found'); process.exit(1);
  } else {
    c = c.replace(serverLangAnchor, uiLangBlock + serverLangAnchor);
    console.log('ui-lang switcher: injected UI language dropdown before Server language');
  }
}

fs.writeFileSync(bundlePath, c);
console.log('ui-lang switcher: complete');
