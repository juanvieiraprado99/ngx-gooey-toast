import { ChangeDetectionStrategy, Component, input } from '@angular/core'

export type GooeyIconKind =
  | 'default'
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'spinner'

/**
 * Phase icons — Lucide-style line SVGs ported 1:1 from the React `icons/`.
 * The spinner variant rotates via the `gooey-spin` keyframe.
 */
@Component({
  selector: 'gooey-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      [class.gooey-spin]="kind() === 'spinner'"
      aria-hidden="true"
    >
      @switch (kind()) {
        @case ('success') {
          <circle cx="12" cy="12" r="10" />
          <path d="M9 12l2 2 4-4" />
        }
        @case ('error') {
          <circle cx="12" cy="12" r="10" />
          <path d="M15 9l-6 6" />
          <path d="M9 9l6 6" />
        }
        @case ('warning') {
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        }
        @case ('info') {
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        }
        @case ('spinner') {
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        }
        @default {
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      line-height: 0;
    }
    .gooey-spin {
      animation: gooey-spin 1s linear infinite;
    }
    @keyframes gooey-spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
  `,
})
export class GooeyIconComponent {
  readonly kind = input<GooeyIconKind>('default')
  readonly size = input(18)
}
