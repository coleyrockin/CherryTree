/** Linear interpolation: nudge `a` toward `b` by `t` (0–1). Used by the
 *  per-frame smoothing loops (cursor, pointer tilt, cursor glow). */
export const lerp = (a, b, t) => a + (b - a) * t;
