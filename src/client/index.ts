import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { createElement, useLayoutEffect, useRef } from 'react'

const ID = 'dsh-subtle-sidebar'
const SLOT = 'shell.overlay'

export const inject = ['layout', 'slots']

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
}
