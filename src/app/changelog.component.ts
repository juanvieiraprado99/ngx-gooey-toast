import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core'
import { releases } from './changelog.data'
import { SeoService } from './seo.service'

@Component({
  selector: 'app-changelog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header class="max-w-2xl">
        <h1 class="text-3xl font-bold tracking-tight sm:text-4xl">Changelog</h1>
        <p class="mt-3 text-base text-neutral-500 sm:text-lg">
          Notable changes to <code class="kbd">ngx-gooey-toast</code>. Follows
          <a
            class="font-medium text-indigo-600 underline underline-offset-2 hover:text-indigo-500"
            href="https://keepachangelog.com/"
            target="_blank"
            rel="noreferrer"
          >Keep a Changelog</a> and semantic versioning.
        </p>
      </header>

      <div class="mt-10">
        @for (release of releases; track release.version) {
          <section class="release">
            <div class="rel-head">
              <h2 class="rel-version">v{{ release.version }}</h2>
              <time class="rel-date">{{ release.date }}</time>
            </div>
            <ul class="changes">
              @for (change of release.changes; track $index) {
                <li class="change">
                  <span class="tag" [attr.data-type]="change.type">{{ change.type }}</span>
                  <span>{{ change.text }}</span>
                </li>
              }
            </ul>
          </section>
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .kbd {
      border-radius: 0.35rem;
      background: rgb(240 240 240);
      padding: 0.1rem 0.35rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.82em;
      white-space: nowrap;
    }
    .release {
      padding: 1.75rem 0;
      border-top: 1px solid rgb(228 228 231);
    }
    .rel-head {
      display: flex;
      align-items: baseline;
      gap: 0.75rem;
    }
    .rel-version {
      font-family: var(--font-display);
      font-size: 1.4rem;
      font-weight: 700;
      color: #18181b;
    }
    .rel-date {
      font-size: 0.85rem;
      color: #a1a1aa;
    }
    .changes {
      margin: 1rem 0 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }
    .change {
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
      font-size: 0.9rem;
      color: rgb(82 82 91);
    }
    .tag {
      flex: none;
      min-width: 4.2rem;
      text-align: center;
      border-radius: 999px;
      padding: 0.1rem 0.55rem;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .tag[data-type='added'] {
      background: #dcfce7;
      color: #166534;
    }
    .tag[data-type='changed'] {
      background: #e0e7ff;
      color: #3730a3;
    }
    .tag[data-type='fixed'] {
      background: #fef3c7;
      color: #92400e;
    }
  `,
})
export class ChangelogComponent implements OnInit {
  private readonly seo = inject(SeoService)

  // Generated from CHANGELOG.md at build time (scripts/changelog-to-ts.mjs).
  protected readonly releases = releases

  ngOnInit(): void {
    this.seo.update({
      title: 'Changelog — ngx-gooey-toast',
      description:
        'Notable changes to ngx-gooey-toast. Follows Keep a Changelog and semantic ' +
        'versioning — new features, fixes, and releases.',
      path: '/changelog',
    })
  }
}
