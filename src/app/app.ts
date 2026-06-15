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
    // Angular's router anchor-scrolling uses ViewportScroller, which honors
    // this configured offset but NOT CSS scroll-margin. Offset by the sticky
    // header's live height (it morphs/wraps) plus a little breathing room so
    // anchored sections land below it instead of behind it.
    inject(ViewportScroller).setOffset(() => {
      const header = document.querySelector('.site-header')
      return [0, (header?.clientHeight ?? 0) + 16]
    })
  }
}
