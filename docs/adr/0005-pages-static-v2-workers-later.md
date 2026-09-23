# Pages static in v2, Workers later

v2 deploys as a static site on Cloudflare Pages with `localStorage` persistence and offline worker unchanged. Workers/KV features (daily puzzle, sync, leaderboard) and accounts stay out of v2; share-Level-via-URL hash is the only social feature.

## Considered Options

- Workers-backed daily + best-times in v2 (rejected: backend before Pack/Difficulty/visual core is proven)
- Accounts/login (rejected: conflicts with anonymous Free Play focus and free-tier scope control)

## Consequences

- No backend code in v2; daily/leaderboard designs must not leak into Pack or progress schema.
