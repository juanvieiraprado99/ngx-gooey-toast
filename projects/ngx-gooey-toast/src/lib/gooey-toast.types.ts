import type { TemplateRef } from '@angular/core'

/** Default auto-dismiss duration (ms) for a settled toast. */
export const DEFAULT_DISPLAY_DURATION = 4000

/**
 * Inline rich content for a description — sanitized before render (never
 * trusted as-is). `html` is cleaned via Angular's DomSanitizer; `markdown` is
 * a light subset (`code`, **bold**, *italic*, links) rendered then sanitized.
 */
export type GooeyRichContent = { html: string } | { markdown: string }

/**
 * Content slot: plain text, a TemplateRef for rich Angular content, or an
 * inline sanitized rich object (the description / custom body). Replaces
 * React's `ReactNode`. Plain strings stay plain text.
 */
export type GooeyContent = string | TemplateRef<unknown> | GooeyRichContent

export type GooeyToastType = 'default' | 'success' | 'error' | 'warning' | 'info'

export type GooeyToastPhase =
  | 'loading'
  | 'default'
  | 'success'
  | 'error'
  | 'warning'
  | 'info'

export type GooeyPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

export interface GooeyToastTimings {
  displayDuration?: number
}

export interface GooeyToastClassNames {
  wrapper?: string
  content?: string
  header?: string
  title?: string
  icon?: string
  description?: string
  actionWrapper?: string
  actionButton?: string
}

export interface GooeyToastAction {
  label: string
  onClick: () => void
  successLabel?: string
}

/**
 * Secondary "cancel" button shown next to the action. Clicking it dismisses the
 * toast; `onClick` (optional) runs first.
 */
export interface GooeyToastCancel {
  label: string
  onClick?: () => void
}

export interface GooeyToastOptions {
  description?: GooeyContent
  action?: GooeyToastAction
  /** Secondary cancel button (rendered next to `action`); dismisses on click. */
  cancel?: GooeyToastCancel
  icon?: GooeyContent
  duration?: number
  id?: string | number
  classNames?: GooeyToastClassNames
  fillColor?: string
  borderColor?: string
  borderWidth?: number
  timing?: GooeyToastTimings
  preset?: AnimationPresetName
  spring?: boolean
  bounce?: number
  showProgress?: boolean
  showTimestamp?: boolean
  /**
   * Override the toaster's `coalesceDuplicates` for this toast. When a matching
   * toast (same type + title + string description) is already on screen, bump
   * its count badge and pulse it instead of stacking a new one.
   *
   * Coalesce is for fire-and-forget toasts. Pass `coalesce: false` for any toast
   * you keep the id of and later `update()` (e.g. a "Connecting…" status that
   * becomes "Connected" / "Failed"): at creation time two such toasts have
   * identical content and would merge into one, after which both `update()`
   * calls hit the single shared entry. (`promise()` toasts never coalesce.)
   */
  coalesce?: boolean
  /**
   * Whether the user can dismiss this toast (swipe, close button, Escape).
   * `false` makes it dismissable only programmatically (`dismiss()`/`update()`).
   * @defaultValue `true`
   */
  dismissible?: boolean
  onDismiss?: (id: string | number) => void
  onAutoClose?: (id: string | number) => void
}

/**
 * Options for `toast.custom()` — a fully custom toast whose body is your
 * TemplateRef (no built-in header/icon/description).
 */
export interface GooeyCustomToastOptions {
  /**
   * Announced to screen readers and shown in history — a TemplateRef is opaque
   * to assistive tech, so a text alternative is required.
   */
  ariaLabel: string
  duration?: number
  id?: string | number
  classNames?: GooeyToastClassNames
  fillColor?: string
  borderColor?: string
  borderWidth?: number
  preset?: AnimationPresetName
  spring?: boolean
  bounce?: number
  showProgress?: boolean
  dismissible?: boolean
  onDismiss?: (id: string | number) => void
  onAutoClose?: (id: string | number) => void
}

export interface GooeyPromiseData<T> {
  loading: string
  success: string | ((data: T) => string)
  error: string | ((error: unknown) => string)
  description?: {
    loading?: GooeyContent
    success?: GooeyContent | ((data: T) => GooeyContent)
    error?: GooeyContent | ((error: unknown) => GooeyContent)
  }
  action?: {
    success?: GooeyToastAction
    error?: GooeyToastAction
  }
  /** Auto-dismiss (ms) for the settled toast; overridden per-result below. */
  duration?: number
  /** Auto-dismiss (ms) for the success toast (wins over `duration`/`timing`). */
  successDuration?: number
  /** Auto-dismiss (ms) for the error toast (wins over `duration`/`timing`). */
  errorDuration?: number
  /** Runs once when the promise settles (either way), after the toast updates. */
  finally?: () => void
  classNames?: GooeyToastClassNames
  fillColor?: string
  borderColor?: string
  borderWidth?: number
  timing?: GooeyToastTimings
  preset?: AnimationPresetName
  spring?: boolean
  bounce?: number
  showTimestamp?: boolean
  onDismiss?: (id: string | number) => void
  onAutoClose?: (id: string | number) => void
}

export interface GooeyToastUpdateOptions {
  title?: string
  description?: GooeyContent
  type?: GooeyToastType
  action?: GooeyToastAction
  /** Replace (or, with `null`, clear) the secondary cancel button. */
  cancel?: GooeyToastCancel | null
  icon?: GooeyContent | null
  showTimestamp?: boolean
  /**
   * New auto-dismiss duration (ms) for the (now mutable) timer. `Infinity` keeps
   * the toast open; a finite value re-arms the countdown from now.
   */
  duration?: number
}

export interface DismissFilter {
  type: GooeyToastType | GooeyToastType[]
}

/** A dismissed toast kept for replay (display data; the replay closure is internal). */
export interface GooeyHistoryRecord {
  id: string | number
  title: string
  type: GooeyToastType
  /** Present only when the description was a plain string (for display). */
  description?: string
  createdAt: Date
  dismissedAt: Date
}

export interface GooeyToasterProps {
  position?: GooeyPosition
  /** Default auto-dismiss (ms) for toasts that don't set duration/timing. */
  duration?: number
  gap?: number
  offset?: number | string
  theme?: 'light' | 'dark'
  /** Accessible name for the toast list (aria-label). Default 'Notifications'. */
  label?: string
  closeButton?: boolean | 'top-left' | 'top-right'
  visibleToasts?: number
  dir?: 'ltr' | 'rtl'
  preset?: AnimationPresetName
  spring?: boolean
  bounce?: number
  swipeToDismiss?: boolean
  closeOnEscape?: boolean
  maxQueue?: number
  queueOverflow?: 'drop-oldest' | 'drop-newest'
  showProgress?: boolean
  /** Where new toasts enter the stack: nearest the anchored edge (default) or far end. */
  stackDirection?: 'newest-first' | 'oldest-first'
  /** Vibrate on toast arrival (mobile, opt-in). No sound. */
  haptics?: boolean
  /** Max dismissed toasts kept for replay (0 disables). Default 20. */
  historyLimit?: number
  /** Default for per-toast `showTimestamp` (each toast can still override). */
  showTimestamp?: boolean
  /**
   * Collapse repeated identical toasts into one with a count badge + pulse
   * instead of stacking them. Matches on type + title + string description.
   * Per-toast override via `GooeyToastOptions.coalesce`. Default false.
   *
   * Note: this dedups by content, so toasts you track by id and `update()` in
   * place should opt out with `coalesce: false` — see `GooeyToastOptions.coalesce`.
   */
  coalesceDuplicates?: boolean
}

// ---------------------------------------------------------------------------
// Animation presets — ported from presets.ts
// ---------------------------------------------------------------------------
export interface AnimationPreset {
  bounce: number
  spring: boolean
  /** Multiplies the pill-resize / landing-squish durations (1 = default). */
  durationScale: number
}

export const animationPresets = {
  smooth: { bounce: 0.18, spring: true, durationScale: 1 },
  bouncy: { bounce: 0.4, spring: true, durationScale: 1.15 },
  subtle: { bounce: 0, spring: true, durationScale: 1.4 },
  snappy: { bounce: 0.4, spring: false, durationScale: 0.6 },
} as const satisfies Record<string, AnimationPreset>

export type AnimationPresetName = keyof typeof animationPresets
