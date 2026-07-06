import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { ViewportScroller } from '@angular/common'
import { RouterOutlet } from '@angular/router'
import { HeaderComponent } from './header.component'

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, HeaderComponent],
  template: `
    <main class="min-h-screen bg-neutral-50 text-neutral-800">
      <app-header />
      <router-outlet />
    </main>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class App {
  constructor() {
    inject(ViewportScroller).setOffset(() => {
      const header = document.querySelector('.site-header')
      return [0, (header?.clientHeight ?? 0) + 16]
    })
  }
}
