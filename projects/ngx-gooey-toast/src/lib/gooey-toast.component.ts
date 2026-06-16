import { NgTemplateOutlet } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
  SecurityContext,
  type OnDestroy,
  type TemplateRef,
} from '@angular/core'
import { DomSanitizer } from '@angular/platform-browser'
import { GooeyIconComponent, type GooeyIconKind } from './gooey-icons.component'
import { isRichContent, renderMarkdown } from './gooey-rich'
import { morphPath, morphPathCenter, PH } from './gooey-morph'
import {
  animate,
  squishSpring,
  type AnimationController,
  type Easing,
} from './spring-animate'
import {
  GooeyToastService,
  type DismissReason,
  type GooeyToastEntry,
} from './gooey-toast.service'
import { animationPresets as PRESETS, DEFAULT_DISPLAY_DURATION } from './gooey-toast.types'
import type {
  GooeyContent,
  GooeyToastAction,
  GooeyToastPhase,
} from './gooey-toast.types'

const DEFAULT_EXPAND_DUR = 0.6
const DEFAULT_COLLAPSE_DUR = 0.9
const SMOOTH_EASE: Easing = [0.4, 0, 0.2, 1]

/** Rubber-band resistance past the threshold so the swipe drag feels elastic. */
export function rubberBand(dx: number, threshold: number): number {
  const a = Math.abs(dx)
  if (a <= threshold) return dx
  return Math.sign(dx) * (threshold + (a - threshold) * 0.35)
}

/** Dismiss a swipe if dragged far enough OR flicked fast enough (px/ms). */
export function shouldDismissSwipe(
  dx: number,
  velocity: number,
  threshold: number,
): boolean {
  return Math.abs(dx) >= threshold || Math.abs(velocity) > 0.6
}

/** Vertical dismiss is only allowed "outward": up for top-anchored, down for bottom. */
export function verticalDismissAllowed(dy: number, topAnchored: boolean): boolean {
  return topAnchored ? dy < 0 : dy > 0
}

interface Dims {
  pw: number
  bw: number
  th: number
}

/** Per-component linear interpolation of the three blob dimensions (pill→blob). */
export function lerpDims(a: Dims, b: Dims, t: number): Dims {
  return {
    pw: a.pw + (b.pw - a.pw) * t,
    bw: a.bw + (b.bw - a.bw) * t,
    th: a.th + (b.th - a.th) * t,
  }
}

/**
 * The morphing pill → blob toast. Ported from React `GooeyToast.tsx`.
 *
 * Per-frame animation data lives in plain fields (not signals) and is written
 * straight to the SVG path, exactly as the React refs did — this avoids change
 * detection churn at 60fps. Reactive state uses signals; each React `useEffect`
 * maps to an `effect()` whose tracked reads (outside `untracked`) are its deps.
 */
@Component({
  selector: 'gooey-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, GooeyIconComponent],
  host: {
    '(mouseenter)': 'onMouseEnter()',
    '(mouseleave)': 'onMouseLeave()',
    // Keyboard focus pauses auto-dismiss like hover does (WCAG 2.2.1) — a user
    // tabbing to the action/close button must not have the toast vanish.
    '(focusin)': 'onMouseEnter()',
    '(focusout)': 'onMouseLeave()',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerUp($event)',
    '(pointercancel)': 'onPointerUp($event)',
    '[class.merge]': 'mergeMode()',
  },
  template: `
    <div
      #wrapper
      class="wrapper"
      [class]="cn()?.wrapper"
      [class.pos-center]="isCenter()"
      [class.pos-right]="isRight() && !isCenter()"
      [attr.data-theme]="theme()"
    >
      <svg #blobSvg class="blob" aria-hidden="true">
        <path
          #path
          [attr.fill]="fillColor()"
          [attr.stroke]="borderColor() || 'none'"
          [attr.stroke-width]="borderColor() ? (borderWidth() ?? 1.5) : 0"
        ></path>
      </svg>

      @if (showCloseButton() && effectivePhase() !== 'loading') {
        <button
          class="close"
          [class.close-right]="closeOnRight()"
          type="button"
          aria-label="Close toast"
          [style.background]="fillColor()"
          [style.border-color]="borderColor() || 'transparent'"
          [style.border-width.px]="borderColor() ? (borderWidth() ?? 1.5) : 0"
          [style.box-shadow]="borderColor() ? 'none' : '0 1px 4px rgba(0,0,0,0.2)'"
          (click)="onCloseClick($event)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      }

      <div
        #content
        class="content"
        [class]="cn()?.content"
        [class.content-mirror]="isRight() && !isCenter()"
        [class.ta-center]="isCenter()"
        [class.ta-right]="isRight() && !isCenter()"
        [class.expanded]="showBody()"
      >
        <div
          #header
          class="header"
          [class]="cn()?.header"
          [attr.data-phase]="effectivePhase()"
        >
          <span #iconEl class="icon" [class]="cn()?.icon">
            @if (customIcon(); as ci) {
              @if (isString(ci)) {
                {{ ci }}
              } @else {
                <ng-container [ngTemplateOutlet]="$any(ci)" />
              }
            } @else {
              <gooey-icon [kind]="iconKind()" [size]="18" />
            }
          </span>
          <span class="title" [class]="cn()?.title">{{ effectiveTitle() }}</span>
          @if (count() > 1) {
            <span class="count-badge" aria-hidden="true">×{{ count() }}</span>
          }
          @if (
            !hasDescription() &&
            !hasAction() &&
            !actionSuccess() &&
            effectiveShowTimestamp()
          ) {
            <span class="timestamp">{{ timestamp() }}</span>
          }
        </div>

        @if (showBody() && hasDescription()) {
          <div class="description" [class]="cn()?.description">
            <div class="description-row">
              <div class="description-body">
                @if (isString(effectiveDescription())) {
                  {{ effectiveDescription() }}
                } @else if (richHtml() !== null) {
                  <div class="rich-content" [innerHTML]="richHtml()"></div>
                } @else {
                  <ng-container [ngTemplateOutlet]="$any(effectiveDescription())" />
                }
              </div>
              @if (effectiveShowTimestamp()) {
                <span class="timestamp">{{ timestamp() }}</span>
              }
            </div>
          </div>
        }

        @if (
          showBody() &&
          !hasDescription() &&
          hasAction() &&
          effectiveShowTimestamp()
        ) {
          <div class="timestamp timestamp-line">{{ timestamp() }}</div>
        }

        @if (showBody() && hasAction() && effectiveAction()) {
          <div class="action" [class]="cn()?.actionWrapper">
            <button
              class="action-btn"
              [class]="cn()?.actionButton"
              type="button"
              [attr.data-phase]="effectivePhase()"
              [attr.aria-label]="effectiveAction()!.label"
              (click)="onActionClick()"
            >
              {{ effectiveAction()!.label }}
            </button>
          </div>
        }

        @if (showProgress()) {
          <div
            class="progress"
            [class.paused]="hovered() || containerHovered()"
            [style.opacity]="showBody() && !actionSuccess() ? 1 : 0"
          >
            <div
              class="progress-bar"
              [attr.data-phase]="effectivePhase()"
              [style.--gooey-progress-duration]="progressDurationStr()"
            ></div>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './gooey-toast.component.css',
})
export class GooeyToastComponent implements OnDestroy {
  private readonly service = inject(GooeyToastService)
  private readonly sanitizer = inject(DomSanitizer)

  /** The live entry this component renders. */
  readonly entry = input.required<GooeyToastEntry>()

  // --- DOM refs ------------------------------------------------------------
  private readonly wrapperRef = viewChild<ElementRef<HTMLDivElement>>('wrapper')
  private readonly pathRef = viewChild<ElementRef<SVGPathElement>>('path')
  private readonly blobSvgRef = viewChild<ElementRef<SVGSVGElement>>('blobSvg')
  private readonly headerRef = viewChild<ElementRef<HTMLDivElement>>('header')
  private readonly iconRef = viewChild<ElementRef<HTMLElement>>('iconEl')
  private readonly contentRef = viewChild<ElementRef<HTMLDivElement>>('content')

  // --- Entry-derived reactive state ---------------------------------------
  private readonly title = computed(() => this.entry().title())
  private readonly phase = computed(() => this.entry().phase())
  private readonly description = computed(() => this.entry().description())
  private readonly action = computed(() => this.entry().action())
  readonly customIconRaw = computed(() => this.entry().icon())
  private readonly entryShowTimestamp = computed(() => this.entry().showTimestamp())
  readonly count = computed(() => this.entry().count())

  // --- Metaball merge: let the toaster clone this toast's blob ------------
  readonly mergeMode = computed(() => this.service.mergeBlobs())
  readonly id = computed(() => this.entry().id)
  /** The live SVG path element this toast draws its blob into. */
  blobPathEl(): SVGPathElement | null {
    return this.pathRef()?.nativeElement ?? null
  }
  /** The local blob `<svg>`; its `getScreenCTM()` maps blob-space → viewport. */
  blobSvgEl(): SVGSVGElement | null {
    return this.blobSvgRef()?.nativeElement ?? null
  }

  // --- Local state ---------------------------------------------------------
  readonly showBody = signal(false)
  readonly dismissing = signal(false)
  readonly actionSuccess = signal<string | null>(null)
  readonly hovered = signal(false)
  readonly swipeOffset = signal(0)
  private readonly dims = signal<Dims>(
    { pw: 0, bw: 0, th: 0 },
    // Value equality: identical measurements must not re-trigger E3, otherwise
    // the ResizeObserver → measure → flush cycle feeds back on itself (jitter).
    // Mirrors the React reference, whose dims effect keys on primitive deps.
    { equal: (a, b) => a.pw === b.pw && a.bw === b.bw && a.th === b.th },
  )

  // --- Global config (read from service) ----------------------------------
  readonly theme = computed(() => this.service.theme())
  readonly containerHovered = computed(() => this.service.containerHovered())
  private readonly position = computed(() => this.service.position())
  private readonly topAnchored = computed(() => this.position().startsWith('top'))
  private readonly dir = computed(() => this.service.dir())
  readonly isCenter = computed(() => this.position().includes('center'))
  private readonly posIsRight = computed(() => this.position().includes('right'))
  readonly isRight = computed(() =>
    this.dir() === 'rtl'
      ? this.isCenter()
        ? false
        : !this.posIsRight()
      : this.posIsRight(),
  )
  readonly showProgress = computed(
    () => this.entry().showProgress ?? this.service.showProgress(),
  )
  private readonly closeButtonSetting = computed(() => this.service.closeButton())
  readonly showCloseButton = computed(() => this.closeButtonSetting() !== false)
  readonly closeOnRight = computed(() =>
    this.isRight()
      ? this.closeButtonSetting() !== 'top-right'
      : this.closeButtonSetting() === 'top-right',
  )

  // Resolved animation prefs: explicit per-toast > preset > global
  private readonly useSpring = computed(() => {
    const e = this.entry()
    const preset = e.preset ? PRESETS[e.preset] : undefined
    return e.spring ?? preset?.spring ?? this.service.spring()
  })
  private readonly bounceVal = computed(() => {
    const e = this.entry()
    const preset = e.preset ? PRESETS[e.preset] : undefined
    return e.bounce ?? preset?.bounce ?? this.service.bounce() ?? 0.4
  })
  /** Preset-driven speed multiplier for resize/squish (cosmetic only). */
  private readonly durScale = computed(() => {
    const e = this.entry()
    return e.preset ? PRESETS[e.preset].durationScale : 1
  })

  // --- Effective values (action-success overrides) ------------------------
  readonly actionSuccessActive = computed(() => this.actionSuccess() !== null)
  readonly effectiveTitle = computed(() => this.actionSuccess() ?? this.title())
  readonly effectivePhase = computed<GooeyToastPhase>(() =>
    this.actionSuccess() ? 'success' : this.phase(),
  )
  readonly effectiveDescription = computed<GooeyContent | undefined>(() =>
    this.actionSuccess() ? undefined : this.description(),
  )
  /** Sanitized HTML for an inline rich description, or null if not rich. */
  readonly richHtml = computed<string | null>(() => {
    const d = this.effectiveDescription()
    if (!isRichContent(d)) return null
    const raw = 'markdown' in d ? renderMarkdown(d.markdown) : d.html
    return this.sanitizer.sanitize(SecurityContext.HTML, raw) ?? ''
  })
  readonly effectiveAction = computed<GooeyToastAction | undefined>(() =>
    this.actionSuccess() ? undefined : this.action(),
  )
  readonly customIcon = computed<GooeyContent | undefined>(() =>
    this.actionSuccess() ? undefined : this.customIconRaw(),
  )
  private readonly isLoading = computed(() => this.effectivePhase() === 'loading')
  readonly hasDescription = computed(() => Boolean(this.effectiveDescription()))
  readonly hasAction = computed(() => Boolean(this.effectiveAction()))
  readonly isExpanded = computed(
    () => (this.hasDescription() || this.hasAction()) && !this.dismissing(),
  )
  readonly effectiveShowTimestamp = computed(() => this.entryShowTimestamp())

  /** Consumer-supplied extra classes per slot (static config on the entry). */
  readonly cn = computed(() => this.entry().classNames)

  readonly fillColor = computed(
    () => this.entry().fillColor ?? (this.theme() === 'dark' ? '#1a1a1a' : '#ffffff'),
  )
  readonly borderColor = computed(() => this.entry().borderColor)
  readonly borderWidth = computed(() => this.entry().borderWidth)

  readonly iconKind = computed<GooeyIconKind>(() =>
    this.isLoading() ? 'spinner' : (this.effectivePhase() as GooeyIconKind),
  )
  private readonly progressDelay = signal(0)
  readonly progressDurationMs = computed(() => {
    // entry.duration already unifies timing.displayDuration ?? duration ?? default.
    const d = this.entry().duration
    return this.progressDelay() || (Number.isFinite(d) ? d : DEFAULT_DISPLAY_DURATION)
  })
  readonly progressDurationStr = computed(() => `${this.progressDurationMs()}ms`)

  readonly timestamp = computed(() => formatTime(this.entry().createdAt))
  readonly isString = (v: unknown): v is string => typeof v === 'string'

  // --- Per-frame / imperative fields (the React refs) ---------------------
  private morphT = 0
  private aDims: Dims = { pw: 0, bw: 0, th: 0 }
  private dimsRef: Dims = { pw: 0, bw: 0, th: 0 }
  private expandedDims: Dims = { pw: 0, bw: 0, th: 0 }
  private morphCtrl: AnimationController | null = null
  private pillResizeCtrl: AnimationController | null = null
  private headerSquishCtrl: AnimationController | null = null
  private blobSquishCtrl: AnimationController | null = null
  private shakeCtrl: AnimationController | null = null
  private iconPopCtrl: AnimationController | null = null
  private hoveredRef = false
  private collapsing = false
  private preDismiss = false
  private reExpanding = false
  private collapseEndTime = 0
  private lastSquishTime = 0
  private mountSquished = false
  private prevShowBody = false
  private headerSquished = false
  private prevPhase: GooeyToastPhase = 'default'
  private remaining: number | null = null
  private timerStart = 0
  private dismissTimer: ReturnType<typeof setTimeout> | null = null
  private leaveTimer: ReturnType<typeof setTimeout> | null = null
  private actionSuccessTimer: ReturnType<typeof setTimeout> | null = null
  private simpleTimer: ReturnType<typeof setTimeout> | null = null
  private simpleRemaining: number | null = null
  private simpleStart = 0
  private swipeStart: { x: number; y: number } | null = null
  private isSwiping = false
  private swipeAxis: 'x' | 'y' | null = null
  private activePointer: number | null = null
  private swipeSamples: { d: number; t: number }[] = []
  private swipeCtrl: AnimationController | null = null
  private resizeObs: ResizeObserver | null = null
  private leaving = false
  /** Static horizontal content padding (fixed in CSS) — read once, then reused. */
  private contentPadX: number | null = null

  private readonly prefersReducedMotion = signal(false)

  private phaseInitialized = false
  private pulseInitialized = false

  constructor() {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
      this.prefersReducedMotion.set(mql.matches)
      const onMotionChange = (e: MediaQueryListEvent) =>
        this.prefersReducedMotion.set(e.matches)
      mql.addEventListener('change', onMotionChange)
      inject(DestroyRef).onDestroy(() => mql.removeEventListener('change', onMotionChange))
    }

    afterNextRender(() => {
      this.measure()
      const content = this.contentRef()?.nativeElement
      if (content) {
        this.resizeObs = new ResizeObserver(() => this.measure())
        this.resizeObs.observe(content)
      }
    })

    this.registerEffects()
  }

  // ----------------------------------------------------------------- effects
  private registerEffects(): void {
    // E1: measure on content-affecting prop changes
    effect(() => {
      this.effectiveTitle()
      this.effectivePhase()
      this.isExpanded()
      this.showBody()
      this.effectiveDescription()
      this.effectiveAction()
      // Count badge changes header width; content is width-locked in pill state
      // so the ResizeObserver can't see it — remeasure explicitly on a coalesce.
      this.count()
      untracked(() => {
        this.measure()
        this.schedule(() => this.measure(), 100) // catch-up after paint
      })
    })

    // E3: dims change → pill resize (compact) or direct update (expanded)
    effect(() => {
      const d = this.dims()
      this.showBody()
      untracked(() => this.onDimsChange(d))
    })

    // E4: entry landing squish for simple toasts (no body). Mirrors the React
    // mount-squish effect — fires once when dims first become valid.
    effect(() => {
      const d = this.dims()
      const hasDims = d.pw > 0 && d.bw > 0 && d.th > 0
      untracked(() => {
        if (hasDims && !this.mountSquished && !this.isExpanded()) {
          this.mountSquished = true
          this.schedule(() => this.triggerLandingSquish('mount'), 45)
        }
      })
    })

    // E5: squish on expand (showBody false → true)
    effect(() => {
      const sb = this.showBody()
      untracked(() => {
        if (!this.prevShowBody && sb && !this.hoveredRef) {
          this.schedule(() => this.triggerLandingSquish('expand'), 80)
        }
        this.prevShowBody = sb
      })
    })

    // E6: error shake on phase → error
    effect(() => {
      const phase = this.phase()
      untracked(() => this.onPhaseChange(phase))
    })

    // E7: expand (delay showBody) or collapse (reverse morph)
    effect(() => {
      const expanded = this.isExpanded()
      untracked(() => this.onExpandedChange(expanded))
    })

    // E8: pre-dismiss collapse timer (expanded), with hover pause
    effect(() => {
      const showBody = this.showBody()
      const actionSuccess = this.actionSuccess()
      const dismissing = this.dismissing()
      const hovered = this.hovered()
      const containerHovered = this.containerHovered()
      untracked(() =>
        this.armPreDismiss(showBody, actionSuccess, dismissing, hovered, containerHovered),
      )
    })

    // E9: re-expand on hover while collapsing
    effect(() => {
      const hovered = this.hovered()
      const containerHovered = this.containerHovered()
      const dismissing = this.dismissing()
      untracked(() => this.maybeReExpand(hovered, containerHovered, dismissing))
    })

    // E10: leave after collapse completes (auto dismiss)
    effect(() => {
      const dismissing = this.dismissing()
      const showBody = this.showBody()
      untracked(() => this.armLeaveAfterCollapse(dismissing, showBody))
    })

    // E11: leave after action-success morph-back
    effect(() => {
      const actionSuccess = this.actionSuccess()
      const showBody = this.showBody()
      untracked(() => this.armLeaveAfterActionSuccess(actionSuccess, showBody))
    })

    // E12: morph pill → blob
    effect(() => {
      const showBody = this.showBody()
      untracked(() => this.onShowBodyMorph(showBody))
    })

    // E13: header elastic squish
    effect(() => {
      const showBody = this.showBody()
      const dismissing = this.dismissing()
      const actionSuccess = this.actionSuccess()
      untracked(() => this.onHeaderSquish(showBody, dismissing, actionSuccess))
    })

    // E14: simple-toast auto-dismiss timer (no body), with hover pause
    effect(() => {
      const isExpanded = this.isExpanded()
      const phase = this.effectivePhase()
      const actionSuccess = this.actionSuccess()
      const hovered = this.hovered()
      const containerHovered = this.containerHovered()
      untracked(() =>
        this.armSimpleDismiss(isExpanded, phase, actionSuccess, hovered, containerHovered),
      )
    })

    // E15: external dismiss request
    effect(() => {
      const reason = this.entry().exitRequest()
      untracked(() => {
        if (reason) this.leave(reason)
      })
    })

    // Apply base wrapper transform when mirror state changes
    effect(() => {
      this.isRight()
      this.isCenter()
      untracked(() => this.applyWrapperTransform())
    })

    // E16: duplicate coalesced → pulse the blob + restart the auto-dismiss timer.
    effect(() => {
      const p = this.entry().pulse()
      untracked(() => {
        if (!this.pulseInitialized) {
          this.pulseInitialized = true
          return
        }
        if (this.leaving) return
        this.pulseBlob()
        this.restartDismissTimer()
        // The count badge is inserted this tick; remeasure next frame (once it's
        // painted) so the blob grows to enclose it instead of letting it spill
        // past the edge until the slower catch-up measure runs.
        requestAnimationFrame(() => this.measure())
      })
    })
  }

  /**
   * Subtle uniform "boop" when a duplicate coalesces. Unlike the landing squish
   * (anchored center-top with an asymmetric stretch, tuned for a small pill),
   * this scales uniformly from the centre so an already-expanded blob doesn't
   * jut its edges out for a frame.
   */
  private pulseBlob(): void {
    const wrapper = this.wrapperRef()?.nativeElement
    if (!wrapper || this.prefersReducedMotion() || !this.useSpring()) return
    this.blobSquishCtrl?.stop()
    this.blobSquishCtrl = animate(0, 1, {
      ...squishSpring(0.45, 0.45, this.bounceVal()),
      onUpdate: (v) => {
        const s = 1 + 0.04 * Math.sin(v * Math.PI)
        wrapper.style.transformOrigin = 'center center'
        this.applyWrapperTransform(`scale(${s})`)
      },
      onComplete: () => {
        this.applyWrapperTransform()
        wrapper.style.transformOrigin = ''
      },
    })
  }

  /** Re-arm the active auto-dismiss timer from scratch (used on coalesce). */
  private restartDismissTimer(): void {
    this.remaining = null
    this.simpleRemaining = null
    this.armSimpleDismiss(
      this.isExpanded(),
      this.effectivePhase(),
      this.actionSuccess(),
      this.hovered(),
      this.containerHovered(),
    )
    this.armPreDismiss(
      this.showBody(),
      this.actionSuccess(),
      this.dismissing(),
      this.hovered(),
      this.containerHovered(),
    )
  }

  // ------------------------------------------------------------- DOM helpers
  /** Push current animated state to the SVG path + constrain wrapper/content. */
  private flush(): void {
    const { pw: p, bw: b, th: h } = this.aDims
    if (p <= 0 || b <= 0 || h <= 0) return
    const t = Math.max(0, Math.min(1, this.morphT))
    const path = this.pathRef()?.nativeElement
    const wrapper = this.wrapperRef()?.nativeElement
    const content = this.contentRef()?.nativeElement
    const centerPos = untracked(() => this.isCenter())
    const rightSide = untracked(() => this.isRight() && !this.isCenter())

    // Height: pass the FULL target height — morphPath scales it by `t` itself.
    // (Using the animated aDims.th would apply `t` twice → blob grows as t²,
    // lagging the linear content reveal and letting the body text spill out.)
    const fullTh = this.dimsRef.th
    if (centerPos) {
      const centerBw = Math.max(this.dimsRef.bw, this.expandedDims.bw, p)
      path?.setAttribute('d', morphPathCenter(p, centerBw, fullTh, t))
    } else {
      path?.setAttribute('d', morphPath(p, b, fullTh, t))
    }

    if (t >= 1) {
      if (wrapper) wrapper.style.width = ''
      if (content) {
        content.style.width = ''
        content.style.overflow = ''
        content.style.maxHeight = ''
        content.style.clipPath = ''
      }
    } else if (t > 0) {
      const targetBw = this.dimsRef.bw
      const targetTh = this.dimsRef.th
      const pillW = Math.min(p, b)
      const currentW = pillW + (b - pillW) * t
      const currentH = PH + (targetTh - PH) * t
      const centerFullW = centerPos
        ? Math.max(this.dimsRef.bw, this.expandedDims.bw, p)
        : 0
      if (wrapper) wrapper.style.width = (centerPos ? centerFullW : currentW) + 'px'
      if (content) {
        content.style.width = (centerPos ? centerFullW : targetBw) + 'px'
        content.style.overflow = 'hidden'
        content.style.maxHeight = currentH + 'px'
        if (centerPos) {
          const clip = (centerFullW - currentW) / 2
          content.style.clipPath = `inset(0 ${clip}px 0 ${clip}px)`
        } else {
          const clip = targetBw - currentW
          content.style.clipPath = rightSide
            ? `inset(0 0 0 ${clip}px)`
            : `inset(0 ${clip}px 0 0)`
        }
      }
    } else {
      const pillW = Math.min(p, b)
      if (wrapper) {
        const centerBw = centerPos
          ? Math.max(this.dimsRef.bw, this.expandedDims.bw, p)
          : pillW
        wrapper.style.width = centerBw + 'px'
      }
      if (content) {
        if (centerPos) {
          const centerBwVal = Math.max(this.dimsRef.bw, this.expandedDims.bw, p)
          content.style.width = centerBwVal + 'px'
          const clip = (centerBwVal - pillW) / 2
          content.style.clipPath = `inset(0 ${clip}px 0 ${clip}px)`
        } else {
          // Constrain to the (animating) pill width so a longer updated title
          // is revealed by the growing pill instead of spilling past the blob.
          content.style.width = pillW + 'px'
          content.style.clipPath = ''
        }
        content.style.overflow = 'hidden'
        content.style.maxHeight = PH + 'px'
      }
    }
  }

  /** Measure natural content dimensions (clear constraints first). */
  private measure(): void {
    const header = this.headerRef()?.nativeElement
    const content = this.contentRef()?.nativeElement
    const wrapper = this.wrapperRef()?.nativeElement
    if (!header || !content) return

    const savedW = wrapper?.style.width ?? ''
    const savedOv = content.style.overflow
    const savedMH = content.style.maxHeight
    const savedCW = content.style.width
    if (wrapper) wrapper.style.width = ''
    content.style.overflow = ''
    content.style.maxHeight = ''
    content.style.width = ''

    if (this.contentPadX == null) {
      const cs = getComputedStyle(content)
      this.contentPadX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
    }
    const paddingX = this.contentPadX
    const pw = header.offsetWidth + paddingX
    const bw = content.offsetWidth
    const th = content.offsetHeight

    if (wrapper) wrapper.style.width = savedW
    content.style.overflow = savedOv
    content.style.maxHeight = savedMH
    content.style.width = savedCW

    this.dimsRef = { pw, bw, th }
    this.dims.set({ pw, bw, th })
  }

  private applyWrapperTransform(extra = ''): void {
    const wrapper = this.wrapperRef()?.nativeElement
    if (!wrapper) return
    const mirror = untracked(() => this.isRight() && !this.isCenter())
    const base = mirror ? 'scaleX(-1)' : ''
    wrapper.style.transform = `${base} ${extra}`.trim()
  }

  // ----------------------------------------------------------- E3: dims change
  private onDimsChange(target: Dims): void {
    const hasDims = target.pw > 0 && target.bw > 0 && target.th > 0
    if (!hasDims || this.collapsing) return

    const prev = { ...this.aDims }

    if (prev.bw <= 0) {
      this.aDims = { ...target }
      this.flush()
      return
    }
    if (this.morphT > 0 && this.morphT < 1) {
      this.aDims = { ...target }
      this.flush()
      return
    }
    if (this.showBody()) {
      this.aDims = { ...target }
      this.flush()
      return
    }
    if (prev.bw === target.bw && prev.pw === target.pw && prev.th === target.th) return

    if (this.prefersReducedMotion()) {
      this.aDims = { ...target }
      this.flush()
      return
    }

    this.pillResizeCtrl?.stop()
    if (Date.now() - this.collapseEndTime > 500 && !this.isExpanded()) {
      this.triggerLandingSquish('expand')
    }
    const useSpring = this.useSpring()
    const bounce = this.bounceVal()
    const s = this.durScale()
    this.pillResizeCtrl = animate(0, 1, {
      ...(useSpring
        ? { type: 'spring', duration: 0.5 * s, bounce: bounce * 0.875 }
        : { duration: 0.4 * s, ease: SMOOTH_EASE }),
      onUpdate: (t) => {
        this.aDims = lerpDims(prev, target, t)
        this.flush()
      },
    })
  }

  // -------------------------------------------------- landing / header squish
  private triggerLandingSquish(phase: 'expand' | 'collapse' | 'mount' = 'mount'): void {
    const wrapper = this.wrapperRef()?.nativeElement
    if (!wrapper || this.prefersReducedMotion() || !this.useSpring()) return
    const now = Date.now()
    if (now - this.lastSquishTime < 300) return
    this.lastSquishTime = now
    this.blobSquishCtrl?.stop()

    const bounce = this.bounceVal()
    const s = this.durScale()
    const springConfig =
      phase === 'collapse'
        ? squishSpring(DEFAULT_COLLAPSE_DUR * s, DEFAULT_COLLAPSE_DUR * s, bounce)
        : squishSpring(DEFAULT_EXPAND_DUR * s, DEFAULT_EXPAND_DUR * s, bounce)
    const bScale = bounce / 0.4
    const compressY = (phase === 'collapse' ? 0.035 : 0.12) * bScale
    const expandX = (phase === 'collapse' ? 0.018 : 0.06) * bScale

    this.blobSquishCtrl = animate(0, 1, {
      ...springConfig,
      onUpdate: (v) => {
        const intensity = Math.sin(v * Math.PI)
        const sy = 1 - compressY * intensity
        const sx = 1 + expandX * intensity
        wrapper.style.transformOrigin = 'center top'
        this.applyWrapperTransform(`scaleX(${sx}) scaleY(${sy})`)
      },
      onComplete: () => {
        this.applyWrapperTransform()
        wrapper.style.transformOrigin = ''
      },
    })
  }

  private onHeaderSquish(
    showBody: boolean,
    dismissing: boolean,
    actionSuccess: string | null,
  ): void {
    const header = this.headerRef()?.nativeElement
    if (!header || this.prefersReducedMotion()) return
    this.headerSquishCtrl?.stop()
    const bounce = this.bounceVal()
    const useSpring = this.useSpring()
    const s = this.durScale()

    if (showBody && !dismissing && !actionSuccess) {
      if (!useSpring) return
      this.headerSquished = true
      this.headerSquishCtrl = animate(0, 1, {
        ...squishSpring(DEFAULT_EXPAND_DUR * s, DEFAULT_EXPAND_DUR * s, bounce),
        onUpdate: (v) => {
          header.style.transform = `scale(${1 - 0.05 * v}) translateY(${v}px)`
        },
      })
    } else if (this.headerSquished) {
      this.headerSquished = false
      const isSpringCollapse = !this.preDismiss && useSpring
      const transition = isSpringCollapse
        ? squishSpring(DEFAULT_COLLAPSE_DUR * s, DEFAULT_COLLAPSE_DUR * s, bounce)
        : { duration: DEFAULT_COLLAPSE_DUR * 0.5, ease: SMOOTH_EASE }
      this.headerSquishCtrl = animate(1, 0, {
        ...transition,
        onUpdate: (v) => {
          header.style.transform = `scale(${1 - 0.05 * v}) translateY(${v}px)`
        },
        onComplete: () => {
          header.style.transform = ''
        },
      })
    }
  }

  // -------------------------------------------- E6: type-change morph + shake
  private onPhaseChange(phase: GooeyToastPhase): void {
    // First run just records the initial phase — no animation on mount.
    if (!this.phaseInitialized) {
      this.phaseInitialized = true
      this.prevPhase = phase
      return
    }
    const changed = phase !== this.prevPhase
    const wrapper = this.wrapperRef()?.nativeElement
    if (
      phase === 'error' &&
      this.prevPhase !== 'error' &&
      !this.dismissing() &&
      wrapper &&
      !this.prefersReducedMotion()
    ) {
      // →error keeps its distinctive shake.
      this.shakeCtrl?.stop()
      this.shakeCtrl = animate(0, 1, {
        duration: 0.4,
        ease: 'easeOut',
        onUpdate: (v) => {
          const decay = 1 - v
          const shake = Math.sin(v * Math.PI * 6) * decay * 3
          this.applyWrapperTransform(`translateX(${shake}px)`)
        },
        onComplete: () => this.applyWrapperTransform(),
      })
    } else if (changed && !this.dismissing() && phase !== 'loading') {
      // Other type changes get a gooey squish ripple (color tweens via CSS).
      this.triggerLandingSquish('mount')
    }

    // Icon pops in on any type change (the accent color glides via CSS).
    if (changed) this.popIcon()

    this.prevPhase = phase
  }

  /** Spring the phase icon in when the toast morphs to a new type. */
  private popIcon(): void {
    const el = this.iconRef()?.nativeElement
    if (!el || this.prefersReducedMotion() || !this.useSpring()) return
    this.iconPopCtrl?.stop()
    this.iconPopCtrl = animate(0, 1, {
      ...squishSpring(0.45, 0.45, this.bounceVal()),
      onUpdate: (v) => {
        el.style.transform = `scale(${0.6 + 0.4 * v})`
      },
      onComplete: () => {
        el.style.transform = ''
      },
    })
  }

  // ------------------------------------------- E7: expand delay / collapse morph
  private onExpandedChange(isExpanded: boolean): void {
    if (isExpanded) {
      const delay = this.prefersReducedMotion() ? 0 : 330
      this.schedule(() => this.showBody.set(true), delay)
      return
    }

    this.morphCtrl?.stop()
    this.pillResizeCtrl?.stop()

    if (this.morphT > 0) {
      const content = this.contentRef()?.nativeElement
      const header = this.headerRef()?.nativeElement
      const cs = content ? getComputedStyle(content) : null
      const padX = cs ? parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) : 20
      const targetPw = header ? header.offsetWidth + padX : this.aDims.pw
      const targetDims: Dims = { pw: targetPw, bw: targetPw, th: PH }

      if (this.prefersReducedMotion()) {
        this.morphT = 0
        this.collapsing = false
        this.preDismiss = false
        this.showBody.set(false)
        this.aDims = { ...targetDims }
        this.flush()
        return
      }

      const savedDims =
        this.expandedDims.bw > 0 ? { ...this.expandedDims } : { ...this.aDims }
      const isPreDismiss = this.preDismiss
      const useSpring = this.useSpring()
      const bounce = this.bounceVal()
      const collapseTransition =
        isPreDismiss || !useSpring
          ? { duration: DEFAULT_COLLAPSE_DUR, ease: SMOOTH_EASE }
          : ({ type: 'spring', duration: DEFAULT_COLLAPSE_DUR, bounce: bounce * 0.875 } as const)

      this.triggerLandingSquish('collapse')

      this.morphCtrl = animate(this.morphT, 0, {
        ...collapseTransition,
        onUpdate: (t) => {
          this.morphT = t
          this.aDims = lerpDims(targetDims, savedDims, t)
          this.flush()
        },
        onComplete: () => {
          this.morphT = 0
          this.collapsing = false
          this.preDismiss = false
          this.collapseEndTime = Date.now()
          this.aDims = { ...targetDims }
          this.flush()
          this.showBody.set(false)
        },
      })
      return
    }

    this.showBody.set(false)
    this.morphT = 0
    this.flush()
  }

  // ----------------------------------------------- E8: pre-dismiss collapse timer
  private armPreDismiss(
    showBody: boolean,
    actionSuccess: string | null,
    dismissing: boolean,
    hovered: boolean,
    containerHovered: boolean,
  ): void {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer)
      this.dismissTimer = null
    }
    if (!showBody || actionSuccess || dismissing) return

    // entry.duration unifies timing.displayDuration ?? duration ?? default —
    // previously only timing was read here, so `duration` was ignored for
    // expanded toasts. Infinity = sticky: never arm the collapse timer.
    const displayMs = this.entry().duration
    if (!Number.isFinite(displayMs)) return
    const expandDelayMs = this.prefersReducedMotion() ? 0 : 330
    const collapseMs = this.prefersReducedMotion() ? 10 : DEFAULT_COLLAPSE_DUR * 1000
    const fullDelay = displayMs - expandDelayMs - collapseMs
    this.progressDelay.set(Math.max(fullDelay, 0))
    if (fullDelay <= 0) return
    if (hovered || containerHovered || this.hoveredRef) return

    const delay = this.remaining ?? fullDelay
    this.timerStart = Date.now()
    this.dismissTimer = setTimeout(() => {
      if (this.hoveredRef || this.containerHovered()) {
        const elapsed = Date.now() - this.timerStart
        this.remaining = Math.max(0, delay - elapsed)
        return
      }
      this.remaining = null
      this.expandedDims = { ...this.aDims }
      this.collapsing = true
      this.preDismiss = true
      this.dismissing.set(true)
    }, delay)
  }

  // ------------------------------------------------------- E9: re-expand on hover
  private maybeReExpand(
    hovered: boolean,
    containerHovered: boolean,
    dismissing: boolean,
  ): void {
    const canExpand = this.hasDescription() || this.hasAction()
    if ((!hovered && !containerHovered) || !canExpand || !dismissing) return

    this.morphCtrl?.stop()
    this.collapsing = false
    this.preDismiss = false
    this.remaining = null
    this.reExpanding = true
    this.dismissing.set(false)
    this.showBody.set(true)

    const currentT = this.morphT
    const startDims = { ...this.aDims }
    const useSpring = this.useSpring()
    const bounce = this.bounceVal()
    const transition = useSpring
      ? ({ type: 'spring', duration: 0.9, bounce } as const)
      : { duration: 0.6, ease: SMOOTH_EASE }

    requestAnimationFrame(() => {
      this.morphCtrl = animate(currentT, 1, {
        ...transition,
        onUpdate: (t) => {
          this.morphT = t
          const target = this.dimsRef
          this.aDims = lerpDims(startDims, target, t)
          this.flush()
        },
        onComplete: () => {
          this.morphT = 1
          this.aDims = { ...this.dimsRef }
          this.reExpanding = false
          this.flush()
        },
      })
    })
  }

  // ----------------------------------------------- E10: leave after collapse
  private armLeaveAfterCollapse(dismissing: boolean, showBody: boolean): void {
    if (this.leaveTimer) {
      clearTimeout(this.leaveTimer)
      this.leaveTimer = null
    }
    if (!dismissing || showBody) return
    this.leaveTimer = setTimeout(() => {
      if (!this.hoveredRef && !this.containerHovered()) {
        this.leave('auto')
      }
    }, 800)
  }

  // ------------------------------------------- E11: leave after action success
  private armLeaveAfterActionSuccess(actionSuccess: string | null, showBody: boolean): void {
    if (this.actionSuccessTimer) {
      clearTimeout(this.actionSuccessTimer)
      this.actionSuccessTimer = null
    }
    if (!actionSuccess || showBody) return
    this.actionSuccessTimer = setTimeout(() => this.leave('auto'), 1200)
  }

  // ------------------------------------------------------ E12: morph pill → blob
  private onShowBodyMorph(showBody: boolean): void {
    if (this.reExpanding) return
    if (!showBody) {
      this.morphT = 0
      this.morphCtrl?.stop()
      this.flush()
      return
    }
    if (this.prefersReducedMotion()) {
      this.pillResizeCtrl?.stop()
      this.morphCtrl?.stop()
      this.morphT = 1
      this.aDims = { ...this.dimsRef }
      this.flush()
      return
    }

    const useSpring = this.useSpring()
    const bounce = this.bounceVal()
    requestAnimationFrame(() => {
      this.pillResizeCtrl?.stop()
      this.morphCtrl?.stop()
      const startDims = { ...this.aDims }
      const transition = useSpring
        ? ({ type: 'spring', duration: 0.9, bounce } as const)
        : { duration: 0.6, ease: SMOOTH_EASE }
      this.morphCtrl = animate(0, 1, {
        ...transition,
        onUpdate: (t) => {
          this.morphT = t
          const target = this.dimsRef
          this.aDims = lerpDims(startDims, target, t)
          this.flush()
        },
        onComplete: () => {
          this.morphT = 1
          this.aDims = { ...this.dimsRef }
          this.flush()
        },
      })
    })
  }

  // ------------------------------------------------ E14: simple auto-dismiss
  private armSimpleDismiss(
    isExpanded: boolean,
    phase: GooeyToastPhase,
    actionSuccess: string | null,
    hovered: boolean,
    containerHovered: boolean,
  ): void {
    if (this.simpleTimer) {
      clearTimeout(this.simpleTimer)
      this.simpleTimer = null
    }
    if (isExpanded || phase === 'loading' || actionSuccess) return
    const duration = this.entry().duration
    if (!Number.isFinite(duration)) return
    if (hovered || containerHovered || this.hoveredRef) return

    const delay = this.simpleRemaining ?? duration
    this.simpleStart = Date.now()
    this.simpleTimer = setTimeout(() => {
      if (this.hoveredRef || this.containerHovered()) {
        this.simpleRemaining = Math.max(0, delay - (Date.now() - this.simpleStart))
        return
      }
      this.leave('auto')
    }, delay)
  }

  // ----------------------------------------------------------------- leave
  private leave(reason: DismissReason): void {
    if (this.leaving) return
    this.leaving = true
    this.clearTimers()
    this.morphCtrl?.stop()
    this.service.remove(this.entry().id, reason)
  }

  // ------------------------------------------------------------- interactions
  onActionClick(): void {
    const action = this.effectiveAction()
    if (!action) return
    if (action.successLabel) {
      this.expandedDims = { ...this.aDims }
      this.collapsing = true
      this.actionSuccess.set(action.successLabel)
    }
    try {
      action.onClick()
    } catch {
      /* onClick errors shouldn't block morph-back */
    }
  }

  onCloseClick(e: Event): void {
    e.stopPropagation()
    this.leave('manual')
  }

  onMouseEnter(): void {
    this.hoveredRef = true
    this.hovered.set(true)
  }
  onMouseLeave(): void {
    this.hoveredRef = false
    this.hovered.set(false)
  }

  private readonly SWIPE_THRESHOLD = 100
  onPointerDown(e: PointerEvent): void {
    if (!this.service.swipeToDismiss() || !e.isPrimary) return
    this.swipeCtrl?.stop()
    this.swipeStart = { x: e.clientX, y: e.clientY }
    this.swipeSamples = [{ d: 0, t: performance.now() }]
    this.isSwiping = false
    this.swipeAxis = null
    this.activePointer = e.pointerId
  }
  onPointerMove(e: PointerEvent): void {
    if (this.swipeStart == null || e.pointerId !== this.activePointer) return
    const dx = e.clientX - this.swipeStart.x
    const dy = e.clientY - this.swipeStart.y
    if (!this.isSwiping) {
      const adx = Math.abs(dx)
      const ady = Math.abs(dy)
      if (Math.max(adx, ady) <= 10) return
      // Lock the axis to whichever the gesture commits to first.
      this.swipeAxis = ady > adx ? 'y' : 'x'
      this.isSwiping = true
      try {
        ;(e.target as Element).setPointerCapture?.(e.pointerId)
      } catch {
        /* capture is best-effort */
      }
    }
    const d = this.swipeAxis === 'y' ? dy : dx
    this.swipeSamples.push({ d, t: performance.now() })
    if (this.swipeSamples.length > 5) this.swipeSamples.shift()
    this.swipeOffset.set(d)
    this.applySwipeVisual(d)
  }
  onPointerUp(e: PointerEvent): void {
    if (e.pointerId !== this.activePointer) return
    const wasSwiping = this.isSwiping
    const d = this.swipeOffset()
    const axis = this.swipeAxis
    try {
      ;(e.target as Element).releasePointerCapture?.(e.pointerId)
    } catch {
      /* ignore */
    }
    this.activePointer = null
    this.swipeStart = null
    this.isSwiping = false
    // Keep swipeAxis set so the spring/fling still renders the right axis;
    // it's cleared in their onComplete.
    if (!wasSwiping) return

    const v = this.swipeVelocity()
    const dismiss =
      axis === 'y'
        ? verticalDismissAllowed(d, this.topAnchored()) &&
          shouldDismissSwipe(d, v, this.SWIPE_THRESHOLD)
        : shouldDismissSwipe(d, v, this.SWIPE_THRESHOLD)
    if (dismiss) {
      this.flingOff(d, v)
    } else {
      this.springBack(d)
    }
  }

  /** Velocity (px/ms) from the last two move samples; 0 if not enough data. */
  private swipeVelocity(): number {
    const s = this.swipeSamples
    if (s.length < 2) return 0
    const a = s[s.length - 2]
    const b = s[s.length - 1]
    const dt = b.t - a.t
    return dt > 0 ? (b.d - a.d) / dt : 0
  }

  private springBack(d: number): void {
    this.swipeOffset.set(0)
    if (this.prefersReducedMotion()) {
      this.applySwipeVisual(0)
      this.swipeAxis = null
      return
    }
    this.swipeCtrl = animate(d, 0, {
      ...squishSpring(0.5, 0.5, this.bounceVal()),
      onUpdate: (x) => this.applySwipeVisual(x),
      onComplete: () => {
        this.applySwipeVisual(0)
        this.swipeAxis = null
      },
    })
  }

  private flingOff(d: number, velocity: number): void {
    if (this.prefersReducedMotion()) {
      this.leave('manual')
      return
    }
    const vp =
      typeof window !== 'undefined'
        ? this.swipeAxis === 'y'
          ? window.innerHeight
          : window.innerWidth
        : 1000
    const dir = Math.sign(d) || 1
    const dist = Math.min(vp, Math.abs(d) + Math.abs(velocity) * 200 + 300)
    this.swipeCtrl = animate(d, dir * dist, {
      duration: 0.28,
      ease: 'easeOut',
      onUpdate: (x) => this.applySwipeVisual(x),
      onComplete: () => this.leave('manual'),
    })
  }

  private applySwipeVisual(d: number): void {
    const wrapper = this.wrapperRef()?.nativeElement
    if (!wrapper) return
    if (d !== 0) {
      const axis = this.swipeAxis ?? 'x'
      const mirror = this.isRight() && !this.isCenter()
      const inwardY = axis === 'y' && !verticalDismissAllowed(d, this.topAnchored())
      // Inward vertical resists hard (it'll snap back); everything else rubber-bands.
      const moved = inwardY ? d * 0.2 : rubberBand(d, this.SWIPE_THRESHOLD)
      const f = Math.min(Math.abs(d) / (this.SWIPE_THRESHOLD * 1.5), 1)
      let extra: string
      if (axis === 'y') {
        // Stretch along Y; scaleX magnitude is mirror-safe under scaleX(-1).
        extra = `translateY(${moved}px) scaleX(${1 - 0.06 * f}) scaleY(${1 + 0.08 * f})`
      } else {
        // Base transform mirrors right-side toasts with scaleX(-1); pre-negate the
        // translate so the blob follows the finger regardless of side.
        const visTx = mirror ? -moved : moved
        extra = `translateX(${visTx}px) scaleX(${1 + 0.08 * f}) scaleY(${1 - 0.06 * f})`
      }
      wrapper.style.transition = 'none'
      this.applyWrapperTransform(extra)
      wrapper.style.opacity = inwardY
        ? ''
        : String(Math.max(0, 1 - Math.abs(d) / (this.SWIPE_THRESHOLD * 1.5)))
    } else {
      wrapper.style.transition = ''
      wrapper.style.opacity = ''
      this.applyWrapperTransform()
    }
  }

  // ------------------------------------------------------------- teardown
  private timeouts = new Set<ReturnType<typeof setTimeout>>()
  /** setTimeout that self-evicts on fire (the Set only holds pending timers). */
  private schedule(fn: () => void, ms: number): void {
    const t = setTimeout(() => {
      this.timeouts.delete(t)
      fn()
    }, ms)
    this.timeouts.add(t)
  }
  private clearTimers(): void {
    for (const t of this.timeouts) clearTimeout(t)
    this.timeouts.clear()
    if (this.dismissTimer) clearTimeout(this.dismissTimer)
    if (this.leaveTimer) clearTimeout(this.leaveTimer)
    if (this.actionSuccessTimer) clearTimeout(this.actionSuccessTimer)
    if (this.simpleTimer) clearTimeout(this.simpleTimer)
  }

  ngOnDestroy(): void {
    this.clearTimers()
    this.resizeObs?.disconnect()
    this.morphCtrl?.stop()
    this.pillResizeCtrl?.stop()
    this.headerSquishCtrl?.stop()
    this.blobSquishCtrl?.stop()
    this.shakeCtrl?.stop()
    this.swipeCtrl?.stop()
    this.iconPopCtrl?.stop()
  }
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })
}
