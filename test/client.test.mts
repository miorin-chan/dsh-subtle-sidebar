import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import { createElement } from 'react'
import { create, act } from 'react-test-renderer'

let registration
globalThis.window = { __ModuleLoader__: { load(entry) { registration = entry } } }
await import('../client.js')
assert.equal(registration.id, '@miorin/dsh-subtle-sidebar')
const plugin = registration.factory(createRequire(import.meta.url))

function fixture({ collapsed = false, knownFrame = true } = {}) {
  const disposers = []
  let view
  let toggles = 0
  const ctx = {
    layout: { toggleSidebar() { toggles += 1 } },
    slots: {
      inject(name, install) { assert.equal(name, 'shell.overlay'); return install() },
      register(options, component) {
        assert.equal(options.id, 'dsh-subtle-sidebar')
        view = component
        return () => { view = undefined }
      },
    },
    effect(install) { disposers.push(install()) },
  }
  plugin.apply(ctx)
  function mount() {
    let root
    act(() => {
      root = create(createElement(view), {
        createNodeMock: () => ({
          closest: () => ({
            parentElement: knownFrame ? { matches: () => true, hasAttribute: () => collapsed } : null,
          }),
        }),
      })
    })
    return () => act(() => root.unmount())
  }
  return {
    mount,
    hasSlot: () => view !== undefined,
    toggleCount: () => toggles,
    dispose() { for (const off of disposers.reverse()) off() },
  }
}

test('declares only the layout and slots service injections', () => {
  assert.deepEqual([...plugin.inject], ['layout', 'slots'])
})

test('collapses the native sidebar once without reopening it on a slot remount', () => {
  const f = fixture()
  assert.equal(f.hasSlot(), true)
  f.mount()()
  f.mount()()
  assert.equal(f.toggleCount(), 1)
  f.dispose()
  assert.equal(f.hasSlot(), false)
})

test('leaves an already closed sidebar and an unrecognized frame alone', () => {
  for (const options of [{ collapsed: true }, { knownFrame: false }]) {
    const f = fixture(options)
    f.mount()()
    assert.equal(f.toggleCount(), 0)
    f.dispose()
  }
})
