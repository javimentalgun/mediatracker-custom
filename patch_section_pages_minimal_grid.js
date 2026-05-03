// DEPRECATED — was used to clear gridItemAppearance on section-page Zv calls
// (Pendiente, Descargados, etc.) so they showed only the cover art. The user
// later asked for the same item appearance as Abandonados in those sections —
// rating + topBar (firstUnwatchedEpisode badge, on-watchlist icon, unwatched
// count) — so this patch is now a no-op. Kept in the Dockerfile to preserve
// step ordering for downstream patches that reference it indirectly.

console.log('section pages minimal grid: no-op (intentional, see comment)');
