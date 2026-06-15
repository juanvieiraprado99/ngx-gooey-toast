import {
  APP_ID,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core'
import { GooeyToastComponent } from './gooey-toast.component'
import { GooeyToastService, type GooeyToastEntry } from './gooey-toast.service'
import {
  animationPresets,
  DEFAULT_DISPLAY_DURATION,
  type GooeyPosition,
  type AnimationPresetName,
} from './gooey-toast.types'

/**
 * Order toasts for rendering. `newest-first` (default) puts the newest nearest
 * the anchored edge; `oldestFirst` flips it so newest enters at the far end.
 */
/** Deterministic per-instance suffix so SVG filter ids are stable under SSR. */
let gooeyFilterSeq = 0

export function orderStack<T>(
  list: readonly T[],
  topAnchored: boolean,
  oldestFirst: boolean,
): T[] {
  const base = topAnchored ? [...list].reverse() : [...list]
  return oldestFirst ? base.reverse() : base
}

/**
 * Stack container — replaces Sonner's `<Toaster>`, the React `GooeyToaster`
 * wrapper, and `AriaLiveAnnouncer`. Inputs mirror `GooeyToasterProps` and are
 * pushed into the global `GooeyToastService` signals.
 *
 * Stacking uses plain flexbox flow: we own the DOM, so the browser lays toasts
 * out for us — no offset math, no ResizeObserver, none of the React/Sonner
 * height-sync machinery. Newest toast sits nearest the anchored edge.
 *
 * Render exactly ONE `<gooey-toaster>` per app: inputs are pushed into the
 * root-singleton service's global config, so multiple instances would
 * overwrite each other (last writer wins).
 *
 * @example
 * // app.ts — render exactly ONE at the app root, then fire toasts from anywhere
 * // via `inject(GooeyToastService)`.
 * import { ChangeDetectionStrategy, Component } from '@angular/core'
 * import { GooeyToasterComponent } from 'ngx-gooey-toast'
 *
 * \@Component({
 *   selector: 'app-root',
 *   changeDetection: ChangeDetectionStrategy.OnPush,
 *   imports: [GooeyToasterComponent],
 *   template: `<gooey-toaster position="bottom-right" theme="dark" />`,
 * })
 * export class App {}
 */
@Component({
  selector: 'gooey-toaster',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GooeyToastComponent],
  host: {
    '(document:keydown.escape)': 'onEscape()',
  },
  template: `
    <ol
      class="toaster"
      [attr.aria-label]="label()"
      [attr.data-position]="position()"
      [attr.dir]="dir()"
      [style.--gap]="gapStr()"
      [style.--offset]="offsetStr()"
      (mouseenter)="onContainerEnter()"
      (mouseleave)="onContainerLeave()"
    >
      @for (t of displayToasts(); track t.id) {
        <li #itemEl class="item" [attr.data-id]="t.id" [style.z-index]="zRank().get(t.id)" animate.enter="g-enter" animate.leave="g-leave">
          <gooey-toast [entry]="t" />
        </li>
      }
    </ol>

    @if (mergeOn()) {
      <svg
        #mergeSvg
        class="merge-svg"
        aria-hidden="true"
        [attr.width]="vw()"
        [attr.height]="vh()"
        [attr.viewBox]="'0 0 ' + vw() + ' ' + vh()"
      >
        <defs>
          <filter
            [attr.id]="'gooey-merge-' + filterId"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
            color-interpolation-filters="sRGB"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
              result="goo"
            />
            <feDropShadow
              in="goo"
              dx="0"
              dy="4"
              stdDeviation="6"
              [attr.flood-color]="mergeShadowColor()"
            />
          </filter>
        </defs>
        <g class="goo" [attr.filter]="'url(#gooey-merge-' + filterId + ')'">
          @for (t of displayToasts(); track t.id) {
            <path #mergePath [attr.data-id]="t.id" [attr.fill]="mergeFill(t)"></path>
          }
        </g>
      </svg>
    }

    <div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {{ politeMessage() }}
    </div>
    <div class="sr-only" role="alert" aria-live="assertive" aria-atomic="true">
      {{ assertiveMessage() }}
    </div>
  `,
  styleUrl: './gooey-toaster.component.css',
})
export class GooeyToasterComponent {
  private readonly service = inject(GooeyToastService)

  // Inputs (mirror GooeyToasterProps)
  /**
   * Which corner/edge the stack is anchored to.
   * One of `top-left` `top-center` `top-right` `bottom-left` `bottom-center`
   * `bottom-right`. Top positions stack newest nearest the top.
   * @defaultValue `'top-right'`
   * @example <gooey-toaster position="bottom-center" />
   */
  readonly position = input<GooeyPosition>('top-right')
  /**
   * Default auto-dismiss time in ms for toasts that don't set their own
   * `duration`/`timing`. `Infinity` keeps them open. Falls back to 4000ms.
   * @defaultValue `undefined` (→ 4000ms)
   */
  readonly duration = input<number | undefined>(undefined)
  /**
   * Vertical space (px) between stacked toasts.
   * @defaultValue `14`
   */
  readonly gap = input(14)
  /**
   * Distance from the anchored screen edge. A number is treated as px.
   * @defaultValue `'24px'`
   * @example <gooey-toaster [offset]="40" />  // or offset="2rem"
   */
  readonly offset = input<number | string>('24px')
  /**
   * Color theme.
   * @defaultValue `'light'`
   */
  readonly theme = input<'light' | 'dark'>('light')
  /** Accessible name for the toast list (aria-label). @defaultValue `'Notifications'` */
  readonly label = input('Notifications')
  /**
   * Show a close button on each toast. `true` uses the default corner; pass
   * `'top-left'`/`'top-right'` to pick the corner.
   * @defaultValue `false`
   */
  readonly closeButton = input<boolean | 'top-left' | 'top-right'>(false)
  /**
   * Max toasts shown at once; the rest wait in an overflow queue.
   * @defaultValue `6`
   */
  readonly visibleToasts = input(6)
  /**
   * Text direction. `rtl` mirrors layout and swipe direction.
   * @defaultValue `'ltr'`
   */
  readonly dir = input<'ltr' | 'rtl'>('ltr')
  /**
   * Animation preset applied to all toasts: `smooth` `bouncy` `subtle` `snappy`.
   * Sets `spring`/`bounce`/duration scale; per-toast options still win.
   * @defaultValue `undefined` (→ `smooth`)
   */
  readonly preset = input<AnimationPresetName | undefined>(undefined)
  /**
   * Use a spring (vs. tween) for the morph. Overrides the preset's spring flag.
   * @defaultValue `undefined` (→ `true`)
   */
  readonly spring = input<boolean | undefined>(undefined)
  /**
   * Spring bounciness, 0 = no overshoot, higher = bouncier. Overrides the preset.
   * @defaultValue `undefined`
   */
  readonly bounce = input<number | undefined>(undefined)
  /**
   * Allow dismissing a toast by swiping it.
   * @defaultValue `true`
   */
  readonly swipeToDismiss = input(true)
  /**
   * Dismiss the newest toast when the user presses Escape.
   * @defaultValue `true`
   */
  readonly closeOnEscape = input(true)
  /**
   * Cap the overflow queue. Beyond it, `queueOverflow` decides what to drop.
   * @defaultValue `Infinity`
   */
  readonly maxQueue = input(Number.POSITIVE_INFINITY)
  /**
   * Which toast to drop when the queue is full.
   * @defaultValue `'drop-oldest'`
   */
  readonly queueOverflow = input<'drop-oldest' | 'drop-newest'>('drop-oldest')
  /**
   * Show a progress bar counting down the auto-dismiss timer.
   * @defaultValue `false`
   */
  readonly showProgress = input(false)
  /**
   * Collapse repeated identical toasts (same type + title + string description)
   * into one with a count badge + pulse, instead of stacking. Toasts you track
   * by id and `update()` should opt out via `GooeyToastOptions.coalesce: false`.
   * @defaultValue `false`
   */
  readonly coalesceDuplicates = input(false)
  /**
   * Fuse adjacent stacked toasts with a gooey "neck" (SVG metaball filter).
   * Blob fills blend at the join and per-toast borders aren't carried into the
   * merged shape — both expected for a metaball. Default false.
   */
  readonly merge = input(false)
  /** Where new toasts enter: nearest the anchored edge (default) or far end. */
  readonly stackDirection = input<'newest-first' | 'oldest-first'>('newest-first')
  /** Opt-in mobile vibration on toast arrival (no sound). */
  readonly haptics = input(false)
  /** Max dismissed toasts kept for replay (0 disables). */
  readonly historyLimit = input(20)

  // --- Metaball merge ------------------------------------------------------
  readonly mergeOn = computed(() => this.merge())
  /**
   * Unique per instance so multiple toasters don't share a <filter> id, yet
   * deterministic (APP_ID + a render-order counter) so server and client agree
   * and SSR hydration doesn't mismatch — unlike a Math.random() value.
   */
  readonly filterId = `${inject(APP_ID)}-${gooeyFilterSeq++}`
  readonly vw = signal(typeof window !== 'undefined' ? window.innerWidth : 0)
  readonly vh = signal(typeof window !== 'undefined' ? window.innerHeight : 0)

  mergeFill(t: GooeyToastEntry): string {
    return t.fillColor ?? (this.service.theme() === 'dark' ? '#1a1a1a' : '#ffffff')
  }
  mergeShadowColor(): string {
    return this.service.theme() === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)'
  }

  readonly offsetStr = computed(() => {
    const o = this.offset()
    return typeof o === 'number' ? `${o}px` : o
  })
  readonly gapStr = computed(() => `${this.gap()}px`)

  /** Top positions render newest-first so the newest sits nearest the top. */
  readonly displayToasts = computed(() =>
    orderStack(
      this.service.toasts(),
      this.position().startsWith('top'),
      this.stackDirection() === 'oldest-first',
    ),
  )

  // FLIP: animate settled toasts as they shift when one enters/leaves.
  private readonly itemEls = viewChildren<ElementRef<HTMLElement>>('itemEl')
  private prevTops = new Map<string, number>()

  // Merge: clone each toast's blob into the shared goo-filtered layer.
  private readonly toastCmps = viewChildren(GooeyToastComponent)
  private readonly mergePaths = viewChildren<ElementRef<SVGPathElement>>('mergePath')
  private readonly mergeSvgRef = viewChild<ElementRef<SVGSVGElement>>('mergeSvg')
  private rafId: number | null = null

  // Screen-reader announcement mirrors
  readonly politeMessage = signal('')
  readonly assertiveMessage = signal('')
  private politeClear: ReturnType<typeof setTimeout> | null = null
  private assertiveClear: ReturnType<typeof setTimeout> | null = null

  constructor() {
    // Push inputs into the global config signals.
    effect(() => {
      const presetConfig = this.preset() ? animationPresets[this.preset()!] : undefined
      this.service.position.set(this.position())
      this.service.dir.set(this.dir())
      this.service.theme.set(this.theme())
      this.service.spring.set(this.spring() ?? presetConfig?.spring ?? true)
      this.service.bounce.set(this.bounce() ?? presetConfig?.bounce)
      this.service.visibleToasts.set(this.visibleToasts())
      this.service.swipeToDismiss.set(this.swipeToDismiss())
      this.service.closeOnEscape.set(this.closeOnEscape())
      this.service.maxQueue.set(this.maxQueue())
      this.service.queueOverflow.set(this.queueOverflow())
      this.service.showProgress.set(this.showProgress())
      this.service.closeButton.set(this.closeButton())
      this.service.defaultDuration.set(this.duration() ?? DEFAULT_DISPLAY_DURATION)
      this.service.coalesceDuplicates.set(this.coalesceDuplicates())
      this.service.mergeBlobs.set(this.merge())
      this.service.haptics.set(this.haptics())
      this.service.historyLimit.set(this.historyLimit())
    })

    // FLIP layout animation: when the list changes, every item that was
    // already on screen gets translated from its previous position back to 0,
    // so siblings glide to make room instead of snapping. The entering item is
    // skipped here (no previous position) — its own animate.enter plays.
    afterRenderEffect(() => {
      this.displayToasts() // re-run when the toast list changes
      const reduce =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const next = new Map<string, number>()
      for (const ref of this.itemEls()) {
        const el = ref.nativeElement
        const id = el.dataset['id']
        if (id == null) continue
        const top = el.getBoundingClientRect().top
        next.set(id, top)
        const prev = this.prevTops.get(id)
        if (prev != null && !reduce) {
          const delta = prev - top
          if (Math.abs(delta) > 0.5) {
            el.style.transition = 'none'
            el.style.transform = `translateY(${delta}px)`
            requestAnimationFrame(() => {
              el.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
              el.style.transform = ''
            })
          }
        }
      }
      this.prevTops = next
    })

    // Mirror announcements into the live regions, clearing after 7s.
    effect(() => {
      const a = this.service.announcement()
      if (!a) return
      if (a.politeness === 'assertive') {
        this.assertiveMessage.set('')
        queueMicrotask(() => this.assertiveMessage.set(a.message))
        if (this.assertiveClear) clearTimeout(this.assertiveClear)
        this.assertiveClear = setTimeout(() => this.assertiveMessage.set(''), 7000)
      } else {
        this.politeMessage.set('')
        queueMicrotask(() => this.politeMessage.set(a.message))
        if (this.politeClear) clearTimeout(this.politeClear)
        this.politeClear = setTimeout(() => this.politeMessage.set(''), 7000)
      }
    })

    // Merge: run the blob-clone sync loop while merge is on and toasts exist.
    if (typeof window !== 'undefined') {
      const onResize = () => {
        this.vw.set(window.innerWidth)
        this.vh.set(window.innerHeight)
      }
      window.addEventListener('resize', onResize)
      inject(DestroyRef).onDestroy(() => window.removeEventListener('resize', onResize))

      effect(() => {
        const on = this.service.mergeBlobs()
        const has = this.service.toasts().length > 0
        untracked(() => (on && has ? this.startMergeLoop() : this.stopMergeLoop()))
      })
      inject(DestroyRef).onDestroy(() => this.stopMergeLoop())
    }
  }

  // ------------------------------------------------------------- merge loop
  private startMergeLoop(): void {
    if (this.rafId != null) return
    const tick = () => {
      this.syncMergePaths()
      this.rafId = requestAnimationFrame(tick)
    }
    this.rafId = requestAnimationFrame(tick)
  }

  private stopMergeLoop(): void {
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  /**
   * Copy each toast's live blob (path `d` + on-screen transform) onto its
   * matching shared path inside the goo-filtered `<g>`. Because the shared SVG
   * sits at viewport origin with a 1:1 viewBox, a toast's blob-space
   * `getScreenCTM()` is already the matrix into shared-svg space. Read all
   * geometry first, then write — avoids layout thrash.
   */
  private syncMergePaths(): void {
    const paths = this.mergePaths()
    if (paths.length === 0) return
    const root = this.mergeSvgRef()?.nativeElement
    const rootCtm = root?.getScreenCTM()
    if (!rootCtm) return
    // Compose into the shared svg's OWN user space via a relative CTM. This
    // cancels any global offset/zoom that affects both svgs equally (mobile
    // visual-viewport offset, page zoom, device-pixel-ratio) — without it the
    // clones drift from the real toasts on mobile.
    const inv = rootCtm.inverse()

    const pathById = new Map<string, SVGPathElement>()
    for (const ref of paths) {
      const id = ref.nativeElement.getAttribute('data-id')
      if (id != null) pathById.set(id, ref.nativeElement)
    }

    const writes: { el: SVGPathElement; d: string; transform: string }[] = []
    for (const cmp of this.toastCmps()) {
      const svg = cmp.blobSvgEl()
      const path = cmp.blobPathEl()
      const target = pathById.get(String(cmp.id()))
      if (!svg || !path || !target) continue
      const local = svg.getScreenCTM()
      const d = path.getAttribute('d')
      if (!local || !d) continue
      const m = inv.multiply(local)
      writes.push({
        el: target,
        d,
        transform: `matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`,
      })
    }

    for (const w of writes) {
      w.el.setAttribute('d', w.d)
      w.el.setAttribute('transform', w.transform)
    }
  }

  /**
   * Recency rank per toast id (newest paints on top regardless of DOM order).
   * Computed once per toast-list change instead of an O(n²) per-item findIndex.
   */
  readonly zRank = computed(() => {
    const map = new Map<string | number, number>()
    this.service.toasts().forEach((t, i) => map.set(t.id, i + 1))
    return map
  })

  onContainerEnter(): void {
    this.service.containerHovered.set(true)
  }
  onContainerLeave(): void {
    this.service.containerHovered.set(false)
  }
  onEscape(): void {
    if (!this.service.closeOnEscape()) return
    const id = this.service.mostRecentId()
    if (id != null) this.service.dismiss(id)
  }
}
