const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// Strip prior version
c = c.replace(/_YT=function\(\)\{[\s\S]*?\}\)\)\)\},/g, '');

// _YT (YouTube page): OAuth section + two collapsible dropdowns (channel config + recent videos)
const compDef = '_YT=function(){' +
  'var _channelsState=r.useState([]),channels=_channelsState[0],setChannels=_channelsState[1];' +
  'var _videosState=r.useState(null),videos=_videosState[0],setVideos=_videosState[1];' +
  'var _inputState=r.useState(""),input=_inputState[0],setInput=_inputState[1];' +
  'var _msgState=r.useState(null),msg=_msgState[0],setMsg=_msgState[1];' +
  'var _busyState=r.useState(false),busy=_busyState[0],setBusy=_busyState[1];' +
  'var _openCfgState=r.useState(false),openCfg=_openCfgState[0],setOpenCfg=_openCfgState[1];' +
  'var _openVidsState=r.useState(true),openVids=_openVidsState[0],setOpenVids=_openVidsState[1];' +
  'var _authState=r.useState(null),auth=_authState[0],setAuth=_authState[1];' +
  'var _syncBusyState=r.useState(false),syncBusy=_syncBusyState[0],setSyncBusy=_syncBusyState[1];' +
  'var loadChannels=function(){fetch("/api/youtube/channels",{credentials:"same-origin"}).then(function(r){return r.json()}).then(setChannels).catch(function(){})};' +
  'var loadVideos=function(){setVideos(null);fetch("/api/youtube/feed",{credentials:"same-origin"}).then(function(r){return r.json()}).then(function(d){setVideos(d.videos||[])}).catch(function(){setVideos([])})};' +
  'var loadAuth=function(){fetch("/api/youtube/oauth/status",{credentials:"same-origin"}).then(function(r){return r.json()}).then(setAuth).catch(function(){setAuth({connected:false})})};' +
  'var connectOauth=function(){window.location="/api/youtube/oauth/start"};' +
  'var syncOauth=function(){' +
    'setSyncBusy(true);setMsg(null);' +
    'fetch("/api/youtube/oauth/sync",{method:"POST",credentials:"same-origin"})' +
      '.then(function(r){return r.json()})' +
      '.then(function(d){setSyncBusy(false);if(d.error){setMsg({type:"error",text:d.error})}else{setMsg({type:"success",text:"Suscripciones sincronizadas: añadidas "+d.added+", saltadas (ya estaban) "+d.skipped+", total "+d.total});loadChannels();loadVideos()}})' +
      '.catch(function(e){setSyncBusy(false);setMsg({type:"error",text:String(e.message||e)})})' +
  '};' +
  'var disconnectOauth=function(){' +
    'if(!confirm("¿Desvincular tu cuenta de YouTube? Los canales ya añadidos se quedan; solo se borra el token de acceso."))return;' +
    'fetch("/api/youtube/oauth",{method:"DELETE",credentials:"same-origin"}).then(function(){loadAuth()})' +
  '};' +
  'r.useEffect(function(){loadChannels();loadVideos();loadAuth()},[]);' +
  'var addChannel=function(){' +
    'if(!input.trim())return;' +
    'setBusy(true);setMsg(null);' +
    'fetch("/api/youtube/channels",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({input:input.trim()})})' +
      '.then(function(r){return r.json()})' +
      '.then(function(d){setBusy(false);if(d.error){setMsg({type:"error",text:d.error})}else{setInput("");setMsg({type:"success",text:"Añadido: "+d.channel.name});loadChannels();loadVideos()}})' +
      '.catch(function(e){setBusy(false);setMsg({type:"error",text:String(e.message||e)})})' +
  '};' +
  'var removeChannel=function(id){' +
    'if(!confirm("¿Quitar este canal?"))return;' +
    'fetch("/api/youtube/channels/"+id,{method:"DELETE",credentials:"same-origin"}).then(function(r){return r.json()}).then(function(){loadChannels();loadVideos()})' +
  '};' +
  'var formatDate=function(s){try{var d=new Date(s);var diff=(Date.now()-d.getTime())/86400000;if(diff<1)return "hoy";if(diff<2)return "ayer";if(diff<7)return Math.floor(diff)+" días";return d.toLocaleDateString("es",{day:"2-digit",month:"2-digit",year:"numeric"})}catch(_){return s}};' +
  'return r.createElement("div",{className:"p-2"},' +
    'r.createElement("h2",{className:"text-2xl mb-4 px-2"},"YouTube"),' +
    // OAuth account-link section (always visible)
    'auth&&r.createElement("div",{className:"mb-3 px-2 flex flex-wrap items-center gap-2"},' +
      '!auth.connected?' +
        'r.createElement("button",{onClick:connectOauth,className:"px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded shadow inline-flex items-center gap-2"},' +
          'r.createElement("i",{className:"material-icons"},"link"),' +
          'xo._("Link YouTube account")' +
        '):' +
        'r.createElement(r.Fragment,null,' +
          'r.createElement("span",{className:"px-3 py-1 rounded bg-green-700 text-white text-sm inline-flex items-center gap-1"},' +
            'r.createElement("i",{className:"material-icons text-base"},"check_circle"),' +
            'xo._("Connected as")+" "+(auth.email||"?")' +
          '),' +
          'r.createElement("button",{onClick:syncOauth,disabled:syncBusy,className:"px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white rounded text-sm inline-flex items-center gap-1"},' +
            'r.createElement("i",{className:"material-icons text-base"},syncBusy?"hourglass_top":"sync"),' +
            'syncBusy?"...":xo._("Sync my subscriptions")' +
          '),' +
          'r.createElement("button",{onClick:disconnectOauth,className:"px-2 py-1 text-sm text-red-500 hover:text-red-700 underline"},xo._("Disconnect"))' +
        ')' +
    '),' +
    // Section 1: configure channels (collapsible)
    'r.createElement("div",{className:"mb-3 border border-slate-300 dark:border-slate-700 rounded overflow-hidden"},' +
      'r.createElement("button",{onClick:function(){setOpenCfg(!openCfg)},className:"w-full text-left text-xl font-semibold px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-2"},' +
        'r.createElement("i",{className:"material-icons"},openCfg?"expand_more":"chevron_right"),' +
        '"Mis canales (" + channels.length + ")"' +
      '),' +
      'openCfg&&r.createElement("div",{className:"p-3"},' +
        'r.createElement("p",{className:"text-sm text-gray-600 dark:text-gray-300 mb-2"},"Pega la URL de un canal de YouTube (ej. youtube.com/@LinusTechTips) o el ID UCxxxx."),' +
        'r.createElement("div",{className:"flex gap-2 mb-3"},' +
          'r.createElement("input",{type:"text",placeholder:"youtube.com/@canal o UC...",value:input,onChange:function(e){setInput(e.currentTarget.value)},onKeyDown:function(e){if(e.key==="Enter")addChannel()},className:"flex-1 px-3 py-1 rounded border dark:bg-slate-800 dark:border-slate-600"}),' +
          'r.createElement("button",{onClick:addChannel,disabled:busy,className:"px-4 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-500 text-white rounded"},busy?"...":xo._("Add"))' +
        '),' +
        'msg?r.createElement("div",{className:"mb-3 p-2 rounded text-sm "+(msg.type==="success"?"bg-green-700 text-white":"bg-red-700 text-white")},msg.text):null,' +
        'channels.length===0?r.createElement("p",{className:"text-gray-500 italic"},xo._("No channels yet")):r.createElement("ul",{className:"flex flex-col gap-1"},' +
          'channels.map(function(ch){' +
            'return r.createElement("li",{key:ch.id,className:"flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded"},' +
              'r.createElement("a",{href:"https://www.youtube.com/channel/"+ch.id,target:"_blank",rel:"noopener noreferrer",className:"underline text-blue-600 dark:text-blue-400"},ch.name),' +
              'r.createElement("button",{onClick:function(){removeChannel(ch.id)},className:"text-sm text-red-500 hover:text-red-700"},"Quitar")' +
            ')' +
          '})' +
        ')' +
      ')' +
    '),' +
    // Section 2: recent videos (collapsible)
    'r.createElement("div",{className:"mb-3 border border-slate-300 dark:border-slate-700 rounded overflow-hidden"},' +
      'r.createElement("button",{onClick:function(){setOpenVids(!openVids)},className:"w-full text-left text-xl font-semibold px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-2"},' +
        'r.createElement("i",{className:"material-icons"},openVids?"expand_more":"chevron_right"),' +
        'xo._("Recent videos") + (videos?(" (" + videos.length + ")"):"")' +
      '),' +
      'openVids&&r.createElement("div",{className:"p-3"},' +
        'videos===null?r.createElement("p",{className:"text-gray-500"},"Cargando..."):' +
        'videos.length===0?r.createElement("p",{className:"text-gray-500 italic"},xo._("No videos")):' +
        'r.createElement("div",{className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"},' +
          'videos.map(function(v){' +
            'return r.createElement("a",{key:v.videoId,href:v.url,target:"_blank",rel:"noopener noreferrer",className:"flex flex-col bg-slate-50 dark:bg-slate-800 rounded overflow-hidden hover:bg-slate-100 dark:hover:bg-slate-700"},' +
              'r.createElement("img",{src:v.thumbnail,alt:v.title,className:"w-full aspect-video object-cover"}),' +
              'r.createElement("div",{className:"p-2"},' +
                'r.createElement("div",{className:"font-semibold text-sm leading-tight mb-1 line-clamp-2"},v.title),' +
                'r.createElement("div",{className:"text-xs text-gray-500"},v.channelName+" · "+formatDate(v.published))' +
              ')' +
            ')' +
          '})' +
        ')' +
      ')' +
    ')' +
  ')' +
'},';

const cardAnchor = '_v=function(e){';
if (!c.includes(cardAnchor)) { console.error('youtube frontend: _v anchor not found'); process.exit(1); }
c = c.replace(cardAnchor, compDef + cardAnchor);
console.log('youtube frontend: injected _YT component');

// Add /youtube route
const routeAnchor = 'r.createElement(Q,{path:"/lists",element:r.createElement(SS,{key:"/lists"})})';
const routePatched = 'r.createElement(Q,{path:"/youtube",element:r.createElement(_YT,null)}),' + routeAnchor;
if (c.includes('path:"/youtube"')) { console.log('youtube frontend: route already added'); }
else if (!c.includes(routeAnchor)) { console.error('youtube frontend: route anchor not found'); process.exit(1); }
else { c = c.replace(routeAnchor, routePatched); console.log('youtube frontend: added /youtube route'); }

// Add YouTube menu entry next to Downloaded
const menuAnchor = '{path:"/lists",name:xo._("Lists")},{path:"/watchlist",name:xo._("Watchlist")},{path:"/downloaded",name:xo._("Downloaded")}]';
const menuPatched = '{path:"/lists",name:xo._("Lists")},{path:"/watchlist",name:xo._("Watchlist")},{path:"/downloaded",name:xo._("Downloaded")},{path:"/youtube",name:"YouTube"}]';
if (c.includes('{path:"/youtube",name:"YouTube"}')) { console.log('youtube frontend: menu already added'); }
else if (!c.includes(menuAnchor)) { console.error('youtube frontend: menu anchor not found'); process.exit(1); }
else { c = c.replace(menuAnchor, menuPatched); console.log('youtube frontend: added YouTube menu entry'); }

// Add /youtube to TOP nav (to the right of Books). Patch_menu_split.js defines
// TOP_PATHS = ["/","/tv","/movies","/games","/books"] — extend it with /youtube.
const topOld = '["/","/tv","/movies","/games","/books"]';
const topNew = '["/","/tv","/movies","/games","/books","/youtube"]';
if (c.includes(topNew)) { console.log('youtube frontend: top nav already includes /youtube'); }
else if (!c.includes(topOld)) { console.log('youtube frontend: top nav anchor not found (skipping)'); }
else { c = c.split(topOld).join(topNew); console.log('youtube frontend: added /youtube to top nav (right of Books)'); }

// /youtube goes ONLY in the top nav. Strip it from the side dropdown if a prior
// version added it there.
const sideWithYt = '["/upcoming","/in-progress","/calendar","/lists","/watchlist","/downloaded","/youtube"]';
const sideWithoutYt = '["/upcoming","/in-progress","/calendar","/lists","/watchlist","/downloaded"]';
if (c.includes(sideWithYt)) {
  c = c.replace(sideWithYt, sideWithoutYt);
  console.log('youtube frontend: removed /youtube from side hamburger (top nav only)');
}

fs.writeFileSync(bundlePath, c);
console.log('youtube frontend: complete');
