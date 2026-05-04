# MediaTOC

> *A media tracker for the obsessively organised — the kind of person who cares which one of the 14 productions of "La casa de Bernarda Alba" they actually saw.*

Self-hosted tracker for everything you watch, read, play, listen to and attend — movies, TV, video games, books, audiobooks, theatre and YouTube videos — with the level of detail that the rest of the trackers don't bother with.

---

## What it is

A media tracker built for **completionists**, Spanish-first but localized to seven languages:

- **Per-medium consumption verbs**, not just "seen": played / watched / read / listened / attended. The same item can have several.
- **Two-way Jellyfin integration**: marks items as downloaded when they appear in your Jellyfin library, opens "Play in Jellyfin" deeplinks, sync-back when you watch something there.
- **YouTube as a first-class media type**: subscribe to channels, mark videos watched, view the recent feed, persistent cache that survives YouTube's RSS outages.
- **Theatre with serious metadata**: Wikidata SPARQL for canonical works + scraping of teatro.es (CDT/INAEM, Spain) for contemporary stagings.
- **Audiobooks** and books with progress in hours/minutes or pages, with last-position tracking.
- **Duplicate detection** and merge tooling that doesn't lose seen / ratings / lists.
- **Full backup / restore** including auto-restore on missing data.db, plus JSON and Letterboxd CSV exports.
- **i18n**: 7 languages (es / en / pt / fr / de / da / ko) with a custom catalogue.

Designed to live in your own infrastructure next to Jellyfin, qBittorrent, Home Assistant and whatever else.

## Install

Requires Docker Engine 20+ with the Compose v2 plugin.

```sh
git clone https://github.com/javimentallab/mediatoc.git
cd mediatoc

cp docker-compose.example.yml docker-compose.yml
${EDITOR:-nano} docker-compose.yml      # set IGDB_CLIENT_ID/SECRET, optional Jellyfin/YouTube/Google

docker compose build mediatoc
docker compose up -d mediatoc
```

Open `http://localhost:7481` — the first user to register becomes admin.

**Tokens and credentials** are managed from `Settings → Application tokens`:
- IGDB (required for video games)
- TMDB API key (recommended for "Where to watch" providers and episode runtimes — paste it in the UI; it's stored at `/storage/tmdb-key.json` with mode 0600)
- Jellyfin (URL + API key)
- YouTube (Google OAuth)

## Custom endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/backup` | Download binary `data.db` (admin) |
| `GET` | `/api/backup/export-json` | Full JSON export (admin) |
| `GET` | `/api/backup/letterboxd` | CSV importable into letterboxd.com (admin) |
| `POST` | `/api/backup/restore` | Upload `.db` to restore on next restart (admin) |
| `POST` | `/api/backup/import` | Merge a JSON export (matches by TMDB/IMDB/IGDB/TVDB) (admin) |
| `POST` | `/api/catalog/cleanup` | Purge orphan mediaItems (admin) |
| `GET` `/POST` | `/api/dupes` | Detect and merge duplicates (admin) |
| `PATCH` | `/api/downloaded` | Toggle the "downloaded" flag |
| `GET` `/PUT` | `/api/links` | External links per item |
| `GET` | `/api/watch-providers` | Where-to-watch (TMDB providers) |
| `PUT` | `/api/audio-progress` | Listening progress |
| `PUT` | `/api/episode-progress` | Per-episode progress |
| `POST` | `/api/episodes/fetch-runtimes` | Refresh episode runtimes (TMDB) |
| `GET` | `/api/hltb` | HowLongToBeat data for a game |
| `GET` `/PUT` | `/api/tmdb/key` | TMDB API key managed via UI (admin) |
| `GET` `/POST` `/DELETE` | `/api/youtube/channels` | YouTube subscriptions |
| `GET` | `/api/youtube/feed` | Recent videos (`?fresh=1` to bypass the cache) |
| `*` | `/api/youtube/oauth/*` | Google OAuth (start/callback/status/sync) |
| `POST` `/DELETE` | `/api/youtube/watched` | Mark / unmark a video as watched |
| `GET` | `/api/youtube/watched-stats` | User's watched-video totals |
| `GET` `/POST` | `/api/jellyfin/*` | Status, sync, config (admin) |

## Host-side backups

The image doesn't ship a cron — recommended pattern:

```cron
0 3 * * * /path/to/backup-mediatoc.sh >> /path/to/backup.log 2>&1
30 3 * * * bash /path/to/verify-backup.sh --quiet >> /path/to/verify.log 2>&1
```

Both scripts use `docker exec mediatoc` and rotate keeping 7 daily / 4 weekly / 3 monthly. Best to keep them outside the image, next to the data volume.

## Build internals

The image is produced by composing a series of small JS scripts on top of a base image — see [`PATCHES.md`](PATCHES.md) for the full inventory. Each script is idempotent, fails loudly if the upstream layout changes (so build breaks rather than silently producing wrong code), and is one-Docker-layer per script for cache efficiency.

CSS / JS edits regenerate the brotli + gzip pre-compressed variants so the static server (and any CDN in front) doesn't keep serving stale bytes after a rebuild.

## License

MIT — see [`LICENSE`](LICENSE) and [`NOTICE.md`](NOTICE.md).
