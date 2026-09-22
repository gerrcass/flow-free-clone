# Flow Free Clone

A web-first clone of the Flow Free pipe-connection puzzle, starting with relaxed Free Play.

## Language

**Board**:
A square grid of cells (e.g. 5x5 to 9x9 in v1) that must be completely filled to solve a puzzle.
_Avoid_: Grid, map

**Cell**:
A single square on the Board. Each Cell holds at most one Pipe segment.
_Avoid_: Square, tile

**Color**:
One of the puzzle's distinct hues identifying a matching pair of Endpoints and their Pipe.
_Avoid_: Hue, team

**Endpoint**:
A fixed colored dot on the Board marking where a Pipe must start or end. Each Color has exactly two Endpoints.
_Avoid_: Dot, node, terminal

**Pipe**:
The continuous orthogonal path connecting a Color's two Endpoints through Cells.
_Avoid_: Line, flow, connection

**Level**:
A single puzzle: a Board size plus a fixed set of Endpoint positions.
_Avoid_: Stage, map, puzzle (as noun for the definition — "puzzle" is fine informally)

**Pack**:
A curated ordered set of Levels forming the v1 progression.
_Avoid_: World, chapter, bundle

**Free Play**:
The relaxed game mode with no timer: solve each Level at your own pace.
_Avoid_: Classic, casual
