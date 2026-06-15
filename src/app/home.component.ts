import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core'
import { NgOptimizedImage } from '@angular/common'
import { DemoComponent } from './demo.component'
import { DocsComponent } from './docs.component'
import { InstallTabsComponent } from './install-tabs.component'
import { SeoService } from './seo.service'

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoComponent, DocsComponent, InstallTabsComponent, NgOptimizedImage],
  template: `
    <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <header class="max-w-2xl">
        <div class="title-row">
          <img
            class="hero-mark"
            ngSrc="ngx-gooey-toast.png"
            width="56"
            height="56"
            priority
            alt="ngx-gooey-toast logo"
          />
          <h1 class="text-3xl font-bold tracking-tight sm:text-4xl">ngx-gooey-toast</h1>
        </div>
        <p class="mt-3 text-base text-neutral-500 sm:text-lg">
          Morphing pill → blob toasts for Angular. Built on signals and a hand-rolled
          spring engine — zero runtime dependencies. Click any example below to run it.
        </p>
        <p class="mt-4">
          <a
            class="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700"
            href="https://goey-toast.vercel.app/"
            target="_blank"
            rel="noreferrer"
          >Inspired by React goey-toast →</a>
        </p>

        <div class="mt-6 max-w-md">
          <app-install-tabs />
        </div>
      </header>

      <div id="examples" class="anchor mt-10 sm:mt-12">
        <app-demo />
      </div>

      <div id="docs" class="anchor mt-12 sm:mt-16">
        <app-docs />
      </div>

      <footer class="made-with mt-12 border-t border-neutral-200 pt-8 text-center text-sm text-neutral-500 sm:mt-16">
        Made with <span aria-hidden="true">❤️</span> for Angular users <span aria-hidden="true">😊</span>
      </footer>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .title-row {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }
    /* Brand mark: pops in on load, then bobs like a floating gooey bubble. */
    .hero-mark {
      width: 56px;
      height: 56px;
      flex: none;
      transform-origin: center bottom;
      animation:
        hero-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both,
        hero-float 3.6s ease-in-out 0.6s infinite;
    }
    @keyframes hero-pop {
      from {
        opacity: 0;
        transform: scale(0.5) translateY(8px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }
    @keyframes hero-float {
      0%,
      100% {
        transform: translateY(0) scale(1);
      }
      50% {
        transform: translateY(-4px) scale(1.04);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .hero-mark {
        animation: none;
      }
    }
    /* Keep anchored sections clear of the sticky header when scrolled to. */
    .anchor {
      scroll-margin-top: 7rem;
    }
  `,
})
export class HomeComponent implements OnInit {
  private readonly seo = inject(SeoService)

  ngOnInit(): void {
    this.seo.update({
      title: 'ngx-gooey-toast — Morphing pill → blob toasts for Angular',
      description:
        'Morphing pill → blob toast notifications for Angular. Built on signals and a ' +
        'hand-rolled spring engine with zero runtime dependencies. Install, configure, ' +
        'and see live examples.',
      path: '/',
    })
  }
}
