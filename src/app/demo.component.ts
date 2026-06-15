import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  TemplateRef,
  inject,
  viewChild,
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { Router, Scroll } from '@angular/router'
import { filter } from 'rxjs/operators'
import { GooeyToasterComponent, GooeyToastService } from 'ngx-gooey-toast'
import { DemoBuilderComponent } from './demo-builder.component'

interface Example {
  label: string
  run: () => void
}
interface Group {
  heading: string
  items: Example[]
}

@Component({
  selector: 'app-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoBuilderComponent, GooeyToasterComponent],
  template: `
    <!-- Toaster lives here (not inside the sticky .builder-col, whose stacking
         context would trap the fixed toaster behind the header). It reads the
         builder's config signals via viewChild. -->
    @if (builder(); as b) {
      <gooey-toaster
        [position]="b.position()"
        [offset]="b.position().startsWith('top') ? '65px' : '24px'"
        [theme]="b.theme()"
        [showProgress]="b.showProgress()"
        [closeOnEscape]="b.closeOnEscape()"
        [closeButton]="b.closeButton()"
        [coalesceDuplicates]="b.coalesceDuplicates()"
        [merge]="b.merge()"
        [gap]="b.merge() ? 2 : 14"
        [stackDirection]="b.newestFirst() ? 'newest-first' : 'oldest-first'"
        [haptics]="b.haptics()"
      />
    }

    <div class="playground">
      <!-- Left: categorized examples -->
      <div class="examples">
        @for (g of groups; track g.heading) {
          <section class="ex-group">
            <h4 class="ex-heading">{{ g.heading }}</h4>
            <div class="ex-pills">
              @for (ex of g.items; track ex.label) {
                <button type="button" class="ex-btn" (click)="ex.run()">{{ ex.label }}</button>
              }
            </div>
          </section>
        }
      </div>

      <!-- Right: interactive builder -->
      <div #builderCol id="builder" class="builder-col">
        <app-demo-builder />
      </div>
    </div>

    <!-- Rich custom body used by the "Custom Component Body" example -->
    <ng-template #customBody>
      <div class="custom-body">
        <strong>Rich content</strong> — any Angular
        <code>TemplateRef</code> works as a description.
      </div>
    </ng-template>
  `,
  styles: `
    :host {
      display: block;
    }
    .playground {
      display: grid;
      gap: 2rem;
      align-items: start;
    }
    /* Let columns shrink so wide children (code, pills) scroll/wrap internally
       instead of expanding the track past the viewport (mobile h-scroll). */
    .playground > * {
      min-width: 0;
    }
    /* Keep the builder clear of the sticky header when anchored to. */
    .builder-col {
      scroll-margin-top: 7rem;
    }
    @media (min-width: 1024px) {
      .playground {
        grid-template-columns: 1fr 1fr;
      }
      /* Only the builder column scrolls when it's taller than the viewport. */
      .builder-col {
        position: sticky;
        top: 1.5rem;
        max-height: calc(100vh - 3rem);
        overflow-y: auto;
        padding-right: 0.25rem;
        scrollbar-width: none; /* Firefox */
        -ms-overflow-style: none; /* old Edge */
      }
      .builder-col::-webkit-scrollbar {
        display: none; /* Chrome/Safari */
      }
    }
    .ex-group + .ex-group {
      margin-top: 1.4rem;
    }
    .ex-heading {
      margin: 0 0 0.6rem;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: #9a9ca3;
    }
    .ex-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
    }
    .ex-btn {
      border: 1px solid rgb(226 226 230);
      background: #fff;
      border-radius: 0.6rem;
      padding: 0.4rem 0.75rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: #3a3b41;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease;
    }
    .ex-btn:hover {
      background: #f6f6f7;
      border-color: rgb(212 212 216);
    }
    .ex-btn:focus-visible {
      outline: 2px solid #6366f1;
      outline-offset: 2px;
    }
    .custom-body {
      font-size: 0.82rem;
    }
    .custom-body code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.78rem;
    }
  `,
})
export class DemoComponent {
  protected readonly toast = inject(GooeyToastService)
  private readonly router = inject(Router)
  private readonly customBody = viewChild<TemplateRef<unknown>>('customBody')
  private readonly builderCol = viewChild<ElementRef<HTMLDivElement>>('builderCol')
  /** The builder owns the toaster-config signals; the toaster (rendered here,
   *  outside the sticky column) reads them through this reference. */
  protected readonly builder = viewChild(DemoBuilderComponent)

  constructor() {
    // When navigating to #builder, reset the (independently scrollable) builder
    // column to the top so the user always lands on the start of the controls,
    // not wherever they'd previously scrolled it.
    this.router.events
      .pipe(
        filter((e): e is Scroll => e instanceof Scroll),
        takeUntilDestroyed(),
      )
      .subscribe((e) => {
        if (e.anchor !== 'builder') return
        const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
        this.builderCol()?.nativeElement.scrollTo({
          top: 0,
          behavior: reduce ? 'auto' : 'smooth',
        })
      })
  }

  protected readonly groups: Group[] = [
    {
      heading: 'Toast Types',
      items: [
        { label: 'Default', run: () => this.toast.show('Just a plain toast') },
        { label: 'Success', run: () => this.toast.success('Saved successfully') },
        { label: 'Error', run: () => this.toast.error('Something went wrong') },
        { label: 'Warning', run: () => this.toast.warning('Careful with that') },
        { label: 'Info', run: () => this.toast.info('Heads up — new update') },
      ],
    },
    {
      heading: 'With Description',
      items: [
        {
          label: 'Success + Description',
          run: () =>
            this.toast.success('Profile updated', {
              description: 'Your changes are now live.',
            }),
        },
        {
          label: 'Error + Description',
          run: () =>
            this.toast.error('Upload failed', {
              description: 'Check your connection and try again.',
            }),
        },
      ],
    },
    {
      heading: 'With Action Button',
      items: [
        {
          label: 'Error + Action',
          run: () =>
            this.toast.error('Deleted item', {
              description: 'You can still undo this.',
              action: { label: 'Undo', onClick: () => this.toast.success('Restored') },
            }),
        },
        {
          label: 'Action + Success Pill',
          run: () =>
            this.toast.show('File ready to share', {
              description: 'Send it to your team or copy the link.',
              action: {
                label: 'Copy link',
                successLabel: 'Copied!',
                onClick: () => {
                  /* copy to clipboard */
                },
              },
            }),
        },
      ],
    },
    {
      heading: 'Custom Component Body',
      items: [
        {
          label: 'TemplateRef Description',
          run: () => {
            const tpl = this.customBody()
            if (tpl) this.toast.info('Custom body', { description: tpl })
          },
        },
      ],
    },
    {
      heading: 'Rich Description (sanitized)',
      items: [
        {
          label: 'Markdown',
          run: () =>
            this.toast.info('Release v2.1', {
              description: {
                markdown:
                  '**3 fixes**, `1` breaking change — see the [changelog](https://angular.dev).',
              },
            }),
        },
        {
          label: 'HTML',
          run: () =>
            this.toast.success('Synced', {
              description: { html: 'Saved to <strong>3 devices</strong>.' },
            }),
        },
        {
          label: 'XSS attempt (stripped)',
          run: () =>
            this.toast.warning('Sanitized', {
              description: {
                html: '<strong>Bold</strong> survives, but <script>alert(1)</script> scripts &amp; <em>onclick</em> handlers are stripped.',
              },
            }),
        },
      ],
    },
    {
      heading: 'No Spring (smooth easing)',
      items: [
        {
          label: 'Success (no spring)',
          run: () => this.toast.success('Smooth', { spring: false }),
        },
        {
          label: 'Error + Desc (no spring)',
          run: () =>
            this.toast.error('Smooth error', {
              spring: false,
              description: 'Eased morph, no overshoot.',
            }),
        },
        {
          label: 'Action (no spring)',
          run: () =>
            this.toast.show('Smooth action', {
              spring: false,
              action: { label: 'OK', onClick: () => {} },
            }),
        },
      ],
    },
    {
      heading: 'Promise (morph animation)',
      items: [
        { label: 'Promise + Success (pill)', run: () => this.runPromise(false, false) },
        { label: 'Promise + Error (pill)', run: () => this.runPromise(true, false) },
        { label: 'Promise + Success (expanded)', run: () => this.runPromise(false, true) },
        { label: 'Promise + Error (expanded)', run: () => this.runPromise(true, true) },
      ],
    },
    {
      heading: 'Update Toast',
      items: [
        { label: 'Update → Success', run: () => this.runUpdate() },
        { label: 'Update → Error', run: () => this.runUpdate('error') },
      ],
    },
    {
      heading: 'Progress Bar',
      items: [
        {
          label: 'Progress Bar',
          run: () =>
            this.toast.success('Auto-dismiss', {
              showProgress: true,
              description: 'Watch the progress bar tick down.',
            }),
        },
      ],
    },
    {
      heading: 'History & Replay',
      items: [
        {
          label: 'Replay last dismissed',
          run: () => {
            const h = this.toast.history()
            if (h.length) this.toast.replay(h[0].id)
            else this.toast.info('No dismissed toasts yet')
          },
        },
        { label: 'Clear history', run: () => this.toast.clearHistory() },
      ],
    },
    {
      heading: 'Callbacks',
      items: [
        {
          label: 'With Callback',
          run: () =>
            this.toast.show('Tap close or wait', {
              onDismiss: () => this.toast.info('onDismiss fired'),
              onAutoClose: () => this.toast.info('onAutoClose fired'),
            }),
        },
      ],
    },
  ]

  protected runPromise(fail: boolean, expanded: boolean): void {
    const work = new Promise<{ name: string }>((resolve, reject) => {
      setTimeout(() => (fail ? reject(new Error('fail')) : resolve({ name: 'report.pdf' })), 2200)
    })
    this.toast.promise(work, {
      loading: 'Uploading…',
      success: (d) => `Uploaded ${d.name}`,
      error: 'Upload failed',
      description: expanded
        ? {
            loading: 'Crunching the bytes, hang tight.',
            success: 'Your file is ready to download.',
            error: 'Check your connection and try again.',
          }
        : undefined,
    })
  }

  protected runUpdate(to: 'success' | 'error' = 'success'): void {
    // Opt out of coalesce: this toast is tracked by id and updated in place, so
    // it must not merge with another identical "Connecting…" toast.
    const id = this.toast.info('Connecting…', { coalesce: false })
    const next =
      to === 'error'
        ? { title: 'Connection failed', type: 'error' as const }
        : { title: 'Connected', type: 'success' as const }
    setTimeout(() => this.toast.update(id, next), 2000)
  }
}
