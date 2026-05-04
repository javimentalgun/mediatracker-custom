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
