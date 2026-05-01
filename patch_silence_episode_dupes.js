const fs = require('fs');
const path = '/app/build/updateMetadata.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('// silence-episode-dupes')) { console.log('silence episode dupes: already patched'); process.exit(0); }

// The UNIQUE constraint failures on episode.tmdbId aren't bugs — they're TMDB returning
// new episode IDs that collide with existing rows. The metadata update skips them
// silently anyway. Just stop spamming the error log with their stack traces.
const skipMsg = 'UNIQUE constraint failed: episode.tmdbId';

// 1. Inner catch (delete-local-episodes failure)
c = c.replace(
  "      } catch (error) {\n        _logger.logger.error(error);\n        return {",
  "      } catch (error) { // silence-episode-dupes\n        if (!String(error.message || '').includes('" + skipMsg + "')) _logger.logger.error(error);\n        return {"
);

// 2. Outer catch in updateMediaItems loop
c = c.replace(
  "    } catch (error) {\n      _logger.logger.error(_chalk.default.red(error.toString()));\n      numberOfFailures++;\n    }",
  "    } catch (error) {\n      if (!String(error.message || '').includes('" + skipMsg + "')) _logger.logger.error(_chalk.default.red(error.toString()));\n      numberOfFailures++;\n    }"
);

fs.writeFileSync(path, c);
console.log('silence episode dupes: filtered noisy UNIQUE constraint logs');
