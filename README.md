# mediatracker-custom — patched fork of bonukai/MediaTracker

Docker image that takes [bonukai/mediatracker](https://github.com/bonukai/MediaTracker) as base
and applies **114 patches** at build time. Each patch is a small Node.js script that surgically
edits the minified frontend bundle or the compiled backend files inside the upstream image.

This is a personal fork. The patches reflect *one* opinionated set of UX/feature changes; if any
of them sound useful, adapt them. Everything is MIT.

## What you get on top of upstream

**Performance** — query rewrites and indexes that turn the heavy paginated pages from 5–11s
into 50–200ms on a 38k-item library:
- Composite index `seen(mediaItemId, userId)` (9.4s → 1ms)
- COUNT fast-paths bypassing the joined-clone for the common "browse the tab" case
- Forced `INDEXED BY` on `mediaItem` so the planner doesn't pick the wrong unique index
- Short-circuited episode subqueries for non-tv mediaTypes
- Eliminated redundant `lastSeen2` join, deferred startup metadata refresh by 5min

**Backups** — full disaster-recovery setup:
- `GET /api/backup` (binary `.db`), `GET /api/backup/export-json` (full-state JSON), `GET /api/backup/letterboxd` (CSV)
- `POST /api/backup/restore` (uploads stage as `data.db.uploaded`, swap on restart)
- `POST /api/backup/import` (replays a JSON export, matches by TMDB/IMDB/IGDB/TVDB id)
- `auto_restore` on startup if `/storage/data.db` is missing
- Host-side cron + verify scripts (in the data volume, not committed)

**Multi-user hardening**:
- Backup / dupes / cleanup / Jellyfin endpoints gated to admin only
- `DELETE /api/seen/:seenId` checks ownership (was IDOR-vulnerable upstream)
- `/api/user/:userId` restricted to self-or-admin
- Cookie `Secure` flag on HTTPS, `SameSite=Lax`, `httpOnly`

**i18n**:
- 61 custom translation keys × 7 locales (en / es / pt / fr / de / da / ko)
- Patches use `xo._("Key")`; the i18n_custom patch injects the per-locale chunks at build

**Features added** (non-exhaustive — see `PATCHES.md` for the full inventory):
- `/downloaded` tab with sections by mediaType
- `/youtube` tab — channel feed via RSS + per-user OAuth Google to auto-pull subscriptions
- Jellyfin integration: status / sync / play-in-Jellyfin / reverse-sync / card badges
- Duplicates detection + merge UI at `/dupes`
- Catalog cleanup (purge orphan registrations from past searches)
- Re-watch tracking with timestamps
- Sectioned `/in-progress`, `/watchlist` pages with collapsible per-mediaType groups
- HLTB (How Long To Beat) for games, runtime fetch for TV episodes
- TMDB watch providers in detail pages
- `Audiobook` progress, `Read` progress, `Listen` progress as separate per-item fields
- Custom progress modal with two parallel "I finished reading / listening" sections
- About page rebrand

## Quick start

```sh
git clone <this-repo> mediatracker-build
cd mediatracker-build
cp docker-compose.example.yml docker-compose.yml
# edit docker-compose.yml — set env vars (or use a .env file)
docker compose build mediatracker
docker compose up -d mediatracker
```

The first run creates `/storage/data.db` and runs all upstream knex migrations. Subsequent
restarts are fast.

## How the patch system works

```
FROM bonukai/mediatracker:latest@sha256:...   ← base image, pinned by digest
  └── COPY patch_X.js → RUN node patch_X.js    ← one patch per layer
      ...                                       ← order is significant
  └── RUN <recompress bundle>                   ← regen .gz/.br after all bundle edits
HEALTHCHECK                                     ← /api/configuration every 30s
```

Each `patch_*.js` file:
1. Reads its target file (a backend `.js` in `/app/build/...` or the bundle at `/app/public/main_*.js`).
2. Checks an `already-patched` marker → if found, exits 0 idempotently.
3. Looks up an "anchor" — a stable substring of the original code.
4. If the anchor is missing, exits 1 (the build fails loudly so you know upstream changed).
5. Otherwise replaces the anchor with the patched version and writes the file back.

`PATCHES.md` is the canonical inventory, grouped by feature.

## Updating to a newer upstream

```sh
docker pull bonukai/mediatracker:latest
docker inspect bonukai/mediatracker:latest --format='{{index .RepoDigests 0}}'
# ... copy the new sha256 into Dockerfile (FROM line)
docker compose build mediatracker
```

If a patch's anchor no longer matches the new upstream, the build fails on that step and
prints the patch name. Open it, find the new corresponding code in the rebuilt bundle, and
update the anchor.

## Custom endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/backup` | Download binary `data.db` (admin) |
| `GET` | `/api/backup/export-json` | Full-state JSON export (admin) |
| `GET` | `/api/backup/letterboxd` | CSV for letterboxd.com import (admin) |
| `POST` | `/api/backup/restore` | Stage `.db` upload as `data.db.uploaded` (admin) |
| `POST` | `/api/backup/import` | Merge JSON export into current DB (admin) |
| `POST` | `/api/catalog/cleanup` | Purge orphan mediaItems (admin) |
| `GET` | `/api/dupes` | Find candidate duplicates (admin) |
| `POST` | `/api/dupes/merge` | Merge duplicate items (admin) |
| `PATCH` | `/api/downloaded` | Toggle `downloaded` flag |
| `GET` `/PUT` | `/api/links` | External links per item |
| `GET` | `/api/watch-providers` | TMDB/IGDB providers |
| `PUT` | `/api/audio-progress` | Listening progress |
| `PUT` | `/api/episode-progress` | Per-episode progress |
| `POST` | `/api/episodes/fetch-runtimes` | Pull episode runtimes from TMDB |
| `GET` | `/api/hltb` | HowLongToBeat data for a game |
| `GET` `/POST` `/DELETE` | `/api/youtube/channels` | Configure subscribed channels |
| `GET` | `/api/youtube/feed` | Recent videos across configured channels |
| `GET` | `/api/youtube/oauth/start` | Begin Google OAuth flow |
| `GET` | `/api/youtube/oauth/callback` | OAuth redirect target |
| `GET` | `/api/youtube/oauth/status` | Connected user info |
| `POST` | `/api/youtube/oauth/sync` | Pull subscriptions from linked Google account |
| `DELETE` | `/api/youtube/oauth` | Unlink Google account, revoke tokens |
| `GET` | `/api/jellyfin/status` | Jellyfin connectivity / last sync stats (admin) |
| `POST` | `/api/jellyfin/sync` | Sync from Jellyfin → MT (admin) |

## Backups (host-side)

The image does not ship a host cron. The recommended setup:

```cron
0 3 * * * /path/to/backup-mediatracker.sh >> /path/to/backup.log 2>&1
30 3 * * * bash /path/to/verify-backup.sh --quiet >> /path/to/verify.log 2>&1
```

Both scripts use `docker exec mediatracker` and rotate keeping 7 daily / 4 weekly / 3 monthly
backups. They are not part of the image — keep them next to your data volume so they share
ownership and survive image rebuilds.

## License

- MediaTracker upstream: MIT (Bonukai)
- Patches in this fork: MIT
