import {
  ChangeDetectionStrategy,
  Component,
  SecurityContext,
  computed,
  inject,
  input,
  signal,
} from '@angular/core'
import { DomSanitizer } from '@angular/platform-browser'
import hljs from 'highlight.js/lib/core'
import typescript from 'highlight.js/lib/languages/typescript'
import bash from 'highlight.js/lib/languages/bash'

// Register only the languages the demo actually uses — keeps the bundle small
// (the full highlight.js auto-bundle pulls in ~190 grammars).
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('bash', bash)

export type CodeLanguage = 'typescript' | 'bash'

/**
 * A read-only code block with syntax highlighting (highlight.js) and a copy
 * button. The highlighted HTML is run through Angular's DomSanitizer before it
 * reaches `[innerHTML]` — same convention as the toast's rich content; the
 * highlight.js theme itself lives in global styles.css (scoped component styles
 * don't reach innerHTML content).
 */
@Component({
  selector: 'app-code-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="code-wrap">
      <button
        type="button"
        class="copy"
        [attr.aria-label]="copied() ? 'Code copied' : 'Copy code'"
        (click)="copy()"
      >
        @if (copied()) {
          <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
            <path
              fill="none"
              stroke="currentColor"
              stroke-width="2.4"
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        } @else {
          <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
            <rect
              x="9"
              y="9"
              width="11"
              height="11"
              rx="2"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            />
            <path
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
            />
          </svg>
        }
      </button>
      <pre class="code"><code [innerHTML]="highlighted()"></code></pre>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .code-wrap {
      position: relative;
      min-width: 0;
    }
    .copy {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      z-index: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgb(212 212 216);
      background: #fff;
      border-radius: 0.45rem;
      padding: 0.3rem;
      color: #3f3f46;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    }
    .copy svg {
      display: block;
    }
    .copy:hover {
      background: #f4f4f5;
      border-color: rgb(161 161 170);
    }
    .copy:focus-visible {
      outline: 2px solid #6366f1;
      outline-offset: 2px;
    }
    .code {
      overflow-x: auto;
      margin: 0;
      border-radius: 0.6rem;
      background: rgb(245 245 245);
      padding: 0.9rem 1rem;
      font-size: 0.8rem;
      line-height: 1.5;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }
    .code code {
      font-family: inherit;
      background: none;
    }
  `,
})
export class CodeBlockComponent {
  private readonly sanitizer = inject(DomSanitizer)

  readonly code = input.required<string>()
  readonly language = input<CodeLanguage>('typescript')

  readonly copied = signal(false)

  readonly highlighted = computed(() => {
    const out = hljs.highlight(this.code(), { language: this.language() }).value
    return this.sanitizer.sanitize(SecurityContext.HTML, out) ?? ''
  })

  copy(): void {
    void navigator.clipboard?.writeText(this.code()).then(() => {
      this.copied.set(true)
      setTimeout(() => this.copied.set(false), 1500)
    })
  }
}
