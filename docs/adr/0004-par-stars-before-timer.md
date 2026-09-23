# Par plus stars before timer

Challenge in v2 comes from structural Difficulty plus solver-derived Par and 1-3 stars per Level. Free Play stays untimed; Time Trial becomes a separate Mode in v3 rather than changing Free Play now.

## Considered Options

- Time Trial first (rejected: contradicts Free Play glossary, forces timer/HUD/storage churn before Packs land)
- Move counter / mistake counting (rejected: noisier signal than Par, harder to tune fairly)
- Hints first (rejected: reduces challenge instead of rewarding it)

## Consequences

- `solver.ts` output feeds Par; HUD and progress gain a star slot; best-times/leaderboards wait for Workers in v3.
