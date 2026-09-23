/**
 * Solver-check script (ticket #2).
 *
 * Proves every shipped Level completable under the win-check contract:
 *   npm run check-pack
 *
 * Exits non-zero when any Level has no solution within the step budget.
 */
import { PACK } from '../src/game/pack';
import { isSolved } from '../src/game/win';
import { solveLevel } from '../src/game/solver';

function main(): void {
  let failed = 0;
  PACK.forEach((level, i) => {
    const t0 = Date.now();
    const pipes = solveLevel(level);
    const ms = Date.now() - t0;
    const ok = pipes !== null && isSolved(level, pipes);
    if (!ok) failed += 1;
    console.log(
      `pack[${i}] ${level.size}x${level.size} ${level.colors.length} colors: ${ms}ms ${ok ? 'ok' : 'FAIL'}`,
    );
  });
  if (failed > 0) {
    console.error(`${failed} of ${PACK.length} Levels unsolved`);
    process.exit(1);
  }
  console.log(`all ${PACK.length} Levels solvable`);
}

main();
