// Auto-generated mega-patch: patch_08_i18n_theater_homepage.js
// Bundles 21 original patch_*.js scripts in execution order.
// Each constituent is wrapped in an IIFE so its top-level vars (const fs = ...)
// don't collide; `process.exit(0)` is rewritten to `return` so an early-exit
// idempotency guard inside one constituent doesn't abort the whole mega-patch.

// ===== patch_ui_language_switcher.js =====
;(() => {
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

})();

// ===== patch_i18n_custom.js =====
;(() => {
const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// Custom translation keys, EN as the canonical key (Lingui convention).
// Each key maps to translations across the 6 non-EN locales the bundle supports
// (es, pt, fr, de, da, ko). EN is identity (key === value).
//
// Confidence: ES is native, PT/FR/DE are solid, DA and KO are best-effort UI translations
// for short labels and degrade gracefully on long descriptive paragraphs — review if you
// expect Danish or Korean users to read those.
//
// To extend: add a new key with all 6 translations + use `xo._("Key")` in patches.
// Documented in STRINGS.md.
const customKeys = {
  // === UI language switcher (patch_ui_language_switcher.js) ===
  'UI language':                  { es: 'Idioma de la interfaz', pt: 'Idioma da interface', fr: "Langue de l'interface", de: 'UI-Sprache', da: 'UI-sprog', ko: 'UI 언어' },
  'Auto (browser)':               { es: 'Automático (navegador)', pt: 'Automático (navegador)', fr: 'Automatique (navigateur)', de: 'Automatisch (Browser)', da: 'Automatisk (browser)', ko: '자동 (브라우저)' },

  // === Games "Visto" split (patch_games_seen_split.js) ===
  'Watched and played':           { es: 'Vistos y jugados', pt: 'Vistos e jogados', fr: 'Vus et joués', de: 'Gesehen und gespielt', da: 'Set og spillet', ko: '시청 및 플레이' },

  // === Actively in-progress button (patch_actively_in_progress_frontend.js) ===
  'Mark as in progress':          { es: 'Marcar como en proceso', pt: 'Marcar como em curso', fr: "Marquer comme en cours", de: 'Als laufend markieren', da: 'Markér som i gang', ko: '진행 중으로 표시' },
  'Stop being in progress':       { es: 'Quitar de en proceso', pt: 'Tirar de em curso', fr: 'Retirer de en cours', de: 'Aus „laufend" entfernen', da: 'Fjern fra i gang', ko: '진행 중에서 제거' },

  // === Mark as seen / watched button (patch_mark_watched_button.js) ===
  'Mark as seen':                 { es: 'Marcar como visto', pt: 'Marcar como visto', fr: 'Marquer comme vu', de: 'Als gesehen markieren', da: 'Markér som set', ko: '시청함으로 표시' },
  'Stop being seen':              { es: 'Quitar de visto', pt: 'Tirar de visto', fr: 'Retirer de vu', de: 'Aus „gesehen" entfernen', da: 'Fjern fra set', ko: '시청함에서 제거' },

  // === Hamburger menu tooltips (patch_menu_split.js _DD) ===
  'In progress menu desc':        { es: 'Lo que estás viendo y lo que ya está disponible para empezar (estrenado y en watchlist)', pt: 'O que estás a ver e o que já está disponível para começar (lançado e na watchlist)', fr: 'Ce que vous regardez et ce qui est désormais disponible (sorti et dans la watchlist)', de: 'Was du gerade siehst und was jetzt verfügbar ist (erschienen und auf der Watchlist)', da: 'Hvad du ser nu og hvad der er klar til at starte (udgivet og på watchlist)', ko: '보고 있는 항목과 이미 시작할 수 있는 항목 (출시되어 watchlist에 있음)' },
  'Upcoming menu desc':           { es: 'Próximas releases en tu biblioteca (capítulos, pelis, juegos, libros)', pt: 'Próximos lançamentos na tua biblioteca (episódios, filmes, jogos, livros)', fr: 'Prochaines sorties dans votre bibliothèque (épisodes, films, jeux, livres)', de: 'Kommende Veröffentlichungen in deiner Bibliothek (Folgen, Filme, Spiele, Bücher)', da: 'Kommende udgivelser i dit bibliotek (afsnit, film, spil, bøger)', ko: '라이브러리의 곧 출시될 항목 (에피소드/영화/게임/책)' },
  'Watchlist menu desc':          { es: 'Lo que quieres ver, jugar o leer en el futuro', pt: 'O que queres ver, jogar ou ler no futuro', fr: 'Ce que vous voulez regarder, jouer ou lire à l\'avenir', de: 'Was du in Zukunft sehen, spielen oder lesen willst', da: 'Det du gerne vil se, spille eller læse i fremtiden', ko: '앞으로 보거나 플레이하거나 읽고 싶은 항목' },
  'Calendar menu desc':           { es: 'Calendario con las fechas de salida de tu biblioteca', pt: 'Calendário com as datas de lançamento da tua biblioteca', fr: 'Calendrier avec les dates de sortie de votre bibliothèque', de: 'Kalender mit den Veröffentlichungsterminen deiner Bibliothek', da: 'Kalender med udgivelsesdatoer fra dit bibliotek', ko: '라이브러리 출시일 캘린더' },
  'Lists menu desc':              { es: 'Tus listas personalizadas', pt: 'As tuas listas personalizadas', fr: 'Vos listes personnalisées', de: 'Deine eigenen Listen', da: 'Dine egne lister', ko: '내 사용자 지정 목록' },
  'Dropped menu desc':            { es: 'Items que has marcado como abandonados', pt: 'Itens que marcaste como abandonados', fr: 'Éléments que vous avez marqués comme abandonnés', de: 'Einträge, die du als aufgegeben markiert hast', da: 'Elementer du har markeret som opgivet', ko: '중단으로 표시한 항목' },
  'Downloaded menu desc':         { es: 'Items que has marcado como descargados', pt: 'Itens que marcaste como baixados', fr: 'Éléments que vous avez marqués comme téléchargés', de: 'Einträge, die du als heruntergeladen markiert hast', da: 'Elementer du har markeret som hentet', ko: '다운로드됨으로 표시한 항목' },

  // === Sections / pages ===
  'Downloaded':                   { es: 'Descargado', pt: 'Baixado', fr: 'Téléchargé', de: 'Heruntergeladen', da: 'Hentet', ko: '다운로드됨' },
  'Watchlist':                    { es: 'Lista de seguimiento', pt: 'Lista para assistir', fr: 'À voir', de: 'Beobachtungsliste', da: 'Watchlist', ko: '시청 목록' },
  'Dropped':                      { es: 'Abandonados', pt: 'Abandonados', fr: 'Abandonnés', de: 'Aufgegeben', da: 'Opgivet', ko: '중단' },
  'Mark as dropped':              { es: 'Marcar como abandonada', pt: 'Marcar como abandonada', fr: 'Marquer comme abandonné', de: 'Als aufgegeben markieren', da: 'Markér som opgivet', ko: '중단으로 표시' },
  'Resume':                       { es: 'Reanudar', pt: 'Retomar', fr: 'Reprendre', de: 'Fortsetzen', da: 'Genoptag', ko: '재개' },
  'Backup':                       { es: 'Backup', pt: 'Backup', fr: 'Sauvegarde', de: 'Sicherung', da: 'Sikkerhedskopi', ko: '백업' },
  'Movies':                       { es: 'Películas', pt: 'Filmes', fr: 'Films', de: 'Filme', da: 'Film', ko: '영화' },
  'Tv':                           { es: 'Series', pt: 'Séries', fr: 'Séries', de: 'Serien', da: 'Serier', ko: 'TV' },
  'Games':                        { es: 'Juegos', pt: 'Jogos', fr: 'Jeux', de: 'Spiele', da: 'Spil', ko: '게임' },
  'Books':                        { es: 'Libros', pt: 'Livros', fr: 'Livres', de: 'Bücher', da: 'Bøger', ko: '책' },

  // === Jellyfin ===
  'Play in Jellyfin':             { es: 'Reproducir en Jellyfin', pt: 'Reproduzir no Jellyfin', fr: 'Lire dans Jellyfin', de: 'In Jellyfin abspielen', da: 'Afspil i Jellyfin', ko: 'Jellyfin에서 재생' },
  'Available on Jellyfin':        { es: 'Disponible en Jellyfin', pt: 'Disponível no Jellyfin', fr: 'Disponible sur Jellyfin', de: 'Verfügbar auf Jellyfin', da: 'Tilgængelig på Jellyfin', ko: 'Jellyfin에서 사용 가능' },

  // === Backup / import / export ===
  'Library search':               { es: 'Buscar en biblioteca', pt: 'Pesquisa na biblioteca', fr: 'Recherche dans la bibliothèque', de: 'Bibliothekssuche', da: 'Bibliotekssøgning', ko: '라이브러리 검색' },
  'Imports JSON':                 { es: 'Importar JSON', pt: 'Importar JSON', fr: 'Importer JSON', de: 'JSON importieren', da: 'Importer JSON', ko: 'JSON 가져오기' },
  'Letterboxd CSV':               { es: 'CSV Letterboxd', pt: 'CSV Letterboxd', fr: 'CSV Letterboxd', de: 'Letterboxd CSV', da: 'Letterboxd CSV', ko: 'Letterboxd CSV' },
  'Catalog cleanup':              { es: 'Limpiar catálogo', pt: 'Limpar catálogo', fr: 'Nettoyer le catalogue', de: 'Katalog aufräumen', da: 'Oprydning i kataloget', ko: '카탈로그 정리' },
  'Detect duplicates':            { es: 'Detectar duplicados', pt: 'Detectar duplicados', fr: 'Détecter les doublons', de: 'Duplikate erkennen', da: 'Find dubletter', ko: '중복 감지' },
  'Restore':                      { es: 'Restaurar', pt: 'Restaurar', fr: 'Restaurer', de: 'Wiederherstellen', da: 'Gendan', ko: '복원' },
  'Find and merge':               { es: 'Buscar y fusionar', pt: 'Buscar e mesclar', fr: 'Chercher et fusionner', de: 'Suchen und zusammenführen', da: 'Find og flet', ko: '찾아서 병합' },
  'Automatic backups':            { es: 'Backups automáticos', pt: 'Backups automáticos', fr: 'Sauvegardes automatiques', de: 'Automatische Sicherungen', da: 'Automatiske sikkerhedskopier', ko: '자동 백업' },
  'Purge orphan catalog':         { es: 'Purgar catálogo huérfano', pt: 'Purgar catálogo órfão', fr: 'Purger le catalogue orphelin', de: 'Verwaiste Einträge entfernen', da: 'Ryd forældreløst katalog', ko: '고아 카탈로그 제거' },
  'Delete orphan catalog items?': { es: '¿Borrar items huérfanos del catálogo?', pt: 'Excluir itens órfãos do catálogo?', fr: 'Supprimer les éléments orphelins du catalogue ?', de: 'Verwaiste Katalogeinträge löschen?', da: 'Slet forældreløse katalogposter?', ko: '고아 카탈로그 항목을 삭제할까요?' },

  // === Detail page / progress modal ===
  'Read':                         { es: 'Leído', pt: 'Lido', fr: 'Lu', de: 'Gelesen', da: 'Læst', ko: '읽음' },
  'Read progress':                { es: 'Progreso leído', pt: 'Progresso de leitura', fr: 'Progression de lecture', de: 'Lesefortschritt', da: 'Læsefremgang', ko: '읽기 진행률' },
  'I finished reading':           { es: 'Terminé de leerlo', pt: 'Terminei de ler', fr: "J'ai fini de le lire", de: 'Ich habe es zu Ende gelesen', da: 'Jeg er færdig med at læse', ko: '다 읽었습니다' },
  'I finished listening':         { es: 'Terminé de escucharlo', pt: 'Terminei de ouvir', fr: "J'ai fini de l'écouter", de: 'Ich habe es zu Ende gehört', da: 'Jeg er færdig med at lytte', ko: '다 들었습니다' },
  'Quick':                        { es: 'Rápido', pt: 'Rápido', fr: 'Rapide', de: 'Schnell', da: 'Hurtig', ko: '빠르게' },
  'Duration':                     { es: 'Duración', pt: 'Duração', fr: 'Durée', de: 'Dauer', da: 'Varighed', ko: '시간' },
  'last time':                    { es: 'última vez', pt: 'última vez', fr: 'dernière fois', de: 'zuletzt', da: 'sidste gang', ko: '마지막' },
  'Set total duration':           { es: 'Establecer duración total', pt: 'Definir duração total', fr: 'Définir la durée totale', de: 'Gesamtdauer festlegen', da: 'Angiv samlet varighed', ko: '총 시간 설정' },
  'Set duration in hours and minutes': { es: 'Establecer duración en horas y minutos', pt: 'Definir duração em horas e minutos', fr: 'Définir la durée en heures et minutes', de: 'Dauer in Stunden und Minuten festlegen', da: 'Angiv varighed i timer og minutter', ko: '시간/분으로 설정' },
  'Set total pages':              { es: 'Establecer total páginas', pt: 'Definir total de páginas', fr: 'Définir le total de pages', de: 'Gesamtseitenzahl festlegen', da: 'Angiv samlet sideantal', ko: '총 페이지 수 설정' },
  'pages':                        { es: 'págs.', pt: 'págs.', fr: 'pages', de: 'S.', da: 'sider', ko: '페이지' },
  '(empty)':                      { es: '(vacía)', pt: '(vazia)', fr: '(vide)', de: '(leer)', da: '(tom)', ko: '(비어 있음)' },

  // === Dupes ===
  'WINNER (most use)':            { es: 'GANADOR (más uso)', pt: 'VENCEDOR (mais usado)', fr: 'GAGNANT (plus utilisé)', de: 'GEWINNER (meiste Nutzung)', da: 'VINDER (mest brugt)', ko: '위너 (가장 많이 사용)' },

  // === Games filter dropdown ===
  'Rated':                        { es: 'Puntuado', pt: 'Avaliado', fr: 'Noté', de: 'Bewertet', da: 'Bedømt', ko: '평가됨' },
  'Unrated':                      { es: 'Sin puntuar', pt: 'Sem avaliação', fr: 'Non noté', de: 'Unbewertet', da: 'Ubedømt', ko: '미평가' },
  'On list':                      { es: 'En lista', pt: 'Na lista', fr: 'Dans la liste', de: 'In der Liste', da: 'På listen', ko: '목록에 있음' },
  'Played':                       { es: 'Jugado', pt: 'Jogado', fr: 'Joué', de: 'Gespielt', da: 'Spillet', ko: '플레이함' },
  'Seen':                         { es: 'Visto', pt: 'Visto', fr: 'Vu', de: 'Gesehen', da: 'Set', ko: '시청함' },
  'Listened':                     { es: 'Escuchado', pt: 'Ouvido', fr: 'Écouté', de: 'Gehört', da: 'Lyttet', ko: '청취함' },
  'Watched':                      { es: 'Visto', pt: 'Assistido', fr: 'Regardé', de: 'Angesehen', da: 'Set', ko: '시청함' },
  'Just watched':                 { es: 'Solo visto', pt: 'Só assistido', fr: 'Seulement regardé', de: 'Nur angesehen', da: 'Kun set', ko: '시청만 함' },

  // === Theater (patch_theater_nav.js + patch_theater_*.js) ===
  'Theater':                      { es: 'Teatro', pt: 'Teatro', fr: 'Théâtre', de: 'Theater', da: 'Teater', ko: '연극' },

  // === Backup page (long descriptive strings) ===
  'Download':                     { es: 'Descargar', pt: 'Baixar', fr: 'Télécharger', de: 'Herunterladen', da: 'Hent', ko: '다운로드' },
  'Download .db (binary)':        { es: 'Descargar .db (binario)', pt: 'Baixar .db (binário)', fr: 'Télécharger .db (binaire)', de: '.db herunterladen (Binär)', da: 'Hent .db (binær)', ko: '.db 다운로드 (바이너리)' },
  'Export JSON':                  { es: 'Exportar JSON', pt: 'Exportar JSON', fr: 'Exporter JSON', de: 'JSON exportieren', da: 'Eksporter JSON', ko: 'JSON 내보내기' },
  'Letterboxd-importable (movies only)': { es: 'Importable en letterboxd.com (solo películas)', pt: 'Importável no letterboxd.com (só filmes)', fr: 'Importable dans letterboxd.com (films uniquement)', de: 'In letterboxd.com importierbar (nur Filme)', da: 'Kan importeres i letterboxd.com (kun film)', ko: 'letterboxd.com에서 가져올 수 있음 (영화만)' },
  'Upload and restore':           { es: 'Subir y restaurar', pt: 'Enviar e restaurar', fr: 'Téléverser et restaurer', de: 'Hochladen und wiederherstellen', da: 'Upload og gendan', ko: '업로드 후 복원' },
  'Backup heading':               { es: 'Copia de seguridad', pt: 'Cópia de segurança', fr: 'Sauvegarde', de: 'Sicherung', da: 'Sikkerhedskopi', ko: '백업' },
  'Download backup desc':         { es: 'Descarga una copia completa de tu base de datos. Guárdala en un sitio seguro.', pt: 'Baixe uma cópia completa do seu banco de dados. Guarde em local seguro.', fr: 'Téléchargez une copie complète de votre base de données. Conservez-la dans un endroit sûr.', de: 'Lade eine vollständige Kopie deiner Datenbank herunter. Bewahre sie an einem sicheren Ort auf.', da: 'Hent en komplet kopi af din database. Opbevar den et sikkert sted.', ko: '데이터베이스 전체 사본을 다운로드하세요. 안전한 곳에 보관하세요.' },
  'Restore desc':                 { es: 'Sube un .db descargado anteriormente. Tras la subida es necesario reiniciar el contenedor para aplicar.', pt: 'Envie um .db baixado anteriormente. Após o envio, é necessário reiniciar o contêiner para aplicar.', fr: "Envoyez un .db téléchargé auparavant. Après l'envoi, il faut redémarrer le conteneur pour appliquer.", de: 'Lade eine zuvor heruntergeladene .db hoch. Nach dem Hochladen muss der Container neu gestartet werden, um die Änderungen zu übernehmen.', da: 'Upload en .db, der tidligere er hentet. Efter upload skal containeren genstartes for at anvende ændringerne.', ko: '이전에 다운로드한 .db를 업로드하세요. 업로드 후 컨테이너를 다시 시작해야 적용됩니다.' },
  'Import JSON desc':             { es: 'Sube un mediatoc-export-*.json para fusionarlo con tus datos actuales. Los items se emparejan por TMDB/IMDB/IGDB ID y se evitan duplicados.', pt: 'Envie um mediatoc-export-*.json para mesclá-lo com seus dados atuais. Os itens são pareados por TMDB/IMDB/IGDB ID e duplicados são evitados.', fr: 'Envoyez un mediatoc-export-*.json pour le fusionner avec vos données actuelles. Les éléments sont appariés par ID TMDB/IMDB/IGDB et les doublons sont évités.', de: 'Lade eine mediatoc-export-*.json hoch, um sie mit deinen aktuellen Daten zusammenzuführen. Einträge werden über TMDB/IMDB/IGDB-ID abgeglichen, Duplikate werden vermieden.', da: 'Upload en mediatoc-export-*.json for at flette den med dine aktuelle data. Elementer matches via TMDB/IMDB/IGDB ID, og dubletter undgås.', ko: 'mediatoc-export-*.json을 업로드하여 현재 데이터와 병합하세요. 항목은 TMDB/IMDB/IGDB ID로 매칭되며 중복이 방지됩니다.' },
  'Create missing items':         { es: 'Crear items que no existan en MT (se rellenarán los metadatos automáticamente al cabo de unas horas)', pt: 'Criar itens que não existam em MT (os metadados serão preenchidos automaticamente em algumas horas)', fr: "Créer des éléments qui n'existent pas dans MT (les métadonnées seront remplies automatiquement après quelques heures)", de: 'Einträge anlegen, die in MT nicht existieren (Metadaten werden in einigen Stunden automatisch ergänzt)', da: 'Opret elementer, som ikke findes i MT (metadata udfyldes automatisk i løbet af nogle timer)', ko: 'MT에 없는 항목 생성 (메타데이터는 몇 시간 내에 자동으로 채워집니다)' },
  'Catalog cleanup desc':         { es: 'Elimina items que MediaTracker registró durante búsquedas pero que tú nunca añadiste a una lista, marcaste como visto, valoraste o iniciaste.', pt: 'Remove itens que MediaTracker registrou em buscas mas que você nunca adicionou a uma lista, marcou como visto, avaliou ou iniciou.', fr: "Supprime les éléments que MediaTracker a enregistrés lors des recherches mais que vous n'avez jamais ajoutés à une liste, marqués comme vus, notés ou commencés.", de: 'Entfernt Einträge, die MediaTracker bei Suchen registriert hat, die du aber nie in eine Liste aufgenommen, als gesehen markiert, bewertet oder begonnen hast.', da: 'Fjerner elementer, som MediaTracker registrerede under søgninger, men som du aldrig tilføjede til en liste, markerede som set, bedømte eller startede.', ko: 'MediaTracker가 검색 중에 등록했지만 목록에 추가하거나, 시청함으로 표시하거나, 평가하거나, 시작한 적이 없는 항목을 제거합니다.' },
  'Auto backups desc':            { es: 'Un cron del host copia data.db cada noche a las 3 AM al directorio de backups configurado (retención 7d / 4w / 3m).', pt: 'Um cron do host copia data.db todas as noites às 3 AM para o diretório de backups configurado (retenção 7d / 4w / 3m).', fr: "Un cron de l'hôte copie data.db chaque nuit à 3 h dans le dossier de sauvegardes configuré (rétention 7j / 4s / 3m).", de: 'Ein Cron auf dem Host kopiert data.db jede Nacht um 3 Uhr in das konfigurierte Backup-Verzeichnis (Aufbewahrung 7T / 4W / 3M).', da: 'En cron på værten kopierer data.db hver nat kl. 3 til den konfigurerede backup-mappe (opbevaring 7d / 4u / 3m).', ko: '호스트의 cron이 매일 밤 3시에 data.db를 설정된 백업 디렉터리로 복사합니다 (보관 7d / 4w / 3m).' },

  // === Dupes page ===
  'Dupes desc backup':            { es: 'Items con mismo título+año pero IDs distintos (creados al importar de Trakt + USB).', pt: 'Itens com mesmo título+ano mas IDs diferentes (criados ao importar de Trakt + USB).', fr: 'Éléments avec le même titre+année mais IDs différents (créés lors de l\'import de Trakt + USB).', de: 'Einträge mit gleichem Titel+Jahr aber unterschiedlichen IDs (entstanden beim Import aus Trakt + USB).', da: 'Elementer med samme titel+år men forskellige ID\'er (oprettet ved import fra Trakt + USB).', ko: '제목+연도가 같지만 ID가 다른 항목 (Trakt + USB에서 가져올 때 생성됨).' },

  // === YouTube section ===
  'Add':                          { es: 'Añadir', pt: 'Adicionar', fr: 'Ajouter', de: 'Hinzufügen', da: 'Tilføj', ko: '추가' },
  'Recent videos':                { es: 'Vídeos recientes', pt: 'Vídeos recentes', fr: 'Vidéos récentes', de: 'Neueste Videos', da: 'Seneste videoer', ko: '최근 동영상' },
  'No channels yet':              { es: 'No hay canales configurados aún.', pt: 'Ainda não há canais configurados.', fr: "Aucune chaîne configurée pour l'instant.", de: 'Noch keine Kanäle eingerichtet.', da: 'Ingen kanaler oprettet endnu.', ko: '아직 구성된 채널이 없습니다.' },
  'No videos':                    { es: 'No hay vídeos. Añade canales arriba.', pt: 'Sem vídeos. Adicione canais acima.', fr: 'Aucune vidéo. Ajoutez des chaînes ci-dessus.', de: 'Keine Videos. Füge oben Kanäle hinzu.', da: 'Ingen videoer. Tilføj kanaler ovenfor.', ko: '동영상이 없습니다. 위에 채널을 추가하세요.' },

  // === YouTube OAuth ===
  'Link YouTube account':         { es: 'Vincular cuenta de YouTube', pt: 'Vincular conta do YouTube', fr: 'Lier mon compte YouTube', de: 'YouTube-Konto verknüpfen', da: 'Tilknyt YouTube-konto', ko: 'YouTube 계정 연결' },
  'Sync my subscriptions':        { es: 'Sincronizar mis suscripciones', pt: 'Sincronizar minhas inscrições', fr: 'Synchroniser mes abonnements', de: 'Meine Abos synchronisieren', da: 'Synkroniser mine abonnementer', ko: '내 구독 동기화' },
  'Disconnect':                   { es: 'Desvincular', pt: 'Desvincular', fr: 'Déconnecter', de: 'Trennen', da: 'Frakobl', ko: '연결 해제' },
  'Connected as':                 { es: 'Conectado como', pt: 'Conectado como', fr: 'Connecté en tant que', de: 'Verbunden als', da: 'Forbundet som', ko: '다음으로 연결됨' },

  // === Backup table headers ===
  'Action':                       { es: 'Acción', pt: 'Ação', fr: 'Action', de: 'Aktion', da: 'Handling', ko: '작업' },
  'Description':                  { es: 'Descripción', pt: 'Descrição', fr: 'Description', de: 'Beschreibung', da: 'Beskrivelse', ko: '설명' },
  'Control':                      { es: 'Control', pt: 'Controle', fr: 'Contrôle', de: 'Steuerung', da: 'Kontrol', ko: '제어' },
  'Export JSON desc':             { es: 'Backup completo en formato JSON (importable luego desde la fila de abajo).', pt: 'Backup completo em formato JSON (pode ser importado depois na linha abaixo).', fr: 'Sauvegarde complète au format JSON (importable depuis la ligne ci-dessous).', de: 'Vollständige Sicherung im JSON-Format (kann später unten importiert werden).', da: 'Komplet sikkerhedskopi i JSON-format (kan importeres nedenfor).', ko: 'JSON 형식의 전체 백업 (아래 줄에서 가져올 수 있음).' },

  // === Refresh buttons (v1.1.0 — Jellyfin import + per-game IGDB) ===
  'Refresh from Jellyfin':        { es: 'Refrescar desde Jellyfin', pt: 'Atualizar do Jellyfin', fr: 'Actualiser depuis Jellyfin', de: 'Von Jellyfin aktualisieren', da: 'Opdater fra Jellyfin', ko: 'Jellyfin에서 새로고침' },
  'Importing...':                 { es: 'Importando...', pt: 'Importando...', fr: 'Importation...', de: 'Importiere...', da: 'Importerer...', ko: '가져오는 중...' },
  'Refresh IGDB time':            { es: 'Refrescar tiempo IGDB', pt: 'Atualizar tempo IGDB', fr: 'Actualiser le temps IGDB', de: 'IGDB-Zeit aktualisieren', da: 'Opdater IGDB-tid', ko: 'IGDB 시간 새로고침' },
  'Refreshing IGDB...':           { es: 'Refrescando IGDB...', pt: 'Atualizando IGDB...', fr: 'Actualisation IGDB...', de: 'IGDB wird aktualisiert...', da: 'Opdaterer IGDB...', ko: 'IGDB 새로고침 중...' },

  // === Application-tokens hints + TMDB UI (v1.1.0+) ===
  'Application tokens':           { es: 'Tokens de aplicación', pt: 'Tokens da aplicação', fr: "Tokens d'application", de: 'Anwendungstokens', da: 'Applikationstokens', ko: '애플리케이션 토큰' },
  'Configure Jellyfin connection in ': { es: 'Puedes configurar la conexión con Jellyfin en ', pt: 'Podes configurar a ligação ao Jellyfin em ', fr: 'Vous pouvez configurer la connexion à Jellyfin dans ', de: 'Du kannst die Jellyfin-Verbindung einrichten in ', da: 'Du kan konfigurere Jellyfin-forbindelsen i ', ko: 'Jellyfin 연결은 다음에서 구성: ' },
  'Link your YouTube account in ':{ es: 'Puedes vincular tu cuenta de YouTube en ', pt: 'Podes vincular a tua conta do YouTube em ', fr: 'Vous pouvez lier votre compte YouTube dans ', de: 'Verknüpfe dein YouTube-Konto in ', da: 'Du kan tilknytte din YouTube-konto i ', ko: 'YouTube 계정 연결은 다음에서: ' },
  'IGDB time configurable in ':   { es: 'Tiempo IGDB configurable en ', pt: 'Tempo IGDB configurável em ', fr: 'Temps IGDB configurable dans ', de: 'IGDB-Zeit konfigurierbar in ', da: 'IGDB-tid kan konfigureres i ', ko: 'IGDB 시간 구성 위치: ' },
  'Refresh':                      { es: 'Refrescar', pt: 'Atualizar', fr: 'Actualiser', de: 'Aktualisieren', da: 'Opdater', ko: '새로고침' },

  // === TMDB user key UI (patch_tmdb_user_key.js) ===
  'TMDB tokens':                  { es: 'Tokens TMDB', pt: 'Tokens TMDB', fr: 'Tokens TMDB', de: 'TMDB-Tokens', da: 'TMDB-tokens', ko: 'TMDB 토큰' },
  'TMDB key info':                { es: 'Necesaria para "Dónde ver" (proveedores) y "Refrescar duración de capítulos". Regístrate en ', pt: 'Necessária para "Onde ver" (provedores) e "Atualizar duração de episódios". Regista-te em ', fr: 'Nécessaire pour "Où regarder" (fournisseurs) et "Actualiser la durée des épisodes". Inscrivez-vous sur ', de: 'Benötigt für „Wo sehen" (Anbieter) und „Episodendauer aktualisieren". Registriere dich auf ', da: 'Nødvendig for "Hvor du kan se" (udbydere) og "Opdater episodevarighed". Tilmeld dig på ', ko: '"보기 위치"(공급자)와 "에피소드 재생시간 갱신"에 필요. 가입처: ' },
  'TMDB key info suffix':         { es: ' y pega tu API key (v3 auth, hex).', pt: ' e cola a tua API key (v3 auth, hex).', fr: " et collez votre clé API (v3 auth, hex).", de: ' und füge deinen API-Key ein (v3 auth, hex).', da: ' og indsæt din API-nøgle (v3 auth, hex).', ko: '에서 가입 후 API 키 붙여넣기 (v3 auth, hex).' },
  'Configured':                   { es: 'Configurada', pt: 'Configurada', fr: 'Configurée', de: 'Konfiguriert', da: 'Konfigureret', ko: '구성됨' },
  'source:':                      { es: 'fuente:', pt: 'fonte:', fr: 'source :', de: 'Quelle:', da: 'kilde:', ko: '출처:' },
  'TMDB not configured warning':  { es: 'No configurada — los "Dónde ver" y refresco de capítulos no funcionarán.', pt: 'Não configurada — "Onde ver" e atualização de duração não funcionarão.', fr: 'Non configurée — "Où regarder" et l\'actualisation des durées ne fonctionneront pas.', de: 'Nicht konfiguriert — „Wo sehen" und Laufzeitaktualisierung funktionieren nicht.', da: 'Ikke konfigureret — "Hvor du kan se" og varighedsopdatering virker ikke.', ko: '구성되지 않음 — "보기 위치"와 재생시간 갱신이 작동하지 않습니다.' },
  'Paste your TMDB API key':      { es: 'Pega tu TMDB API key (v3 auth)', pt: 'Cola a tua TMDB API key (v3 auth)', fr: 'Collez votre clé API TMDB (v3 auth)', de: 'Füge deinen TMDB-API-Key ein (v3 auth)', da: 'Indsæt din TMDB API-nøgle (v3 auth)', ko: 'TMDB API 키 붙여넣기 (v3 auth)' },
  'Save':                         { es: 'Guardar', pt: 'Guardar', fr: 'Enregistrer', de: 'Speichern', da: 'Gem', ko: '저장' },
  'Delete':                       { es: 'Borrar', pt: 'Apagar', fr: 'Supprimer', de: 'Löschen', da: 'Slet', ko: '삭제' },
  'Confirm delete TMDB key':      { es: '¿Borrar la TMDB API key guardada?', pt: 'Apagar a TMDB API key guardada?', fr: 'Supprimer la clé TMDB enregistrée ?', de: 'Gespeicherten TMDB-Key löschen?', da: 'Slet den gemte TMDB-nøgle?', ko: '저장된 TMDB 키를 삭제할까요?' },
  'Key saved.':                   { es: 'Key guardada.', pt: 'Key guardada.', fr: 'Clé enregistrée.', de: 'Key gespeichert.', da: 'Nøgle gemt.', ko: '키 저장됨.' },
  'Key deleted.':                 { es: 'Key borrada.', pt: 'Key apagada.', fr: 'Clé supprimée.', de: 'Key gelöscht.', da: 'Nøgle slettet.', ko: '키 삭제됨.' },

  // === Relative dates (formatDate in patch_youtube_frontend.js) ===
  'today':                        { es: 'hoy', pt: 'hoje', fr: "aujourd'hui", de: 'heute', da: 'i dag', ko: '오늘' },
  'yesterday':                    { es: 'ayer', pt: 'ontem', fr: 'hier', de: 'gestern', da: 'i går', ko: '어제' },
  'day':                          { es: 'día', pt: 'dia', fr: 'jour', de: 'Tag', da: 'dag', ko: '일' },
  'days':                         { es: 'días', pt: 'dias', fr: 'jours', de: 'Tage', da: 'dage', ko: '일' }
};

// Anchors per locale: `"In progress":"<translation>"` is the stable end-of-letter-I marker
// in each locale chunk. Bumping any value here forces re-injection over old bundles.
const LOCALES = [
  { code: 'en', anchor: '"In progress":"In progress"',     marker: '"days":"days"' },
  { code: 'es', anchor: '"In progress":"En proceso"',      marker: '"days":"días"' },
  { code: 'pt', anchor: '"In progress":"Em curso"',        marker: '"days":"dias"' },
  // FR uses double-quoted JS string so the apostrophe in "l'hôte" doesn't terminate the literal
  { code: 'fr', anchor: '"In progress":"En cours"',        marker: '"days":"jours"' },
  { code: 'de', anchor: '"In progress":"In Arbeit …"', marker: '"days":"Tage"' },
  { code: 'da', anchor: '"In progress":"Igangværende"',    marker: '"days":"dage"' },
  { code: 'ko', anchor: '"In progress":"진행 중"',          marker: '"days":"일"' }
];

// Strip any prior injection: walk `,"key":"val"` pairs after the anchor as long as the
// key looks like one we (or a previous version of this patch) injected. We don't want to
// rely on customKeys alone, since an old-bundle injection may contain keys we removed —
// the heuristic is "stop at the first key that doesn't look like one of ours."
const allPossibleKeys = new Set([
  ...Object.keys(customKeys),
  // Legacy keys that may exist from older versions of this patch:
  'Library search', 'Imports JSON', 'Letterboxd CSV', 'CSV Letterboxd'
]);
const stripPrev = after => {
  let s = after;
  while (s.startsWith(',"')) {
    const m = s.match(/^,"([^"]+)":"(?:[^"\\]|\\.)*"/);
    if (!m) break;
    if (!allPossibleKeys.has(m[1])) break;
    s = s.slice(m[0].length);
  }
  return s;
};

const valueFor = (entry, code) => code === 'en' ? null : entry[code];
const totalKeys = Object.keys(customKeys).length;

for (const loc of LOCALES) {
  if (!c.includes(loc.anchor)) {
    console.error('i18n custom: ' + loc.code + ' chunk anchor not found');
    process.exit(1);
  }
  if (c.includes(loc.marker)) {
    console.log('i18n custom: ' + loc.code + ' already injected (current version)');
    continue;
  }
  const entries = Object.entries(customKeys).map(([k, v]) => {
    const val = loc.code === 'en' ? k : (v[loc.code] || k);
    return JSON.stringify(k) + ':' + JSON.stringify(val);
  }).join(',');
  const idx = c.indexOf(loc.anchor) + loc.anchor.length;
  c = c.slice(0, idx) + ',' + entries + stripPrev(c.slice(idx));
  console.log('i18n custom: injected ' + totalKeys + ' keys into ' + loc.code + ' chunk');
}

fs.writeFileSync(bundlePath, c);
console.log('i18n custom: complete (' + totalKeys + ' keys × ' + LOCALES.length + ' locales)');

})();

// ===== patch_theater_nav.js =====
;(() => {
// Add a "Teatro" (theater) section as a first-class mediaType, integrated like
// movies/tv/games/books. Top nav entry sits left of YouTube.
//
// Edits in this single patch:
//   1. ty() menu — add {path:"/theater", name: xo._("Theater")} just before
//      the /youtube entry.
//   2. Top-nav inclusion filter ["/","/tv","/movies","/games","/books","/youtube"]
//      — add "/theater" so the entry actually renders in the horizontal nav.
//   3. Title-filter mirror (same array, used to hide the page-title duplicate
//      for top-nav routes).
//   4. Route registration — add `<Q path="/theater" element=ey({mediaType:"theater"})>`
//      right before the /youtube route. Reuses ey() (the generic Zv wrapper),
//      same as movie/tv/games/books.
//   5. Predicate Tt (is theater) defined alongside existing Ao/Ro/Io/Do/jo
//      predicates, for future use in filters and badges.
//   6. mediaType label dictionary in _v: add `theater: xo._("Theater")`.

const fs = require('fs');
const child = require('child_process');
const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/*mt-fork:theater-nav*/';
if (c.includes(marker)) {
  console.log('theater nav: already patched');
  return /* was process.exit(0) */;
}

// 1. Menu list (ty): insert {path:"/theater",...} before /youtube entry.
{
  const old = '{path:"/youtube",name:"YouTube"}]},ny=function';
  const fresh = '{path:"/theater",name:xo._("Theater")},{path:"/youtube",name:"YouTube"}]},ny=function';
  if (!c.includes(old)) {
    console.error('theater nav: ty() /youtube anchor not found'); process.exit(1);
  }
  c = c.replace(old, fresh);
}

// 2. Top-nav inclusion filter — add "/theater" before "/youtube".
// Two occurrences of the literal array (same content, different uses).
{
  const old = '["/","/tv","/movies","/games","/books","/youtube"]';
  const fresh = '["/","/tv","/movies","/games","/books","/theater","/youtube"]';
  const occ = c.split(old).length - 1;
  if (occ === 0) {
    console.error('theater nav: top-nav array anchor not found'); process.exit(1);
  }
  c = c.split(old).join(fresh);
  console.log('theater nav: added /theater to top-nav array (' + occ + ' occurrences)');
}

// 3. Routes: add <Q path="/theater" element=ey()> before the /youtube route.
{
  const old = 'r.createElement(Q,{path:"/youtube",element:r.createElement(_YT,null)})';
  const fresh = 'r.createElement(Q,{path:"/theater",element:r.createElement(ey,{key:"/theater",mediaType:"theater"})}),' + old;
  if (!c.includes(old)) {
    console.error('theater nav: /youtube route anchor not found'); process.exit(1);
  }
  c = c.replace(old, fresh);
}

// 4. mediaType label dict in _v card. Anchor on the existing object literal.
{
  const old = 'w={audiobook:xo._("Audiobook"),book:xo._("Book"),movie:xo._("Movie"),tv:xo._("Tv"),video_game:xo._("Video game")}';
  const fresh = 'w={audiobook:xo._("Audiobook"),book:xo._("Book"),movie:xo._("Movie"),tv:xo._("Tv"),video_game:xo._("Video game"),theater:xo._("Theater")}';
  if (!c.includes(old)) {
    console.error('theater nav: _v mediaType dict anchor not found'); process.exit(1);
  }
  c = c.replace(old, fresh);
}

// 5. Tt predicate (mirrors Io/Ao/Ro/Do/jo). Insert right after Io.
{
  const old = 'Io=function(e){return"string"==typeof e?"movie"===e:"movie"===(null==e?void 0:e.mediaType)},';
  const tt = 'Tt=function(e){return"string"==typeof e?"theater"===e:"theater"===(null==e?void 0:e.mediaType)},';
  if (!c.includes(old)) {
    console.error('theater nav: Io predicate anchor not found'); process.exit(1);
  }
  c = c.replace(old, old + tt);
}

c = marker + c;
fs.writeFileSync(bundlePath, c);
console.log('theater nav: complete (menu + top-nav + route + label + predicate)');

})();

// ===== patch_theater_routes_enum.js =====
;(() => {
// /api/items, /api/items/paginated and other routes validate `mediaType` against
// a hard-coded enum ['audiobook','book','movie','tv','video_game']. Without
// 'theater' the validator rejects requests from /theater, the frontend bubbles
// the 400 up and the page renders blank. Add 'theater' to the enum everywhere.

const fs = require('fs');
const path = '/app/build/generated/routes/routes.js';
let c = fs.readFileSync(path, 'utf8');

const old = "enum: ['audiobook', 'book', 'movie', 'tv', 'video_game']";
const fresh = "enum: ['audiobook', 'book', 'movie', 'tv', 'video_game', 'theater']";

const occ = c.split(old).length - 1;
if (occ === 0) {
  if (c.includes(fresh)) {
    console.log('theater routes enum: already patched');
    return /* was process.exit(0) */;
  }
  console.error('theater routes enum: anchor not found'); process.exit(1);
}
c = c.split(old).join(fresh);
fs.writeFileSync(path, c);
console.log('theater routes enum: added theater to ' + occ + ' enum location(s)');

})();

// ===== patch_theater_metadata_provider.js =====
;(() => {
// Wikidata SPARQL metadata provider for `mediaType: 'theater'`. Search hits
// the SPARQL endpoint with the mwapi EntitySearch service filtered to items
// that are instances (or subclasses) of theatrical work (Q25379). Details
// fetch the entity JSON from Special:EntityData and pulls poster (P18),
// inception/release date (P577), author (P50), genre (P136) and duration
// (P2047).
//
// External ID: we reuse the existing `tmdbId` INTEGER column for the numeric
// Wikidata QID (Q41567 → 41567). `source='wikidata'` disambiguates so the
// reverse-lookup never collides with a real TMDb id. This avoids a schema
// migration just for one mediaType.

const fs = require('fs');

// === 1. Drop the provider class file in place. ===
{
  const providerPath = '/app/build/metadata/provider/wikidata.js';
  const providerSrc = `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WikidataTheater = void 0;
const _axios = (() => { try { return require('axios'); } catch(_) { return null; } })();
const _metadataProvider = require("../metadataProvider");

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const ENTITY_DATA_URL = (qid) => 'https://www.wikidata.org/wiki/Special:EntityData/' + qid + '.json';
const COMMONS_FILE_URL = (filename) => 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(filename);
const USER_AGENT = 'MediaTrackerCustom/0.1 (theater plays via Wikidata)';

// Theatrical-work classes accepted as "Teatro" in MediaTracker.
//   Q25379       — obra de teatro / play
//   Q116476516   — obra dramática / dramatic work
//   Q1786828     — drama (genre/work)
//   Q860861      — pieza teatral / theatre play
//   Q40831       — ópera / opera (sung dramatic work)
//   Q1344        — ópera / opera (broader, kept for safety)
const THEATER_CLASSES = ['wd:Q25379','wd:Q116476516','wd:Q1786828','wd:Q860861','wd:Q40831','wd:Q1344'].join(' ');

const SPARQL_SEARCH = (query, lang) => \`
PREFIX bd: <http://www.bigdata.com/rdf#>
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX mwapi: <https://www.mediawiki.org/ontology#API/>

SELECT ?item ?itemLabel ?itemDescription
       (SAMPLE(?image)     AS ?imageOne)
       (MIN(?inception)    AS ?inceptionMin)
       (SAMPLE(?duration)  AS ?durationOne) WHERE {
  SERVICE wikibase:mwapi {
    bd:serviceParam wikibase:api "EntitySearch" .
    bd:serviceParam wikibase:endpoint "www.wikidata.org" .
    bd:serviceParam mwapi:search "\${query.replace(/"/g, ' ').slice(0, 100)}" .
    bd:serviceParam mwapi:language "\${lang || 'es'}" .
    ?item wikibase:apiOutputItem mwapi:item .
  }
  ?item wdt:P31/wdt:P279* ?_type .
  VALUES ?_type { \${THEATER_CLASSES} }
  OPTIONAL { ?item wdt:P18 ?image . }
  OPTIONAL { ?item wdt:P577 ?inception . }
  OPTIONAL { ?item wdt:P2047 ?duration . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "\${lang || 'es'},en" . }
}
GROUP BY ?item ?itemLabel ?itemDescription
LIMIT 20
\`;

function _qidToNumber(qid) {
  const m = String(qid || '').match(/Q(\\d+)/);
  return m ? Number(m[1]) : null;
}

function _commonsFromUri(uri) {
  // Wikidata image URIs come back as http://commons.wikimedia.org/wiki/Special:FilePath/<file>
  if (!uri) return null;
  const m = String(uri).match(/Special:FilePath\\/(.+)$/);
  return m ? COMMONS_FILE_URL(decodeURIComponent(m[1])) : String(uri);
}

class WikidataTheater extends _metadataProvider.MetadataProvider {
  constructor() {
    super();
    this.name = 'wikidata';
    this.mediaType = 'theater';
  }

  async search(query) {
    if (!_axios) throw new Error('axios not available');
    const lang = 'es';
    const res = await _axios.get(SPARQL_ENDPOINT, {
      params: { query: SPARQL_SEARCH(query, lang), format: 'json' },
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/sparql-results+json' },
      timeout: 15000,
    });
    const rows = (res.data && res.data.results && res.data.results.bindings) || [];
    // The query is GROUPed but EntitySearch may still return the same QID with
    // different rankings. Dedupe in JS just in case.
    const seen = new Set();
    return rows.map(r => {
      const itemUri = r.item && r.item.value || '';
      const qid = itemUri.split('/').pop();
      const tmdbId = _qidToNumber(qid);
      // Inception comes back as e.g. '+1601-01-01T00:00:00Z' — strip to
      // YYYY-MM-DD. Wikidata uses '00' for unknown month/day (e.g.
      // '+1602-00-00T00:00:00Z' = "year 1602, month/day unknown"), which is
      // not a valid SQL/JS date — coerce zero components to '01'.
      let releaseDate = null;
      if (r.inceptionMin && r.inceptionMin.value) {
        const m = String(r.inceptionMin.value).match(/^[+-]?(\\d{4})-(\\d{2})-(\\d{2})/);
        if (m) {
          const mm = m[2] === '00' ? '01' : m[2];
          const dd = m[3] === '00' ? '01' : m[3];
          releaseDate = m[1] + '-' + mm + '-' + dd;
        }
      }
      const runtime = (r.durationOne && r.durationOne.value && Number(r.durationOne.value)) || null;
      return {
        source: 'wikidata',
        mediaType: 'theater',
        title: r.itemLabel ? r.itemLabel.value : qid,
        originalTitle: null,
        overview: r.itemDescription ? r.itemDescription.value : null,
        externalPosterUrl: _commonsFromUri(r.imageOne && r.imageOne.value),
        externalBackdropUrl: null,
        releaseDate: releaseDate,
        runtime: runtime,
        tmdbId: tmdbId,
        needsDetails: true,
      };
    }).filter(it => it.tmdbId && !seen.has(it.tmdbId) && (seen.add(it.tmdbId), true));
  }

  async details(mediaItem) {
    if (!_axios) throw new Error('axios not available');
    const qid = 'Q' + mediaItem.tmdbId;
    const res = await _axios.get(ENTITY_DATA_URL(qid), {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      timeout: 15000,
    });
    const ent = res.data && res.data.entities && res.data.entities[qid];
    if (!ent) return mediaItem;
    const labels = ent.labels || {};
    const descs = ent.descriptions || {};
    const claims = ent.claims || {};
    const sitelinks = ent.sitelinks || {};
    const _firstClaimValue = (prop) => {
      const arr = claims[prop];
      if (!arr || arr.length === 0) return null;
      const dv = arr[0].mainsnak && arr[0].mainsnak.datavalue;
      return dv ? dv.value : null;
    };
    const _firstClaimAll = (prop) => {
      const arr = claims[prop] || [];
      return arr.map(c => c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value).filter(Boolean);
    };
    const titleLabel = (labels.es || labels.en || labels[Object.keys(labels)[0]] || {}).value || qid;
    const shortDesc = (descs.es || descs.en || descs[Object.keys(descs)[0]] || {}).value || null;
    // Image (P18) → Commons file path
    const imageFile = _firstClaimValue('P18');
    const externalPosterUrl = imageFile ? COMMONS_FILE_URL(imageFile) : null;
    // Inception/release date (P577)
    const inception = _firstClaimValue('P577');
    let releaseDate = null;
    if (inception && inception.time) {
      const m = String(inception.time).match(/^[+-]?(\\d{4})-(\\d{2})-(\\d{2})/);
      if (m) {
        const mm = m[2] === '00' ? '01' : m[2];
        const dd = m[3] === '00' ? '01' : m[3];
        releaseDate = m[1] + '-' + mm + '-' + dd;
      }
    }
    // Duration (P2047)
    const dur = _firstClaimValue('P2047');
    let runtime = null;
    if (dur && dur.amount != null) runtime = Math.round(Number(dur.amount));
    // Author (P50), genre (P136), language (P407) — collect QIDs to resolve in one call.
    const authorQids = _firstClaimAll('P50').map(v => v && v.id).filter(Boolean);
    const genreQids  = _firstClaimAll('P136').map(v => v && v.id).filter(Boolean);
    const langQids   = _firstClaimAll('P407').map(v => v && v.id).filter(Boolean);
    const allQids = Array.from(new Set([...authorQids, ...genreQids, ...langQids]));
    let labelMap = {};
    if (allQids.length) {
      try {
        const r = await _axios.get('https://www.wikidata.org/w/api.php', {
          params: { action: 'wbgetentities', ids: allQids.join('|'), props: 'labels', languages: 'es|en', format: 'json' },
          headers: { 'User-Agent': USER_AGENT },
          timeout: 15000,
        });
        const ents = (r.data && r.data.entities) || {};
        for (const id of Object.keys(ents)) {
          const lb = ents[id].labels || {};
          const v = (lb.es || lb.en || {}).value;
          if (v) labelMap[id] = v;
        }
      } catch (_) { /* labels are best-effort */ }
    }
    const _qidToLabels = (qids) => qids.map(q => labelMap[q]).filter(Boolean);
    const authorNames = _qidToLabels(authorQids);
    const genreNames  = _qidToLabels(genreQids);
    const langNames   = _qidToLabels(langQids);
    // Synopsis: pull lead-section extract from Wikipedia. Prefer es, fall back
    // to en. Sitelink keys are 'eswiki' / 'enwiki' with { title: 'Macbeth' }.
    let synopsis = null;
    const _wpSummary = async (wiki, title) => {
      try {
        const r = await _axios.get('https://' + wiki + '.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title.replace(/ /g, '_')), {
          headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
          timeout: 15000,
        });
        return (r.data && r.data.extract) || null;
      } catch (_) { return null; }
    };
    if (sitelinks.eswiki && sitelinks.eswiki.title) synopsis = await _wpSummary('es', sitelinks.eswiki.title);
    if (!synopsis && sitelinks.enwiki && sitelinks.enwiki.title) synopsis = await _wpSummary('en', sitelinks.enwiki.title);
    // Compose overview: header (Autor / Géneros / Idioma) + Wikipedia synopsis,
    // falling back to the short Wikidata description when no synopsis is available.
    const headerLines = [];
    if (authorNames.length) headerLines.push('Autor: ' + authorNames.join(', '));
    if (genreNames.length)  headerLines.push('Géneros: ' + genreNames.join(', '));
    if (langNames.length)   headerLines.push('Idioma: ' + langNames.join(', '));
    const body = synopsis || shortDesc || '';
    const overview = (headerLines.length ? headerLines.join('\\n') + (body ? '\\n\\n' + body : '') : body) || null;
    return {
      ...mediaItem,
      source: 'wikidata',
      mediaType: 'theater',
      title: titleLabel,
      originalTitle: mediaItem.originalTitle || titleLabel,
      overview: overview,
      externalPosterUrl: externalPosterUrl,
      externalBackdropUrl: null,
      releaseDate: releaseDate,
      runtime: runtime,
      genres: genreNames.length ? genreNames : genreQids,
      tmdbId: mediaItem.tmdbId,
      needsDetails: false,
    };
  }

  async findByTmdbId(tmdbId) {
    return this.details({ tmdbId, mediaType: 'theater', source: 'wikidata' });
  }
}
exports.WikidataTheater = WikidataTheater;
//# sourceMappingURL=wikidata.js.map
`;
  fs.writeFileSync(providerPath, providerSrc);
  console.log('theater metadata provider: wrote /app/build/metadata/provider/wikidata.js');
}

// === 2. Register the provider in metadataProviders.js ===
{
  const regPath = '/app/build/metadata/metadataProviders.js';
  let c = fs.readFileSync(regPath, 'utf8');
  if (c.includes('require("./provider/wikidata")') || c.includes('WikidataTheater')) {
    console.log('theater metadata provider: registry already wired');
  } else {
    const oldImport = 'var _tmdb = require("./provider/tmdb");';
    const newImport = oldImport + '\nvar _wikidata = require("./provider/wikidata");';
    if (!c.includes(oldImport)) {
      console.error('theater metadata provider: import anchor not found'); process.exit(1);
    }
    c = c.replace(oldImport, newImport);
    const oldList = 'const providers = [new _igdb.IGDB(), new _audible.Audible(), new _openlibrary.OpenLibrary(), new _tmdb.TMDbMovie(), new _tmdb.TMDbTv()];';
    const newList = 'const providers = [new _igdb.IGDB(), new _audible.Audible(), new _openlibrary.OpenLibrary(), new _tmdb.TMDbMovie(), new _tmdb.TMDbTv(), new _wikidata.WikidataTheater()];';
    if (!c.includes(oldList)) {
      console.error('theater metadata provider: providers list anchor not found'); process.exit(1);
    }
    c = c.replace(oldList, newList);
    fs.writeFileSync(regPath, c);
    console.log('theater metadata provider: registered WikidataTheater in metadataProviders');
  }
}

// === 3. Sanity require the new module to surface syntax errors at build time ===
try {
  delete require.cache[require.resolve('/app/build/metadata/provider/wikidata.js')];
  require('/app/build/metadata/provider/wikidata.js');
  console.log('theater metadata provider: provider module syntax OK');
} catch (e) {
  console.error('theater metadata provider: SYNTAX ERROR -> ' + e.message.slice(0, 300));
  process.exit(1);
}

})();

// ===== patch_theater_teatroes_provider.js =====
;(() => {
// Add teatro.es (CDT/INAEM) as a second metadata source for `mediaType:theater`.
//
// Why: Wikidata covers classics well but misses most contemporary Spanish stagings
// — teatro.es indexes ~40,000 Spanish theatre premieres ("estrenos"). It exposes
// no public API, so we POST to the public search form and parse the HTML.
//
// IMPORTANT — WAF limitation: teatro.es protects DETAIL pages with Incapsula/
// Imperva. Search POST works fine (returns full HTML), but GET on a detail
// URL returns an ~833-byte JS challenge stub. Cookie jars + realistic headers
// don't help (verified). So we operate ONLY on the search-listing data:
// title, temporada (year), and producción (company). Each result is marked
// `needsDetails: false` so the framework doesn't try to fetch the detail page.
// If Incapsula behavior changes in the future, swap `needsDetails:false` →
// `true` and keep the existing details() — it already bails gracefully when
// the response doesn't contain the expected markers.
//
// Integration:
//   1) New file /app/build/metadata/provider/teatroes.js — TeatroEsTheater class.
//   2) metadataProviders.js — require + register.
//   3) wikidata.js — augment WikidataTheater.search() to also pull teatroes
//      results and merge (de-duplicated by title). details() routing works
//      out of the box because the framework dispatches by `mediaItem.source`.
//
// Each teatro.es entry is a PRODUCTION (single staging by one company), not a
// work. The search collapses by title (lowercased) and keeps the production
// with the EARLIEST `temporada` (year) > 0 as a stand-in for the original
// staging. This avoids 50 "La casa de Bernarda Alba" entries from one search.
//
// MUST run AFTER patch_theater_metadata_provider.js (which creates wikidata.js
// and registers WikidataTheater).

const fs = require('fs');

const PROVIDER_PATH = '/app/build/metadata/provider/teatroes.js';
const REGISTRY_PATH = '/app/build/metadata/metadataProviders.js';
const WIKIDATA_PATH = '/app/build/metadata/provider/wikidata.js';

// === 1. Write the teatro.es provider file. ===
{
  const providerSrc = `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeatroEsTheater = void 0;
const _axios = (() => { try { return require('axios'); } catch(_) { return null; } })();
const _metadataProvider = require("../metadataProvider");

const SEARCH_URL = 'https://www.teatro.es/estrenos-teatro';
const DETAIL_URL = (id) => 'https://www.teatro.es/estrenos-teatro/x-' + id;
const USER_AGENT = 'MediaTrackerCustom/0.1 (Spanish theatre fallback via teatro.es CDT)';

function _decodeEntities(s) {
  if (s == null) return s;
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&aacute;/g, 'á').replace(/&eacute;/g, 'é').replace(/&iacute;/g, 'í').replace(/&oacute;/g, 'ó').replace(/&uacute;/g, 'ú').replace(/&ntilde;/g, 'ñ')
    .replace(/&Aacute;/g, 'Á').replace(/&Eacute;/g, 'É').replace(/&Iacute;/g, 'Í').replace(/&Oacute;/g, 'Ó').replace(/&Uacute;/g, 'Ú').replace(/&Ntilde;/g, 'Ñ');
}

function _parseSearchResults(html) {
  // Each card: <div class="row collapse result_item_row result_item_row_estrenos result_item ..." data-title="..." data-url="..." data-id="..." ...>
  //              <span class="results_estrenos_titulo_titulo">{title}</span>
  //              <span class="results_estrenos_titulo_temporada"> (<span class="value">{year}</span>)</span>
  //              <div class="results_estrenos_produccion"><span class="value">{company}</span></div>
  const items = [];
  const blockRe = /<div class="row collapse result_item_row result_item_row_estrenos[^"]*"[\\s\\S]*?<\\/div>\\s*<\\/div>\\s*<\\/div>/g;
  const seenIds = new Set();
  let m;
  while ((m = blockRe.exec(html)) !== null) {
    const block = m[0];
    const idM = block.match(/data-id="(\\d+)"/);
    const titleM = block.match(/data-title="([^"]+)"/);
    if (!idM || !titleM) continue;
    const id = Number(idM[1]);
    if (seenIds.has(id)) continue;
    seenIds.add(id);
    const title = _decodeEntities(titleM[1]);
    const yearM = block.match(/results_estrenos_titulo_temporada[^>]*>[^<]*\\(<span class="value">(\\d+)<\\/span>/);
    const year = yearM ? Number(yearM[1]) : 0;
    const prodM = block.match(/results_estrenos_produccion[\\s\\S]*?<span class="value">([^<]+)<\\/span>/);
    const production = prodM ? _decodeEntities(prodM[1].trim()) : null;
    items.push({ id, title, year, production });
  }
  return items;
}

function _collapseByTitle(items) {
  // Keep one entry per (title lowercased), preferring the production with the
  // earliest year > 0. Falls back to the first occurrence if no year.
  const byKey = new Map();
  for (const it of items) {
    const key = it.title.toLowerCase().trim();
    const existing = byKey.get(key);
    if (!existing) { byKey.set(key, it); continue; }
    const itHasYear = it.year > 0;
    const exHasYear = existing.year > 0;
    if (itHasYear && (!exHasYear || it.year < existing.year)) byKey.set(key, it);
  }
  return [...byKey.values()];
}

function _parseDetail(html) {
  // <span class="results_detalle_estreno_titulo titolResults">{title}</span>
  // <div class="results_detalle_estreno_temporada"><span class="value">{year}</span></div>
  // <div class="results_detalle_estreno_produccion"><span class="value">{company}</span></div>
  // <div class="results_detalle_estreno_ficha_artistica"><span class="value">{free-form ficha}</span></div>
  const out = {};
  let m;
  m = html.match(/results_detalle_estreno_titulo titolResults[^>]*>([\\s\\S]*?)<\\/span>/);
  if (m) out.title = _decodeEntities(m[1]).trim();
  m = html.match(/Temporada<\\/span>:\\s*<span class="value">([^<]+)<\\/span>/);
  if (m) {
    const y = Number(m[1].replace(/[^0-9]/g, ''));
    if (y > 0) out.year = y;
  }
  m = html.match(/Producción<\\/span>:\\s*<span class="value">([^<]+)<\\/span>/);
  if (m) out.production = _decodeEntities(m[1]).trim();
  m = html.match(/Ficha artística<\\/span>:\\s*<span class="value">([\\s\\S]*?)<\\/span>/);
  if (m) out.ficha = _decodeEntities(m[1].replace(/<[^>]+>/g, '')).trim();
  return out;
}

function _extractFromFicha(ficha) {
  // Free-form text with patterns like: "Autoría: <names>. Dirección: <name>. Intérpretes: ..."
  // and "Estreno: 13 de marzo de 1948 en la Cúpula del Coliseum de Barcelona"
  if (!ficha) return {};
  const out = {};
  let m;
  m = ficha.match(/Autoría:\\s*([^.]+?)(?:\\.|$)/);
  if (m) out.author = m[1].trim();
  m = ficha.match(/Dirección:\\s*([^.]+?)(?:\\.|$)/);
  if (m) out.director = m[1].trim();
  m = ficha.match(/Intérpretes?:\\s*([^.]+?)(?:\\.|$)/);
  if (m) out.cast = m[1].trim();
  m = ficha.match(/Estreno:\\s*([^.]+?)(?:\\.|$)/);
  if (m) out.premiere = m[1].trim();
  return out;
}

class TeatroEsTheater extends _metadataProvider.MetadataProvider {
  constructor() {
    super();
    this.name = 'teatroes';
    this.mediaType = 'theater';
  }

  async search(query) {
    if (!_axios) throw new Error('axios not available');
    const body = new URLSearchParams({
      'CDTbw_searchform_estrenos_page': '1',
      'CDTbw_searchform_estrenos_pagesize': '50',
      'CDTbw_searchform_estrenos_tipobuscador': 'avanzado',
      'CDTbw_searchform_estrenos_titulo': String(query || '').slice(0, 100),
    }).toString();
    let html;
    try {
      const res = await _axios.post(SEARCH_URL, body, {
        headers: {
          'User-Agent': USER_AGENT,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'text/html',
        },
        timeout: 15000,
        maxContentLength: 5 * 1024 * 1024,
      });
      html = res.data || '';
    } catch (_) { return []; }
    const raw = _parseSearchResults(html);
    const collapsed = _collapseByTitle(raw).slice(0, 20);
    return collapsed.map(it => ({
      source: 'teatroes',
      mediaType: 'theater',
      title: it.title,
      originalTitle: it.title,
      // No detail fetch is reliable through Incapsula, so embed everything we
      // know (production company) in the search-time overview itself.
      overview: it.production ? ('Producción: ' + it.production) : null,
      externalPosterUrl: null,
      externalBackdropUrl: null,
      releaseDate: it.year ? (it.year + '-01-01') : null,
      runtime: null,
      tmdbId: it.id,
      needsDetails: false,
    }));
  }

  async details(mediaItem) {
    // teatro.es detail pages are gated by Incapsula and consistently return a
    // ~833-byte JS challenge stub to non-browser clients. We try a single GET
    // with realistic headers; if the response lacks the expected markers we
    // assume we hit the WAF and just return the search-time data. The
    // ~strings used as markers are stable across the site's templates.
    if (!_axios) return mediaItem;
    const id = mediaItem.tmdbId;
    if (!id) return mediaItem;
    let html;
    try {
      const res = await _axios.get(DETAIL_URL(id), {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html',
          'Referer': 'https://www.teatro.es/estrenos-teatro',
        },
        timeout: 15000,
        maxContentLength: 5 * 1024 * 1024,
      });
      html = res.data || '';
    } catch (_) { return mediaItem; }
    if (!html || html.length < 5000 || html.indexOf('results_detalle_estreno_titulo') < 0) {
      // WAF challenge or removed page — keep the search-time payload.
      return { ...mediaItem, needsDetails: false };
    }
    const det = _parseDetail(html);
    const fields = _extractFromFicha(det.ficha);
    const headerLines = [];
    if (fields.author)   headerLines.push('Autor: ' + fields.author);
    if (det.production)  headerLines.push('Producción: ' + det.production);
    if (fields.director) headerLines.push('Dirección: ' + fields.director);
    if (fields.premiere) headerLines.push('Estreno: ' + fields.premiere);
    const body = fields.cast ? ('Intérpretes: ' + fields.cast) : '';
    const overview = headerLines.length
      ? headerLines.join('\\n') + (body ? '\\n\\n' + body : '')
      : (body || mediaItem.overview || null);
    const releaseDate = det.year ? (det.year + '-01-01') : mediaItem.releaseDate || null;
    return {
      ...mediaItem,
      source: 'teatroes',
      mediaType: 'theater',
      title: det.title || mediaItem.title,
      originalTitle: mediaItem.originalTitle || det.title || mediaItem.title,
      overview: overview,
      externalPosterUrl: null,
      externalBackdropUrl: null,
      releaseDate: releaseDate,
      runtime: null,
      genres: fields.author ? [fields.author] : [],
      tmdbId: id,
      needsDetails: false,
    };
  }

  async findByTmdbId(tmdbId) {
    return this.details({ tmdbId, mediaType: 'theater', source: 'teatroes' });
  }
}
exports.TeatroEsTheater = TeatroEsTheater;
//# sourceMappingURL=teatroes.js.map
`;
  fs.writeFileSync(PROVIDER_PATH, providerSrc);
  console.log('teatroes provider: wrote ' + PROVIDER_PATH);
}

// === 2. Register TeatroEsTheater in metadataProviders.js. ===
{
  let c = fs.readFileSync(REGISTRY_PATH, 'utf8');
  if (c.includes('require("./provider/teatroes")') || c.includes('TeatroEsTheater')) {
    console.log('teatroes provider: registry already wired');
  } else {
    const oldImport = 'var _wikidata = require("./provider/wikidata");';
    const newImport = oldImport + '\nvar _teatroes = require("./provider/teatroes");';
    if (!c.includes(oldImport)) {
      console.error('teatroes provider: import anchor not found (wikidata not registered yet?)'); process.exit(1);
    }
    c = c.replace(oldImport, newImport);
    const oldList = 'new _wikidata.WikidataTheater()];';
    const newList = 'new _wikidata.WikidataTheater(), new _teatroes.TeatroEsTheater()];';
    if (!c.includes(oldList)) {
      console.error('teatroes provider: providers list anchor not found'); process.exit(1);
    }
    c = c.replace(oldList, newList);
    fs.writeFileSync(REGISTRY_PATH, c);
    console.log('teatroes provider: registered TeatroEsTheater');
  }
}

// === 3. Augment WikidataTheater.search() to also query teatro.es and merge. ===
//   The search controller only calls metadataProviders.get(mediaType) which
//   returns the first provider — Wikidata. To surface teatro.es entries in the
//   same search results, Wikidata's search() pulls from teatroes and concats,
//   de-duplicated by lowercased title (Wikidata wins on collision).
{
  let c = fs.readFileSync(WIKIDATA_PATH, 'utf8');
  const marker = '/* mt-fork: teatroes-merge */';
  if (c.includes(marker)) {
    console.log('teatroes provider: wikidata.search merge already patched');
  } else {
    // Anchor the very last `}` of the WikidataTheater.search method body. We
    // append a wrapping IIFE-ish technique by replacing the search definition
    // entirely is risky — instead, splice into the existing body just before
    // the final `return rows.map(...)` to capture the wikidata results, then
    // post-process. The simplest robust seam: replace the `async search(query)`
    // signature with a wrapper that calls the original implementation under a
    // new name and merges teatroes results.
    //
    // Since the file is generated by patch_theater_metadata_provider.js with a
    // known structure, we monkey-patch the prototype after the class declaration
    // by appending JS at the bottom of the file — keeps the original class body
    // intact and idempotent across re-runs.
    const append = '\n' + marker + '\n' +
      '(function _mergeTeatroesIntoWikidataSearch(){\n' +
      '  try {\n' +
      '    const _teatroesMod = require("./teatroes");\n' +
      '    const _origSearch = exports.WikidataTheater.prototype.search;\n' +
      '    if (!_origSearch || _origSearch.__mtForkMerged) return;\n' +
      '    const _merged = async function(query) {\n' +
      '      const wikiResults = await _origSearch.call(this, query).catch(() => []);\n' +
      '      const teProvider = new _teatroesMod.TeatroEsTheater();\n' +
      '      const teResults = await teProvider.search(query).catch(() => []);\n' +
      '      const seen = new Set(wikiResults.map(r => String(r.title || "").toLowerCase().trim()));\n' +
      '      const extra = teResults.filter(r => {\n' +
      '        const k = String(r.title || "").toLowerCase().trim();\n' +
      '        if (!k || seen.has(k)) return false;\n' +
      '        seen.add(k);\n' +
      '        return true;\n' +
      '      });\n' +
      '      return wikiResults.concat(extra);\n' +
      '    };\n' +
      '    _merged.__mtForkMerged = true;\n' +
      '    exports.WikidataTheater.prototype.search = _merged;\n' +
      '  } catch (e) { /* keep wikidata working even if teatroes load fails */ }\n' +
      '})();\n';
    c = c + append;
    fs.writeFileSync(WIKIDATA_PATH, c);
    console.log('teatroes provider: wikidata.search wrapped to merge teatroes results');
  }
}

// === 4. Sanity-load the new module so syntax errors fail the build. ===
try {
  delete require.cache[require.resolve(PROVIDER_PATH)];
  require(PROVIDER_PATH);
  console.log('teatroes provider: module syntax OK');
} catch (e) {
  console.error('teatroes provider: SYNTAX ERROR -> ' + e.message.slice(0, 300));
  process.exit(1);
}

})();

// ===== patch_theater_card_icon.js =====
;(() => {
// On the item card, show a small Material Icon `theater_comedy` next to the
// "Teatro" mediaType label so theater plays read at a glance. Other mediaTypes
// keep their current text-only label (no behavior change for movies/tv/etc).
//
// Anchor on the existing `r.createElement("span",null,w[t.mediaType])` next to
// the year span. Wrap in a Fragment that prepends the icon when mediaType is
// 'theater'.

const fs = require('fs');
const child = require('child_process');
const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/*mt-fork:theater-card-icon*/';
if (c.includes(marker)) {
  console.log('theater card icon: already patched');
  return /* was process.exit(0) */;
}

// Anchor: the inline mediaType label render.
const old = 'r.createElement("span",null,w[t.mediaType])';
if (!c.includes(old)) {
  console.error('theater card icon: w[t.mediaType] anchor not found'); process.exit(1);
}
// New: same span, but for theater prepend a tiny material-icons "theater_comedy"
// glyph styled as inline text size for the line. Other mediaTypes render as before.
const fresh =
  'r.createElement("span",null,' + marker +
    '"theater"===t.mediaType&&r.createElement("i",{className:"material-icons text-base align-middle mr-1",style:{fontSize:"1em",verticalAlign:"-0.15em"}},"theater_comedy"),' +
    'w[t.mediaType]' +
  ')';
c = c.replace(old, fresh);
fs.writeFileSync(bundlePath, c);
console.log('theater card icon: theater_comedy prefixed to mediaType label for theater items');

})();

// ===== patch_theater_seen_button.js =====
;(() => {
// Frontend bug: the "Add to seen history" big button (rendered as a btn-blue
// label inside the action panel below each card) checks the mediaType against
// audiobook/book/video_game/movie/tv but NOT theater. As a result, on theater
// cards only the small rating star and download toggle are shown — the big
// "Marcar como visto" button is missing entirely. Add a Tt(n) (theater) branch
// so theater items use the same "Add to seen history" label as movies.

const fs = require('fs');
const path = require('path');
const dir = '/app/public';

// Find the actual hashed bundle file: main_*.js (not .br/.gz/.LICENSE.txt)
const bundle = fs.readdirSync(dir)
  .filter(f => /^main_[0-9a-f_]+\.js$/.test(f) && !f.endsWith('.LICENSE.txt'))[0];
if (!bundle) {
  console.error('theater seen button: bundle main_*.js not found in /app/public');
  process.exit(1);
}
const bundlePath = path.join(dir, bundle);
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/* mt-fork: theater-seen-button */';
if (c.includes(marker)) {
  console.log('theater seen button: already patched (' + bundle + ')');
  return /* was process.exit(0) */;
}

const old = 'Io(n)&&r.createElement(Xe,{id:"Add to seen history"}),Ro(n)&&';
const _new = 'Io(n)&&r.createElement(Xe,{id:"Add to seen history"}),Tt(n)&&r.createElement(Xe,{id:"Add to seen history"}),Ro(n)&&';

if (!c.includes(old)) {
  console.error('theater seen button: anchor not found in ' + bundle + ' (bundle layout changed?)');
  process.exit(1);
}
c = c.replace(old, _new);
c = marker + c;
fs.writeFileSync(bundlePath, c);

// Invalidate compressed variants so the server stops serving the old gzip/br
// versions instead of our patched bytes.
for (const ext of ['.br', '.gz']) {
  const p = bundlePath + ext;
  if (fs.existsSync(p)) {
    try { fs.unlinkSync(p); console.log('  removed stale ' + path.basename(p)); }
    catch (e) { console.error('  could not remove ' + p + ': ' + e.message); }
  }
}

console.log('theater seen button: added Tt(n) branch to "Add to seen history" render in ' + bundle);

})();

// ===== patch_homepage_remove_audiobooks.js =====
;(() => {
const fs = require('fs');
const child = require('child_process');

// Remove the audiobook block from the homepage summary. The block is rendered as
//   (null===(<id>=o.audiobook)||void 0===<id>?void 0:<id>.plays)>0&&r.createElement("div",…)
// Replacing the truthy gate with `false&&` short-circuits the createElement so the
// block doesn't render. Cheaper and safer than ripping the whole expression out.
// Re-emission of compressed bundle (.gz/.br) happens at the end of the Dockerfile,
// so this patch only edits the .js file.

const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/*mt-fork:no-audiobook-summary*/';
if (c.includes(marker)) {
  console.log('homepage remove audiobooks: already patched');
  return /* was process.exit(0) */;
}

const re = /\(null===\(([a-zA-Z_$][a-zA-Z0-9_$]*)=o\.audiobook\)\|\|void 0===\1\?void 0:\1\.plays\)>0&&/g;
const matches = c.match(re);
if (!matches || matches.length === 0) {
  console.error('homepage remove audiobooks: anchor not found (homepage summary block layout changed?)');
  process.exit(1);
}
c = c.replace(re, marker + 'false&&');
fs.writeFileSync(bundlePath, c);

console.log('homepage remove audiobooks: short-circuited audiobook block (' + matches.length + ' occurrence' + (matches.length === 1 ? '' : 's') + ')');

})();

// ===== patch_homepage_youtube_block.js =====
;(() => {
const fs = require('fs');
const child = require('child_process');

// Add a YouTube block to the homepage summary. Renders only when the user has
// marked at least one video as watched. Layout matches the other media-type
// blocks (mb-6 mr-6 + text-lg font-bold title + whitespace-nowrap duration row).
//
// Mounts where the audiobook block used to live — patch_homepage_remove_audiobooks.js
// must run first to leave behind the marker we anchor on.

const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/*mt-fork:yt-home*/';
if (c.includes(marker)) {
  console.log('homepage youtube block: already patched');
  return /* was process.exit(0) */;
}

// Component definition. Cp is the existing milliseconds-to-duration formatter,
// available globally in the bundle scope. Receives stats as a prop from the
// homepage scope (where `o = useQuery(/api/statistics/summary)`), so it renders
// in lockstep with the rest of the summary blocks — no separate fetch.
// patch_youtube_stats_in_summary.js inlines o.youtube into the summary response.
const ytHomeDef = '_YTHome=function(e){' +
  'var s=e&&e.stats;' +
  'if(!s)return null;' +
  'var totalSeconds=Number(s.totalSeconds)||0;' +
  'var count=Number(s.count)||0;' +
  'return r.createElement("div",{className:"mb-6 mr-6"},' +
    'r.createElement("div",{className:"text-lg font-bold"},"YouTube"),' +
    'r.createElement("div",{className:"whitespace-nowrap"},' +
      'r.createElement("b",null,r.createElement(Cp,{milliseconds:totalSeconds*1e3}))," viendo"' +
    '),' +
    'r.createElement("div",null,r.createElement("b",null,count)," videos")' +
  ')' +
'},';

// Inject the component definition right before _v (same anchor used by other patches).
const compAnchor = '_v=function(e){';
if (c.includes('_YTHome=function(){')) {
  console.log('homepage youtube block: _YTHome already injected');
} else if (!c.includes(compAnchor)) {
  console.error('homepage youtube block: _v anchor not found'); process.exit(1);
} else {
  c = c.replace(compAnchor, ytHomeDef + compAnchor);
  console.log('homepage youtube block: injected _YTHome component');
}

// Mount the component as a sibling of the audiobook block. We anchor on the
// audiobook-removal marker so this patch is order-dependent (must run after
// patch_homepage_remove_audiobooks.js). Pass `o.youtube` as the `stats` prop —
// `o` is the homepage scope's summary object (from /api/statistics/summary).
const mountAnchor = '/*mt-fork:no-audiobook-summary*/false&&';
const mountPatched = marker + 'r.createElement(_YTHome,{stats:o.youtube}),' + mountAnchor;
if (!c.includes(mountAnchor)) {
  console.error('homepage youtube block: mount anchor not found — did patch_homepage_remove_audiobooks.js run first?');
  process.exit(1);
}
c = c.replace(mountAnchor, mountPatched);
fs.writeFileSync(bundlePath, c);
console.log('homepage youtube block: mounted _YTHome in summary (replaces former audiobook slot)');

})();

// ===== patch_homepage_theater_block.js =====
;(() => {
// Add a "Teatro" block to the homepage summary, mirroring the existing Books
// block. Renders only when the user has at least one play (o.theater?.plays > 0).
// Goes between Books and YouTube blocks.

const fs = require('fs');
const child = require('child_process');
const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/*mt-fork:home-theater*/';
if (c.includes(marker)) {
  console.log('home theater block: already patched');
  return /* was process.exit(0) */;
}

// Anchor: the closing of the Books block, just before the YouTube block.
// The Books block ends with `}}}}))),` (closing of Books div + the mt-fork:yt-home marker on the next element).
const anchor = '/*mt-fork:yt-home*/r.createElement(_YTHome';
if (!c.includes(anchor)) {
  console.error('home theater block: yt-home anchor not found'); process.exit(1);
}

// Theater block: same shape as Books. Show count + total runtime if available.
const block = marker +
  '(o.theater&&(o.theater.items||0)>0)&&' +
  'r.createElement("div",{className:"mb-6 mr-6"},' +
    'r.createElement("div",{className:"text-lg font-bold"},r.createElement(Xe,{id:"Theater"})),' +
    'r.createElement("div",null,"(",r.createElement("b",null,o.theater.items||0)," ",xo._("Theater"),")"' +
      '),' +
    '(o.theater.duration>0)&&r.createElement("div",{className:"whitespace-nowrap"},r.createElement(Cp,{milliseconds:60*o.theater.duration*1e3}))' +
  '),';

c = c.replace(anchor, block + anchor);
fs.writeFileSync(bundlePath, c);
console.log('home theater block: inserted Teatro block before YouTube');

})();

// ===== patch_homepage_exclude_abandoned.js =====
;(() => {
// "Recently released" on the homepage was leaking dropped/abandoned items AND
// already-completed items (TVs with all episodes seen, movies/games/books
// already marked as seen). Two coordinated changes:
//   1. Backend: add excludeAbandoned to the dg(...) query — server-side filter
//      from patch_abandoned_filter.js drops abandoned items at the source.
//   2. Client: extend the existing n.filter() to also drop e.seen (which is
//      computed in items.js as "all episodes seen for TV / lastSeen for non-TV").

const fs = require('fs');
const child = require('child_process');
const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/*mt-fork:home-recent-noaband-noseen*/';
if (c.includes(marker)) {
  console.log('homepage recently released filter: already patched');
  return /* was process.exit(0) */;
}

// 1. Backend: excludeAbandoned in the query args.
const oldQ = 'dg({orderBy:"lastAiring",sortOrder:"desc",page:1,onlySeenItems:!1})';
const freshQ = 'dg({orderBy:"lastAiring",sortOrder:"desc",page:1,onlySeenItems:!1,excludeAbandoned:!0})';
if (!c.includes(oldQ)) {
  console.error('homepage recently released filter: dg() anchor not found'); process.exit(1);
}
c = c.replace(oldQ, freshQ);

// 2. Client: append `&& !e.seen` to the existing client-side filter that limits to last 90 days.
const oldFilter = 'n.filter((function(e){return new Date(e.lastAiring)>ss(new Date,90)}))';
const freshFilter = 'n.filter((function(e){return new Date(e.lastAiring)>ss(new Date,90)&&!e.seen}))' + marker;
if (!c.includes(oldFilter)) {
  console.error('homepage recently released filter: n.filter anchor not found'); process.exit(1);
}
c = c.replace(oldFilter, freshFilter);

fs.writeFileSync(bundlePath, c);
console.log('homepage recently released filter: now excludes abandoned + completed items');

})();

// ===== patch_homepage_remove_next_episode.js =====
;(() => {
// Remove the "Next episode to watch" block from the homepage. Series with
// unwatched episodes still show up in the hamburger /in-progress section, so
// dedicating a homepage block to them is redundant and adds visual noise.
//
// Strategy: gate the createElement call with `false&&` so React renders nothing
// for that child, instead of ripping out the JSX (cheaper, easier to revert,
// same approach as patch_homepage_remove_audiobooks.js).

const fs = require('fs');
const child = require('child_process');
const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/*mt-fork:no-next-episode-home*/';
if (c.includes(marker)) {
  console.log('homepage remove next episode: already patched');
  return /* was process.exit(0) */;
}

const old = 'r.createElement(qv,{title:xo._("Next episode to watch")';
const fresh = marker + 'false&&r.createElement(qv,{title:xo._("Next episode to watch")';
if (!c.includes(old)) {
  console.error('homepage remove next episode: anchor not found'); process.exit(1);
}
c = c.replace(old, fresh);
fs.writeFileSync(bundlePath, c);
console.log('homepage remove next episode: short-circuited block');

})();

// ===== patch_section_pages_minimal_grid.js =====
;(() => {
// DEPRECATED — was used to clear gridItemAppearance on section-page Zv calls
// (Pendiente, Descargados, etc.) so they showed only the cover art. The user
// later asked for the same item appearance as Abandonados in those sections —
// rating + topBar (firstUnwatchedEpisode badge, on-watchlist icon, unwatched
// count) — so this patch is now a no-op. Kept in the Dockerfile to preserve
// step ordering for downstream patches that reference it indirectly.

console.log('section pages minimal grid: no-op (intentional, see comment)');

})();

// ===== patch_persistent_state.js =====
;(() => {
// Persistence + visibility tweaks across the SPA:
//
//   1. Page title (header `<span>{name}</span>` in ny) was wrapped in
//      `md:hidden` so it only showed on mobile. Make it visible everywhere
//      so the user always sees which section they're on.
//   2. _Section open/closed state on /in-progress, /abandonados, /downloaded
//      is per-mount React state, so it resets every time the user navigates
//      back from a detail/episode page. Persist it in sessionStorage keyed by
//      the section label.
//   3. Zv (the items grid) only persists `page` to URL search params; the
//      sort, filter, and orderBy dropdowns live in component state and reset
//      on back-navigation. Mirror them to URL search params so back/refresh
//      preserves them.

const fs = require('fs');
const child = require('child_process');
const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/*mt-fork:persistent-state*/';
if (c.includes(marker)) {
  console.log('persistent-state: already patched');
  return /* was process.exit(0) */;
}

// === 1. Remove the in-nav page-title block entirely ===
// Base image rendered `<div className="md:hidden">{currentPagePathName}</div>`
// in ny() so on mobile the user could see which page they were on. We removed
// it: on desktop the hamburger menu + URL identifies the section just fine,
// and showing "Abandonados" / "Pendiente" / etc. to the right of the top nav
// items is undesired UX (looks like a top-nav entry).
//
// Anchor structure (upstream): the page-title div is preceded by `,` and
// followed by `,r.createElement("div",{className:"inline-flex ml-auto…"`
// (the user dropdown / theme toggle column). Slice from the comma before
// `r.createElement("div",{className:"md:hidden"}` through the matching close
// of that createElement.
{
  const startMarker = ',r.createElement("div",{className:"md:hidden"},r.createElement("div",{className:"flex flex-col md:flex-row"},m.filter((function(e){return e.path===c.pathname';
  const startIdx = c.indexOf(startMarker);
  if (startIdx < 0) {
    console.error('persistent-state: page title md:hidden anchor not found'); process.exit(1);
  }
  // Block ends with `e.name)})))` followed by a top-level `,r.createElement(`
  // (the next sibling — the user dropdown column).
  const endMarker = 'e.name)}))))';
  const endIdx = c.indexOf(endMarker, startIdx);
  if (endIdx < 0) {
    console.error('persistent-state: page title end marker not found'); process.exit(1);
  }
  c = c.slice(0, startIdx) + c.slice(endIdx + endMarker.length);
  console.log('persistent-state: removed in-nav page-title block (no more "Abandonados" right of YouTube)');
}

// === 2. _Section open/closed in sessionStorage ===
// All 3 sectioned pages (_IPS, _ABS, _DLP) define _Section the same way:
//   var st=r.useState(false),open=st[0],setOpen=st[1];
// Replace with a wrapper that reads/writes sessionStorage per section label.
//
// Caveat: this useState pattern also appears inside `_GamesSection` (the
// "Juegos" wrapper in _IPS), which is declared as `function()` — no `props`
// arg. A naive `props.label` reference there throws ReferenceError on every
// render of /in-progress, blanking the page. Use a typeof-guarded fallback so
// the same replacement is safe whether or not `props` is in scope.
{
  const old = 'var st=r.useState(false),open=st[0],setOpen=st[1];';
  const fresh =
    "var _secKey='mt_sec_'+String((typeof props!=='undefined'&&props&&props.label)||'_section');" +
    "var _secInit=(function(){try{return sessionStorage.getItem(_secKey)==='1'}catch(_){return false}})();" +
    "var st=r.useState(_secInit),open=st[0],_secSetOpen=st[1];" +
    "var setOpen=function(v){try{sessionStorage.setItem(_secKey,v?'1':'0')}catch(_){}_secSetOpen(v)};";
  const occurrences = c.split(old).length - 1;
  if (occurrences === 0) {
    console.error('persistent-state: _Section useState anchor not found'); process.exit(1);
  }
  c = c.split(old).join(fresh);
  console.log('persistent-state: persisted ' + occurrences + ' _Section open states in sessionStorage');
}

// === 3. Zv: sort / order / filter / page persisted in URL ===
// SUB-ZV BAILOUT: when Zv is rendered as a sub-grid (e.g. inside _GVS for the
// games "Visto" split view) it carries marker args (onlyJustWatched, or both
// onlyWatched+onlyPlayed). Such instances must NOT read from or write to the
// URL — the parent page already owns those params, and inheriting them would
// cause page-out-of-range errors and filter recursion. `_subZv` factors out
// that condition for reuse below.
//
// We declare _subZv inline as a comma-list element next to the existing var
// chain so it lives in Zv's scope.

// 3a. Initial sortOrder reads from URL (skipped for sub-Zv).
{
  const old = '(0,r.useState)(e.sortOrder)';
  const fresh = "(0,r.useState)(((e&&(e.onlyJustWatched||e.onlyPlayed||e.onlyWatched))?null:(g&&g.get&&g.get('sortOrder')))||e.sortOrder)";
  if (!c.includes(old)) {
    console.error('persistent-state: Zv sortOrder useState anchor not found'); process.exit(1);
  }
  c = c.replace(old, fresh);
  console.log('persistent-state: Zv sortOrder reads from URL (sub-Zv exempt)');
}

// 3b. Initial orderBy (lookup in `o` dict).
{
  const old = 'Gv({values:l,initialSelection:o[e.orderBy]})';
  const fresh = "Gv({values:l,initialSelection:o[((e&&(e.onlyJustWatched||e.onlyPlayed||e.onlyWatched))?null:(g&&g.get&&g.get('orderBy')))]||o[e.orderBy]})";
  if (!c.includes(old)) {
    console.error('persistent-state: Zv orderBy Gv anchor not found'); process.exit(1);
  }
  c = c.replace(old, fresh);
  console.log('persistent-state: Zv orderBy reads from URL (sub-Zv exempt)');
}

// 3c. Initial filter (lookup in `a` dict).
{
  const old = 'Gv({values:Object.values(a),initialSelection:a.all})';
  const fresh = "Gv({values:Object.values(a),initialSelection:a[((c&&(c.onlyJustWatched||c.onlyPlayed||c.onlyWatched))?null:(g&&g.get&&g.get('filter')))]||a.all})";
  if (!c.includes(old)) {
    console.error('persistent-state: Zv filter Gv anchor not found'); process.exit(1);
  }
  c = c.replace(old, fresh);
  console.log('persistent-state: Zv filter reads from URL (sub-Zv exempt)');
}

// 3d. Page useState — sub-Zv MUST start at 1 to avoid "Invalid page number"
//     when the parent's URL says ?page=N but the sub-list has fewer pages.
{
  const old = 'r.useState)(Number(null==g?void 0:g.get("page"))||1)';
  const fresh = 'r.useState)((c&&(c.onlyJustWatched||c.onlyPlayed||c.onlyWatched))?1:(Number(null==g?void 0:g.get("page"))||1))';
  if (!c.includes(old)) {
    console.error('persistent-state: Zv page useState anchor not found'); process.exit(1);
  }
  c = c.replace(old, fresh);
  console.log('persistent-state: Zv page reads from URL (sub-Zv starts at 1)');
}

// 3e. Mirror state changes to URL via the existing useEffect that fires on
//     [S, x, JSON.stringify(W)]. {replace:true} so changing filter/sort
//     replaces the current history entry. Sub-Zv skip the write entirely.
{
  const old = '(0,r.useEffect)((function(){1!==E&&D(1)}),[S,x,JSON.stringify(W)])';
  const fresh =
    '(0,r.useEffect)((function(){' +
      '1!==E&&D(1);' +
      'if(c&&(c.onlyJustWatched||c.onlyPlayed||c.onlyWatched))return;' +
      'try{' +
        'var cur=Object.fromEntries(g.entries());' +
        'if(S)cur.orderBy=S;else delete cur.orderBy;' +
        'if(x)cur.sortOrder=x;else delete cur.sortOrder;' +
        "var fk=Object.keys(W).find(function(k){return W[k]});" +
        "if(fk&&fk!=='all')cur.filter=fk;else delete cur.filter;" +
        'v(cur,{replace:true});' +
      '}catch(_){}' +
    '}),[S,x,JSON.stringify(W)])';
  if (!c.includes(old)) {
    console.error('persistent-state: Zv useEffect anchor not found'); process.exit(1);
  }
  c = c.replace(old, fresh);
  console.log('persistent-state: Zv state changes mirrored to URL (sub-Zv exempt, replace not push)');
}

// Place the marker at the start so the idempotency check works on rebuilds.
c = marker + c;
fs.writeFileSync(bundlePath, c);
console.log('persistent-state: complete');

})();

// ===== patch_query_cache_tuning.js =====
;(() => {
// React Query defaults: add staleTime (30s) so navigating between pages
// doesn't refetch every list immediately. keepPreviousData was already on.
// Keeps the UI snappy on back/forward without showing stale-for-too-long data.

const fs = require('fs');
const child = require('child_process');
const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/*mt-fork:rq-stale*/';
if (c.includes(marker)) {
  console.log('query cache tuning: already patched');
  return /* was process.exit(0) */;
}

const old = 'queries:{queryFn:function(e){return console.log(e),null},keepPreviousData:!0,';
const fresh = 'queries:{queryFn:function(e){return console.log(e),null},keepPreviousData:!0,staleTime:30000,' + marker;
if (!c.includes(old)) {
  console.error('query cache tuning: anchor not found'); process.exit(1);
}
c = c.replace(old, fresh);
fs.writeFileSync(bundlePath, c);
console.log('query cache tuning: staleTime=30s added to QueryClient defaults');

})();

// ===== patch_homepage_games_hours.js =====
;(() => {
const fs = require('fs');
const child = require('child_process');

// Render two lines in the homepage video_game summary:
//   line 1: "(N juegos) Xh Ym jugando"  → distinct kind=played
//   line 2: "(M juegos) Xh Ym viendo"   → distinct kind=watched
// Counts and minutes come from playedItems/playedDuration/watchedItems/watchedDuration
// computed in patch_stats_distinct_game_runtime.js. Cp formats milliseconds.

const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/*mt-fork:games-hours*/';
if (c.includes(marker)) {
  console.log('homepage games hours: already patched');
  return /* was process.exit(0) */;
}

// Anchor: the entire "(<1>{1}</1> plays)" element for video_game.
// Replace with two lines: "(N juegos) Xh Ym jugando" and "(M juegos) Xh Ym viendo".
const oldFrag = 'r.createElement("div",null,r.createElement(Xe,{id:"<0>{0}</0> video games (<1>{1}</1> plays)",values:{0:o.video_game.items,1:o.video_game.plays},components:{0:r.createElement("b",null),1:r.createElement("b",null)}}))';
const newFrag = marker +
  'r.createElement(r.Fragment,null,' +
    'r.createElement("div",null,"(",r.createElement("b",null,o.video_game.playedItems||0)," juegos) ",r.createElement(Cp,{milliseconds:60*(o.video_game.playedDuration||0)*1e3})," jugando"),' +
    'r.createElement("div",null,"(",r.createElement("b",null,o.video_game.watchedItems||0)," juegos) ",r.createElement(Cp,{milliseconds:60*(o.video_game.watchedDuration||0)*1e3})," viendo")' +
  ')';

if (!c.includes(oldFrag)) {
  console.error('homepage games hours: anchor not found (upstream may have changed the summary block)');
  process.exit(1);
}

c = c.replace(oldFrag, newFrag);

// Also remove the upstream "Xh playing" line that sits between the "Games"
// header and our two new lines. It's redundant now (our "(N juegos) Xh jugando"
// already tells you the playing time) and the user explicitly asked to drop it.
const playingLine = 'r.createElement("div",{className:"whitespace-nowrap"},r.createElement(Xe,{id:"<0><1/> </0>playing",components:{0:r.createElement("b",null),1:r.createElement(Cp,{milliseconds:60*o.video_game.duration*1e3})}})),';
if (c.includes(playingLine)) {
  c = c.replace(playingLine, '');
  console.log('homepage games hours: removed upstream "Xh playing" line');
} else {
  console.log('homepage games hours: "Xh playing" line not found (already removed?)');
}

fs.writeFileSync(bundlePath, c);
console.log('homepage games hours: replaced "(N plays)" with two lines (jugando/viendo)');

})();

// ===== patch_refresh_game_runtimes_frontend.js =====
;(() => {
const fs = require('fs');
const child = require('child_process');

// Add a "Refresh game runtimes" section to the Backup page (admin-only). Lets
// the user trigger the bulk IGDB time-to-beat backfill without waiting for the
// 24h metadata-refresh cycle to populate mediaItem.runtime for all games.

const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/*mt-fork:gr-refresh*/';
if (c.includes(marker)) {
  console.log('refresh game runtimes frontend: already patched');
  return /* was process.exit(0) */;
}

// _GR (game runtimes refresh) component — single button + result status.
const compDef = '_GR=function(){' +
  'var _s=r.useState(false),busy=_s[0],setBusy=_s[1];' +
  'var _r=r.useState(null),result=_r[0],setResult=_r[1];' +
  'var refresh=function(){' +
    'if(!confirm("Esto consultar\\u00e1 IGDB por cada juego. Puede tardar 1-2 minutos."))return;' +
    'setBusy(true);setResult(null);' +
    'fetch("/api/refresh-game-runtimes",{method:"POST",credentials:"same-origin"})' +
      '.then(function(r){return r.json()})' +
      '.then(function(d){setBusy(false);setResult(d)})' +
      '.catch(function(e){setBusy(false);setResult({error:String(e.message||e)})})' +
  '};' +
  'return r.createElement("div",{className:"flex flex-col gap-2"},' +
    'r.createElement("p",{className:"text-sm text-gray-600 dark:text-gray-300"},"Trae el tiempo total estimado (max IGDB time-to-beat) para cada juego con igdbId. Se usa en el resumen de la home."),' +
    'r.createElement("button",{onClick:refresh,disabled:busy,className:"self-start px-4 py-2 bg-purple-700 hover:bg-purple-800 disabled:bg-gray-500 text-white rounded shadow inline-flex items-center gap-2"},' +
      'r.createElement("i",{className:"material-icons"},busy?"hourglass_top":"refresh"),' +
      'busy?"Consultando IGDB...":"Refrescar tiempos de juegos"' +
    '),' +
    'result?r.createElement("div",{className:"p-3 rounded text-white "+(result.error?"bg-red-700":"bg-green-700")},' +
      'result.error?("Error: "+result.error):' +
      '("Total: "+result.total+" \\u00b7 actualizados: "+result.updated+" \\u00b7 sin cambios: "+result.unchanged+" \\u00b7 sin tiempo IGDB: "+result.missing+(result.failed?" \\u00b7 fallidos: "+result.failed:""))' +
    '):null' +
  ')' +
'},';

// Inject component definition before _v (same anchor used by other section components).
const compAnchor = '_v=function(e){';
if (c.includes('_GR=function(){')) {
  console.log('refresh game runtimes frontend: _GR already injected');
} else if (!c.includes(compAnchor)) {
  console.error('refresh game runtimes frontend: _v anchor not found'); process.exit(1);
} else {
  c = c.replace(compAnchor, compDef + compAnchor);
  console.log('refresh game runtimes frontend: injected _GR component');
}

// _GR no longer mounts inside _BK. Per-game refresh ("Refrescar tiempo IGDB"
// on each game's detail page) is added by patch_per_game_runtime_refresh.js.
// _GR's component definition stays available in case a future caller wants
// the bulk version, but it's not rendered anywhere by default.
c = marker + c;
fs.writeFileSync(bundlePath, c);
console.log('refresh game runtimes frontend: complete (component defined; mount moved per-game)');

})();

// ===== patch_rename_inprogress_to_pendiente.js =====
;(() => {
const fs = require('fs');
const child = require('child_process');

// Rename the hardcoded "En progreso" heading on /in-progress to "En proceso"
// (which is also the default Spanish i18n value for the "In progress" key, so
// the menu and the page heading stay in sync). Path remains /in-progress to
// avoid breaking bookmarks/PWA.

const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/*mt-fork:rename-inprogress*/';
if (c.includes(marker)) {
  console.log('rename inprogress: already patched');
  return /* was process.exit(0) */;
}

let changed = 0;

// Hardcoded heading on /in-progress page: "En progreso" → "En proceso".
const oldHeading = '"text-2xl mb-4 px-2"},"En progreso")';
const newHeading = '"text-2xl mb-4 px-2"},"En proceso")';
if (c.includes(oldHeading)) {
  c = c.replace(oldHeading, newHeading);
  changed++;
  console.log('rename inprogress: page heading → En proceso');
} else {
  console.log('rename inprogress: page heading anchor not found (skipping)');
}

if (changed === 0) {
  console.error('rename inprogress: no anchors matched — upstream may have changed both the heading and the ES i18n');
  process.exit(1);
}

c = marker + c;
fs.writeFileSync(bundlePath, c);
console.log('rename inprogress: complete (' + changed + ' replacement' + (changed === 1 ? '' : 's') + ')');

})();

// ===== patch_pendiente_games_consistent.js =====
;(() => {
const fs = require('fs');
const child = require('child_process');

// On the /in-progress (Pendiente) page, the games section was rendering
// _GamesSection (a special component with three sub-dropdowns: On list /
// Played / Seen). The other media-type sections all use the simpler _Section
// with `onlyWithProgress`. Make games match: replace the _GamesSection usage
// with a single _Section showing only what the user is currently playing.
//
// The other usage of _GamesSection (Watchlist page) is left alone —
// only the Pendiente page is being normalized.

const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/*mt-fork:pendiente-games-consistent*/';
if (c.includes(marker)) {
  console.log('pendiente games consistent: already patched');
  return /* was process.exit(0) */;
}

// Anchor: the Pendiente page builds Movies → TV → _GamesSection → Books, where TV
// uses onlyWithProgress (Watchlist uses onlyOnWatchlist, so this is unique).
const oldFrag = 'args:{mediaType:"tv",onlyWithProgress:!0}}),r.createElement(_GamesSection,null),';
const newFrag = 'args:{mediaType:"tv",onlyWithProgress:!0}}),r.createElement(_Section,{label:xo._("Games"),args:{mediaType:"video_game",onlyWithProgress:!0}}),';

if (!c.includes(oldFrag)) {
  console.error('pendiente games consistent: anchor not found (Pendiente page TV→Games sequence changed?)');
  process.exit(1);
}

c = marker + c.replace(oldFrag, newFrag);
fs.writeFileSync(bundlePath, c);
console.log('pendiente games consistent: replaced _GamesSection with single onlyWithProgress section');

})();

// ===== patch_filter_seen_games_only.js =====
;(() => {
const fs = require('fs');
const child = require('child_process');

// On the items grid pages (Movies / Series / Books / Games / Audiobooks), the
// filter dropdown shows: All, Rated, Unrated, On watchlist, Played/Watched,
// Just watched/Seen. The "Just watched" option (= filter onlyWatched) was
// added by patch_seen_kind_wiring.js to distinguish "actually played" from
// "marked watched only". For non-game media it isn't useful — the user just
// gets a redundant tab. Keep it only on the Games page (label: "Seen").

const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/*mt-fork:filter-seen-games-only*/';
if (c.includes(marker)) {
  console.log('filter seen games-only: already patched');
  return /* was process.exit(0) */;
}

// Anchor on the full filter object construction. The function takes mediaItem `e`
// and returns the labels-by-filter-key map. We rewrite it to spread the
// onlyWatched key only when Ao(e) is true (Ao = isVideoGame).
const oldFrag = '(e){return{all:xo._("All"),onlyWithUserRating:xo._("Rated"),onlyWithoutUserRating:xo._("Unrated"),onlyOnWatchlist:xo._("On watchlist"),onlyPlayed:jo(e)?xo._("Listened"):Do(e)?xo._("Read"):Ao(e)?xo._("Played"):xo._("Watched"),onlyWatched:Ao(e)?xo._("Seen"):xo._("Just watched")}}';
const newFrag = marker + '(e){return Object.assign({all:xo._("All"),onlyWithUserRating:xo._("Rated"),onlyWithoutUserRating:xo._("Unrated"),onlyOnWatchlist:xo._("On watchlist"),onlyPlayed:jo(e)?xo._("Listened"):Do(e)?xo._("Read"):Ao(e)?xo._("Played"):xo._("Watched")},Ao(e)?{onlyWatched:xo._("Seen")}:{})}';

if (!c.includes(oldFrag)) {
  console.error('filter seen games-only: anchor not found (filter object construction changed?)');
  process.exit(1);
}
c = c.replace(oldFrag, newFrag);
fs.writeFileSync(bundlePath, c);
console.log('filter seen games-only: onlyWatched filter restricted to Games page');

})();
