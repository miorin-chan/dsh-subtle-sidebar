import type { Context } from '@deepseek-ai/cordis'
import type { ShortcutBinding, ShortcutCommandId, Shortcuts } from '@deepseek-ai/dsh-client-shortcuts/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { createElement, useLayoutEffect, useRef } from 'react'

const ID = 'dsh-subtle-sidebar'
const SLOT = 'shell.overlay'
const LEFT = 'sidebar.left.toggle' as ShortcutCommandId
const RIGHT = 'sidebar.right.toggle' as ShortcutCommandId

type Snapshot = ReturnType<Shortcuts['config']['getSnapshot']>
type Edit = Parameters<Shortcuts['edit']>[0]

function sameBinding(a: ShortcutBinding | null | undefined, b: typeof a): boolean {
  if (a == null || b == null) return a === b
  return a.code === b.code && a.secondCode === b.secondCode && a.modifiers.join(',') === b.modifiers.join(',')
}

/** Native edits are revision-checked and single-command. Release the left key before assigning it to the right. */
async function swap(shortcuts: Shortcuts, start: Snapshot, left: ShortcutBinding, right: ShortcutBinding,
  isDisposed: () => boolean): Promise<'saved' | 'retry' | 'stopped'> {
  const profile = `${shortcuts.runtime}:${shortcuts.platform}` as const
  const sequence: readonly Edit[] = [
    { type: 'set', id: LEFT, binding: null },
    { type: 'set', id: RIGHT, binding: left },
    { type: 'set', id: LEFT, binding: right },
  ]
  let accepted = start
  let saved = 0
  const edit = async (operation: Edit, revision: Snapshot['revision']) => {
    try {
      return await shortcuts.edit(operation, revision)
    } catch (error) {
      console.warn(`${ID}: shortcut preferences could not be updated`, error)
      return undefined
    }
  }
  for (const operation of sequence) {
    if (isDisposed()) break
    const result = await edit(operation, accepted.revision)
    if (result?.status !== 'saved') {
      if (saved === 0 && (result?.status === 'stale' || result?.status === 'not-ready')) return 'retry'
      console.warn(`${ID}: sidebar shortcuts were not swapped (${result?.status ?? 'error'})`)
      break
    }
    accepted = result.snapshot
    saved += 1
  }
  if (saved === sequence.length) return 'saved'

  // Reset only our intermediate edits, in reverse order. A newer user edit wins.
  for (const id of (saved === 2 ? [RIGHT, LEFT] : saved === 1 ? [LEFT] : [])) {
    const current = shortcuts.config.getSnapshot()
    const expected = accepted.document.profiles[profile]
    const actual = current.document.profiles[profile]
    if (current.status !== 'ready' || !sameBinding(actual?.[id], expected?.[id])) continue
    const result = await edit({ type: 'reset', id }, current.revision)
    if (result?.status !== 'saved') {
      console.warn(`${ID}: could not restore the intermediate shortcut edit (${result?.status ?? 'error'})`)
    }
  }
  return 'stopped'
}

function watchDefaultBindings(shortcuts: Shortcuts): () => void {
  let disposed = false
  let busy = false
  let attemptedRevision: Snapshot['revision'] | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let off: (() => void)[] = []
  const stop = () => {
    disposed = true
    clearTimeout(timer)
    for (const dispose of off) dispose()
    off = []
  }
  const schedule = () => {
    if (disposed || busy) return
    clearTimeout(timer)
    const config = shortcuts.config.getSnapshot()
    const catalog = shortcuts.catalog.getSnapshot()
    const left = catalog.find(row => row.id === LEFT)
    const right = catalog.find(row => row.id === RIGHT)
    if (config.status !== 'ready' || left === undefined || right === undefined) return
    if (left.modified || right.modified || left.binding === null || right.binding === null) { stop(); return }
    if (left.issue || right.issue || left.conflicts.length || right.conflicts.length) return
    if (attemptedRevision === config.revision) return
    const { binding: oldLeft } = left
    const { binding: oldRight } = right
    // Built-in commands register during bootstrap and invalidate the native catalog revision.
    // Coalesce those notifications before attempting any writes.
    timer = setTimeout(() => {
      busy = true
      attemptedRevision = config.revision
      void swap(shortcuts, config, oldLeft, oldRight, () => disposed).then(outcome => {
        busy = false
        if (outcome === 'retry') schedule()
        else stop()
      })
    }, 150)
  }
  off = [shortcuts.catalog.subscribe(schedule), shortcuts.config.subscribe(schedule)]
  schedule()
  return stop
}

export const inject = ['layout', 'slots', 'shortcuts']

export function apply(ctx: Context): void {
  const layout = ctx.layout
  let initialized = false
  function StartupCollapse() {
    const anchor = useRef<HTMLSpanElement>(null)
    useLayoutEffect(() => {
      if (initialized) return
      // AppFrame in DSH 0.2.2-rc.5 puts the overlay directly under its frame.
      // Its data markers distinguish an already-collapsed drawer/rail from an open sidebar.
      // If the frame contract changes, do not blindly toggle.
      const frame = anchor.current?.closest('[data-shell-overlay]')?.parentElement
      if (!frame || !frame.matches('[data-rightbar-collapsed], [data-rightbar-fullscreen]')
        && frame.style.gridTemplateColumns === '') return
      initialized = true
      if (!frame.hasAttribute('data-sidebar-collapsed')) layout.toggleSidebar()
    }, [])
    return createElement('span', { ref: anchor, hidden: true, 'data-dsh-subtle-sidebar': '' })
  }
  ctx.effect(() => ctx.slots.inject(SLOT, () => ctx.slots.register({ name: SLOT, id: ID }, StartupCollapse)))
  ctx.effect(() => watchDefaultBindings(ctx.shortcuts))
}
