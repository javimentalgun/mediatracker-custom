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
