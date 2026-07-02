import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  TemplateRef,
  ViewEncapsulation,
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
  // ng-template content stamped inside <gooey-toast> (custom toasts, TemplateRef
  // descriptions) gets the TOAST component's _ngcontent attribute, not this
  // component's — so emulated-scoped styles would never match it. Unscope them.
  encapsulation: ViewEncapsulation.None,
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
      <div class="demo-rich-body">
        <strong>Rich content</strong> — any Angular
        <code>TemplateRef</code> works as a description.
      </div>
    </ng-template>

    <!-- Fully custom toast used by the "Custom Toast" examples: the template IS
         the whole body (toast.custom) — no built-in header/icon/description. -->
    <ng-template #customCard>
      <div class="custom-card">
        <div class="custom-card-icon">📦</div>
        <div class="custom-card-main">
          <div class="custom-card-title">report.pdf uploaded</div>
          <div class="custom-card-meta">2.4 MB · just now</div>
        </div>
        <button type="button" class="custom-card-btn" (click)="toast.success('Link copied')">
          Copy link
        </button>
      </div>
    </ng-template>

    <!-- Chat-style message notification -->
    <ng-template #customMessage>
      <div class="msg-card">
        <div class="msg-avatar">AL</div>
        <div class="msg-main">
          <div class="msg-name">Ana Lima</div>
          <div class="msg-preview">Can you review my PR when you get a sec?</div>
        </div>
        <button type="button" class="msg-reply" (click)="toast.info('Opening chat…')">
          Reply
        </button>
      </div>
    </ng-template>

    <!-- Dark "now playing" card (pairs with fillColor: '#1a1a1a') -->
    <ng-template #customPlayer>
      <div class="player-card">
        <div class="player-art">🎵</div>
        <div class="player-main">
          <div class="player-track">Midnight City</div>
          <div class="player-artist">M83 — Hurry Up, We're Dreaming</div>
        </div>
        <div class="player-controls">
          <button type="button" class="player-btn" (click)="toast.show('Playing')">▶</button>
          <button type="button" class="player-btn" (click)="toast.show('Skipped')">⏭</button>
        </div>
      </div>
    </ng-template>

    <!-- Gamified achievement with gradient text + XP bar -->
    <ng-template #customAchievement>
      <div class="ach-card">
        <div class="ach-badge">🏆</div>
        <div class="ach-main">
          <div class="ach-title">Achievement unlocked!</div>
          <div class="ach-desc">Century — 100 commits in one week</div>
          <div class="ach-xp">
            <div class="ach-xp-fill"></div>
          </div>
          <div class="ach-xp-label">+250 XP · level 12</div>
        </div>
      </div>
    </ng-template>

    <!-- Consent-style: only its own buttons close it (dismissible: false) -->
    <ng-template #customConsent>
      <div class="consent-card">
        <div class="consent-text">
          <strong>Enable analytics?</strong>
          We use anonymous usage data to improve the app.
        </div>
        <div class="consent-actions">
          <button type="button" class="consent-btn consent-accept" (click)="closeConsent(true)">
            Accept
          </button>
          <button type="button" class="consent-btn consent-decline" (click)="closeConsent(false)">
            Decline
          </button>
        </div>
      </div>
    </ng-template>
  `,
  styles: `
    app-demo {
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
    .demo-rich-body {
      font-size: 0.82rem;
    }
    .demo-rich-body code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.78rem;
    }
    /* toast.custom() card — consumer-owned layout inside the blob */
    .custom-card {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.15rem 0.1rem;
    }
    .custom-card-icon {
      font-size: 1.3rem;
      line-height: 1;
    }
    .custom-card-main {
      min-width: 0;
    }
    .custom-card-title {
      font-size: 0.82rem;
      font-weight: 700;
      white-space: nowrap;
    }
    .custom-card-meta {
      font-size: 0.72rem;
      opacity: 0.75;
    }
    .custom-card-btn {
      flex-shrink: 0;
      border: none;
      border-radius: 999px;
      padding: 0.45rem 0.85rem;
      font-size: 0.75rem;
      font-weight: 700;
      font-family: inherit;
      background: #6366f1;
      color: #fff;
      cursor: pointer;
    }
    .custom-card-btn:hover {
      background: #4f52e0;
    }
    .custom-card-btn:focus-visible {
      outline: 2px solid #6366f1;
      outline-offset: 2px;
    }

    /* Chat message card */
    .msg-card {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.15rem 0.1rem;
    }
    .msg-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      flex-shrink: 0;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #a855f7);
      color: #fff;
      font-size: 0.72rem;
      font-weight: 700;
    }
    .msg-main {
      min-width: 0;
    }
    .msg-name {
      font-size: 0.8rem;
      font-weight: 700;
    }
    .msg-preview {
      font-size: 0.74rem;
      opacity: 0.75;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 190px;
    }
    .msg-reply {
      flex-shrink: 0;
      border: 1px solid #d4d4d8;
      border-radius: 999px;
      padding: 0.4rem 0.8rem;
      font-size: 0.74rem;
      font-weight: 700;
      font-family: inherit;
      background: transparent;
      color: #3a3b41;
      cursor: pointer;
    }
    .msg-reply:hover {
      background: #f4f4f5;
    }

    /* Dark "now playing" card — explicit light text (blob fill is #1a1a1a) */
    .player-card {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.15rem 0.1rem;
      color: #f4f4f5;
    }
    .player-art {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      flex-shrink: 0;
      border-radius: 0.55rem;
      background: linear-gradient(135deg, #312e81, #7c3aed);
      font-size: 1.05rem;
    }
    .player-main {
      min-width: 0;
    }
    .player-track {
      font-size: 0.8rem;
      font-weight: 700;
      color: #fff;
    }
    .player-artist {
      font-size: 0.72rem;
      color: #a1a1aa;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 170px;
    }
    .player-controls {
      display: flex;
      gap: 0.3rem;
      flex-shrink: 0;
    }
    .player-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border: none;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
      font-size: 0.72rem;
      cursor: pointer;
    }
    .player-btn:hover {
      background: rgba(255, 255, 255, 0.22);
    }

    /* Achievement card */
    .ach-card {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      padding: 0.15rem 0.1rem;
    }
    .ach-badge {
      font-size: 1.7rem;
      line-height: 1;
      filter: drop-shadow(0 2px 6px rgba(245, 158, 11, 0.45));
    }
    .ach-main {
      min-width: 0;
    }
    .ach-title {
      font-size: 0.82rem;
      font-weight: 800;
      background: linear-gradient(90deg, #f59e0b, #ef4444, #a855f7);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .ach-desc {
      font-size: 0.73rem;
      opacity: 0.8;
    }
    .ach-xp {
      margin-top: 0.35rem;
      height: 5px;
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.08);
      overflow: hidden;
    }
    .ach-xp-fill {
      width: 72%;
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, #f59e0b, #ef4444);
    }
    .ach-xp-label {
      margin-top: 0.2rem;
      font-size: 0.68rem;
      font-weight: 600;
      opacity: 0.65;
    }

    /* Consent card — its own buttons are the only way out */
    .consent-card {
      padding: 0.15rem 0.1rem;
      max-width: 280px;
    }
    .consent-text {
      font-size: 0.78rem;
      line-height: 1.5;
    }
    .consent-text strong {
      display: block;
      font-size: 0.82rem;
    }
    .consent-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.6rem;
    }
    .consent-btn {
      flex: 1;
      border: none;
      border-radius: 999px;
      padding: 0.5rem 0.9rem;
      font-size: 0.76rem;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
    }
    .consent-accept {
      background: #16a34a;
      color: #fff;
    }
    .consent-accept:hover {
      background: #15803d;
    }
    .consent-decline {
      background: #ececee;
      color: #3a3b41;
    }
    .consent-decline:hover {
      background: #e2e2e5;
    }
  `,
})
export class DemoComponent {
  protected readonly toast = inject(GooeyToastService)
  private readonly router = inject(Router)
  private readonly customBody = viewChild<TemplateRef<unknown>>('customBody')
  private readonly customCard = viewChild<TemplateRef<unknown>>('customCard')
  private readonly customMessage = viewChild<TemplateRef<unknown>>('customMessage')
  private readonly customPlayer = viewChild<TemplateRef<unknown>>('customPlayer')
  private readonly customAchievement = viewChild<TemplateRef<unknown>>('customAchievement')
  private readonly customConsent = viewChild<TemplateRef<unknown>>('customConsent')
  /** Live consent toast id — its template buttons dismiss it programmatically. */
  private consentId: string | number | null = null
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
        {
          label: 'Action + Cancel',
          run: () =>
            this.toast.warning('Delete file?', {
              description: 'This action cannot be undone.',
              duration: Number.POSITIVE_INFINITY,
              action: { label: 'Delete', onClick: () => this.toast.success('Deleted') },
              cancel: { label: 'Cancel' },
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
      heading: 'Custom Toast (toast.custom)',
      items: [
        {
          label: 'Custom card',
          run: () => {
            const tpl = this.customCard()
            if (tpl) this.toast.custom(tpl, { ariaLabel: 'report.pdf uploaded, 2.4 megabytes', duration: 8000 })
          },
        },
        {
          label: 'Custom + progress, no swipe',
          run: () => {
            const tpl = this.customCard()
            if (tpl)
              this.toast.custom(tpl, {
                ariaLabel: 'report.pdf uploaded, 2.4 megabytes',
                duration: 8000,
                showProgress: true,
                dismissible: false,
              })
          },
        },
        {
          label: 'Chat message',
          run: () => {
            const tpl = this.customMessage()
            if (tpl)
              this.toast.custom(tpl, {
                ariaLabel: 'New message from Ana Lima: can you review my PR?',
                duration: 8000,
              })
          },
        },
        {
          label: 'Now playing (dark)',
          run: () => {
            const tpl = this.customPlayer()
            if (tpl)
              this.toast.custom(tpl, {
                ariaLabel: 'Now playing: Midnight City by M83',
                duration: 8000,
                fillColor: '#1a1a1a',
              })
          },
        },
        {
          label: 'Achievement',
          run: () => {
            const tpl = this.customAchievement()
            if (tpl)
              this.toast.custom(tpl, {
                ariaLabel: 'Achievement unlocked: 100 commits in one week, plus 250 XP',
                duration: 8000,
              })
          },
        },
        {
          label: 'Consent (buttons close it)',
          run: () => {
            const tpl = this.customConsent()
            if (tpl)
              this.consentId = this.toast.custom(tpl, {
                ariaLabel: 'Enable analytics? Accept or decline.',
                duration: Number.POSITIVE_INFINITY,
                dismissible: false,
              })
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
        { label: 'Per-result durations + finally', run: () => this.runPromiseDurations() },
      ],
    },
    {
      heading: 'Loading',
      items: [
        { label: 'Loading → Success', run: () => this.runLoading(false) },
        { label: 'Loading → Error', run: () => this.runLoading(true) },
      ],
    },
    {
      heading: 'Update Toast',
      items: [
        { label: 'Update → Success', run: () => this.runUpdate() },
        { label: 'Update → Error', run: () => this.runUpdate('error') },
        { label: 'Reuse id (in-place)', run: () => this.runReuseId() },
      ],
    },
    {
      heading: 'Dismissible',
      items: [
        {
          label: 'dismissible: false',
          run: () =>
            this.toast.warning('Swipe, Esc and close are blocked', {
              description: 'Only the auto-dismiss timer (or dismiss()) removes me.',
              dismissible: false,
              duration: 6000,
            }),
        },
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

  /** Close the consent toast from its own template buttons. */
  protected closeConsent(accepted: boolean): void {
    if (this.consentId != null) this.toast.dismiss(this.consentId)
    this.consentId = null
    this.toast.success(accepted ? 'Analytics enabled' : 'Analytics disabled')
  }

  protected runPromiseDurations(): void {
    const work = new Promise<void>((resolve) => setTimeout(resolve, 1800))
    this.toast.promise(work, {
      loading: 'Syncing…',
      success: 'Synced (stays 8s)',
      error: 'Sync failed',
      successDuration: 8000,
      errorDuration: 12000,
      finally: () => this.toast.info('finally() ran'),
    })
  }

  /**
   * Re-showing with the same id updates the live toast in place (no update()
   * call needed) — the second success() call below morphs the first toast.
   */
  protected runReuseId(): void {
    this.toast.info('Connecting…', { id: 'reuse-demo', duration: Number.POSITIVE_INFINITY })
    setTimeout(
      () => this.toast.success('Connected', { id: 'reuse-demo', duration: 3000 }),
      1500,
    )
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

  protected runLoading(fail: boolean): void {
    // Sticky spinner you resolve yourself; give it a finite duration on resolve
    // so the settled result auto-closes.
    const id = this.toast.loading('Uploading…')
    const next = fail
      ? { title: 'Upload failed', type: 'error' as const, duration: 4000 }
      : { title: 'Uploaded report.pdf', type: 'success' as const, duration: 4000 }
    setTimeout(() => this.toast.update(id, next), 2200)
  }
}
