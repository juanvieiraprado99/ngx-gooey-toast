/**
 * Parametric morph paths for the gooey toast — ported verbatim from the React
 * implementation. Pure functions, language-agnostic.
 *
 * `morphPath`       — pill anchored top-left, body grows from underneath (left/right positions).
 * `morphPathCenter` — pill centered, body grows symmetrically (center positions).
 * t = 0 → pure pill, t = 1 → full organic blob.
 */

export const PH = 34 // pill height constant

/**
 * Last-result cache for the path functions, which are called every animation
 * frame. Avoids recomputing the SVG string when called with identical args.
 */
export function memoizePath(
  fn: (pw: number, bw: number, th: number, t: number) => string,
) {
  let lastArgs: [number, number, number, number] | null = null
  let lastResult = ''
  return (pw: number, bw: number, th: number, t: number): string => {
    if (
      lastArgs &&
      lastArgs[0] === pw &&
      lastArgs[1] === bw &&
      lastArgs[2] === th &&
      lastArgs[3] === t
    ) {
      return lastResult
    }
    lastResult = fn(pw, bw, th, t)
    lastArgs = [pw, bw, th, t]
    return lastResult
  }
}

function morphPathRaw(pw: number, bw: number, th: number, t: number): string {
  const pr = PH / 2
  const pillW = Math.min(pw, bw)

  const bodyH = PH + (th - PH) * t

  // Pure pill when t is zero or body too small for proper rounded corners
  if (t <= 0 || bodyH - PH < 8) {
    return [
      `M 0,${pr}`,
      `A ${pr},${pr} 0 0 1 ${pr},0`,
      `H ${pillW - pr}`,
      `A ${pr},${pr} 0 0 1 ${pillW},${pr}`,
      `A ${pr},${pr} 0 0 1 ${pillW - pr},${PH}`,
      `H ${pr}`,
      `A ${pr},${pr} 0 0 1 0,${pr}`,
      `Z`,
    ].join(' ')
  }

  const curve = 14 * t
  const cr = Math.min(16, (bodyH - PH) * 0.45)
  const bodyW = pillW + (bw - pillW) * t
  const bodyTop = PH - curve
  const qEndX = Math.min(pillW + curve, bodyW - cr)

  return [
    `M 0,${pr}`,
    `A ${pr},${pr} 0 0 1 ${pr},0`,
    `H ${pillW - pr}`,
    `A ${pr},${pr} 0 0 1 ${pillW},${pr}`,
    `L ${pillW},${bodyTop}`,
    `Q ${pillW},${bodyTop + curve} ${qEndX},${bodyTop + curve}`,
    `H ${bodyW - cr}`,
    `A ${cr},${cr} 0 0 1 ${bodyW},${bodyTop + curve + cr}`,
    `L ${bodyW},${bodyH - cr}`,
    `A ${cr},${cr} 0 0 1 ${bodyW - cr},${bodyH}`,
    `H ${cr}`,
    `A ${cr},${cr} 0 0 1 0,${bodyH - cr}`,
    `Z`,
  ].join(' ')
}

function morphPathCenterRaw(
  pw: number,
  bw: number,
  th: number,
  t: number,
): string {
  const pr = PH / 2
  const pillW = Math.min(pw, bw)

  // Pill is ALWAYS centered at the final body width position
  const pillOffset = (bw - pillW) / 2

  // Pure pill when t is zero or body too small
  if (t <= 0 || PH + (th - PH) * t - PH < 8) {
    return [
      `M ${pillOffset},${pr}`,
      `A ${pr},${pr} 0 0 1 ${pillOffset + pr},0`,
      `H ${pillOffset + pillW - pr}`,
      `A ${pr},${pr} 0 0 1 ${pillOffset + pillW},${pr}`,
      `A ${pr},${pr} 0 0 1 ${pillOffset + pillW - pr},${PH}`,
      `H ${pillOffset + pr}`,
      `A ${pr},${pr} 0 0 1 ${pillOffset},${pr}`,
      `Z`,
    ].join(' ')
  }

  const bodyH = PH + (th - PH) * t
  const curve = 14 * t
  const cr = Math.min(16, (bodyH - PH) * 0.45)
  const bodyTop = PH - curve

  // Body grows symmetrically outward from pill center
  const bodyCenter = bw / 2
  const halfBodyW = pillW / 2 + ((bw - pillW) / 2) * t // grows from pillW/2 to bw/2
  const bodyLeft = bodyCenter - halfBodyW
  const bodyRight = bodyCenter + halfBodyW

  // Q curve endpoints: body edges meet pill edges with organic curves
  const qLeftX = Math.max(bodyLeft + cr, pillOffset - curve)
  const qRightX = Math.min(bodyRight - cr, pillOffset + pillW + curve)

  return [
    `M ${pillOffset},${pr}`,
    `A ${pr},${pr} 0 0 1 ${pillOffset + pr},0`,
    `H ${pillOffset + pillW - pr}`,
    `A ${pr},${pr} 0 0 1 ${pillOffset + pillW},${pr}`,
    `L ${pillOffset + pillW},${bodyTop}`,
    `Q ${pillOffset + pillW},${bodyTop + curve} ${qRightX},${bodyTop + curve}`,
    `H ${bodyRight - cr}`,
    `A ${cr},${cr} 0 0 1 ${bodyRight},${bodyTop + curve + cr}`,
    `L ${bodyRight},${bodyH - cr}`,
    `A ${cr},${cr} 0 0 1 ${bodyRight - cr},${bodyH}`,
    `H ${bodyLeft + cr}`,
    `A ${cr},${cr} 0 0 1 ${bodyLeft},${bodyH - cr}`,
    `L ${bodyLeft},${bodyTop + curve + cr}`,
    `A ${cr},${cr} 0 0 1 ${bodyLeft + cr},${bodyTop + curve}`,
    `H ${qLeftX}`,
    `Q ${pillOffset},${bodyTop + curve} ${pillOffset},${bodyTop}`,
    `Z`,
  ].join(' ')
}

export const morphPath = memoizePath(morphPathRaw)
export const morphPathCenter = memoizePath(morphPathCenterRaw)
