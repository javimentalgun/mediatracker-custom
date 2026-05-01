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

  // === Backup page (long descriptive strings) ===
  'Download':                     { es: 'Descargar', pt: 'Baixar', fr: 'Télécharger', de: 'Herunterladen', da: 'Hent', ko: '다운로드' },
  'Download .db (binary)':        { es: 'Descargar .db (binario)', pt: 'Baixar .db (binário)', fr: 'Télécharger .db (binaire)', de: '.db herunterladen (Binär)', da: 'Hent .db (binær)', ko: '.db 다운로드 (바이너리)' },
  'Export JSON':                  { es: 'Exportar JSON', pt: 'Exportar JSON', fr: 'Exporter JSON', de: 'JSON exportieren', da: 'Eksporter JSON', ko: 'JSON 내보내기' },
  'Letterboxd-importable (movies only)': { es: 'Importable en letterboxd.com (solo películas)', pt: 'Importável no letterboxd.com (só filmes)', fr: 'Importable dans letterboxd.com (films uniquement)', de: 'In letterboxd.com importierbar (nur Filme)', da: 'Kan importeres i letterboxd.com (kun film)', ko: 'letterboxd.com에서 가져올 수 있음 (영화만)' },
  'Upload and restore':           { es: 'Subir y restaurar', pt: 'Enviar e restaurar', fr: 'Téléverser et restaurer', de: 'Hochladen und wiederherstellen', da: 'Upload og gendan', ko: '업로드 후 복원' },
  'Backup heading':               { es: 'Copia de seguridad', pt: 'Cópia de segurança', fr: 'Sauvegarde', de: 'Sicherung', da: 'Sikkerhedskopi', ko: '백업' },
  'Download backup desc':         { es: 'Descarga una copia completa de tu base de datos. Guárdala en un sitio seguro.', pt: 'Baixe uma cópia completa do seu banco de dados. Guarde em local seguro.', fr: 'Téléchargez une copie complète de votre base de données. Conservez-la dans un endroit sûr.', de: 'Lade eine vollständige Kopie deiner Datenbank herunter. Bewahre sie an einem sicheren Ort auf.', da: 'Hent en komplet kopi af din database. Opbevar den et sikkert sted.', ko: '데이터베이스 전체 사본을 다운로드하세요. 안전한 곳에 보관하세요.' },
  'Restore desc':                 { es: 'Sube un .db descargado anteriormente. Tras la subida es necesario reiniciar el contenedor para aplicar.', pt: 'Envie um .db baixado anteriormente. Após o envio, é necessário reiniciar o contêiner para aplicar.', fr: "Envoyez un .db téléchargé auparavant. Après l'envoi, il faut redémarrer le conteneur pour appliquer.", de: 'Lade eine zuvor heruntergeladene .db hoch. Nach dem Hochladen muss der Container neu gestartet werden, um die Änderungen zu übernehmen.', da: 'Upload en .db, der tidligere er hentet. Efter upload skal containeren genstartes for at anvende ændringerne.', ko: '이전에 다운로드한 .db를 업로드하세요. 업로드 후 컨테이너를 다시 시작해야 적용됩니다.' },
  'Import JSON desc':             { es: 'Sube un mediatracker-export-*.json para fusionarlo con tus datos actuales. Los items se emparejan por TMDB/IMDB/IGDB ID y se evitan duplicados.', pt: 'Envie um mediatracker-export-*.json para mesclá-lo com seus dados atuais. Os itens são pareados por TMDB/IMDB/IGDB ID e duplicados são evitados.', fr: 'Envoyez un mediatracker-export-*.json pour le fusionner avec vos données actuelles. Les éléments sont appariés par ID TMDB/IMDB/IGDB et les doublons sont évités.', de: 'Lade eine mediatracker-export-*.json hoch, um sie mit deinen aktuellen Daten zusammenzuführen. Einträge werden über TMDB/IMDB/IGDB-ID abgeglichen, Duplikate werden vermieden.', da: 'Upload en mediatracker-export-*.json for at flette den med dine aktuelle data. Elementer matches via TMDB/IMDB/IGDB ID, og dubletter undgås.', ko: 'mediatracker-export-*.json을 업로드하여 현재 데이터와 병합하세요. 항목은 TMDB/IMDB/IGDB ID로 매칭되며 중복이 방지됩니다.' },
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
  'Connected as':                 { es: 'Conectado como', pt: 'Conectado como', fr: 'Connecté en tant que', de: 'Verbunden als', da: 'Forbundet som', ko: '다음으로 연결됨' }
};

// Anchors per locale: `"In progress":"<translation>"` is the stable end-of-letter-I marker
// in each locale chunk. Bumping any value here forces re-injection over old bundles.
const LOCALES = [
  { code: 'en', anchor: '"In progress":"In progress"',     marker: '"Auto backups desc":"Auto backups desc"' },
  { code: 'es', anchor: '"In progress":"En proceso"',      marker: '"Auto backups desc":"Un cron del host copia data.db cada noche a las 3 AM al directorio de backups configurado (retención 7d / 4w / 3m)."' },
  { code: 'pt', anchor: '"In progress":"Em curso"',        marker: '"Auto backups desc":"Um cron do host copia data.db todas as noites às 3 AM para o diretório de backups configurado (retenção 7d / 4w / 3m)."' },
  // FR uses double-quoted JS string so the apostrophe in "l'hôte" doesn't terminate the literal
  { code: 'fr', anchor: '"In progress":"En cours"',        marker: "\"Auto backups desc\":\"Un cron de l'hôte copie data.db chaque nuit à 3 h dans le dossier de sauvegardes configuré (rétention 7j / 4s / 3m).\"" },
  { code: 'de', anchor: '"In progress":"In Arbeit …"', marker: '"Auto backups desc":"Ein Cron auf dem Host kopiert data.db jede Nacht um 3 Uhr in das konfigurierte Backup-Verzeichnis (Aufbewahrung 7T / 4W / 3M)."' },
  { code: 'da', anchor: '"In progress":"Igangværende"',    marker: '"Auto backups desc":"En cron på værten kopierer data.db hver nat kl. 3 til den konfigurerede backup-mappe (opbevaring 7d / 4u / 3m)."' },
  { code: 'ko', anchor: '"In progress":"진행 중"',          marker: '"Auto backups desc":"호스트의 cron이 매일 밤 3시에 data.db를 설정된 백업 디렉터리로 복사합니다 (보관 7d / 4w / 3m)."' }
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
