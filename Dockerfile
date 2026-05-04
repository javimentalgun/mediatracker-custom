FROM bonukai/mediatracker:latest@sha256:4397847ec1a88a83e29a9c19c31261af47de730047adc7dbe4bbcbb34ca27df1

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD wget -q -O /dev/null "http://$(hostname):7481/api/configuration" || exit 1

# --- Security: CVE updates (Trivy-flagged HIGH/CRITICAL on the upstream image) ---

# Alpine: upgrade ALL OS-level packages with HIGH/CRITICAL CVEs flagged by Trivy
# (libcrypto3, libssl3, libpng, expat, libexpat, musl, musl-utils, lcms2, zlib).
# `apk upgrade --available` bumps anything where the repo has a newer version,
# which is the only way to clear most of these without changing base image.
RUN apk update && apk upgrade --no-cache --available && rm -rf /var/cache/apk/*

# Node deps: bump axios, fast-xml-parser, form-data, lodash (direct) and add
# overrides for path-to-regexp + tar-fs (transitive). See patch for CVE list.
# Upstream image ships only the node binary (no npm) so we install npm via apk
# for this layer, run install, then remove npm + caches to keep the image lean.
# `set -eo pipefail` ensures `tail` doesn't mask npm errors; lock file is removed
# so the new ranges + overrides actually take effect.
SHELL ["/bin/sh", "-eo", "pipefail", "-c"]
COPY patch_security_updates.js /tmp/patch_security_updates.js
RUN node /tmp/patch_security_updates.js
RUN apk add --no-cache npm && \
    cd /app && rm -f package-lock.json && \
    npm install --legacy-peer-deps --no-audit --no-fund 2>&1 | tail -25 && \
    rm -rf /root/.npm /var/cache/apk/*
# Force express's nested path-to-regexp to 0.1.13 — npm overrides + nested
# install both failed in this image. Workaround: download the 0.1.13 tarball
# from the npm registry and overwrite the nested copy in-place. The 0.1.13
# release is a single-file regex change so this is safe.
# Targets CVE-2026-4867 (ReDoS via catastrophic backtracking).
RUN cd /tmp && \
    wget -q https://registry.npmjs.org/path-to-regexp/-/path-to-regexp-0.1.13.tgz && \
    mkdir -p ptr && tar xzf path-to-regexp-0.1.13.tgz -C ptr && \
    rm -rf /app/node_modules/express/node_modules/path-to-regexp && \
    mv ptr/package /app/node_modules/express/node_modules/path-to-regexp && \
    rm -rf /tmp/ptr /tmp/path-to-regexp-0.1.13.tgz && \
    node -p "'path-to-regexp (express nested) → ' + require('/app/node_modules/express/node_modules/path-to-regexp/package.json').version"
# Note: npm stays installed (~45MB) because `apk del npm` also removes its
# nodejs dependency, which clobbers the upstream `/usr/local/bin/node` symlink
# and breaks every later `RUN node /tmp/patch_*.js` step. Acceptable trade-off.
# Sanity: print resolved versions for the bumped packages so build logs document the fix.
RUN cd /app && for p in axios fast-xml-parser form-data lodash; do \
      echo "$p: $(node -p "require('$p/package.json').version")"; \
    done

# --- Backend patches ---

# Tag the build with a fork-specific version suffix (e.g. 0.2.11-custom.1)
COPY patch_version.js /tmp/patch_version.js
RUN node /tmp/patch_version.js

# Auto-restore from latest backup if /storage/data.db is missing on startup
COPY patch_auto_restore.js /tmp/patch_auto_restore.js
RUN node /tmp/patch_auto_restore.js

# 1. SQLite performance pragmas (mmap, cache, temp_store, synchronous)
COPY patch_dbconfig.js /tmp/patch_dbconfig.js
RUN node /tmp/patch_dbconfig.js

# 2. Skip episode subqueries for non-TV items (book/movie/game listings)
# v2: instead of removing the JOIN entirely, inject WHERE 1=0 inside each episode
# subquery when mediaType !== 'tv'. SELECTs still resolve (no "no such column")
# but the subquery short-circuits so we don't scan the episode table.
COPY patch_items_v2.js /tmp/patch_items_v2.js
RUN node /tmp/patch_items_v2.js

# Disambiguate `progress` column references after episode.progress was added
COPY patch_items_disambiguate.js /tmp/patch_items_disambiguate.js
RUN node /tmp/patch_items_disambiguate.js

# Add `progress` field to firstUnwatchedEpisode object in items result (so cards can show TV episode progress)
COPY patch_tv_episode_progress_in_items.js /tmp/patch_tv_episode_progress_in_items.js
RUN node /tmp/patch_tv_episode_progress_in_items.js

# In-progress filter: include TV shows where firstUnwatchedEpisode.progress > 0
COPY patch_in_progress_filter.js /tmp/patch_in_progress_filter.js
RUN node /tmp/patch_in_progress_filter.js

# Fix orderBy=progress SQL "ambiguous column name: progress" — qualifies the
# bare "progress" in the CASE ELSE branch as "progress"."progress".
COPY patch_items_progress_sort_ambiguous.js /tmp/patch_items_progress_sort_ambiguous.js
RUN node /tmp/patch_items_progress_sort_ambiguous.js

# --- Frontend patches ---
# (applied below as features are added)

# Force DD/MM/YYYY date format everywhere (instead of browser-locale default)
RUN BUNDLE=$(ls /app/public/main_*.js) && \
    sed -i 's/\.toLocaleDateString()/.toLocaleDateString("es",{day:"2-digit",month:"2-digit",year:"numeric"})/g' "$BUNDLE" && \
    echo "Frontend: date format DD/MM/YYYY OK"

# --- Downloaded feature ---

# 1. Migration: add downloaded column to mediaItem table
COPY patch_downloaded_migration.js /tmp/patch_downloaded_migration.js
RUN node /tmp/patch_downloaded_migration.js

# 2. Add 'downloaded' to mediaItemColumns
COPY patch_downloaded_entity.js /tmp/patch_downloaded_entity.js
RUN node /tmp/patch_downloaded_entity.js

# 3. Add 'downloaded' to booleanColumnNames in repository
COPY patch_downloaded_repo.js /tmp/patch_downloaded_repo.js
RUN node /tmp/patch_downloaded_repo.js

# 4. Expose downloaded in items query result
COPY patch_downloaded_items.js /tmp/patch_downloaded_items.js
RUN node /tmp/patch_downloaded_items.js

# Map audioProgress + links into items query result (so cards can read them) — must run AFTER downloaded patch
COPY patch_audio_progress_in_items.js /tmp/patch_audio_progress_in_items.js
RUN node /tmp/patch_audio_progress_in_items.js

# 5. Add PATCH /api/downloaded endpoint to controller
COPY patch_downloaded_controller.js /tmp/patch_downloaded_controller.js
RUN node /tmp/patch_downloaded_controller.js

# 6. Register route
COPY patch_downloaded_routes.js /tmp/patch_downloaded_routes.js
RUN node /tmp/patch_downloaded_routes.js

# 7. Frontend: inject _DL toggle component + button on cards
COPY patch_downloaded_frontend.js /tmp/patch_downloaded_frontend.js
RUN node /tmp/patch_downloaded_frontend.js

# Music note icon on listened audiobook cards (instead of generic check)
COPY patch_audiobook_icon.js /tmp/patch_audiobook_icon.js
RUN node /tmp/patch_audiobook_icon.js

# --- Links feature ---
COPY patch_links_migration.js /tmp/patch_links_migration.js
RUN node /tmp/patch_links_migration.js

COPY patch_links_entity.js /tmp/patch_links_entity.js
RUN node /tmp/patch_links_entity.js

COPY patch_links_controller.js /tmp/patch_links_controller.js
RUN node /tmp/patch_links_controller.js

COPY patch_links_routes.js /tmp/patch_links_routes.js
RUN node /tmp/patch_links_routes.js

COPY patch_links_frontend.js /tmp/patch_links_frontend.js
RUN node /tmp/patch_links_frontend.js

# --- Watch Providers feature ---
COPY patch_wp_controller.js /tmp/patch_wp_controller.js
RUN node /tmp/patch_wp_controller.js

COPY patch_wp_routes.js /tmp/patch_wp_routes.js
RUN node /tmp/patch_wp_routes.js

COPY patch_wp_frontend.js /tmp/patch_wp_frontend.js
RUN node /tmp/patch_wp_frontend.js

# --- Book/Game progress feature ---
# Show % text + Set Progress quick button on card when progress exists
COPY patch_progress_card.js /tmp/patch_progress_card.js
RUN node /tmp/patch_progress_card.js

# --- Login/Register page ---
# Always show both login and register options regardless of noUsers/enableRegistration flags
COPY patch_login_page.js /tmp/patch_login_page.js
RUN node /tmp/patch_login_page.js

# --- Backup feature ---
# New tab "Backup" in nav, page with download button, GET /api/backup endpoint
COPY patch_backup_controller.js /tmp/patch_backup_controller.js
RUN node /tmp/patch_backup_controller.js

COPY patch_backup_routes.js /tmp/patch_backup_routes.js
RUN node /tmp/patch_backup_routes.js

COPY patch_backup_frontend.js /tmp/patch_backup_frontend.js
RUN node /tmp/patch_backup_frontend.js

# --- Audiobook position: music_note in top-LEFT (vs check_circle top-right) ---
COPY patch_audiobook_position.js /tmp/patch_audiobook_position.js
RUN node /tmp/patch_audiobook_position.js

# --- Audiobook progress: minutes slider + duration field always available ---
COPY patch_audiobook_progress.js /tmp/patch_audiobook_progress.js
RUN node /tmp/patch_audiobook_progress.js

# --- Unify books + audiobooks tabs ---
COPY patch_unify_books.js /tmp/patch_unify_books.js
RUN node /tmp/patch_unify_books.js

COPY patch_unify_books_frontend.js /tmp/patch_unify_books_frontend.js
RUN node /tmp/patch_unify_books_frontend.js

# --- Game playing indicator: play_circle_outline when game has progress but not seen ---
COPY patch_game_playing.js /tmp/patch_game_playing.js
RUN node /tmp/patch_game_playing.js

# --- Game seen toggle: eye button on game cards (top-center) to mark seen/visto ---
COPY patch_game_seen.js /tmp/patch_game_seen.js
RUN node /tmp/patch_game_seen.js

# --- Progress modal: rename to "Progreso" + fix percentage bar layout/spacing ---
COPY patch_progress_modal.js /tmp/patch_progress_modal.js
RUN node /tmp/patch_progress_modal.js

# --- Hide last-seen / times-read verbose blocks from detail page (replaced by compact summary line) ---
COPY patch_hide_seen_summary.js /tmp/patch_hide_seen_summary.js
RUN node /tmp/patch_hide_seen_summary.js

# --- Hover tooltips on Pendiente (bookmark), Completado (check), Favorito (rating stars) ---
COPY patch_tooltips.js /tmp/patch_tooltips.js
RUN node /tmp/patch_tooltips.js

# --- Progress modal: redesign into two sections (Terminé de leerlo / escucharlo) ---
COPY patch_progress_redesign.js /tmp/patch_progress_redesign.js
RUN node /tmp/patch_progress_redesign.js

# --- Audio progress: separate field for listening progress ---
# Backend: migration + entity + controller + routes
COPY patch_audio_progress_migration.js /tmp/patch_audio_progress_migration.js
RUN node /tmp/patch_audio_progress_migration.js

COPY patch_audio_progress_entity.js /tmp/patch_audio_progress_entity.js
RUN node /tmp/patch_audio_progress_entity.js

COPY patch_audio_progress_controller.js /tmp/patch_audio_progress_controller.js
RUN node /tmp/patch_audio_progress_controller.js

COPY patch_audio_progress_routes.js /tmp/patch_audio_progress_routes.js
RUN node /tmp/patch_audio_progress_routes.js

# Frontend: rename "I finished" button + add two parallel "Progreso leído"/"Progreso escuchado"
COPY patch_audio_progress_frontend.js /tmp/patch_audio_progress_frontend.js
RUN node /tmp/patch_audio_progress_frontend.js

# Sidebar action buttons reorganized into a 2-column grid (3 rows × 2 cols)
COPY patch_sidebar_grid.js /tmp/patch_sidebar_grid.js
RUN node /tmp/patch_sidebar_grid.js

# Green "✓ Completado" badge next to the seen-history link when item is completed
COPY patch_completed_badge.js /tmp/patch_completed_badge.js
RUN node /tmp/patch_completed_badge.js

# Audio-listened indicator (music_note top-center) when audioProgress > 0
COPY patch_audio_listened_icon.js /tmp/patch_audio_listened_icon.js
RUN node /tmp/patch_audio_listened_icon.js

# Shorten episode-row buttons "Marcar episodio como visto" → "Visto" / "No visto"
COPY patch_episode_buttons_short.js /tmp/patch_episode_buttons_short.js
RUN node /tmp/patch_episode_buttons_short.js

# Per-episode progress: new column on `episode` table + endpoint + slider in row
COPY patch_episode_progress_migration.js /tmp/patch_episode_progress_migration.js
RUN node /tmp/patch_episode_progress_migration.js

COPY patch_episode_progress_entity.js /tmp/patch_episode_progress_entity.js
RUN node /tmp/patch_episode_progress_entity.js

COPY patch_episode_progress_controller.js /tmp/patch_episode_progress_controller.js
RUN node /tmp/patch_episode_progress_controller.js

COPY patch_episode_progress_routes.js /tmp/patch_episode_progress_routes.js
RUN node /tmp/patch_episode_progress_routes.js

COPY patch_episode_progress_frontend.js /tmp/patch_episode_progress_frontend.js
RUN node /tmp/patch_episode_progress_frontend.js

# Episode detail page: 2x2 grid (Visto / No visto / Añadir a lista / Slider)
COPY patch_episode_page_grid.js /tmp/patch_episode_page_grid.js
RUN node /tmp/patch_episode_page_grid.js

# Fetch episode runtimes from TMDB (button + endpoint)
COPY patch_fetch_runtimes_controller.js /tmp/patch_fetch_runtimes_controller.js
RUN node /tmp/patch_fetch_runtimes_controller.js

COPY patch_fetch_runtimes_routes.js /tmp/patch_fetch_runtimes_routes.js
RUN node /tmp/patch_fetch_runtimes_routes.js

COPY patch_fetch_runtimes_frontend.js /tmp/patch_fetch_runtimes_frontend.js
RUN node /tmp/patch_fetch_runtimes_frontend.js

# How Long To Beat (IGDB time_to_beat) for games
COPY patch_hltb_controller.js /tmp/patch_hltb_controller.js
RUN node /tmp/patch_hltb_controller.js

COPY patch_hltb_routes.js /tmp/patch_hltb_routes.js
RUN node /tmp/patch_hltb_routes.js

# Catalog cleanup endpoint (purge orphan mediaItems from search-result registrations)
COPY patch_cleanup_controller.js /tmp/patch_cleanup_controller.js
RUN node /tmp/patch_cleanup_controller.js

COPY patch_cleanup_routes.js /tmp/patch_cleanup_routes.js
RUN node /tmp/patch_cleanup_routes.js

# Performance: extra indexes on new columns
COPY patch_perf_indexes_migration.js /tmp/patch_perf_indexes_migration.js
RUN node /tmp/patch_perf_indexes_migration.js

# Performance v2: composite index on seen(mediaItemId, userId) — fixes 9-second
# "is mediaItem seen by user" lookups that the home page makes per slider section.
COPY patch_perf_indexes_v2_migration.js /tmp/patch_perf_indexes_v2_migration.js
RUN node /tmp/patch_perf_indexes_v2_migration.js

# Performance v3: composite indexes that backup.importJson, userRating dedup,
# and listItem membership checks need. Each adds a single index covering the
# full WHERE pattern those queries use.
COPY patch_perf_indexes_v3_migration.js /tmp/patch_perf_indexes_v3_migration.js
RUN node /tmp/patch_perf_indexes_v3_migration.js

# seen.kind column — distinguishes "actually played" (kind='played') from
# "only watched / eye-click" (kind='watched'). Initial reclassification: rows where
# the mediaItem is on the user's watchlist are marked 'watched' (eye-clicks added
# before active play), the rest stay 'played'.
COPY patch_seen_kind_migration.js /tmp/patch_seen_kind_migration.js
RUN node /tmp/patch_seen_kind_migration.js

# Wiring: /api/seen accepts `kind`, eye-click sends kind=watched, items.js supports onlyKind filter
COPY patch_seen_kind_wiring.js /tmp/patch_seen_kind_wiring.js
RUN node /tmp/patch_seen_kind_wiring.js

# Decouple the four item states (pendiente / en curso / visto / completado).
# Strips the implicit watchlist add/remove from progress.addItem so toggling
# completion never silently mutates the watchlist.
COPY patch_states_independent.js /tmp/patch_states_independent.js
RUN node /tmp/patch_states_independent.js

# Drop redundant `lastSeen2` leftJoin in items query (was a byte-for-byte duplicate
# of `lastSeen`, costing ~5s on movies for nothing).
COPY patch_items_dedupe_lastseen.js /tmp/patch_items_dedupe_lastseen.js
RUN node /tmp/patch_items_dedupe_lastseen.js

# Eye icon on game cards when kind=watched, next to the check_circle.
# Must run after patch_audio_listened_icon (frontend check_circle markup) AND
# after patch_items_dedupe_lastseen (which renames lastSeen2 → lastSeen, the
# field this patch keys off in the row map).
COPY patch_game_watched_card_icon.js /tmp/patch_game_watched_card_icon.js
RUN node /tmp/patch_game_watched_card_icon.js

# Cache /api/items for 60s and keep results in memory 5min so the games
# "Visto" page (3 Zv instances) doesn't refetch on every re-render.
COPY patch_items_query_cache.js /tmp/patch_items_query_cache.js
RUN node /tmp/patch_items_query_cache.js

# Short-circuit the seenEpisodes inner materialization for non-tv mediaTypes
# (movies/books/games never produce meaningful rows from this 31k-seen scan).
COPY patch_items_short_circuit_seen_episodes.js /tmp/patch_items_short_circuit_seen_episodes.js
RUN node /tmp/patch_items_short_circuit_seen_episodes.js

# Force INDEXED BY mediaitem_mediatype_index — SQLite's planner picks
# mediaitem_goodreadsid_mediatype_unique by mistake, costing 100× extra time.
COPY patch_items_force_index.js /tmp/patch_items_force_index.js
RUN node /tmp/patch_items_force_index.js

# Replace the heavy paginated COUNT (5400ms on movies) with a simple
# `SELECT COUNT(*) FROM mediaItem WHERE mediaType=?` when none of the join-based
# filters are active — the typical "browse the tab" case.
COPY patch_items_simple_count.js /tmp/patch_items_simple_count.js
RUN node /tmp/patch_items_simple_count.js

# Bug fix: onlySeenItems === true was strict equality, but URL query params arrive
# as strings ("true"), so the data filter never applied (count was OK from fast-path,
# but data returned ALL items). Accept "true" / 1 / true.
COPY patch_only_seen_items_truthy.js /tmp/patch_only_seen_items_truthy.js
RUN node /tmp/patch_only_seen_items_truthy.js

# Add "Seen"/"Visto" as a separate option in the items grid filter dropdown
# (distinct from "Played" — which now maps to onlyWithProgress)
COPY patch_games_seen_filter.js /tmp/patch_games_seen_filter.js
RUN node /tmp/patch_games_seen_filter.js

# Add `onlyDownloaded` filter to items endpoint (used by the Descargado tab below)
COPY patch_items_only_downloaded.js /tmp/patch_items_only_downloaded.js
RUN node /tmp/patch_items_only_downloaded.js

# Menu restructure: collapse Watchlist into Lists; move Import + Backup to Settings
COPY patch_menu_restructure.js /tmp/patch_menu_restructure.js
RUN node /tmp/patch_menu_restructure.js

# Menu split: top nav = media types (TV/Pelis/Juegos/Libros), right sidebar = Home/Próx/EnProg/Cal/Listas
COPY patch_menu_split.js /tmp/patch_menu_split.js
RUN node /tmp/patch_menu_split.js

# Settings -> Appearance tab (move dark/light toggle into settings; gear icon in top nav)
COPY patch_settings_appearance.js /tmp/patch_settings_appearance.js
RUN node /tmp/patch_settings_appearance.js

# Library search bar in top nav + /library-search/:q results page
COPY patch_library_search.js /tmp/patch_library_search.js
RUN node /tmp/patch_library_search.js

# Lists page: clickable blocks, watchlist pinned with bookmark, item previews
COPY patch_lists_page.js /tmp/patch_lists_page.js
RUN node /tmp/patch_lists_page.js

# Watchlist as separate menu entry below Lists; remove from Lists page
COPY patch_watchlist_tab.js /tmp/patch_watchlist_tab.js
RUN node /tmp/patch_watchlist_tab.js

# "Descargado" menu tab + page (lists items with downloaded=1) — must come
# AFTER watchlist tab so the menu anchor exists.
COPY patch_downloaded_tab.js /tmp/patch_downloaded_tab.js
RUN node /tmp/patch_downloaded_tab.js

# Sectioned pages: /in-progress and /watchlist render 4 sections by mediaType
# (same UX as /downloaded). Replaces the original iy/gS components.
COPY patch_sectioned_pages.js /tmp/patch_sectioned_pages.js
RUN node /tmp/patch_sectioned_pages.js

# Duplicates: detect mediaItems with same title+year but distinct external IDs,
# merge them moving seen/ratings/progress/listItems to a chosen winner.
COPY patch_dupes_controller.js /tmp/patch_dupes_controller.js
RUN node /tmp/patch_dupes_controller.js

COPY patch_dupes_routes.js /tmp/patch_dupes_routes.js
RUN node /tmp/patch_dupes_routes.js

COPY patch_dupes_frontend.js /tmp/patch_dupes_frontend.js
RUN node /tmp/patch_dupes_frontend.js

# Always show total playing time on the Games stats card (even when 0)
COPY patch_games_total_time.js /tmp/patch_games_total_time.js
RUN node /tmp/patch_games_total_time.js

# Upcoming page: show all future items in library, not only watchlist
COPY patch_upcoming_filter.js /tmp/patch_upcoming_filter.js
RUN node /tmp/patch_upcoming_filter.js

# Calendar: rewrite getCalendarItems to query whole library (not only watchlist)
COPY patch_calendar_all.js /tmp/patch_calendar_all.js
RUN node /tmp/patch_calendar_all.js

# Recently released: remove watchlist filter, extend window 30 → 90 days
COPY patch_recently_released.js /tmp/patch_recently_released.js
RUN node /tmp/patch_recently_released.js

# Throttle background metadata refresh: cap to 100 items per cycle (was unlimited)
# so a 38k-item library doesn't peg CPU at 100% for hours after import.
COPY patch_metadata_throttle.js /tmp/patch_metadata_throttle.js
RUN node /tmp/patch_metadata_throttle.js

# Silence the noisy "UNIQUE constraint failed: episode.tmdbId" errors during refresh.
# These are TMDB returning renamed episode IDs that collide with existing rows; the
# metadata update skips them anyway, but the log spam was hiding real errors.
COPY patch_silence_episode_dupes.js /tmp/patch_silence_episode_dupes.js
RUN node /tmp/patch_silence_episode_dupes.js

# Defer the startup metadata refresh by 5 min. Without this, every restart
# leaves the server unresponsive for several minutes while the first batch
# runs synchronously — cloudflared sees connection resets and 502s.
COPY patch_skip_startup_metadata.js /tmp/patch_skip_startup_metadata.js
RUN node /tmp/patch_skip_startup_metadata.js

# IGDB time-to-beat: fetch the `completely` (max) field for each game during
# metadata refresh and store as mediaItem.runtime in minutes. Used by the homepage
# summary's video_game block so total time = sum of distinct games' max time-to-beat.
COPY patch_igdb_time_to_beat.js /tmp/patch_igdb_time_to_beat.js
RUN node /tmp/patch_igdb_time_to_beat.js

# Stats endpoint: for video_game, replace SUM(seen.duration) with
# SUM(DISTINCT mediaItem.runtime) so re-playing a 100h game doesn't double-count.
COPY patch_stats_distinct_game_runtime.js /tmp/patch_stats_distinct_game_runtime.js
RUN node /tmp/patch_stats_distinct_game_runtime.js

# Auto-trigger IGDB time-to-beat backfill the first time userStatisticsSummary
# runs after a container start, so the homepage games hours don't show 0 until
# the user clicks the manual refresh button.
COPY patch_auto_refresh_games_on_stats.js /tmp/patch_auto_refresh_games_on_stats.js
RUN node /tmp/patch_auto_refresh_games_on_stats.js

# Inline YouTube watched stats into /api/statistics/summary so the homepage
# delivers all blocks in one request. patch_homepage_youtube_block.js consumes
# o.youtube from the summary instead of doing a separate fetch.
COPY patch_youtube_stats_in_summary.js /tmp/patch_youtube_stats_in_summary.js
RUN node /tmp/patch_youtube_stats_in_summary.js

# Homepage summary: book "duration" comes from numberOfPages × 2 minutes,
# instead of sum(seen.duration) which is almost always 0.
COPY patch_book_reading_minutes.js /tmp/patch_book_reading_minutes.js
RUN node /tmp/patch_book_reading_minutes.js

# Admin endpoint POST /api/refresh-game-runtimes — bulk-fetch IGDB time-to-beat
# for every existing video_game (without waiting on the 24h refresh cycle).
COPY patch_refresh_game_runtimes.js /tmp/patch_refresh_game_runtimes.js
RUN node /tmp/patch_refresh_game_runtimes.js

# Prevent Cloudflare and browsers from caching /sw.js for a year. The default
# .js Cache-Control: max-age=31536000 was making CF serve a stale SW that pinned
# users to an old bundle even after rebuilds.
COPY patch_sw_no_cache.js /tmp/patch_sw_no_cache.js
RUN node /tmp/patch_sw_no_cache.js

# Bugfix: req.header('Accept-Encoding').includes(...) crashes when the header
# is absent. Make the brotli/gzip swap defensive so /js and /css don't 500.
COPY patch_accept_encoding_safe.js /tmp/patch_accept_encoding_safe.js
RUN node /tmp/patch_accept_encoding_safe.js

# Bugfix: utils.downloadAsset() makes axios requests with no User-Agent, and
# Wikimedia Commons (and other CDNs) 403 those. Add a UA so theater posters
# from Wikidata can actually be fetched.
COPY patch_download_asset_ua.js /tmp/patch_download_asset_ua.js
RUN node /tmp/patch_download_asset_ua.js

# --- Jellyfin integration ---
# Backend: jellyfinStatus / jellyfinSync / jellyfinLookup endpoints + helpers
COPY patch_jellyfin_controller.js /tmp/patch_jellyfin_controller.js
RUN node /tmp/patch_jellyfin_controller.js

COPY patch_jellyfin_routes.js /tmp/patch_jellyfin_routes.js
RUN node /tmp/patch_jellyfin_routes.js

# Frontend: Jellyfin section in /backup page (status + sync button)
COPY patch_jellyfin_frontend.js /tmp/patch_jellyfin_frontend.js
RUN node /tmp/patch_jellyfin_frontend.js

# "▶ Reproducir en Jellyfin" button on detail page
COPY patch_jellyfin_play_button.js /tmp/patch_jellyfin_play_button.js
RUN node /tmp/patch_jellyfin_play_button.js

# Purple play_circle badge on cards when item is available in Jellyfin
COPY patch_jellyfin_card_badge.js /tmp/patch_jellyfin_card_badge.js
RUN node /tmp/patch_jellyfin_card_badge.js

# Reverse sync: when MT marks something as seen, also mark played in Jellyfin
# (opt-in via JELLYFIN_REVERSE_SYNC=true env var)
COPY patch_jellyfin_reverse.js /tmp/patch_jellyfin_reverse.js
RUN node /tmp/patch_jellyfin_reverse.js

# Multi-user safety: gate all Jellyfin endpoints + reverse-sync to admin MT users.
# Non-admin users get 403 and don't see badges/play buttons (the integration is
# tied to a single Jellyfin user via env vars, so leaking it across MT users would
# be wrong).
COPY patch_jellyfin_admin_only.js /tmp/patch_jellyfin_admin_only.js
RUN node /tmp/patch_jellyfin_admin_only.js

# Move Jellyfin URL/API key/userId out of env vars and into /storage/jellyfin-config.json
# so the integration can be configured from the UI (Settings → Backup → Jellyfin).
# Adds GET/PUT /api/jellyfin/config (admin-only). Must run after admin_only so the
# helper jellyfinIsAdmin is already installed.
COPY patch_jellyfin_runtime_config.js /tmp/patch_jellyfin_runtime_config.js
RUN node /tmp/patch_jellyfin_runtime_config.js

# Gate backup/restore/import/export/dupes/cleanup to admin users only.
# Otherwise a non-admin could download the data.db with all users' data.
COPY patch_admin_only_endpoints.js /tmp/patch_admin_only_endpoints.js
RUN node /tmp/patch_admin_only_endpoints.js

# /api/user/:userId returned {id, name} of any user to any logged-in user, enabling
# enumeration of the user list. Restrict to self-or-admin.
COPY patch_user_byid_gate.js /tmp/patch_user_byid_gate.js
RUN node /tmp/patch_user_byid_gate.js

# DELETE /api/seen/:seenId deleted by primary key with no ownership check, letting
# any logged-in user wipe other users' seen history. Patch to require ownership or admin.
COPY patch_seen_delete_idor.js /tmp/patch_seen_delete_idor.js
RUN node /tmp/patch_seen_delete_idor.js

# When marking an item as seen, auto-remove it from watchlist if it's now complete
# (movie/audio/book/game = always; tv = no aired non-special episodes left unseen)
COPY patch_watchlist_autoremove.js /tmp/patch_watchlist_autoremove.js
RUN node /tmp/patch_watchlist_autoremove.js

# Special thanks to bonukai on the About page
COPY patch_about_thanks.js /tmp/patch_about_thanks.js
RUN node /tmp/patch_about_thanks.js

# YouTube section: configure channels + recent videos feed (RSS-based)
COPY patch_youtube_controller.js /tmp/patch_youtube_controller.js
RUN node /tmp/patch_youtube_controller.js

COPY patch_youtube_routes.js /tmp/patch_youtube_routes.js
RUN node /tmp/patch_youtube_routes.js

# express.json() body limit raised from 100KB default to 100MB so /api/backup/import
# can accept full mediatoc-export-*.json files (10-50MB on populated libraries).
COPY patch_body_limit.js /tmp/patch_body_limit.js
RUN node /tmp/patch_body_limit.js

# Session cookie SameSite=Lax (required so OAuth callback from accounts.google.com
# carries the MT session cookie back; default 'true' = Strict and blocks it).
COPY patch_session_samesite_lax.js /tmp/patch_session_samesite_lax.js
RUN node /tmp/patch_session_samesite_lax.js

# Cookie hardening: trust X-Forwarded-Proto (so Cloudflare HTTPS terminates correctly)
# and emit Secure flag when on HTTPS, while keeping local HTTP access working.
COPY patch_cookie_secure.js /tmp/patch_cookie_secure.js
RUN node /tmp/patch_cookie_secure.js

# YouTube OAuth: per-user Google account linking → fetch user's subscriptions
COPY patch_youtube_oauth_controller.js /tmp/patch_youtube_oauth_controller.js
RUN node /tmp/patch_youtube_oauth_controller.js

COPY patch_youtube_oauth_routes.js /tmp/patch_youtube_oauth_routes.js
RUN node /tmp/patch_youtube_oauth_routes.js

# Per-user "marked as watched" tracking for YouTube videos. Backend uses the
# user's OAuth access token to resolve video duration via YouTube Data API v3.
COPY patch_youtube_watched_controller.js /tmp/patch_youtube_watched_controller.js
RUN node /tmp/patch_youtube_watched_controller.js

COPY patch_youtube_watched_routes.js /tmp/patch_youtube_watched_routes.js
RUN node /tmp/patch_youtube_watched_routes.js

COPY patch_youtube_frontend.js /tmp/patch_youtube_frontend.js
RUN node /tmp/patch_youtube_frontend.js

# UI language switcher: dropdown in Settings that persists in localStorage and
# overrides navigator.language at app boot. Must run BEFORE patch_i18n_custom so
# the new "UI language" / "Auto (browser)" keys can be translated.
COPY patch_ui_language_switcher.js /tmp/patch_ui_language_switcher.js
RUN node /tmp/patch_ui_language_switcher.js

# i18n: add custom translation keys (Downloaded, Play in Jellyfin, etc.) to the
# bundle's ES + EN locale chunks. Patches that use xo._("Key") get translated.
COPY patch_i18n_custom.js /tmp/patch_i18n_custom.js
RUN node /tmp/patch_i18n_custom.js

# Theater section: nav entry (left of YouTube), route → ey() generic page,
# Tt predicate, mediaType label. Must run AFTER patch_i18n_custom (uses
# xo._("Theater")) AND after patch_youtube_frontend (anchors on the /youtube
# route element which is created there).
COPY patch_theater_nav.js /tmp/patch_theater_nav.js
RUN node /tmp/patch_theater_nav.js

# Add 'theater' to the mediaType enum used by the route validators (otherwise
# /api/items?mediaType=theater is rejected with 400 and the page goes blank).
COPY patch_theater_routes_enum.js /tmp/patch_theater_routes_enum.js
RUN node /tmp/patch_theater_routes_enum.js

# Wikidata SPARQL provider for `mediaType: 'theater'`. Drops the provider
# class file in /app/build/metadata/provider/wikidata.js and registers it in
# metadataProviders.js. Search via mwapi EntitySearch + filter to instances
# of theatrical work (Q25379). Reuses tmdbId column for the Wikidata QID.
COPY patch_theater_metadata_provider.js /tmp/patch_theater_metadata_provider.js
RUN node /tmp/patch_theater_metadata_provider.js

# teatro.es (CDT/INAEM) HTML scraper as a second source for theater. Wraps
# WikidataTheater.search to merge teatroes results — covers contemporary
# Spanish stagings that Wikidata doesn't track. MUST run after the wikidata
# provider patch above.
COPY patch_theater_teatroes_provider.js /tmp/patch_theater_teatroes_provider.js
RUN node /tmp/patch_theater_teatroes_provider.js

# Show a Material `theater_comedy` icon next to the "Teatro" mediaType label
# on item cards.
COPY patch_theater_card_icon.js /tmp/patch_theater_card_icon.js
RUN node /tmp/patch_theater_card_icon.js

# Frontend: the "Add to seen history" big button conditional in the action panel
# branches on audiobook/book/video_game/movie/tv but never on theater, so theater
# items got no "Marcar como visto" big button — only the small rating star and
# download toggle were visible. Add a Tt(n) (theater) branch.
COPY patch_theater_seen_button.js /tmp/patch_theater_seen_button.js
RUN node /tmp/patch_theater_seen_button.js


# Rename bundle to include a content hash. Without this, Cloudflare/browsers cache
# main_<originalHash>.js for a year (max-age=31536000) and never fetch new content
# even though our patches change it. MUST be AFTER all patches that modify the bundle —
# otherwise the hash reflects only partial content and CF keeps serving the old version
# even though our later patches changed the file.
# Homepage summary: drop audiolibros block (replaced by YouTube watch-time block below).
COPY patch_homepage_remove_audiobooks.js /tmp/patch_homepage_remove_audiobooks.js
RUN node /tmp/patch_homepage_remove_audiobooks.js

# Homepage summary: YouTube block ("X videos · Yh viewing"). Mounts in the slot the
# audiolibros block used to occupy. Must run AFTER patch_homepage_remove_audiobooks.js.
COPY patch_homepage_youtube_block.js /tmp/patch_homepage_youtube_block.js
RUN node /tmp/patch_homepage_youtube_block.js

# Theater block in the homepage summary, just before the YouTube block. Anchors
# on the /*mt-fork:yt-home*/ marker so this MUST run after patch_homepage_youtube_block.
COPY patch_homepage_theater_block.js /tmp/patch_homepage_theater_block.js
RUN node /tmp/patch_homepage_theater_block.js

# Homepage "Recently released": exclude abandoned (server-side) AND completed
# (client-side filter on e.seen). Dropped series and finished items don't
# belong in a "what's new" feed.
COPY patch_homepage_exclude_abandoned.js /tmp/patch_homepage_exclude_abandoned.js
RUN node /tmp/patch_homepage_exclude_abandoned.js

# Homepage: drop the "Next episode to watch" block. Same info is in /in-progress.
COPY patch_homepage_remove_next_episode.js /tmp/patch_homepage_remove_next_episode.js
RUN node /tmp/patch_homepage_remove_next_episode.js

# Hamburger sectioned pages (Pendiente / Abandonados / Descargados): grid shows
# only cover art (no rating, no top-bar badges). Header count + footer paginator
# from Zv unchanged. Per-mediaType pages (/tv, /movies, ...) unaffected.
COPY patch_section_pages_minimal_grid.js /tmp/patch_section_pages_minimal_grid.js
RUN node /tmp/patch_section_pages_minimal_grid.js

# Persist navigation state across back/forward: page title visible always,
# section-open state in sessionStorage, Zv sort/filter/orderBy in URL params.
COPY patch_persistent_state.js /tmp/patch_persistent_state.js
RUN node /tmp/patch_persistent_state.js

# React Query defaults: staleTime=30s so revisiting pages doesn't refetch
# every list — back/forward feels instant.
COPY patch_query_cache_tuning.js /tmp/patch_query_cache_tuning.js
RUN node /tmp/patch_query_cache_tuning.js

# (patch_item_flags_combined moved AFTER patch_actively_in_progress_frontend
# so the _AB / _AIP function definitions exist when we rewrite their fetches.)

# (count-query-abandoned and only-just-watched moved AFTER patch_abandoned_filter
# below, since they both need the abandoned filter's destructure additions.)

# Homepage summary games block: replace "(N plays)" with "(Xh)" using duration field.
COPY patch_homepage_games_hours.js /tmp/patch_homepage_games_hours.js
RUN node /tmp/patch_homepage_games_hours.js

# Frontend button on Backup page to trigger /api/refresh-game-runtimes.
COPY patch_refresh_game_runtimes_frontend.js /tmp/patch_refresh_game_runtimes_frontend.js
RUN node /tmp/patch_refresh_game_runtimes_frontend.js

# Rename "En progreso" / "In progress" → "Pendiente" (page heading + ES i18n).
COPY patch_rename_inprogress_to_pendiente.js /tmp/patch_rename_inprogress_to_pendiente.js
RUN node /tmp/patch_rename_inprogress_to_pendiente.js

# Pendiente page: replace _GamesSection (3 sub-dropdowns) with a single
# onlyWithProgress section so games match the layout of movies/tv/books.
COPY patch_pendiente_games_consistent.js /tmp/patch_pendiente_games_consistent.js
RUN node /tmp/patch_pendiente_games_consistent.js

# Items-grid filter dropdown: hide the "Just watched"/onlyWatched option for
# non-game media types (it's only useful on Games where it maps to "Seen").
COPY patch_filter_seen_games_only.js /tmp/patch_filter_seen_games_only.js
RUN node /tmp/patch_filter_seen_games_only.js

# --- Dropped / Abandonados feature ---
# Per-user "stopped consuming on purpose" flag with its own page + hamburger entry.
# Migration creates the abandoned table; controller exposes 3 endpoints; filter
# extends items query with excludeAbandoned/onlyAbandoned; frontend adds toggle
# button on detail pages, the /abandonados page, and the menu entry.
COPY patch_abandoned_migration.js /tmp/patch_abandoned_migration.js
RUN node /tmp/patch_abandoned_migration.js

# One-shot: nuke video_game.runtime values > 500h so the new IGDB cap takes
# effect on previously-cached endless games (Star Citizen, MMOs, etc).
COPY patch_reset_outlier_game_runtimes.js /tmp/patch_reset_outlier_game_runtimes.js
RUN node /tmp/patch_reset_outlier_game_runtimes.js

COPY patch_abandoned_controller.js /tmp/patch_abandoned_controller.js
RUN node /tmp/patch_abandoned_controller.js

COPY patch_abandoned_routes.js /tmp/patch_abandoned_routes.js
RUN node /tmp/patch_abandoned_routes.js

COPY patch_abandoned_filter.js /tmp/patch_abandoned_filter.js
RUN node /tmp/patch_abandoned_filter.js

COPY patch_abandoned_frontend.js /tmp/patch_abandoned_frontend.js
RUN node /tmp/patch_abandoned_frontend.js

# Actively-in-progress flag: backend table + endpoints + items.js join.
# A user-toggled flag separate from the `progress` table, so the UI can show
# "manually marked as in progress" distinct from "watchlist + already released".
COPY patch_actively_in_progress_backend.js /tmp/patch_actively_in_progress_backend.js
RUN node /tmp/patch_actively_in_progress_backend.js

# Actively-in-progress: detail-page button (right after _AB).
COPY patch_actively_in_progress_frontend.js /tmp/patch_actively_in_progress_frontend.js
RUN node /tmp/patch_actively_in_progress_frontend.js

# Combined /api/item-flags endpoint + frontend cache so the _AB ("Marcar como
# abandonada") and _AIP ("Marcar como en proceso") buttons render in lockstep
# instead of popping in one after the other on the detail page. MUST run after
# both _AB and _AIP are injected.
COPY patch_item_flags_combined.js /tmp/patch_item_flags_combined.js
RUN node /tmp/patch_item_flags_combined.js

# "Marcar como visto" button on the detail page (replaces the eye on game cards).
# Must run after patch_item_flags_combined so the shared cache helpers exist.
COPY patch_mark_watched_button.js /tmp/patch_mark_watched_button.js
RUN node /tmp/patch_mark_watched_button.js

# Pre-hydrate _AB / _AIP / _MAS from the details response so the buttons
# render synchronously with the rest of the action row instead of popping in
# alongside the cover. Must run after _AB, _AIP, _MAS are all defined.
COPY patch_details_includes_flags.js /tmp/patch_details_includes_flags.js
RUN node /tmp/patch_details_includes_flags.js

# "Update metadata" button: was rendered as a tiny `text-sm btn` (looked unfinished)
# and only for source ∈ {igdb, tmdb, openlibrary, audible} — so theater
# (source='wikidata') never showed it. Promote to btn-blue full-width and
# include 'wikidata' in the allowlist. MUST run after patch_actively_in_progress_frontend
# (which uses the original 4-source string as anchor while relocating the button).
COPY patch_update_metadata_btn.js /tmp/patch_update_metadata_btn.js
RUN node /tmp/patch_update_metadata_btn.js

# Per-game "Refrescar tiempo IGDB" button on the detail page (video_game + igdbId).
# Calls POST /api/refresh-game-runtime/:mediaItemId. Must run AFTER
# patch_update_metadata_btn (which is the anchor it wraps).
COPY patch_per_game_runtime_refresh.js /tmp/patch_per_game_runtime_refresh.js
RUN node /tmp/patch_per_game_runtime_refresh.js

# Inline IGDB-token hint in the section header on /games (between item count
# and the filter dropdown). Points users to /settings/application-tokens.
COPY patch_games_igdb_hint.js /tmp/patch_games_igdb_hint.js
RUN node /tmp/patch_games_igdb_hint.js

# Hide the empty "I am watching/reading/listening/playing it" placeholder for
# theater items — it has no label branch for theater so it renders as a 34×6 px
# ghost button. _AIP ("Marcar como en proceso") already covers the same intent.
COPY patch_theater_hide_iam_btn.js /tmp/patch_theater_hide_iam_btn.js
RUN node /tmp/patch_theater_hide_iam_btn.js

# The "Seen history" / "Read history" link on the detail page branches on
# audiobook/book/movie/tv/game but never on theater → empty link for theater.
# Add a Tt(a) branch using the "Seen history" label.
COPY patch_theater_seen_history_link.js /tmp/patch_theater_seen_history_link.js
RUN node /tmp/patch_theater_seen_history_link.js

# Rename the white "Lo estoy viendo / leyendo / etc." button (one branch per
# media type) to a single "Marcar como en proceso" label, and make the click
# also PUT /api/actively-in-progress/:id (so the item is actually marked as
# in-progress instead of just nudging progress=0).
COPY patch_iam_to_inprogress.js /tmp/patch_iam_to_inprogress.js
RUN node /tmp/patch_iam_to_inprogress.js

# Add two extra buttons to the Rp progress modal (between "Marcar como
# completado" and "Cancelar"):
#   • Quitar de proceso  — DELETE /api/actively-in-progress/:id
#   • Quitar progreso    — resets progress to 0 (no seen-row deletion)
COPY patch_modal_clear_progress.js /tmp/patch_modal_clear_progress.js
RUN node /tmp/patch_modal_clear_progress.js


# Bug: the default count query in items.js counts ALL mediaItem rows of the
# requested type, while the data query restricts to library items (in a list
# or with a seen row). On /theater this showed "9 elementos" while only 2
# were rendered. Make the default count branch apply the same library filter.
COPY patch_count_in_library.js /tmp/patch_count_in_library.js
RUN node /tmp/patch_count_in_library.js

# Bugfix for header count and paginator on /abandonados and /in-progress: the
# count fast-path didn't know about excludeAbandoned/onlyAbandoned. Runs after
# patch_abandoned_filter so excludeAbandoned/onlyAbandoned are in the destructure.
COPY patch_count_query_abandoned.js /tmp/patch_count_query_abandoned.js
RUN node /tmp/patch_count_query_abandoned.js

# /games filter dropdown: add "Solo visto" (Just watched) — games marked Watched
# but never Played. Also fixes upstream's broken pass-through for
# onlyWatched/onlyPlayed. Runs after patch_abandoned_filter so the controller's
# destructure already ends with onlyAbandoned (the regex anchor we use).
COPY patch_only_just_watched.js /tmp/patch_only_just_watched.js
RUN node /tmp/patch_only_just_watched.js

# /games + filter=Visto: replace the flat grid with two collapsible sections
# ("Solo visto" / "Vistos y jugados"). Backend filters from patch_only_just_watched.
COPY patch_games_seen_split.js /tmp/patch_games_seen_split.js
RUN node /tmp/patch_games_seen_split.js

# Page background overrides: light = "cáscara de huevo" (#F0EAD6), dark = black.
COPY patch_background_colors.js /tmp/patch_background_colors.js
RUN node /tmp/patch_background_colors.js

# CSS rule for .btn-green (used by _AIP "Marcar como en proceso" toggle). Must
# run BEFORE patch_css_rename so the content hash reflects the new rule.
COPY patch_css_btn_green.js /tmp/patch_css_btn_green.js
RUN node /tmp/patch_css_btn_green.js

# Override .items-grid fixed widths (180/360/540/720/900/1080 by breakpoint)
# so the grid fills its container — fixes cards getting clipped in sectioned
# pages (En proceso, Watchlist, Descargados, etc.).
COPY patch_css_items_grid_fluid.js /tmp/patch_css_items_grid_fluid.js
RUN node /tmp/patch_css_items_grid_fluid.js

# Strip the `flex justify-center w-full` wrapper around .items-grid in the JS
# bundle (upstream centers the grid; combined with the section's overflow-hidden
# this clips the first item's left half).
COPY patch_items_grid_no_center.js /tmp/patch_items_grid_no_center.js
RUN node /tmp/patch_items_grid_no_center.js

# Make /import and /backup live INSIDE the Settings layout so the sidebar
# stays visible while the user is on those pages.
COPY patch_settings_import_backup_inside.js /tmp/patch_settings_import_backup_inside.js
RUN node /tmp/patch_settings_import_backup_inside.js

# Content-hash the CSS (busts long-lived browser/CF cache when CSS changes).
# Must run after any patch that modifies the CSS (background_colors).
COPY patch_css_rename.js /tmp/patch_css_rename.js
RUN node /tmp/patch_css_rename.js

# Move credential-style config blocks (IGDB, soon Jellyfin/YouTube) from their
# current locations into the "Application tokens" settings tab.
COPY patch_credentials_to_tokens.js /tmp/patch_credentials_to_tokens.js
RUN node /tmp/patch_credentials_to_tokens.js

# Self-service TMDB API key: backend GET/PUT /api/tmdb/key + UI box in
# /settings/application-tokens. Persists in /storage/tmdb-key.json (admin-only).
# MUST run after patch_credentials_to_tokens (mount inside _AT_EXT).
COPY patch_tmdb_user_key.js /tmp/patch_tmdb_user_key.js
RUN node /tmp/patch_tmdb_user_key.js

# /api/jellyfin/import-from-server: scan all of Jellyfin and (1) mark existing
# MT items as downloaded, (2) create stubs for items not yet in MT (TMDB
# metadata fills in on the next refresh cycle).
COPY patch_jellyfin_import_from_server.js /tmp/patch_jellyfin_import_from_server.js
RUN node /tmp/patch_jellyfin_import_from_server.js

# Two purple "Refrescar desde Jellyfin" buttons (Downloaded page + _JF in
# settings/application-tokens). Must run AFTER patch_downloaded_tab and
# patch_jellyfin_frontend (the components it wraps).
COPY patch_jellyfin_import_buttons.js /tmp/patch_jellyfin_import_buttons.js
RUN node /tmp/patch_jellyfin_import_buttons.js

COPY patch_bundle_rename.js /tmp/patch_bundle_rename.js
RUN node /tmp/patch_bundle_rename.js

# PWA: manifest.json + service worker (offline cache + faster subsequent loads).
# Runs after rename so the SW caches the FINAL hashed filename.
COPY patch_pwa.js /tmp/patch_pwa.js
RUN node /tmp/patch_pwa.js

# --- Regenerate compressed bundle (.br and .gz) ---
# The server serves pre-compressed versions when the browser supports them; if we leave
# the originals, all our frontend patches are silently bypassed.
RUN BUNDLE=$(ls /app/public/main_*.js | grep -v '\.LICENSE\|\.map') && \
    node -e "const fs=require('fs'),zlib=require('zlib');const p='$BUNDLE';const d=fs.readFileSync(p);fs.writeFileSync(p+'.gz',zlib.gzipSync(d,{level:9}));fs.writeFileSync(p+'.br',zlib.brotliCompressSync(d));console.log('Recompressed bundle:',p);"
