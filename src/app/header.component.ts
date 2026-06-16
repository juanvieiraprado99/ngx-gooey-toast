import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  signal,
  viewChild,
} from '@angular/core'
import { NgOptimizedImage } from '@angular/common'
import { httpResource } from '@angular/common/http'
import { RouterLink, RouterLinkActive } from '@angular/router'
import { animate, squishSpring, type AnimationController } from 'ngx-gooey-toast'

interface NavAnchor {
  label: string
  fragment: string
}

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, NgOptimizedImage],
  host: {
    class: 'site-header',
    '[style.--m]': 'morph()',
    '(window:scroll)': 'onScroll()',
  },
  template: `
    <div class="island">
      <a class="logo" routerLink="/" (mouseenter)="squishLogo()">
        <img
          #logoMark
          class="logo-mark"
          ngSrc="ngx-gooey-toast.png"
          width="30"
          height="30"
          priority
          alt=""
        />
        <span class="logo-word">ngx-gooey-toast</span>
      </a>

      <nav class="nav" aria-label="Primary">
        @for (item of anchors; track item.fragment) {
          <a class="link" [routerLink]="['/']" [fragment]="item.fragment">{{ item.label }}</a>
        }
        <a
          class="link"
          routerLink="/changelog"
          routerLinkActive="on"
          ariaCurrentWhenActive="page"
        >Changelog</a>
      </nav>

      <div class="actions">
        <a
          class="btn github"
          href="https://github.com/juanvieiraprado99/ngx-gooey-toast"
          target="_blank"
          rel="noreferrer"
          [attr.aria-label]="
            stars() === null
              ? 'View ngx-gooey-toast on GitHub'
              : 'View ngx-gooey-toast on GitHub (' + stars() + ' stars)'
          "
        >
          <svg class="icon" viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
            <path
              fill="currentColor"
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
            />
          </svg>
          <span class="label">GitHub</span>
          @if (stars() !== null) {
            <span class="stars">
              <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M8 1.2l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.9 4.2 13l.7-4.3-3.1-3 4.3-.6L8 1.2Z"
                />
              </svg>
              {{ starsLabel() }}
            </span>
          }
        </a>

        <a
          class="btn npm"
          href="https://www.npmjs.com/package/ngx-gooey-toast"
          target="_blank"
          rel="noreferrer"
          aria-label="View ngx-gooey-toast on npm"
        >
          <svg class="icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path fill="currentColor" d="M2 2v20h20V2H2zm17 17h-3V6.5h-4V19H5V5h14v14z" />
          </svg>
          <span class="label">npm</span>
        </a>
      </div>
    </div>
  `,
  styles: `
    /* --m: 0 = top (full-width bar) → 1 = floating centered island.
       Driven each frame by the toast spring engine; all chrome interpolates off it. */
    :host {
      --m: 0;
      position: sticky;
      top: 0;
      z-index: 50;
      display: block;
      /* Side + top gap grows with --m so the island detaches from the edges. */
      padding-top: calc(var(--m) * 0.65rem);
      padding-inline: calc(var(--m) * 1rem);
    }
    .island {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      /* 100% → 60rem, centered. */
      max-width: calc(100% - var(--m) * (100% - 60rem));
      margin-inline: auto;
      padding: 0.7rem 1rem;
      background: rgb(250 250 250 / calc(0.8 + var(--m) * 0.13));
      backdrop-filter: saturate(180%) blur(calc(12px + var(--m) * 6px));
      border: 1px solid rgb(228 228 231);
      /* Square full-width bar (bottom border only) → fully rounded pill. */
      border-radius: calc(var(--m) * 999px);
      box-shadow: rgb(15 23 42 / calc(var(--m) * 0.1)) 0 10px 30px -8px;
      transition: none;
    }
    @media (min-width: 640px) {
      .island {
        padding: 0.7rem 1.5rem;
      }
    }
    .logo {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 1.1rem;
      letter-spacing: -0.01em;
      color: #18181b;
      text-decoration: none;
    }
    .logo-mark {
      width: 30px;
      height: 30px;
      /* Idle bob — the gooey blob floating like its bubbles. transform-origin
         bottom so the hover squish reads as a "plant". */
      transform-origin: center bottom;
      animation: logo-float 3.2s ease-in-out infinite;
    }
    @keyframes logo-float {
      0%,
      100% {
        transform: translateY(0) scale(1);
      }
      50% {
        transform: translateY(-2px) scale(1.03);
      }
    }
    .logo:focus-visible {
      outline: 2px solid #6366f1;
      outline-offset: 2px;
      border-radius: 0.4rem;
    }
    @media (prefers-reduced-motion: reduce) {
      .logo-mark {
        animation: none;
      }
    }
    .nav {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      flex-wrap: wrap;
      margin-left: auto;
    }
    .link {
      padding: 0.4rem 0.8rem;
      border-radius: 999px;
      font-size: 0.85rem;
      font-weight: 600;
      color: #52525b;
      text-decoration: none;
      transition: background 0.15s ease, color 0.15s ease;
    }
    .link:hover {
      background: rgb(0 0 0 / 0.05);
      color: #18181b;
    }
    /* Rounded-pill active state echoes the pill → blob morph. */
    .link.on {
      background: #18181b;
      color: #fff;
    }
    .link:focus-visible {
      outline: 2px solid #6366f1;
      outline-offset: 2px;
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.4rem 0.7rem;
      border-radius: 999px;
      border: 1px solid rgb(212 212 216);
      background: #fff;
      font-size: 0.8rem;
      font-weight: 600;
      color: #27272a;
      text-decoration: none;
      transition: background 0.15s ease, border-color 0.15s ease;
    }
    .btn:hover {
      background: #f4f4f5;
      border-color: rgb(161 161 170);
    }
    .btn:focus-visible {
      outline: 2px solid #6366f1;
      outline-offset: 2px;
    }
    .btn .icon {
      flex: none;
    }
    .stars {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      padding-left: 0.5rem;
      margin-left: 0.1rem;
      border-left: 1px solid rgb(228 228 231);
      color: #52525b;
    }
    /* On narrow screens drop the text labels, keep the icons + star count. */
    @media (max-width: 520px) {
      .btn .label {
        display: none;
      }
    }
    /* On phones, hide the jump-link nav so the island stays one short row
       (logo + GitHub/npm icons) instead of wrapping into a tall blob. */
    @media (max-width: 640px) {
      .nav {
        display: none;
      }
      .island {
        flex-wrap: nowrap;
      }
      .actions {
        margin-left: auto;
      }
    }
  `,
})
export class HeaderComponent {
  protected readonly anchors: NavAnchor[] = [
    { label: 'Examples', fragment: 'examples' },
    { label: 'Builder', fragment: 'builder' },
    { label: 'Docs', fragment: 'docs' },
  ]

  // Live GitHub star count from the public API (unauthenticated: 60 req/hr per IP).
  private readonly repo = httpResource<{ stargazers_count: number }>(
    () => 'https://api.github.com/repos/juanvieiraprado99/ngx-gooey-toast',
  )
  protected readonly stars = computed(() => this.repo.value()?.stargazers_count ?? null)
  protected readonly starsLabel = computed(() => {
    const n = this.stars()
    if (n === null) return ''
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`
  })

  private readonly logoMark = viewChild<ElementRef<HTMLImageElement>>('logoMark')

  /** 0 = full-width bar (top), 1 = floating centered island (scrolled). */
  protected readonly morph = signal(0)
  private scrolled = false
  private anim: AnimationController | null = null
  private logoSquish: AnimationController | null = null

  /** Gooey squish on the logo — same spring/squish the toast plays on landing. */
  protected squishLogo(): void {
    const el = this.logoMark()?.nativeElement
    if (!el) return
    if (
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }
    this.logoSquish?.stop()
    this.logoSquish = animate(0, 1, {
      ...squishSpring(0.5, 0.5, 0.45),
      onUpdate: (v) => {
        const intensity = Math.sin(v * Math.PI)
        // Inline transform overrides the idle float for the duration; cleared
        // on complete so the bob resumes.
        el.style.transform = `scaleX(${1 + 0.16 * intensity}) scaleY(${1 - 0.14 * intensity})`
      },
      onComplete: () => {
        el.style.transform = ''
      },
    })
  }

  protected onScroll(): void {
    // Mobile: header stays a static top bar — never morph to the pill island.
    if (typeof matchMedia === 'function' && matchMedia('(max-width: 640px)').matches) {
      if (this.morph() !== 0) {
        this.anim?.stop()
        this.morph.set(0)
      }
      this.scrolled = false
      return
    }
    // Desktop: hysteresis — enter pill above 40px, exit only below 8px; hold between.
    const y = window.scrollY
    const next = this.scrolled ? y > 8 : y > 40
    if (next === this.scrolled) return
    this.scrolled = next
    const target = next ? 1 : 0

    // Reduced-motion: snap, skip the spring.
    const reduce =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      this.morph.set(target)
      return
    }

    // Drive the morph with the same spring engine the toast uses.
    this.anim?.stop()
    this.anim = animate(this.morph(), target, {
      ...squishSpring(0.45, 0.45, 0.4),
      onUpdate: (v) => this.morph.set(v),
    })
  }
}
