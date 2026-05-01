const fs = require('fs');
const path = '/app/build/metadata/provider/igdb.js';
let c = fs.readFileSync(path, 'utf8');

// IGDB exposes a separate `game_time_to_beats` endpoint with three fields (all in seconds):
//   hastily   = main story
//   normally  = main + extras
//   completely = 100% completion
// We use `completely` (max — what the user asked for), falling back to normally/hastily
// for games without 100% data. Stored in mediaItem.runtime as MINUTES (the column type
// is integer and other media types use minutes here too).
//
// Side effects: every metadata refresh for a game will now make an extra IGDB API call
// (~250ms throttled). Fine — refreshes are 1×/24h per game.

if (c.includes('// mt-fork: time_to_beat')) {
  console.log('igdb time-to-beat: already patched');
  process.exit(0);
}

// Add the helper method right before `async game(gameId)`. Class field syntax is fine.
const helperMethod =
  "  async gameTimeToBeat(gameId) { // mt-fork: time_to_beat\n" +
  "    try {\n" +
  "      const res = await this.get('game_time_to_beats', `fields hastily,normally,completely; where game_id = ${gameId};`);\n" +
  "      if (!res || !res.length) return null;\n" +
  "      const t = res[0];\n" +
  "      // 500h cap: IGDB stores absurd 'completely' values for endless games\n" +
  "      // (Star Citizen → 100,000h, MMOs → years). Anything > 500h is treated\n" +
  "      // as no meaningful time-to-beat data, so the homepage total stays sane.\n" +
  "      const CAP_SECONDS = 500 * 3600;\n" +
  "      const candidates = [t.completely, t.normally, t.hastily].filter(s => s && s > 0 && s <= CAP_SECONDS);\n" +
  "      if (!candidates.length) return null;\n" +
  "      const seconds = Math.max.apply(null, candidates);\n" +
  "      return Math.round(seconds / 60);\n" +
  "    } catch (e) {\n" +
  "      return null;\n" +
  "    }\n" +
  "  }\n";

const helperAnchor = '  async game(gameId) {';
if (!c.includes(helperAnchor)) { console.error('igdb time-to-beat: helper anchor not found'); process.exit(1); }
c = c.replace(helperAnchor, helperMethod + helperAnchor);

// Patch details() to fetch time_to_beat and attach it as `runtime` on the mapped result.
// We do it in details() (not mapGame) so search results don't trigger an extra API call
// per row — that's wasteful and would blow up the rate limit on a search for "mario".
const oldDetails =
  "  async details(mediaItem) {\n" +
  "    const result = await this.game(mediaItem.igdbId);\n" +
  "    return result ? this.mapGame(result) : null;\n" +
  "  }";
const newDetails =
  "  async details(mediaItem) {\n" +
  "    const result = await this.game(mediaItem.igdbId);\n" +
  "    if (!result) return null;\n" +
  "    const mapped = this.mapGame(result);\n" +
  "    const ttb = await this.gameTimeToBeat(mediaItem.igdbId); // mt-fork: time_to_beat\n" +
  "    if (ttb) mapped.runtime = ttb;\n" +
  "    return mapped;\n" +
  "  }";

if (!c.includes(oldDetails)) { console.error('igdb time-to-beat: details anchor not found'); process.exit(1); }
c = c.replace(oldDetails, newDetails);

fs.writeFileSync(path, c);
console.log('igdb time-to-beat: patched details() to fetch and store runtime (max time-to-beat in minutes)');
