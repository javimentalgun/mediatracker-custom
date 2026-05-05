# Patches inventory

10 mega-patches, applied in order by the `Dockerfile`. Each is the literal
concatenation of its constituent scripts (originally 184 individual `patch_*.js`
files, consolidated for readability). Order across buckets is load-bearing —
many constituents anchor on markers created by earlier ones.

## Convention

Each constituent inside a mega-patch is wrapped in an IIFE so its top-level
declarations (`const fs = require('fs')`, etc.) don't collide with siblings.
`process.exit(0)` is rewritten to `return` so an early-success guard inside
one constituent doesn't abort the whole bucket. The typical mutation pattern:

```js
;(() => {
  const fs = require('fs');
  const path = '/app/build/...';
  let c = fs.readFileSync(path, 'utf8');
  if (c.includes('marker')) { console.log('already patched'); return; }
  if (!c.includes(anchor)) { console.error('anchor not found'); process.exit(1); }
  c = c.replace(anchor, fresh);
  fs.writeFileSync(path, c);
})();
```

Anchors are short fragments of the minified bundle. When upstream rebuilds with
a different minifier output, several anchors can break and have to be updated.

## Buckets

| # | File | Constituents | Domain |
|---|---|---|---|
| 01 | `patch_01_security_pre_npm.js` | 1 | Bumps direct deps + adds overrides in `package.json`. Must run BEFORE `npm install`. |
| 02 | `patch_02_backend_db_items.js` | 8 | SQLite pragmas, version tag, auto-restore, items SQL fixes, in-progress filter. |
| 03 | `patch_03_downloaded_links_wp.js` | 19 | `downloaded` flag end-to-end, custom links, watch-providers, login/register, progress card. |
| 04 | `patch_04_backup_audiobook_episodes.js` | 28 | Backup tab, audiobook position/progress, unify books, episodes table + per-episode progress, audio progress field, sidebar 2-col grid. |
| 05 | `patch_05_perf_seen_items_opt.js` | 22 | TMDB runtime fetch, IGDB HLTB, catalog cleanup, perf indexes (v1/v2/v3), `seen.kind`, items query optimizations (force-index, simple-count, short-circuit). |
| 06 | `patch_06_navigation_dupes_security.js` | 27 | Menu split + restructure, library search, lists/watchlist/downloaded tabs, sectioned pages, dupes detector, calendar + upcoming + recently-released, metadata throttle, IGDB time-to-beat backfill, `sw.js`/cache headers. |
| 07 | `patch_07_jellyfin_youtube_oauth.js` | 23 | Full Jellyfin integration (status, sync, play button, card badge, reverse-sync, runtime config), endpoint security gates (admin-only, IDOR fixes), YouTube channels + OAuth + watched tracking. |
| 08 | `patch_08_i18n_theater_homepage.js` | 21 | UI language switcher, custom i18n keys, theater media-type (Wikidata + teatro.es providers), homepage block reshuffle (drop audiobooks, add YouTube + theater), persistent navigation state. |
| 09 | `patch_09_abandoned_inprogress_counts.js` | 22 | Abandonados feature, actively-in-progress flag, combined item-flags endpoint, mark-watched button, theater detail-page polish, count fast-paths for new filters. |
| 10 | `patch_10_visual_tokens_bundle.js` | 13 | Background colors, `.btn-green`, items-grid CSS, `css_rename` content-hash bump, application-tokens hub (TMDB key + relocations), Jellyfin import buttons, `bundle_rename` content-hash bump, `index.html` title, PWA manifest + service worker. **Must run last** (the rename steps bump cache-busting hashes). |

Total: **184 constituents** across 10 mega-patches.

## Maintenance

To add a new patch: write it as a self-contained `patch_<topic>.js` (using the
IIFE-friendly pattern above), add it to the right bucket in `_build_megapatches.js`
(at the position that respects its ordering constraints), and re-run
`docker run --rm -v "$PWD":/work -w /work node:20-alpine node _build_megapatches.js`
to regenerate the affected mega-patch. The `_build_megapatches.js` file is the
source of truth for the bucket map.
