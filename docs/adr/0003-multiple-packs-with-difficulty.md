# Multiple Packs with Difficulty

Single hardcoded `PACK` (30 Levels) becomes named Packs (Starter / Classic / Expert) with `Difficulty` as a Pack property plus Board size and Color count as Level signals. Progress migrates from `boolean[]` behind `progress:v1` to a per-Pack map behind `progress:v2` with fallback read of `v1`.

## Considered Options

- One Pack split into difficulty sections (rejected: progress per section gets messy, no clean Pack identity for tabs)
- Difficulty as global setting filtering one Pack (rejected: conflates player aid with structural challenge)
- 5 Packs at once (rejected: too much generator/solver tuning for v2; 3 proves the shape)

## Consequences

- `pack.ts`, `progress.ts`, and `LevelSelect` must handle Pack identity; old saves need a one-way migration path.
