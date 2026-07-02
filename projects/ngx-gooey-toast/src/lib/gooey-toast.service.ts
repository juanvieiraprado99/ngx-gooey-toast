import { Injectable, signal, type TemplateRef, type WritableSignal } from '@angular/core'
import { DEFAULT_DISPLAY_DURATION } from './gooey-toast.types'
import type {
  AnimationPresetName,
  DismissFilter,
  GooeyContent,
  GooeyCustomToastOptions,
  GooeyHistoryRecord,
  GooeyPosition,
  GooeyPromiseData,
  GooeyToastAction,
  GooeyToastCancel,
  GooeyToastClassNames,
  GooeyToastOptions,
  GooeyToastPhase,
  GooeyToastTimings,
  GooeyToastType,
  GooeyToastUpdateOptions,
} from './gooey-toast.types'

/** Per-type vibration pattern (ms) for haptic feedback on toast arrival. */
export function hapticPattern(type: GooeyToastType): number[] {
  switch (type) {
    case 'error':
      return [20, 40, 20]
    case 'warning':
      return [12, 30, 12]
    case 'success':
      return [14]
    default:
      return [10] // info / default
  }
}

/** Why a toast left the screen — drives which callbacks fire. */
export type DismissReason = 'auto' | 'manual'

/** Live announcement pushed to the aria-live regions. */
export interface GooeyAnnouncement {
  message: string
  politeness: 'polite' | 'assertive'
  seq: number
}

/**
 * A live toast. Mutable fields are signals so `update()` / promise resolution
 * re-render in place. Static config is plain readonly data.
 */
export interface GooeyToastEntry {
  readonly id: string | number
  readonly title: WritableSignal<string>
  readonly type: WritableSignal<GooeyToastType>
  readonly phase: WritableSignal<GooeyToastPhase>
  readonly description: WritableSignal<GooeyContent | undefined>
  readonly action: WritableSignal<GooeyToastAction | undefined>
  readonly cancel: WritableSignal<GooeyToastCancel | undefined>
  readonly icon: WritableSignal<GooeyContent | undefined>
  readonly showTimestamp: WritableSignal<boolean>
  /** How many identical toasts have coalesced into this one (1 = no dupes). */
  readonly count: WritableSignal<number>
  /** Bump-counter the component watches to pulse + restart its timer on a dupe. */
  readonly pulse: WritableSignal<number>
  /** Set to 'manual' by the service to ask the component to play its exit. */
  readonly exitRequest: WritableSignal<DismissReason | null>
  readonly classNames?: GooeyToastClassNames
  readonly fillColor?: string
  readonly borderColor?: string
  readonly borderWidth?: number
  readonly timing?: GooeyToastTimings
  readonly preset?: AnimationPresetName
  readonly spring?: boolean
  readonly bounce?: number
  readonly showProgress?: boolean
  /** `false` blocks user-initiated dismissal (swipe / close button / Escape). */
  readonly dismissible?: boolean
  /** Fully custom body (from `custom()`); replaces the built-in header/description. */
  readonly custom?: TemplateRef<unknown>
  /**
   * Auto-dismiss duration (ms). Infinity = stay open. A signal so `update()`
   * and `promise()` settle can re-arm the timers in place (E8/E14 track it).
   */
  readonly duration: WritableSignal<number>
  readonly createdAt: Date
  readonly onDismiss?: (id: string | number) => void
  readonly onAutoClose?: (id: string | number) => void
}

interface QueueItem {
  entry: GooeyToastEntry
}

/**
 * Global toast store + public API. Replaces the React module-singleton
 * `context.ts` (config) and `gooey-toast.tsx` (queue + imperative API).
 *
 * Components read the config signals; the `<gooey-toaster>` writes them from
 * its inputs. Call `success()/error()/…` from anywhere via DI.
 */
@Injectable({ providedIn: 'root' })
export class GooeyToastService {
  // --- Global config (written by <gooey-toaster>, read by toasts) ----------
  readonly position = signal<GooeyPosition>('top-right')
  readonly dir = signal<'ltr' | 'rtl'>('ltr')
  readonly theme = signal<'light' | 'dark'>('light')
  readonly spring = signal(true)
  readonly bounce = signal<number | undefined>(undefined)
  readonly visibleToasts = signal(6)
  readonly swipeToDismiss = signal(true)
  readonly closeOnEscape = signal(true)
  readonly maxQueue = signal(Number.POSITIVE_INFINITY)
  readonly queueOverflow = signal<'drop-oldest' | 'drop-newest'>('drop-oldest')
  readonly showProgress = signal(false)
  readonly closeButton = signal<boolean | 'top-left' | 'top-right'>(false)
  /** Default auto-dismiss duration (ms) when a toast doesn't set its own. */
  readonly defaultDuration = signal(DEFAULT_DISPLAY_DURATION)
  readonly coalesceDuplicates = signal(false)
  readonly mergeBlobs = signal(false)
  readonly haptics = signal(false)
  readonly historyLimit = signal(20)
  /** Global default for per-toast `showTimestamp`. */
  readonly showTimestampDefault = signal(true)

  /**
   * Page visibility (false while the tab is hidden). Auto-dismiss timers pause
   * on hidden so a toast fired in a background tab is still there on return.
   */
  readonly pageVisible = signal(true)

  constructor() {
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      this.pageVisible.set(!document.hidden)
      document.addEventListener('visibilitychange', () =>
        this.pageVisible.set(!document.hidden),
      )
    }
  }

  /** Dismissed toasts kept for replay (newest first). Read-only by convention. */
  readonly history = signal<GooeyHistoryRecord[]>([])
  /** id → closure that re-fires the original create call (refs preserved). */
  private readonly replayFns = new Map<string | number, () => string | number>()

  /** Hovering anywhere in the stack — pauses timers, holds toasts expanded. */
  readonly containerHovered = signal(false)

  /** Latest screen-reader announcement, rendered by the toaster live regions. */
  readonly announcement = signal<GooeyAnnouncement | null>(null)

  // --- Toast state ---------------------------------------------------------
  readonly toasts = signal<GooeyToastEntry[]>([])
  private readonly queue: QueueItem[] = []
  private seq = 0

  // ---------------------------------------------------------------------- API
  /**
   * Show a neutral toast.
   * @param title Main line of text.
   * @param options Description, action, icon, duration, styling, callbacks…
   * @returns The toast id (pass to `update()`/`dismiss()`).
   * @example
   * const toast = inject(GooeyToastService)
   * toast.show('Copied to clipboard')
   * toast.show('Heads up', { description: 'Check your inbox.', duration: 6000 })
   */
  show(title: string, options?: GooeyToastOptions): string | number {
    return this.create(title, 'default', options)
  }
  /**
   * Show a success toast (green, polite announcement).
   * @returns The toast id.
   * @example
   * toast.success('Saved!', {
   *   description: 'Your changes are live.',
   *   action: { label: 'Undo', onClick: () => undo() },
   * })
   */
  success(title: string, options?: GooeyToastOptions): string | number {
    return this.create(title, 'success', options)
  }
  /**
   * Show an error toast (red, assertive announcement).
   * @returns The toast id.
   * @example toast.error('Upload failed', { description: 'File too large.' })
   */
  error(title: string, options?: GooeyToastOptions): string | number {
    return this.create(title, 'error', options)
  }
  /**
   * Show a warning toast (assertive announcement).
   * @returns The toast id.
   * @example toast.warning('Low disk space')
   */
  warning(title: string, options?: GooeyToastOptions): string | number {
    return this.create(title, 'warning', options)
  }
  /**
   * Show an info toast (polite announcement).
   * @returns The toast id.
   * @example toast.info('A new version is available')
   */
  info(title: string, options?: GooeyToastOptions): string | number {
    return this.create(title, 'info', options)
  }

  /**
   * Show a standalone loading toast (spinner icon, stays open by default).
   * Resolve it later with `update(id, { type, title, duration })` — e.g. flip to
   * `success` with a finite `duration` so it auto-closes. Defaults to
   * `duration: Infinity` and `coalesce: false` (so it isn't merged before you
   * update it). For a one-call flow prefer `promise()`.
   * @returns The toast id.
   * @example
   * const id = toast.loading('Uploading…')
   * // later…
   * toast.update(id, { type: 'success', title: 'Uploaded', duration: 4000 })
   */
  loading(title: string, options?: GooeyToastOptions): string | number {
    return this.create(
      title,
      'info',
      {
        ...options,
        duration: options?.duration ?? Number.POSITIVE_INFINITY,
        coalesce: options?.coalesce ?? false,
      },
      'loading',
    )
  }

  /**
   * Track a promise in one toast: `loading` → `success`/`error` in place.
   * `success`/`error` may be a string or a function of the resolved value/error.
   * @returns The toast id.
   * @example
   * toast.promise(api.save(form), {
   *   loading: 'Saving…',
   *   success: (res) => `Saved as ${res.name}`,
   *   error: (err) => `Failed: ${err}`,
   * })
   */
  promise<T>(promise: Promise<T>, data: GooeyPromiseData<T>): string | number {
    const id = this.genId()
    const entry = this.makeEntry({
      id,
      title: data.loading,
      type: 'info',
      phase: 'loading',
      description: data.description?.loading,
      timing: data.timing,
      classNames: data.classNames,
      fillColor: data.fillColor,
      borderColor: data.borderColor,
      borderWidth: data.borderWidth,
      preset: data.preset,
      spring: data.spring,
      bounce: data.bounce,
      showTimestamp: data.showTimestamp,
      onDismiss: data.onDismiss,
      onAutoClose: data.onAutoClose,
      // Stay open while loading — Infinity arms neither auto-dismiss path (E14
      // guards on phase, but an expanded loading toast with a description would
      // otherwise collapse via E8 on the default duration). On settle we set a
      // finite duration so the result toast auto-closes.
      duration: Number.POSITIVE_INFINITY,
    })
    // Duration applied to the settled (success/error) toast; per-result
    // overrides (successDuration/errorDuration) win over the shared value.
    const settleDuration =
      data.duration ?? data.timing?.displayDuration ?? this.defaultDuration()
    const runFinally = () => {
      try {
        data.finally?.()
      } catch {
        /* callback errors must not break the toast */
      }
    }

    this.announce(this.message(data.loading, data.description?.loading), 'polite')
    this.push(entry)

    promise.then(
      (result) => {
        const desc =
          typeof data.description?.success === 'function'
            ? data.description.success(result)
            : data.description?.success
        const title =
          typeof data.success === 'function' ? data.success(result) : data.success
        entry.title.set(title)
        entry.description.set(desc)
        entry.action.set(data.action?.success)
        entry.type.set('success')
        entry.phase.set('success')
        entry.duration.set(data.successDuration ?? settleDuration)
        this.announce(this.message(title, desc), 'polite')
        this.triggerHaptic('success')
        // A promise can't be re-awaited; replay re-shows the settled toast.
        this.replayFns.set(id, () =>
          this.create(title, 'success', { description: desc, action: data.action?.success }),
        )
        runFinally()
      },
      (err) => {
        const desc =
          typeof data.description?.error === 'function'
            ? data.description.error(err)
            : data.description?.error
        const title =
          typeof data.error === 'function' ? data.error(err) : data.error
        entry.title.set(title)
        entry.description.set(desc)
        entry.action.set(data.action?.error)
        entry.type.set('error')
        entry.phase.set('error')
        entry.duration.set(data.errorDuration ?? settleDuration)
        this.announce(this.message(title, desc), 'assertive')
        this.triggerHaptic('error')
        this.replayFns.set(id, () =>
          this.create(title, 'error', { description: desc, action: data.action?.error }),
        )
        runFinally()
      },
    )

    return id
  }

  /**
   * Show a fully custom toast: your TemplateRef IS the body (no built-in
   * header, icon, or description). `ariaLabel` is required — it's what screen
   * readers announce and what history/replay shows.
   * @returns The toast id.
   * @example
   * // <ng-template #tpl><my-upload-card /></ng-template>
   * toast.custom(tpl, { ariaLabel: 'Upload in progress', duration: 8000 })
   */
  custom(content: TemplateRef<unknown>, options: GooeyCustomToastOptions): string | number {
    const id = options.id ?? this.genId()
    const entry = this.makeEntry({
      id,
      title: options.ariaLabel,
      type: 'default',
      phase: 'default',
      custom: content,
      classNames: options.classNames,
      fillColor: options.fillColor,
      borderColor: options.borderColor,
      borderWidth: options.borderWidth,
      preset: options.preset,
      spring: options.spring,
      bounce: options.bounce,
      showProgress: options.showProgress,
      showTimestamp: false,
      dismissible: options.dismissible,
      onDismiss: options.onDismiss,
      onAutoClose: options.onAutoClose,
      duration: options.duration ?? this.defaultDuration(),
    })
    this.announce(options.ariaLabel, 'polite')
    this.triggerHaptic('default')
    // Replay re-fires with the same TemplateRef (refs preserved) as a new toast.
    this.replayFns.set(id, () => this.custom(content, { ...options, id: undefined }))
    this.push(entry)
    return id
  }

  /**
   * Mutate a live toast in place (title, description, type, action, icon,
   * duration…). No-op if the id isn't found. Create the toast with
   * `coalesce: false` so a duplicate-looking "loading" toast isn't merged
   * before you update it.
   *
   * `duration` is mutable: setting a finite value re-arms the auto-dismiss
   * countdown from now; `Infinity` keeps the toast open.
   * @example
   * const id = toast.info('Connecting…', { coalesce: false, duration: Infinity })
   * // later…
   * toast.update(id, { title: 'Connected', type: 'success', duration: 4000 })
   */
  update(id: string | number, options: GooeyToastUpdateOptions): void {
    const entry = this.find(id)
    if (!entry) return
    if (options.title !== undefined) entry.title.set(options.title)
    if (options.description !== undefined) entry.description.set(options.description)
    if (options.type !== undefined) {
      entry.type.set(options.type)
      entry.phase.set(options.type)
    }
    if (options.action !== undefined) entry.action.set(options.action)
    if ('cancel' in options) entry.cancel.set(options.cancel ?? undefined)
    if ('icon' in options) entry.icon.set(options.icon ?? undefined)
    if (options.showTimestamp !== undefined) entry.showTimestamp.set(options.showTimestamp)
    // Mutable duration: re-arm the auto-dismiss timers (E8/E14 track it).
    if (options.duration !== undefined) entry.duration.set(options.duration)
    // Announce when the title OR description changed so SR users hear in-place
    // updates that don't touch the title (e.g. a description- or type-only update).
    if (options.title !== undefined || options.description !== undefined) {
      this.announce(
        this.message(entry.title(), entry.description()),
        options.type ? this.politeness(options.type) : 'polite',
      )
    }
  }

  /**
   * Dismiss toasts (plays the exit animation).
   * @param idOrFilter A toast id; a `{ type }` filter (type or array of types);
   * or omit to dismiss everything.
   * @example
   * toast.dismiss(id)                 // one toast
   * toast.dismiss({ type: 'error' })  // all errors (or { type: ['error','warning'] })
   * toast.dismiss()                   // all toasts + queue
   */
  dismiss(idOrFilter?: string | number | DismissFilter): void {
    if (idOrFilter != null && typeof idOrFilter === 'object') {
      const types = Array.isArray(idOrFilter.type) ? idOrFilter.type : [idOrFilter.type]
      const set = new Set<GooeyToastType>(types)
      // Drop matching queued items
      for (let i = this.queue.length - 1; i >= 0; i--) {
        if (set.has(this.queue[i].entry.type())) this.dropQueued(i)
      }
      for (const t of this.toasts()) {
        if (set.has(t.type())) t.exitRequest.set('manual')
      }
      return
    }
    if (idOrFilter != null) {
      const qIdx = this.queue.findIndex((q) => q.entry.id === idOrFilter)
      if (qIdx !== -1) {
        this.dropQueued(qIdx)
        return
      }
      this.find(idOrFilter)?.exitRequest.set('manual')
      return
    }
    while (this.queue.length > 0) this.dropQueued(this.queue.length - 1)
    for (const t of this.toasts()) t.exitRequest.set('manual')
  }

  /** Remove a queued (never-shown) toast: honor onDismiss, drop its replay. */
  private dropQueued(index: number): void {
    const [item] = this.queue.splice(index, 1)
    if (!item) return
    try {
      item.entry.onDismiss?.(item.entry.id)
    } catch {
      /* callback errors must not break the queue */
    }
    this.replayFns.delete(item.entry.id)
  }

  /** Called by a toast component once its exit/collapse animation finishes. */
  remove(id: string | number, reason: DismissReason): void {
    const list = this.toasts()
    const entry = list.find((t) => t.id === id)
    if (!entry) return
    this.toasts.set(list.filter((t) => t.id !== id))

    if (reason === 'auto') {
      try {
        entry.onAutoClose?.(id)
      } catch {
        /* callback errors must not break the queue */
      }
    }
    try {
      entry.onDismiss?.(id)
    } catch {
      /* callback errors must not break the queue */
    }

    // Capture into history (newest first) for replay; evict oldest past the cap.
    const limit = this.historyLimit()
    const fn = this.replayFns.get(id)
    if (limit > 0 && fn) {
      const desc = entry.description()
      const rec: GooeyHistoryRecord = {
        id,
        title: entry.title(),
        type: entry.type(),
        description: typeof desc === 'string' ? desc : undefined,
        createdAt: entry.createdAt,
        dismissedAt: new Date(),
      }
      this.history.update((h) => {
        const next = [rec, ...h]
        while (next.length > limit) {
          const dropped = next.pop()!
          this.replayFns.delete(dropped.id)
        }
        return next
      })
    } else {
      this.replayFns.delete(id)
    }

    this.processQueue()
  }

  /**
   * Re-fire a dismissed toast as a fresh one (from the replay history).
   * @returns The new toast id, or `undefined` if the id is no longer in history.
   * @example toast.replay(record.id)
   */
  replay(id: string | number): string | number | undefined {
    return this.replayFns.get(id)?.()
  }

  /** Clear the dismissed-toast history (keeps replay closures for live toasts). */
  clearHistory(): void {
    this.history.set([])
    const live = new Set(this.toasts().map((t) => t.id))
    for (const key of [...this.replayFns.keys()]) {
      if (!live.has(key)) this.replayFns.delete(key)
    }
  }

  /** Id of the newest live toast, or `undefined` when none are showing. */
  mostRecentId(): string | number | undefined {
    const list = this.toasts()
    return list.length ? list[list.length - 1].id : undefined
  }

  /**
   * Push a message to the screen-reader live regions without showing a toast.
   * @param politeness `'polite'` waits for a pause; `'assertive'` interrupts.
   */
  announce(message: string, politeness: 'polite' | 'assertive' = 'polite'): void {
    if (!message) return
    this.announcement.set({ message, politeness, seq: ++this.seq })
  }

  // ------------------------------------------------------------- internals
  private create(
    title: string,
    type: GooeyToastType,
    options?: GooeyToastOptions,
    phase: GooeyToastPhase = type,
  ): string | number {
    const id = options?.id ?? this.genId()

    // Reusing a live/queued toast's id updates that toast in place (sonner
    // semantics) — stacking a second entry with the same id would break
    // `@for track t.id` (duplicate key) and make find()/dismiss() ambiguous.
    if (options?.id != null) {
      const existing = this.find(options.id)
      if (existing) {
        existing.title.set(title)
        existing.type.set(type)
        existing.phase.set(phase)
        if (options.description !== undefined) existing.description.set(options.description)
        if (options.action !== undefined) existing.action.set(options.action)
        if (options.cancel !== undefined) existing.cancel.set(options.cancel)
        if (options.icon !== undefined) existing.icon.set(options.icon)
        if (options.showTimestamp !== undefined)
          existing.showTimestamp.set(options.showTimestamp)
        const nextDuration = options.timing?.displayDuration ?? options.duration
        if (nextDuration !== undefined) existing.duration.set(nextDuration)
        this.announce(this.message(title, options.description), this.politeness(type))
        this.triggerHaptic(type)
        return existing.id
      }
    }

    // Coalesce: a matching live toast absorbs the duplicate (count badge +
    // pulse + timer restart) instead of stacking a new one.
    const coalesce = options?.coalesce ?? this.coalesceDuplicates()
    if (coalesce && options?.id == null) {
      const key = this.coalesceKey(type, title, options?.description)
      if (key != null) {
        const matches = (t: GooeyToastEntry) =>
          this.coalesceKey(t.type(), t.title(), t.description()) === key
        // Check live toasts AND the overflow queue, so bursts past the
        // visible cap still collapse instead of stacking queued duplicates.
        const existing =
          this.toasts().find(matches) ?? this.queue.find((q) => matches(q.entry))?.entry
        if (existing) {
          existing.count.update((n) => n + 1)
          existing.pulse.update((n) => n + 1)
          this.announce(this.message(title, options?.description), this.politeness(type))
          this.triggerHaptic(type)
          return existing.id
        }
      }
    }

    const duration =
      options?.timing?.displayDuration ??
      options?.duration ??
      this.defaultDuration()
    const entry = this.makeEntry({
      id,
      title,
      type,
      phase,
      description: options?.description,
      action: options?.action,
      cancel: options?.cancel,
      icon: options?.icon,
      classNames: options?.classNames,
      fillColor: options?.fillColor,
      borderColor: options?.borderColor,
      borderWidth: options?.borderWidth,
      timing: options?.timing,
      preset: options?.preset,
      spring: options?.spring,
      bounce: options?.bounce,
      showProgress: options?.showProgress,
      showTimestamp: options?.showTimestamp,
      dismissible: options?.dismissible,
      onDismiss: options?.onDismiss,
      onAutoClose: options?.onAutoClose,
      duration,
    })
    this.announce(this.message(title, options?.description), this.politeness(type))
    this.triggerHaptic(type)
    // Replay re-fires the toast as a fresh one (no id → never updates in place).
    // It reads the entry's *current* state, so a toast mutated via `update()` is
    // replayed in its latest form; styling refs on the entry are preserved.
    this.replayFns.set(id, () => this.replayEntry(entry))
    this.push(entry)
    return id
  }

  /** Re-fire a (possibly `update()`d) entry as a brand-new toast. */
  private replayEntry(entry: GooeyToastEntry): string | number {
    return this.create(entry.title(), entry.type(), {
      description: entry.description(),
      action: entry.action(),
      cancel: entry.cancel(),
      icon: entry.icon(),
      classNames: entry.classNames,
      fillColor: entry.fillColor,
      borderColor: entry.borderColor,
      borderWidth: entry.borderWidth,
      timing: entry.timing,
      preset: entry.preset,
      spring: entry.spring,
      bounce: entry.bounce,
      showProgress: entry.showProgress,
      showTimestamp: entry.showTimestamp(),
      dismissible: entry.dismissible,
      duration: entry.duration(),
      onDismiss: entry.onDismiss,
      onAutoClose: entry.onAutoClose,
    })
  }

  private makeEntry(init: {
    id: string | number
    title: string
    type: GooeyToastType
    phase: GooeyToastPhase
    description?: GooeyContent
    action?: GooeyToastAction
    cancel?: GooeyToastCancel
    icon?: GooeyContent
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
    dismissible?: boolean
    custom?: TemplateRef<unknown>
    duration: number
    onDismiss?: (id: string | number) => void
    onAutoClose?: (id: string | number) => void
  }): GooeyToastEntry {
    return {
      id: init.id,
      title: signal(init.title),
      type: signal(init.type),
      phase: signal(init.phase),
      description: signal(init.description),
      action: signal(init.action),
      cancel: signal(init.cancel),
      icon: signal(init.icon),
      showTimestamp: signal(init.showTimestamp ?? this.showTimestampDefault()),
      count: signal(1),
      pulse: signal(0),
      exitRequest: signal<DismissReason | null>(null),
      classNames: init.classNames,
      fillColor: init.fillColor,
      borderColor: init.borderColor,
      borderWidth: init.borderWidth,
      timing: init.timing,
      preset: init.preset,
      spring: init.spring,
      bounce: init.bounce,
      showProgress: init.showProgress,
      dismissible: init.dismissible,
      custom: init.custom,
      duration: signal(init.duration),
      createdAt: new Date(),
      onDismiss: init.onDismiss,
      onAutoClose: init.onAutoClose,
    }
  }

  private push(entry: GooeyToastEntry): void {
    if (this.toasts().length < this.visibleToasts()) {
      this.toasts.update((list) => [...list, entry])
    } else {
      this.enqueue({ entry })
    }
  }

  private enqueue(item: QueueItem): boolean {
    const max = this.maxQueue()
    if (this.queue.length >= max) {
      if (this.queueOverflow() === 'drop-newest') return false
      this.queue.shift() // drop-oldest
    }
    this.queue.push(item)
    return true
  }

  private processQueue(): void {
    const max = this.visibleToasts()
    while (this.queue.length > 0 && this.toasts().length < max) {
      const next = this.queue.shift()!
      this.toasts.update((list) => [...list, next.entry])
    }
  }

  private find(id: string | number): GooeyToastEntry | undefined {
    return (
      this.toasts().find((t) => t.id === id) ??
      this.queue.find((q) => q.entry.id === id)?.entry
    )
  }

  private idSeq = 0
  private genId(): string {
    // Monotonic counter — collision-proof within the (root-singleton) service,
    // unlike the previous Math.random() slug.
    return `gooey-${++this.idSeq}`
  }

  /**
   * Dedup key for coalescing. Returns null when not coalescable — only string
   * descriptions can be compared (a TemplateRef body is opaque).
   */
  private coalesceKey(
    type: GooeyToastType,
    title: string,
    description?: GooeyContent,
  ): string | null {
    if (description !== undefined && typeof description !== 'string') return null
    return `${type} ${title} ${description ?? ''}`
  }

  private message(title: string, description?: GooeyContent): string {
    return typeof description === 'string' ? `${title}: ${description}` : title
  }

  private politeness(type: GooeyToastType): 'polite' | 'assertive' {
    return type === 'error' || type === 'warning' ? 'assertive' : 'polite'
  }

  /** Opt-in mobile vibration on arrival; no-op without the API or on reduced-motion. */
  private triggerHaptic(type: GooeyToastType): void {
    if (!this.haptics()) return
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
    try {
      navigator.vibrate(hapticPattern(type))
    } catch {
      /* vibrate can throw on some browsers — ignore */
    }
  }
}
