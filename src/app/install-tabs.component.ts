import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core'
import { CodeBlockComponent } from './code-block.component'

type PackageManager = 'npm' | 'pnpm' | 'bun'

const COMMANDS: Record<PackageManager, string> = {
  npm: 'npm install ngx-gooey-toast',
  pnpm: 'pnpm add ngx-gooey-toast',
  bun: 'bun add ngx-gooey-toast',
}

/**
 * Installation snippet with a tabbed package-manager selector (npm/pnpm/bun).
 * Tabs follow the WAI-ARIA tabs pattern: roving focus, arrow-key navigation,
 * `aria-selected`, and a linked `tabpanel`.
 */
@Component({
  selector: 'app-install-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CodeBlockComponent],
  template: `
    <div class="tabs" role="tablist" aria-label="Package manager" [style.--i]="activeIndex()">
      <span class="slider" aria-hidden="true"></span>
      @for (pm of managers; track pm; let i = $index) {
        <button
          type="button"
          class="tab"
          role="tab"
          [id]="'pm-tab-' + pm"
          [class.on]="active() === pm"
          [attr.aria-selected]="active() === pm"
          [attr.aria-controls]="'pm-panel'"
          [attr.tabindex]="active() === pm ? 0 : -1"
          (click)="active.set(pm)"
          (keydown)="onKeydown($event, i)"
        >{{ pm }}</button>
      }
    </div>
    <div id="pm-panel" role="tabpanel" [attr.aria-labelledby]="'pm-tab-' + active()">
      <app-code-block [code]="command()" language="bash" />
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .tabs {
      position: relative;
      display: inline-flex;
      margin-bottom: 0.6rem;
      padding: 0.2rem;
      border-radius: 0.6rem;
      background: rgb(240 240 240);
    }
    /* The white pill behind the active tab. Slides between fixed-width tabs by
       translating one tab-width per index — driven by --i off activeIndex(). */
    .slider {
      position: absolute;
      top: 0.2rem;
      left: 0.2rem;
      height: calc(100% - 0.4rem);
      width: 3.6rem;
      border-radius: 0.45rem;
      background: #fff;
      box-shadow: 0 1px 2px rgb(0 0 0 / 0.08);
      transform: translateX(calc(var(--i, 0) * 3.6rem));
      transition: transform 0.28s cubic-bezier(0.34, 1.3, 0.64, 1);
    }
    .tab {
      position: relative;
      z-index: 1;
      width: 3.6rem;
      border: none;
      background: none;
      border-radius: 0.45rem;
      padding: 0.3rem 0;
      font-size: 0.8rem;
      font-weight: 600;
      color: #52525b;
      cursor: pointer;
      transition: color 0.15s ease;
    }
    .tab:hover {
      color: #18181b;
    }
    .tab.on {
      color: #18181b;
    }
    .tab:focus-visible {
      outline: 2px solid #6366f1;
      outline-offset: 2px;
    }
    @media (prefers-reduced-motion: reduce) {
      .slider {
        transition: none;
      }
    }
  `,
})
export class InstallTabsComponent {
  protected readonly managers: PackageManager[] = ['npm', 'pnpm', 'bun']
  protected readonly active = signal<PackageManager>('npm')
  protected readonly activeIndex = computed(() => this.managers.indexOf(this.active()))
  protected readonly command = computed(() => COMMANDS[this.active()])

  protected onKeydown(event: KeyboardEvent, index: number): void {
    const last = this.managers.length - 1
    let next: number
    switch (event.key) {
      case 'ArrowRight':
        next = index === last ? 0 : index + 1
        break
      case 'ArrowLeft':
        next = index === 0 ? last : index - 1
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = last
        break
      default:
        return
    }
    event.preventDefault()
    const pm = this.managers[next]
    this.active.set(pm)
    document.getElementById(`pm-tab-${pm}`)?.focus()
  }
}
