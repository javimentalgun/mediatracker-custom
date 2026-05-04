# MediaTOC

> *Para los que tenemos un toque de TOC con todo lo que vemos, leemos, jugamos y escuchamos.*

Tracker auto-hospedado para tu colección entera de medios — pelis, series, juegos, libros, audiolibros, teatro y vídeos de YouTube — con la obsesión por el detalle que el resto de los trackers no quiere darte.

---

## Qué es esto

Un tracker de medios pensado para **completistas y obsesivos**, en español de fábrica:

- **Marca por tipo de consumo correcto**, no "visto" para todo: jugado / visto / leído / escuchado / asistido. Un mismo media puede tener varios.
- **Doble integración con Jellyfin**: marca como descargado lo que tienes en tu biblioteca, abre el deeplink "Reproducir en Jellyfin", sincroniza al revés cuando ves algo en Jellyfin.
- **YouTube** como un media más: suscríbete a canales, marca videos vistos, ve el feed reciente, persistencia que sobrevive a las caídas de la API RSS de YouTube.
- **Teatro** con metadatos serios: Wikidata SPARQL para clásicos + scraping de teatro.es (CDT/INAEM) para producciones españolas modernas.
- **Audiolibros** y libros con progreso por horas/minutos o por páginas, con tracking del último punto.
- **Detección de duplicados** y herramienta de fusión sin perder seen/ratings/listas.
- **Backup completo** auto-restaurable, exportable a JSON o Letterboxd CSV.
- **i18n**: 7 idiomas (es / en / pt / fr / de / da / ko) con catálogo propio.

Pensado para vivir en tu propia infra junto a Jellyfin, qBittorrent, Home Assistant y demás.

## Instalar

Requisitos: Docker Engine 20+ con plugin Compose v2.

```sh
git clone https://github.com/javimentallab/mediatracker-custom.git mediatoc
cd mediatoc

cp docker-compose.example.yml docker-compose.yml
${EDITOR:-nano} docker-compose.yml      # configura IGDB_CLIENT_ID/SECRET, opcional Jellyfin/YouTube/Google

docker compose build mediatracker
docker compose up -d mediatracker
```

Abre `http://localhost:7481` — el primer usuario que registres es admin.

**Tokens y credenciales** se gestionan desde `Settings → Tokens de aplicación`:
- IGDB (obligatorio para juegos)
- TMDB API key (recomendado para "Dónde ver" y duración de capítulos — pégala en la UI, se guarda en `/storage/tmdb-key.json` con permisos 0600)
- Jellyfin (URL + API key)
- YouTube (OAuth de Google)

## Cómo funciona por dentro

MediaTOC se construye aplicando una secuencia de **184 parches `patch_*.js`** sobre la imagen `bonukai/mediatracker:latest`. Cada parche:

1. Lee un fichero del backend compilado o del bundle frontend.
2. Comprueba un marker — si ya está parcheado, sale sin tocar (idempotente).
3. Busca un anchor estable y lo sustituye por código nuevo.
4. Si el anchor no aparece, falla ruidosamente — sabes que upstream cambió.

```
FROM bonukai/mediatracker:latest@sha256:...
  └── COPY patch_X.js → RUN node patch_X.js   ← una capa Docker por parche
      ...
  └── recompresión .gz/.br tras los cambios CSS/JS
HEALTHCHECK /api/configuration cada 30s
```

Inventario completo en [`PATCHES.md`](PATCHES.md). Catálogo de strings i18n en [`STRINGS.md`](STRINGS.md).

## Actualizar a un upstream nuevo

```sh
docker pull bonukai/mediatracker:latest
docker inspect bonukai/mediatracker:latest --format='{{index .RepoDigests 0}}'
# pega el sha256 nuevo en la línea FROM del Dockerfile
docker compose build mediatracker
```

Si un parche se rompe porque su anchor desapareció en el nuevo upstream, el build falla mostrando el nombre del parche. Lo abres, buscas el nuevo bloque equivalente y actualizas el anchor.

## Endpoints añadidos

| Método | Path | Para qué |
|---|---|---|
| `GET` | `/api/backup` | Descarga `data.db` binario (admin) |
| `GET` | `/api/backup/export-json` | Export completo JSON (admin) |
| `GET` | `/api/backup/letterboxd` | CSV para letterboxd.com (admin) |
| `POST` | `/api/backup/restore` | Sube `.db` para restaurar al reiniciar (admin) |
| `POST` | `/api/backup/import` | Importar JSON (matchea TMDB/IMDB/IGDB/TVDB) (admin) |
| `POST` | `/api/catalog/cleanup` | Purgar mediaItems huérfanos (admin) |
| `GET` `/POST` | `/api/dupes` | Detectar y fusionar duplicados (admin) |
| `PATCH` | `/api/downloaded` | Toggle flag descargado |
| `GET` `/PUT` | `/api/links` | Enlaces externos por item |
| `GET` | `/api/watch-providers` | Dónde ver (TMDB providers) |
| `PUT` | `/api/audio-progress` | Progreso escucha |
| `PUT` | `/api/episode-progress` | Progreso por capítulo |
| `POST` | `/api/episodes/fetch-runtimes` | Refrescar duración de capítulos (TMDB) |
| `GET` | `/api/hltb` | HowLongToBeat para juegos |
| `GET` `/PUT` | `/api/tmdb/key` | TMDB API key gestionada por UI (admin) |
| `GET` `/POST` `/DELETE` | `/api/youtube/channels` | Suscripciones YouTube |
| `GET` | `/api/youtube/feed` | Vídeos recientes (con `?fresh=1` para bypass caché) |
| `*` | `/api/youtube/oauth/*` | OAuth Google (start/callback/status/sync) |
| `POST` `/DELETE` | `/api/youtube/watched` | Marcar/desmarcar visto |
| `GET` | `/api/youtube/watched-stats` | Stats del usuario |
| `GET` `/POST` | `/api/jellyfin/*` | Status, sync, config (admin) |

## Backups en el host

La imagen no incluye cron — el patrón recomendado:

```cron
0 3 * * * /path/to/backup-mediatracker.sh >> /path/to/backup.log 2>&1
30 3 * * * bash /path/to/verify-backup.sh --quiet >> /path/to/verify.log 2>&1
```

Los scripts hacen `docker exec mediatracker` con rotación 7 diarios / 4 semanales / 3 mensuales. Mejor mantenerlos fuera de la imagen, junto al volumen de datos.

## Construido sobre [MediaTracker](https://github.com/bonukai/MediaTracker)

MediaTOC se apoya en el trabajo open-source de **bonukai/MediaTracker** ([MIT](https://github.com/bonukai/MediaTracker/blob/main/LICENSE)). Sin esa base nada de esto existiría — gracias.

La arquitectura de parches mantiene la integración limpia con upstream: cuando bonukai publica fixes o features, podemos rebajar y los parches se reaplican (con quizás algún anchor a re-actualizar si hay cambios profundos). Ver [`NOTICE.md`](NOTICE.md) para los detalles de atribución.

## Licencia

MediaTOC y los parches de este repo están bajo **MIT** — ver [`LICENSE`](LICENSE).
MediaTracker upstream también es **MIT** — ver [`NOTICE.md`](NOTICE.md).
