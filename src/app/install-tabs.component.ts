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
    <div class="tabs" role="tablist" aria-label="Package manager">
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
      display: inline-flex;
      gap: 0.25rem;
      margin-bottom: 0.6rem;
      padding: 0.2rem;
      border-radius: 0.6rem;
      background: rgb(240 240 240);
    }
    .tab {
      border: none;
      background: none;
      border-radius: 0.45rem;
      padding: 0.3rem 0.8rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: #52525b;
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease;
    }
    .tab:hover {
      color: #18181b;
    }
    .tab.on {
      background: #fff;
      color: #18181b;
      box-shadow: 0 1px 2px rgb(0 0 0 / 0.08);
    }
    .tab:focus-visible {
      outline: 2px solid #6366f1;
      outline-offset: 2px;
    }
  `,
})
export class InstallTabsComponent {
  protected readonly managers: PackageManager[] = ['npm', 'pnpm', 'bun']
  protected readonly active = signal<PackageManager>('npm')
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
