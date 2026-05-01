# Patches inventory

114 patches active. Each runs in the order defined by the `Dockerfile`. Order matters: many
patches depend on anchors created by earlier ones.

## Convention

Each `patch_*.js` modifies files inside the container (the bundled JS, `/app/build/...js`,
the entrypoint, locale files, knex migrations). The typical pattern:

```js
const fs = require('fs');
const path = '/app/build/...';
let c = fs.readFileSync(path, 'utf8');
if (c.includes('marker')) { console.log('already patched'); process.exit(0); }
const old = '...';
const fresh = '...';
if (!c.includes(old)) { console.error('anchor not found'); process.exit(1); }
c = c.replace(old, fresh);
fs.writeFileSync(path, c);
```

Anchors are short fragments of the minified bundle. When upstream rebuilds the bundle with a
different minifier output, several anchors can break and have to be updated.

## By category

### Build / infrastructure
- `patch_version.js` — `Config.version` → `v0.0.1` (configurable)
- `patch_bundle_rename.js` — renames `main_<hash>.js` → `main_<hash>_<contentHash>.js` so the CDN cache invalidates per build
- `patch_pwa.js` — manifest.json + sw.js + meta tags
- `patch_auto_restore.js` — entrypoint hook: restores `data.db` from the latest backup if absent
- `patch_sw_no_cache.js` — `/sw.js` served with `Cache-Control: no-store` (defeats the upstream max-age)

### Backend / DB performance
- `patch_dbconfig.js` — SQLite pragmas (mmap, cache, WAL, foreign_keys)
- `patch_perf_indexes_migration.js` — initial extra indexes
- `patch_perf_indexes_v2_migration.js` — composite `seen(mediaItemId, userId)` index (the big "in progress" win)
- `patch_metadata_throttle.js` — caps the metadata refresh to 10 items/cycle
- `patch_skip_startup_metadata.js` — defers the first refresh by 5 min so startup is responsive
- `patch_silence_episode_dupes.js` — silences the noisy `UNIQUE constraint` log spam from upstream

### Items query rewrites
- `patch_items_v2.js` — short-circuits episode subqueries when `mediaType !== 'tv'`
- `patch_items_disambiguate.js` — `progress` → `progress.progress` (ambiguous-column fix)
- `patch_items_dedupe_lastseen.js` — drops the redundant `lastSeen2` join (-5.5s on movies)
- `patch_items_short_circuit_seen_episodes.js` — short-circuits `seenEpisodes` for non-tv
- `patch_items_force_index.js` — forces `INDEXED BY mediaitem_mediatype_index` (planner picks the wrong unique index otherwise)
- `patch_items_simple_count.js` — count fast-paths per filter (movies 11s → 67ms; in-progress count 303 → real 61)
- `patch_items_only_downloaded.js` — adds the `onlyDownloaded` filter
- `patch_in_progress_filter.js` — refines `onlyWithProgress` to include TV with `firstUnwatchedEpisode.progress > 0`
- `patch_audio_progress_in_items.js` — exposes `audioProgress` and `links` in `mapRawResult`
- `patch_tv_episode_progress_in_items.js` — adds `progress` to `firstUnwatchedEpisode`
- `patch_only_seen_items_truthy.js` — accepts `"true"` / `1` / `true` for `onlySeenItems` (URL strings vs strict equality fix)

### Feature: Downloaded
- `patch_downloaded_migration.js` — `downloaded` column on `mediaItem`
- `patch_downloaded_entity.js` / `patch_downloaded_repo.js` / `patch_downloaded_items.js` — wiring
- `patch_downloaded_controller.js` / `patch_downloaded_routes.js` — `PATCH /api/downloaded`
- `patch_downloaded_frontend.js` — `_DL` toggle button on cards
- `patch_downloaded_tab.js` — collapsible `/downloaded` page + nav entry

### Feature: Links
- `patch_links_migration.js` / `patch_links_entity.js` — JSON `links` column
- `patch_links_controller.js` / `patch_links_routes.js` — `PUT /api/links`
- `patch_links_frontend.js` — `_LK` section on detail page

### Feature: Watch providers
- `patch_wp_controller.js` — calls TMDB `watch/providers`
- `patch_wp_routes.js` / `patch_wp_frontend.js` — UI grouped by provider type

### Feature: Backup / Import / Export
- `patch_backup_controller.js` — download `.db` + JSON v2 export (with episodes) + JSON import + Letterboxd CSV + restore-upload
- `patch_backup_routes.js` / `patch_backup_frontend.js` — `_BK` page at `/backup`
- `patch_cleanup_controller.js` / `patch_cleanup_routes.js` — orphan-purge endpoint

### Feature: Duplicate detection
- `patch_dupes_controller.js` — find dupes + merge endpoint
- `patch_dupes_routes.js` / `patch_dupes_frontend.js` — `/dupes` page

### Feature: Jellyfin
- `patch_jellyfin_controller.js` — status / sync / lookup / library-ids / sync-downloaded
- `patch_jellyfin_routes.js` — registers the 5 endpoints
- `patch_jellyfin_frontend.js` — Jellyfin block inside `/backup`
- `patch_jellyfin_play_button.js` — "Play in Jellyfin" button on detail page
- `patch_jellyfin_card_badge.js` — purple badge + auto-trigger sync-downloaded
- `patch_jellyfin_reverse.js` — MT-mark-seen → Jellyfin played (opt-in)
- `patch_jellyfin_admin_only.js` — admin-only gate on every Jellyfin endpoint

### Feature: TV episode progress
- `patch_episode_progress_migration.js` — `progress` column on `episode`
- `patch_episode_progress_entity.js` / `patch_episode_progress_controller.js` / `patch_episode_progress_routes.js`
- `patch_episode_progress_frontend.js` — slider on each episode row
- `patch_episode_page_grid.js` — 2×2 layout on the per-episode page
- `patch_episode_buttons_short.js` — short labels "Seen"/"Unseen"

### Feature: Audio (audiobook) progress
- `patch_audio_progress_migration.js` / `_entity` / `_controller` / `_routes` — `audioProgress` column
- `patch_audio_progress_frontend.js` — slider + h/m duration controls
- `patch_audio_listened_icon.js` — music_note icon when `audioProgress > 0`
- `patch_audiobook_icon.js` / `patch_audiobook_position.js` — audiobook-specific iconography
- `patch_audiobook_progress.js` — duration controls

### Tooltips & card badges
- `patch_completed_badge.js` — green "Completed" badge + "N times · first time DD/MM/YYYY"
- `patch_tooltips.js` — hover tips on watchlist / seen / rating
- `patch_progress_card.js` — % overlay on cards

### UI: sliders, modals, sidebar
- `patch_progress_modal.js` — Progress modal with fixed layout
- `patch_progress_redesign.js` — modal with parallel "I finished reading" / "I finished listening" sections
- `patch_sidebar_grid.js` — action buttons in 2×3 grid
- `patch_hide_seen_summary.js` — hides verbose seen blocks (replaced by compact summary)
- `patch_game_playing.js` — `play_circle` icon for games with `progress > 0`
- `patch_game_seen.js` — eye toggle on game cards
- `patch_games_seen_filter.js` — adds "Seen" / "Played" / "Listened" / "Watched" options to the per-mediaType filter dropdown

### Navigation / menu
- `patch_menu_restructure.js` — collapses Watchlist into Lists, moves Backup to Settings
- `patch_menu_split.js` — top nav by media type + side dropdown for the rest
- `patch_settings_appearance.js` — Appearance tab in Settings
- `patch_lists_page.js` — clickable list cards with item previews
- `patch_watchlist_tab.js` — `/watchlist` as a separate menu entry
- `patch_library_search.js` — search input in nav + `/library-search/:q` page
- `patch_sectioned_pages.js` — `/in-progress` and `/watchlist` with collapsible per-mediaType sections

### Calendar / upcoming
- `patch_calendar_all.js` — calendar filtered to watchlist + in-progress (excludes abandoned)
- `patch_upcoming_filter.js` — upcoming tab without the watchlist filter
- `patch_recently_released.js` — 90-day window, no watchlist filter

### Misc endpoints
- `patch_fetch_runtimes_controller.js` / `_routes` / `_frontend.js` — pull runtimes from TMDB
- `patch_hltb_controller.js` / `_routes` — How Long To Beat (IGDB time_to_beat) for games
- `patch_games_total_time.js` — total play time always visible on the games stats card
- `patch_unify_books.js` / `patch_unify_books_frontend.js` — merges Books + Audiobooks tabs

### Login / auth / About
- `patch_login_page.js` — login/register pages always reachable
- `patch_about_thanks.js` — fork rebrand on the About page + special thanks to bonukai

### YouTube
- `patch_youtube_controller.js` / `_routes.js` / `_frontend.js` — `/youtube` page with channel configurator (URL or `UC...` ID), RSS feed of recent videos, per-user storage at `/storage/youtube-{userId}.json`
- `patch_youtube_oauth_controller.js` / `_routes.js` — per-user Google OAuth so each user can link their YouTube account and auto-import subscriptions (start / callback / status / sync / delete). Needs `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` in env. Tokens stored inside the user's own JSON

### Sectional logic
- `patch_seen_kind_migration.js` — `seen.kind` column distinguishing `played` vs `watched`
- `patch_seen_kind_wiring.js` — `/api/seen` accepts `kind`; eye-click sends `kind=watched`; items query supports `onlyPlayed` / `onlyWatched` filters

### Watchlist auto-cleanup
- `patch_watchlist_autoremove.js` — removes from watchlist when an item is fully seen

### i18n
- `patch_i18n_custom.js` — 61 custom keys × 7 locales (`en`/`es`/`pt`/`fr`/`de`/`da`/`ko`) injected into the bundle's locale chunks

### Hardening / security
- `patch_session_samesite_lax.js` — session cookie `SameSite=Lax` (was `Strict`, blocked OAuth callbacks cross-site)
- `patch_cookie_secure.js` — `app.set('trust proxy', true)` + `cookie.secure: 'auto'` so the `Secure` flag is emitted when the session arrives over HTTPS (Cloudflare)
- `patch_body_limit.js` — raises `express.json()` body limit to 100MB (default 100KB broke `/api/backup/import` with real-size exports)
- `patch_user_byid_gate.js` — `/api/user/:userId` restricted to self-or-admin (was leaking `{id, name}` of any user to any logged-in user)
- `patch_seen_delete_idor.js` — `DELETE /api/seen/:seenId` checks ownership or admin (was deleting by primary key with no auth check)
