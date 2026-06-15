/**
 * Zero-dependency animation engine — a drop-in replacement for the subset of
 * framer-motion's `animate(from, to, options)` used by gooey-toast.
 *
 * Supports two modes, mirroring the original call sites:
 *   - spring: `{ type: 'spring', stiffness, damping, mass }`
 *             `{ type: 'spring', duration, bounce }`
 *   - tween:  `{ duration, ease }`  (ease = cubic-bezier tuple or named curve)
 *
 * Each call returns a controller with `.stop()`. `onUpdate(v)` fires every frame
 * with the current value; `onComplete()` fires once when the animation settles.
 */

export interface AnimationController {
  stop(): void
}

export type Easing =
  | readonly [number, number, number, number]
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'

interface BaseOptions {
  onUpdate: (value: number) => void
  onComplete?: () => void
}

/** Spring physics config, independent of animation callbacks. */
export interface SpringConfig {
  type: 'spring'
  stiffness?: number
  damping?: number
  mass?: number
  duration?: number // seconds — used with `bounce` to derive stiffness/damping
  bounce?: number
  velocity?: number
  restDelta?: number
  restSpeed?: number
}

export type SpringOptions = SpringConfig & BaseOptions

export interface TweenOptions extends BaseOptions {
  type?: 'tween'
  duration: number // seconds
  ease?: Easing
}

export type AnimateOptions = SpringOptions | TweenOptions

const hasRaf =
  typeof requestAnimationFrame === 'function' && typeof performance !== 'undefined'

function isSpring(o: AnimateOptions): o is SpringOptions {
  const s = o as { stiffness?: number; bounce?: number }
  return o.type === 'spring' || s.stiffness != null || s.bounce != null
}

// ---------------------------------------------------------------------------
// Cubic-bezier easing (Newton-Raphson sampler, same approach as CSS engines)
// ---------------------------------------------------------------------------
const NAMED_EASE: Record<string, readonly [number, number, number, number]> = {
  easeIn: [0.42, 0, 1, 1],
  easeOut: [0, 0, 0.58, 1],
  easeInOut: [0.42, 0, 0.58, 1],
}

function cubicBezier(p1x: number, p1y: number, p2x: number, p2y: number) {
  const cx = 3 * p1x
  const bx = 3 * (p2x - p1x) - cx
  const ax = 1 - cx - bx
  const cy = 3 * p1y
  const by = 3 * (p2y - p1y) - cy
  const ay = 1 - cy - by

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t
  const sampleDX = (t: number) => (3 * ax * t + 2 * bx) * t + cx

  const solveX = (x: number) => {
    let t = x
    for (let i = 0; i < 8; i++) {
      const x2 = sampleX(t) - x
      if (Math.abs(x2) < 1e-6) return t
      const d = sampleDX(t)
      if (Math.abs(d) < 1e-6) break
      t -= x2 / d
    }
    // Bisection fallback
    let lo = 0
    let hi = 1
    t = x
    while (lo < hi) {
      const x2 = sampleX(t)
      if (Math.abs(x2 - x) < 1e-6) return t
      if (x > x2) lo = t
      else hi = t
      t = (lo + hi) / 2
    }
    return t
  }

  return (x: number) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    return sampleY(solveX(x))
  }
}

function resolveEasing(ease?: Easing): (t: number) => number {
  if (!ease || ease === 'linear') return (t) => t
  if (typeof ease === 'string') {
    const tuple = NAMED_EASE[ease] ?? NAMED_EASE['easeInOut']
    return cubicBezier(tuple[0], tuple[1], tuple[2], tuple[3])
  }
  return cubicBezier(ease[0], ease[1], ease[2], ease[3])
}

// ---------------------------------------------------------------------------
// Spring physics — analytic solution (matches framer-motion's spring feel).
// duration/bounce → stiffness/damping via root-finding, identical to framer.
// ---------------------------------------------------------------------------
function calcAngularFreq(undampedFreq: number, dampingRatio: number) {
  return undampedFreq * Math.sqrt(1 - dampingRatio * dampingRatio)
}

function clamp(min: number, max: number, v: number) {
  return Math.min(Math.max(v, min), max)
}

/** Derive { stiffness, damping } from a target duration (s) + bounce (0..1). */
function findSpring(duration: number, bounce: number, mass = 1) {
  const safeMin = 0.001
  let dampingRatio = clamp(0.05, 1, 1 - bounce)
  const dur = clamp(0.01, 10, duration)
  const velocity = 0

  let envelope: (f: number) => number
  let derivative: (f: number) => number

  if (dampingRatio < 1) {
    envelope = (undampedFreq) => {
      const exponentialDecay = undampedFreq * dampingRatio
      const delta = exponentialDecay * dur
      const a = exponentialDecay - velocity
      const b = calcAngularFreq(undampedFreq, dampingRatio)
      const c = Math.exp(-delta)
      return safeMin - (a / b) * c
    }
    derivative = (undampedFreq) => {
      const exponentialDecay = undampedFreq * dampingRatio
      const delta = exponentialDecay * dur
      const d = delta * velocity + velocity
      const e = Math.pow(dampingRatio, 2) * Math.pow(undampedFreq, 2) * dur
      const f = Math.exp(-delta)
      const g = calcAngularFreq(undampedFreq, dampingRatio)
      const factor = -envelope(undampedFreq) + safeMin > 0 ? -1 : 1
      return (factor * ((d - e) * f)) / g
    }
  } else {
    envelope = (undampedFreq) => {
      const a = Math.exp(-undampedFreq * dur)
      const b = (undampedFreq - velocity) * dur + 1
      return -safeMin + a * b
    }
    derivative = (undampedFreq) => {
      const a = Math.exp(-undampedFreq * dur)
      const b = (velocity - undampedFreq) * (dur * dur)
      return a * b
    }
  }

  let undampedFreq = 5 / dur
  for (let i = 0; i < 12; i++) {
    const d = derivative(undampedFreq)
    if (d === 0) break
    undampedFreq = undampedFreq - envelope(undampedFreq) / d
  }

  if (Number.isNaN(undampedFreq)) {
    return { stiffness: 100, damping: 10 }
  }
  const stiffness = Math.pow(undampedFreq, 2) * mass
  const damping = dampingRatio * 2 * Math.sqrt(mass * stiffness)
  return { stiffness, damping }
}

function startSpring(
  from: number,
  to: number,
  o: SpringOptions,
): AnimationController {
  const mass = o.mass ?? 1
  let stiffness = o.stiffness ?? 100
  let damping = o.damping ?? 10
  if (o.stiffness == null && (o.duration != null || o.bounce != null)) {
    const derived = findSpring(o.duration ?? 0.5, o.bounce ?? 0.25, mass)
    stiffness = derived.stiffness
    damping = derived.damping
  }

  const restDelta = o.restDelta ?? 0.01
  const restSpeed = o.restSpeed ?? 2
  const v0 = o.velocity ?? 0
  const delta0 = from - to // displacement from equilibrium

  const dampingRatio = damping / (2 * Math.sqrt(stiffness * mass))
  const naturalFreq = Math.sqrt(stiffness / mass) // rad/s

  let resolve: (t: number) => number
  if (dampingRatio < 1) {
    const angularFreq = naturalFreq * Math.sqrt(1 - dampingRatio * dampingRatio)
    resolve = (t) => {
      const envelope = Math.exp(-dampingRatio * naturalFreq * t)
      return (
        to +
        envelope *
          (delta0 * Math.cos(angularFreq * t) +
            ((v0 + dampingRatio * naturalFreq * delta0) / angularFreq) *
              Math.sin(angularFreq * t))
      )
    }
  } else if (dampingRatio === 1) {
    resolve = (t) => {
      const envelope = Math.exp(-naturalFreq * t)
      return to + envelope * (delta0 + (v0 + naturalFreq * delta0) * t)
    }
  } else {
    const dampedFreq = naturalFreq * Math.sqrt(dampingRatio * dampingRatio - 1)
    resolve = (t) => {
      const envelope = Math.exp(-dampingRatio * naturalFreq * t)
      return (
        to +
        envelope *
          (delta0 * Math.cosh(dampedFreq * t) +
            ((v0 + dampingRatio * naturalFreq * delta0) / dampedFreq) *
              Math.sinh(dampedFreq * t))
      )
    }
  }

  let stopped = false
  let rafId = 0
  let startTime = 0
  let prevTime = 0
  let prevValue = from

  const tick = (now: number) => {
    if (stopped) return
    if (!startTime) {
      startTime = now
      prevTime = now
    }
    const t = (now - startTime) / 1000 // seconds since start
    const value = resolve(t)

    // Numerical speed (units/s) from the last frame for the rest check.
    const dt = (now - prevTime) / 1000
    const speed = dt > 0 ? Math.abs(value - prevValue) / dt : 0
    prevTime = now
    prevValue = value

    const settled = Math.abs(value - to) < restDelta && speed < restSpeed
    if (settled || t > 10) {
      o.onUpdate(to)
      stopped = true
      o.onComplete?.()
      return
    }
    o.onUpdate(value)
    rafId = requestAnimationFrame(tick)
  }

  if (!hasRaf) {
    o.onUpdate(to)
    o.onComplete?.()
    return { stop() {} }
  }
  rafId = requestAnimationFrame(tick)
  return {
    stop() {
      stopped = true
      if (rafId) cancelAnimationFrame(rafId)
    },
  }
}

function startTween(
  from: number,
  to: number,
  o: TweenOptions,
): AnimationController {
  const durationMs = Math.max(o.duration, 0) * 1000
  const easing = resolveEasing(o.ease)
  let stopped = false
  let rafId = 0
  let startTime = 0

  if (!hasRaf || durationMs <= 0) {
    o.onUpdate(to)
    o.onComplete?.()
    return { stop() {} }
  }

  const tick = (now: number) => {
    if (stopped) return
    if (!startTime) startTime = now
    const progress = Math.min(1, (now - startTime) / durationMs)
    const eased = easing(progress)
    o.onUpdate(from + (to - from) * eased)
    if (progress >= 1) {
      stopped = true
      o.onComplete?.()
      return
    }
    rafId = requestAnimationFrame(tick)
  }
  rafId = requestAnimationFrame(tick)
  return {
    stop() {
      stopped = true
      if (rafId) cancelAnimationFrame(rafId)
    },
  }
}

export function animate(
  from: number,
  to: number,
  options: AnimateOptions,
): AnimationController {
  return isSpring(options)
    ? startSpring(from, to, options)
    : startTween(from, to, options as TweenOptions)
}

/**
 * Squish spring config — scales mass with morph duration so the feel stays
 * consistent. bounce 0.0 = heavily damped (subtle), 0.8 = very bouncy.
 * Ported verbatim from the React component.
 */
export function squishSpring(
  durationSec: number,
  defaultDur: number,
  bounce = 0.4,
): SpringConfig {
  const scale = durationSec / defaultDur
  const stiffness = 200 + bounce * 437.5
  const damping = 24 - bounce * 20
  const mass = 0.7 * scale
  return { type: 'spring', stiffness, damping, mass }
}
