# Custom strings & i18n

The patches inject Spanish-original strings into the bundle. The `patch_i18n_custom.js` patch
maps them to keys translatable across the 7 locales MediaTracker ships with.

> **Status**: 61 custom keys × 7 locales (`en`, `es`, `pt`, `fr`, `de`, `da`, `ko`) injected
> into the bundle's locale chunks. Patches use `xo._("Key")` to render them.
>
> **Translation confidence**: ES is native, PT/FR/DE are solid, DA and KO are best-effort —
> short UI labels are fine; long descriptive paragraphs (cron, paths, multi-sentence help text)
> may sound off and would benefit from native review.

## Migrated keys

### Sections / tabs
`Downloaded`, `Watchlist`, `Backup`, `Movies`, `Tv`, `Games`, `Books`

### Jellyfin
`Play in Jellyfin`, `Available on Jellyfin`

### Backup / import / export
`Library search`, `Imports JSON`, `Letterboxd CSV`, `Catalog cleanup`, `Detect duplicates`,
`Restore`, `Find and merge`, `Automatic backups`, `Purge orphan catalog`,
`Delete orphan catalog items?`, `Download`, `Download .db (binary)`, `Export JSON`,
`Letterboxd-importable (movies only)`, `Upload and restore`, `Backup heading`,
`Download backup desc`, `Restore desc`, `Import JSON desc`, `Create missing items`,
`Catalog cleanup desc`, `Auto backups desc`

### Detail page / progress modal
`Read`, `Read progress`, `I finished reading`, `I finished listening`, `Quick`, `Duration`,
`last time`, `Set total duration`, `Set duration in hours and minutes`, `Set total pages`,
`pages`, `(empty)`

### Duplicates
`WINNER (most use)`, `Dupes desc backup`

### Games-section filter dropdown
`Rated`, `Unrated`, `On list`, `Played`, `Seen`, `Listened`, `Watched`, `Just watched`

### YouTube
`Add`, `Recent videos`, `No channels yet`, `No videos`,
`Link YouTube account`, `Sync my subscriptions`, `Disconnect`, `Connected as`

## Adding a new key

1. Add an entry to `customKeys` in `patch_i18n_custom.js`. Each entry maps the EN key to the
   six other locale translations (`{ es, pt, fr, de, da, ko }`).
2. Bump the `marker` field in the `LOCALES` array of the same file to a substring guaranteed
   to be present only with the new key. This forces re-injection over already-patched bundles.
3. Replace the hardcoded string in whichever feature patch needs it with `xo._("New Key")`.
4. Rebuild: `docker compose build mediatoc && docker compose up -d mediatoc`.

## Still hardcoded (dynamic interpolations)

These contain runtime values and would need `Trans` components or plural support to migrate
properly — low value, high friction, so left as-is:

- `"Subido OK ("+d.size+" bytes). Reinicia..."` (backup_frontend)
- `"Importados: "+d.lastImported+" | Saltados: "+d.lastSkipped+...` (jellyfin_frontend)
- `"¿Fusionar item "+loserId+" → "+winnerId+"?..."` (dupes_frontend)
- `"Eliminados "+d.deleted+" items"` (various confirm-dialog alerts)
- Relative-date strings: `"hoy" / "ayer" / "N días"` (youtube_frontend, completed_badge)
- Server-side error messages in `backup_controller.js` — these are API responses, not bundle
  strings, so `xo._()` doesn't reach them.
