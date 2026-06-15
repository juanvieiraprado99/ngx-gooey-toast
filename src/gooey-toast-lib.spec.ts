import {
  animate,
  squishSpring,
  morphPath,
  PH,
  GooeyToastService,
  renderMarkdown,
  isRichContent,
  orderStack,
  hapticPattern,
} from 'ngx-gooey-toast'
import {
  rubberBand,
  shouldDismissSwipe,
  verticalDismissAllowed,
} from '../projects/ngx-gooey-toast/src/lib/gooey-toast.component'

describe('gooey-morph', () => {
  it('pill height constant is 34', () => {
    expect(PH).toBe(34)
  })

  it('t=0 is a pure pill (no quadratic curve)', () => {
    const pill = morphPath(120, 300, 80, 0)
    expect(pill.startsWith('M 0,17')).toBe(true)
    expect(pill.includes('Q')).toBe(false)
  })

  it('t=1 is an organic blob (has a quadratic curve and differs from the pill)', () => {
    const pill = morphPath(120, 300, 80, 0)
    const blob = morphPath(120, 300, 80, 1)
    expect(blob.includes('Q')).toBe(true)
    expect(blob).not.toBe(pill)
  })
})

describe('spring-animate', () => {
  it('squishSpring derives deterministic stiffness/damping/mass', () => {
    const s = squishSpring(0.6, 0.6, 0.4)
    expect(s.stiffness).toBeCloseTo(375)
    expect(s.damping).toBeCloseTo(16)
    expect(s.mass).toBeCloseTo(0.7)
  })

  it('a zero-duration tween snaps to the target and completes synchronously', () => {
    let final = NaN
    let done = false
    animate(0, 10, {
      duration: 0,
      onUpdate: (v) => (final = v),
      onComplete: () => (done = true),
    })
    expect(final).toBe(10)
    expect(done).toBe(true)
  })

  it('returns a controller with a stop() method', () => {
    const ctrl = animate(0, 1, { duration: 1, onUpdate: () => {} })
    expect(typeof ctrl.stop).toBe('function')
    ctrl.stop()
  })
})

describe('swipe gesture', () => {
  it('rubberBand is identity within the threshold and damped past it', () => {
    expect(rubberBand(40, 100)).toBe(40)
    expect(rubberBand(-100, 100)).toBe(-100)
    // 50px past threshold → threshold + 50*0.35 = 117.5
    expect(rubberBand(150, 100)).toBeCloseTo(117.5)
    expect(rubberBand(-150, 100)).toBeCloseTo(-117.5)
  })

  it('shouldDismissSwipe triggers on distance OR velocity', () => {
    expect(shouldDismissSwipe(120, 0, 100)).toBe(true) // far enough
    expect(shouldDismissSwipe(20, 1.2, 100)).toBe(true) // fast flick
    expect(shouldDismissSwipe(20, 0.1, 100)).toBe(false) // neither
  })

  it('verticalDismissAllowed only outward (up for top, down for bottom)', () => {
    expect(verticalDismissAllowed(-30, true)).toBe(true) // top, drag up
    expect(verticalDismissAllowed(30, true)).toBe(false) // top, drag down
    expect(verticalDismissAllowed(30, false)).toBe(true) // bottom, drag down
    expect(verticalDismissAllowed(-30, false)).toBe(false) // bottom, drag up
  })
})

describe('rich content', () => {
  it('renderMarkdown formats the supported subset', () => {
    expect(renderMarkdown('**b**')).toBe('<strong>b</strong>')
    expect(renderMarkdown('*i*')).toBe('<em>i</em>')
    expect(renderMarkdown('`c`')).toBe('<code>c</code>')
    expect(renderMarkdown('a\nb')).toBe('a<br>b')
    expect(renderMarkdown('[x](https://a.com)')).toContain(
      '<a href="https://a.com" target="_blank" rel="noopener noreferrer">x</a>',
    )
  })

  it('renderMarkdown escapes HTML so injected tags cannot execute', () => {
    const out = renderMarkdown('<script>alert(1)</script>')
    expect(out).not.toContain('<script>')
    expect(out).toContain('&lt;script&gt;')
  })

  it('renderMarkdown does not turn javascript: links into anchors', () => {
    const out = renderMarkdown('[x](javascript:alert(1))')
    expect(out).not.toContain('<a ')
  })

  it('isRichContent matches the rich wrappers only', () => {
    expect(isRichContent({ html: '<b>x</b>' })).toBe(true)
    expect(isRichContent({ markdown: '**x**' })).toBe(true)
    expect(isRichContent('plain')).toBe(false)
    expect(isRichContent(null)).toBe(false)
  })
})

describe('orderStack', () => {
  const list = ['a', 'b', 'c'] // oldest → newest

  it('newest-first puts newest nearest the edge per position', () => {
    expect(orderStack(list, true, false)).toEqual(['c', 'b', 'a']) // top: newest first
    expect(orderStack(list, false, false)).toEqual(['a', 'b', 'c']) // bottom: newest last
  })

  it('oldest-first flips the order', () => {
    expect(orderStack(list, true, true)).toEqual(['a', 'b', 'c'])
    expect(orderStack(list, false, true)).toEqual(['c', 'b', 'a'])
  })

  it('does not mutate the input', () => {
    orderStack(list, true, true)
    expect(list).toEqual(['a', 'b', 'c'])
  })
})

describe('hapticPattern', () => {
  it('returns a distinct non-empty pattern per type', () => {
    for (const t of ['default', 'success', 'error', 'warning', 'info'] as const) {
      const p = hapticPattern(t)
      expect(Array.isArray(p)).toBe(true)
      expect(p.length).toBeGreaterThan(0)
    }
    // error is the strongest (longest pattern); success is a single tick.
    expect(hapticPattern('error').length).toBeGreaterThan(hapticPattern('success').length)
  })
})

describe('GooeyToastService', () => {
  it('adds a toast and returns its id', () => {
    const s = new GooeyToastService()
    const id = s.success('Saved')
    expect(s.toasts().length).toBe(1)
    expect(s.toasts()[0].id).toBe(id)
    expect(s.toasts()[0].title()).toBe('Saved')
  })

  it('caps visible toasts and drains the queue on removal', () => {
    const s = new GooeyToastService()
    s.visibleToasts.set(2)
    const id1 = s.info('a')
    s.info('b')
    s.info('c')
    expect(s.toasts().length).toBe(2)

    s.remove(id1, 'manual')
    expect(s.toasts().length).toBe(2)
    expect(s.toasts().map((t) => t.title())).toContain('c')
  })

  it('dismiss(filter) flags matching active toasts for exit', () => {
    const s = new GooeyToastService()
    s.error('boom')
    s.dismiss({ type: 'error' })
    expect(s.toasts()[0].exitRequest()).toBe('manual')
  })

  it('remove(auto) fires onAutoClose and onDismiss', () => {
    const s = new GooeyToastService()
    let auto = false
    let dismissed = false
    const id = s.success('y', {
      onAutoClose: () => (auto = true),
      onDismiss: () => (dismissed = true),
    })
    s.remove(id, 'auto')
    expect(auto).toBe(true)
    expect(dismissed).toBe(true)
    expect(s.toasts().length).toBe(0)
  })

  it('coalesces duplicate toasts into one with a bumped count + pulse', () => {
    const s = new GooeyToastService()
    s.coalesceDuplicates.set(true)
    const id1 = s.success('Saved')
    const id2 = s.success('Saved')
    expect(id2).toBe(id1)
    expect(s.toasts().length).toBe(1)
    expect(s.toasts()[0].count()).toBe(2)
    expect(s.toasts()[0].pulse()).toBe(1)
  })

  it('does not coalesce when disabled (default)', () => {
    const s = new GooeyToastService()
    const id1 = s.success('Saved')
    const id2 = s.success('Saved')
    expect(id2).not.toBe(id1)
    expect(s.toasts().length).toBe(2)
  })

  it('per-toast coalesce:false opts out even when globally enabled', () => {
    const s = new GooeyToastService()
    s.coalesceDuplicates.set(true)
    s.success('Saved')
    s.success('Saved', { coalesce: false })
    expect(s.toasts().length).toBe(2)
  })

  it('does not coalesce toasts that differ in title, type, or description', () => {
    const s = new GooeyToastService()
    s.coalesceDuplicates.set(true)
    s.success('Saved')
    s.success('Removed') // different title
    s.error('Saved') // different type
    s.success('Saved', { description: 'synced' }) // different description
    expect(s.toasts().length).toBe(4)
  })

  it('records dismissed toasts in history (newest first)', () => {
    const s = new GooeyToastService()
    const id = s.error('Boom', { description: 'bad' })
    s.remove(id, 'manual')
    const h = s.history()
    expect(h.length).toBe(1)
    expect(h[0].id).toBe(id)
    expect(h[0].title).toBe('Boom')
    expect(h[0].type).toBe('error')
    expect(h[0].description).toBe('bad')
  })

  it('replay re-fires a dismissed toast as a fresh one', () => {
    const s = new GooeyToastService()
    const id = s.success('Saved')
    s.remove(id, 'manual')
    const newId = s.replay(s.history()[0].id)
    expect(newId).toBeDefined()
    expect(newId).not.toBe(id)
    expect(s.toasts().length).toBe(1)
    expect(s.toasts()[0].title()).toBe('Saved')
    expect(s.toasts()[0].type()).toBe('success')
  })

  it('history is bounded and evicts the oldest replay closure', () => {
    const s = new GooeyToastService()
    s.historyLimit.set(2)
    const a = s.info('a')
    const b = s.info('b')
    const c = s.info('c')
    s.remove(a, 'manual')
    s.remove(b, 'manual')
    s.remove(c, 'manual')
    expect(s.history().length).toBe(2)
    expect(s.history().map((r) => r.title)).toEqual(['c', 'b'])
    expect(s.replay(a)).toBeUndefined() // evicted
  })

  it('historyLimit 0 disables capture', () => {
    const s = new GooeyToastService()
    s.historyLimit.set(0)
    const id = s.info('x')
    s.remove(id, 'manual')
    expect(s.history().length).toBe(0)
  })

  it('clearHistory empties history but keeps live-toast replays', () => {
    const s = new GooeyToastService()
    const dead = s.info('dead')
    s.remove(dead, 'manual')
    const live = s.success('live')
    s.clearHistory()
    expect(s.history().length).toBe(0)
    expect(s.replay(dead)).toBeUndefined()
    expect(s.replay(live)).toBeDefined() // still on screen
  })

  it('promise toast has a finite duration so a simple settled result auto-closes', () => {
    const s = new GooeyToastService()
    const id = s.promise(Promise.resolve(), {
      loading: 'Saving',
      success: 'Saved',
      error: 'Failed',
    })
    const entry = s.toasts().find((t) => t.id === id)!
    // Regression: was Number.POSITIVE_INFINITY → a no-description result never dismissed.
    expect(Number.isFinite(entry.duration)).toBe(true)
  })

  it('update() mutates the entry in place', () => {
    const s = new GooeyToastService()
    const id = s.info('Connecting')
    s.update(id, { title: 'Connected', type: 'success' })
    const entry = s.toasts().find((t) => t.id === id)!
    expect(entry.title()).toBe('Connected')
    expect(entry.type()).toBe('success')
    expect(entry.phase()).toBe('success')
  })

  it('options.duration flows into entry.duration (used by ALL dismiss timers)', () => {
    const s = new GooeyToastService()
    const id = s.success('slow', { duration: 10000, description: 'body' })
    expect(s.toasts().find((t) => t.id === id)!.duration).toBe(10000)
    const sticky = s.info('sticky', { duration: Number.POSITIVE_INFINITY })
    expect(s.toasts().find((t) => t.id === sticky)!.duration).toBe(
      Number.POSITIVE_INFINITY,
    )
  })

  it('defaultDuration (toaster duration input) is the fallback for new toasts', () => {
    const s = new GooeyToastService()
    s.defaultDuration.set(9000)
    const plain = s.info('a')
    const explicit = s.info('b', { duration: 1000 })
    expect(s.toasts().find((t) => t.id === plain)!.duration).toBe(9000)
    expect(s.toasts().find((t) => t.id === explicit)!.duration).toBe(1000)
  })

  it('coalesces against queued (overflowed) toasts too', () => {
    const s = new GooeyToastService()
    s.coalesceDuplicates.set(true)
    s.visibleToasts.set(1)
    s.info('first') // visible
    const q1 = s.info('queued') // overflows into the queue
    const q2 = s.info('queued') // must merge with the queued one
    expect(q2).toBe(q1)
    expect(s.toasts().length).toBe(1)
  })

  it('dismiss(id) of a queued toast fires onDismiss', () => {
    const s = new GooeyToastService()
    s.visibleToasts.set(1)
    let dismissed: string | number | undefined
    s.info('visible')
    const queued = s.info('queued', { onDismiss: (id) => (dismissed = id) })
    s.dismiss(queued)
    expect(dismissed).toBe(queued)
  })

  it('dismiss() clears the queue and honors queued onDismiss callbacks', () => {
    const s = new GooeyToastService()
    s.visibleToasts.set(1)
    let count = 0
    s.info('visible')
    s.info('q1', { onDismiss: () => count++ })
    s.info('q2', { onDismiss: () => count++ })
    s.dismiss()
    expect(count).toBe(2)
  })

  it('generated ids are unique across many toasts', () => {
    const s = new GooeyToastService()
    s.visibleToasts.set(Number.POSITIVE_INFINITY)
    const ids = new Set<string | number>()
    for (let i = 0; i < 100; i++) ids.add(s.info(`t${i}`))
    expect(ids.size).toBe(100)
  })
})
