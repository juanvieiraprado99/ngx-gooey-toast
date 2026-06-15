import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import {
  GooeyToastService,
  animationPresets,
  type AnimationPresetName,
  type GooeyPosition,
  type GooeyToastOptions,
  type GooeyToastType,
} from 'ngx-gooey-toast'
import { CodeBlockComponent } from './code-block.component'

const POSITIONS: GooeyPosition[] = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
]
const TYPES: GooeyToastType[] = ['default', 'success', 'error', 'warning', 'info']
const PRESETS: AnimationPresetName[] = ['smooth', 'bouncy', 'subtle', 'snappy']

@Component({
  selector: 'app-demo-builder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CodeBlockComponent],
  template: `
    <div class="builder">
      <header class="b-head">
        <h3>Toast builder</h3>
        <p>Design and test your toast in real time.</p>
      </header>

      <!-- Position -->
      <div class="group" role="group" aria-label="Position">
        <span class="label">Position</span>
        <div class="pills">
          @for (p of positions; track p) {
            <button
              type="button"
              class="pill"
              [class.on]="position() === p"
              [attr.aria-pressed]="position() === p"
              (click)="position.set(p)"
            >{{ p }}</button>
          }
        </div>
      </div>

      <!-- Type -->
      <div class="group" role="group" aria-label="Type">
        <span class="label">Type</span>
        <div class="pills">
          @for (t of types; track t) {
            <button
              type="button"
              class="pill"
              [class.on]="type() === t"
              [attr.data-type]="t"
              [attr.aria-pressed]="type() === t"
              (click)="type.set(t)"
            >{{ t }}</button>
          }
        </div>
      </div>

      <!-- Title -->
      <div class="group">
        <label class="label" for="b-title">Title</label>
        <input
          id="b-title"
          class="input"
          type="text"
          [value]="title()"
          (input)="title.set($any($event.target).value)"
        />
      </div>

      <!-- Description -->
      <div class="group">
        <div class="row">
          <label class="label inline" for="b-desc-on">Description</label>
          <button
            id="b-desc-on"
            type="button"
            class="switch"
            [class.on]="descriptionOn()"
            role="switch"
            [attr.aria-checked]="descriptionOn()"
            (click)="descriptionOn.set(!descriptionOn())"
          ><span class="knob"></span></button>
        </div>
        @if (descriptionOn()) {
          <textarea
            class="input area"
            rows="2"
            aria-label="Description text"
            [value]="descriptionText()"
            (input)="descriptionText.set($any($event.target).value)"
          ></textarea>
        }
      </div>

      <!-- Action -->
      <div class="group">
        <div class="row">
          <label class="label inline accent" for="b-action-on">Action Button</label>
          <button
            id="b-action-on"
            type="button"
            class="switch"
            [class.on]="actionOn()"
            role="switch"
            [attr.aria-checked]="actionOn()"
            (click)="actionOn.set(!actionOn())"
          ><span class="knob"></span></button>
        </div>
      </div>

      <!-- Style -->
      <div class="group">
        <span class="label">Style</span>
        <div class="row">
          <span class="sub">Fill Color</span>
          <div class="color-row">
            <input
              class="color"
              type="color"
              aria-label="Fill color"
              [value]="fillColor()"
              (input)="fillColor.set($any($event.target).value)"
            />
            <input
              class="input hex"
              type="text"
              aria-label="Fill color hex"
              [value]="fillColor()"
              (input)="fillColor.set($any($event.target).value)"
            />
          </div>
        </div>
        <div class="row">
          <span class="sub">Border</span>
          <button
            type="button"
            class="switch"
            [class.on]="borderOn()"
            role="switch"
            aria-label="Border"
            [attr.aria-checked]="borderOn()"
            (click)="borderOn.set(!borderOn())"
          ><span class="knob"></span></button>
        </div>
      </div>

      <!-- Timing -->
      <div class="group">
        <span class="label">Timing</span>
        <div class="row">
          <label class="sub" for="b-duration">Display Duration</label>
          <span class="value">{{ durationLabel() }}</span>
        </div>
        <input
          id="b-duration"
          class="slider"
          type="range"
          min="1000"
          max="10000"
          step="500"
          [value]="duration()"
          (input)="duration.set(+$any($event.target).value)"
        />
      </div>

      <!-- Preset -->
      <div class="group" role="group" aria-label="Animation preset">
        <span class="label">Animation Preset</span>
        <div class="pills">
          @for (pr of presets; track pr) {
            <button
              type="button"
              class="pill"
              [class.on]="preset() === pr"
              [attr.aria-pressed]="preset() === pr"
              (click)="selectPreset(pr)"
            >{{ pr }}</button>
          }
        </div>
      </div>

      <!-- Spring -->
      <div class="group">
        <div class="row">
          <span class="label inline">Spring Effect</span>
          <button
            type="button"
            class="switch"
            [class.on]="springOn()"
            role="switch"
            aria-label="Spring effect"
            [attr.aria-checked]="springOn()"
            (click)="springOn.set(!springOn())"
          ><span class="knob"></span></button>
        </div>
        @if (springOn()) {
          <div class="row">
            <label class="sub" for="b-bounce">Bounce: {{ bounce().toFixed(2) }}</label>
          </div>
          <input
            id="b-bounce"
            class="slider"
            type="range"
            min="0"
            max="1"
            step="0.05"
            [value]="bounce()"
            (input)="bounce.set(+$any($event.target).value)"
          />
        }
      </div>

      <!-- Theme -->
      <div class="group" role="group" aria-label="Theme">
        <span class="label">Theme</span>
        <div class="pills">
          <button
            type="button"
            class="pill"
            [class.on]="theme() === 'light'"
            [attr.aria-pressed]="theme() === 'light'"
            (click)="theme.set('light')"
          >light</button>
          <button
            type="button"
            class="pill"
            [class.on]="theme() === 'dark'"
            [attr.aria-pressed]="theme() === 'dark'"
            (click)="theme.set('dark')"
          >dark</button>
        </div>
      </div>

      <!-- Boolean toggles -->
      @for (tg of toggles; track tg.label) {
        <div class="row toggle-row">
          <span class="label inline">{{ tg.label }}</span>
          <button
            type="button"
            class="switch"
            [class.on]="tg.value()"
            role="switch"
            [attr.aria-label]="tg.label"
            [attr.aria-checked]="tg.value()"
            (click)="tg.value.set(!tg.value())"
          ><span class="knob"></span></button>
        </div>
      }

      <button type="button" class="fire" (click)="fire()">Fire Toast</button>
      <button type="button" class="fire" (click)="fireBurst()">Fire ×3 (test coalesce)</button>
      <p class="hint">Tip: drag a toast away to dismiss it.</p>

      <app-code-block [code]="code()" />
    </div>
  `,
  styleUrl: './demo-builder.component.css',
})
export class DemoBuilderComponent {
  protected readonly toast = inject(GooeyToastService)

  protected readonly positions = POSITIONS
  protected readonly types = TYPES
  protected readonly presets = PRESETS

  // Toaster-level config. Public because the <gooey-toaster> now lives in
  // DemoComponent (outside the sticky builder column, which would otherwise
  // trap the fixed toaster's z-index behind the header) and reads these via
  // viewChild.
  readonly position = signal<GooeyPosition>('top-left')
  readonly theme = signal<'light' | 'dark'>('light')
  readonly showProgress = signal(false)
  readonly closeOnEscape = signal(true)
  protected readonly closeButtonOn = signal(false)
  readonly coalesceDuplicates = signal(true)
  readonly merge = signal(false)
  readonly newestFirst = signal(true)
  readonly haptics = signal(false)
  readonly closeButton = computed<boolean | 'top-right'>(() =>
    this.closeButtonOn() ? 'top-right' : false,
  )

  // Per-toast fields
  protected readonly type = signal<GooeyToastType>('success')
  protected readonly title = signal('Changes saved')
  protected readonly descriptionOn = signal(true)
  protected readonly descriptionText = signal(
    'Your changes have been saved and synced successfully.',
  )
  protected readonly actionOn = signal(false)
  protected readonly fillColor = signal('#ffffff')
  protected readonly borderOn = signal(false)
  protected readonly duration = signal(4000)
  protected readonly preset = signal<AnimationPresetName>('smooth')
  protected readonly springOn = signal(true)
  protected readonly bounce = signal(0.4)
  protected readonly showTimestamp = signal(true)

  protected readonly toggles = [
    { label: 'Show Progress', value: this.showProgress },
    { label: 'Close on Escape', value: this.closeOnEscape },
    { label: 'Show Timestamp', value: this.showTimestamp },
    { label: 'Close Button', value: this.closeButtonOn },
    { label: 'Coalesce Duplicates', value: this.coalesceDuplicates },
    { label: 'Merge Blobs', value: this.merge },
    { label: 'Newest nearest edge', value: this.newestFirst },
    { label: 'Haptics (mobile)', value: this.haptics },
  ]

  protected readonly durationLabel = computed(() => `${(this.duration() / 1000).toFixed(1)}s`)

  private buildOptions(): GooeyToastOptions {
    const opts: GooeyToastOptions = {}
    if (this.descriptionOn() && this.descriptionText().trim()) {
      opts.description = this.descriptionText().trim()
    }
    if (this.actionOn()) {
      opts.action = {
        label: 'Undo',
        successLabel: 'Done',
        onClick: () => this.toast.info('Action clicked'),
      }
    }
    if (this.fillColor().toLowerCase() !== '#ffffff') opts.fillColor = this.fillColor()
    if (this.borderOn()) opts.borderColor = '#6366f1'
    if (this.duration() !== 4000) opts.duration = this.duration()
    opts.preset = this.preset()
    opts.spring = this.springOn()
    if (this.springOn()) opts.bounce = this.bounce()
    // Always set — entry default is true, so omitting can't turn it off.
    opts.showTimestamp = this.showTimestamp()
    return opts
  }

  protected selectPreset(p: AnimationPresetName): void {
    // Presets only vary `bounce` (all spring:true). Since the builder always
    // sends the slider's bounce (which overrides preset.bounce), sync the slider
    // to the preset so the choice is actually reflected.
    this.preset.set(p)
    this.springOn.set(animationPresets[p].spring)
    this.bounce.set(animationPresets[p].bounce)
  }

  protected fire(): void {
    const opts = this.buildOptions()
    const title = this.title()
    switch (this.type()) {
      case 'success':
        this.toast.success(title, opts)
        break
      case 'error':
        this.toast.error(title, opts)
        break
      case 'warning':
        this.toast.warning(title, opts)
        break
      case 'info':
        this.toast.info(title, opts)
        break
      default:
        this.toast.show(title, opts)
    }
  }

  /** Fire the same toast three times to show duplicate coalescing. */
  protected fireBurst(): void {
    this.fire()
    this.fire()
    this.fire()
  }

  protected readonly code = computed(() => {
    const lines: string[] = []
    lines.push(`<gooey-toaster [position]="'${this.position()}'" [theme]="'${this.theme()}'" />`)
    lines.push('')

    const opts = this.optionLinesForCode()
    const method = this.type() === 'default' ? 'show' : this.type()
    const call = `this.toast.${method}('${this.escape(this.title())}'`
    if (opts.length === 0) {
      lines.push(`${call})`)
    } else {
      lines.push(`${call}, {`)
      for (const o of opts) lines.push(`  ${o},`)
      lines.push('})')
    }
    return lines.join('\n')
  })

  private optionLinesForCode(): string[] {
    const o: string[] = []
    if (this.descriptionOn() && this.descriptionText().trim()) {
      o.push(`description: '${this.escape(this.descriptionText().trim())}'`)
    }
    if (this.actionOn()) {
      o.push(`action: { label: 'Undo', successLabel: 'Done', onClick: () => {} }`)
    }
    if (this.fillColor().toLowerCase() !== '#ffffff') o.push(`fillColor: '${this.fillColor()}'`)
    if (this.borderOn()) o.push(`borderColor: '#6366f1'`)
    if (this.duration() !== 4000) o.push(`duration: ${this.duration()}`)
    o.push(`preset: '${this.preset()}'`)
    o.push(`spring: ${this.springOn()}`)
    if (this.springOn()) o.push(`bounce: ${this.bounce().toFixed(2)}`)
    if (!this.showTimestamp()) o.push(`showTimestamp: false`)
    return o
  }

  private escape(s: string): string {
    return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  }
}
