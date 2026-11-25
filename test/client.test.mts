import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { setTimeout as delay } from 'node:timers/promises'
import { test } from 'node:test'
import { createElement } from 'react'
import { create, act } from 'react-test-renderer'

let registration
globalThis.window = { __ModuleLoader__: { load(entry) { registration = entry } } }
await import('../client.js')
assert.equal(registration.id, '@miorin/dsh-subtle-sidebar')
const plugin = registration.factory(createRequire(import.meta.url))

const LEFT = 'sidebar.left.toggle'
const RIGHT = 'sidebar.right.toggle'
const leftKey = { code: 'KeyB', modifiers: ['meta'] }
const rightKey = { code: 'KeyB', modifiers: ['meta', 'alt'] }
const ids = [LEFT, RIGHT]

function fixture({ collapsed = false, overrides = {}, failAt = 0, staleAt = 0, beforeFailure, loading = false,
  knownFrame = true, bound = true } = {}) {
  let revision = 0
  let preferences = { ...overrides }
  let status = loading ? 'loading' : 'ready'
  const snapshot = () => ({ status, revision, document: { profiles: { 'desktop:macos': { ...preferences } } } })
  const listeners = new Set()
  const observable = getSnapshot => ({ getSnapshot, subscribe(callback) {
    listeners.add(callback)
    return () => listeners.delete(callback)
  } })
  const emit = () => { for (const callback of [...listeners]) callback() }
  const calls = []
  const shortcuts = {
    runtime: 'desktop', platform: 'macos',
    config: observable(snapshot),
    catalog: observable(() => ids.map((id, index) => ({ id, modified: Object.hasOwn(preferences, id),
      binding: bound ? Object.hasOwn(preferences, id) ? preferences[id] : [leftKey, rightKey][index] : null,
      issue: null, conflicts: [] }))),
    async edit(operation, expected) {
      assert.equal(expected, revision)
      calls.push(operation)
      if (calls.length === staleAt) {
        revision += 1
        emit()
        return { status: 'stale', snapshot: snapshot() }
      }
      if (calls.length === failAt) {
        preferences = beforeFailure?.(preferences) ?? preferences
        revision += 1
        emit()
        return { status: 'write-failed', snapshot: snapshot() }
      }
      if (operation.type === 'reset') delete preferences[operation.id]
      else preferences[operation.id] = operation.binding
      revision += 1
      emit()
      return { status: 'saved', snapshot: snapshot() }
    },
  }
  const disposers = []
  let view
  let toggles = 0
  const ctx = {
    shortcuts,
    layout: { toggleSidebar() { toggles += 1 } },
    slots: {
      inject(name, install) { assert.equal(name, 'shell.overlay'); return install() },
      register(options, component) { assert.equal(options.id, 'dsh-subtle-sidebar'); view = component; return () => { view = undefined } },
    },
    effect(install) { disposers.push(install()) },
  }
  plugin.apply(ctx)
  function mount() {
    let root
    act(() => {
      root = create(createElement(view), { createNodeMock: () => ({ closest: () => ({
        parentElement: knownFrame ? { matches: () => true, hasAttribute: () => collapsed } : null,
      }) }) })
    })
    return () => act(() => root.unmount())
  }
  return { calls, listeners, mount, toggleCount: () => toggles, current: () => preferences,
    ready() { status = 'ready'; revision += 1; emit() }, dispose() { for (const off of disposers.reverse()) off() } }
}

const wait = () => delay(225)

test('collapses the native sidebar once without reopening it on a slot remount', () => {
  const f = fixture()
  f.mount()()
  f.mount()()
  assert.equal(f.toggleCount(), 1)
  f.dispose()
  assert.equal(f.listeners.size, 0)
})

test('leaves an already closed sidebar and an unrecognized frame alone', () => {
  for (const options of [{ collapsed: true }, { knownFrame: false }]) {
    const f = fixture(options)
    f.mount()()
    assert.equal(f.toggleCount(), 0)
    f.dispose()
  }
})

test('swaps only the two defaults after native preferences are ready', async () => {
  const other = { code: 'KeyG', modifiers: ['meta'] }
  const f = fixture({ overrides: { 'other.command': other }, loading: true })
  assert.deepEqual(f.calls, [])
  f.ready()
  await wait()
  assert.deepEqual(f.calls, [
    { type: 'set', id: LEFT, binding: null },
    { type: 'set', id: RIGHT, binding: leftKey },
    { type: 'set', id: LEFT, binding: rightKey },
  ])
  assert.deepEqual(f.current(), { 'other.command': other, [LEFT]: rightKey, [RIGHT]: leftKey })
  assert.equal(f.listeners.size, 0)
  f.dispose()
})

test('leaves existing modifications, an unbound platform, and disposed work untouched', async () => {
  const existing = fixture({ overrides: { [LEFT]: null } })
  const unbound = fixture({ bound: false })
  const disposed = fixture()
  disposed.dispose()
  await wait()
  for (const f of [existing, unbound, disposed]) {
    assert.deepEqual(f.calls, [])
    assert.equal(f.listeners.size, 0)
    f.dispose()
  }
})

test('retries a stale first write and restores defaults after a later failure', async () => {
  const stale = fixture({ staleAt: 1 })
  const failed = fixture({ failAt: 3 })
  await delay(400)
  assert.equal(stale.calls.length, 4)
  assert.deepEqual(stale.current(), { [LEFT]: rightKey, [RIGHT]: leftKey })
  assert.deepEqual(failed.calls.slice(3), [{ type: 'reset', id: RIGHT }, { type: 'reset', id: LEFT }])
  assert.deepEqual(failed.current(), {})
  stale.dispose()
  failed.dispose()
})

test('restores the left binding without touching a concurrent right binding edit', async () => {
  const custom = { code: 'KeyG', modifiers: ['meta'] }
  const f = fixture({ failAt: 2, beforeFailure: preferences => ({ ...preferences, [RIGHT]: custom }) })
  await wait()
  assert.deepEqual(f.calls.slice(2), [{ type: 'reset', id: LEFT }])
  assert.deepEqual(f.current(), { [RIGHT]: custom })
  f.dispose()
})

test('does not reset newer user preferences after a failed write', async () => {
  const f = fixture({ failAt: 2, beforeFailure: preferences => ({ ...preferences, [LEFT]: leftKey }) })
  await wait()
  assert.equal(f.calls.length, 2)
  assert.deepEqual(f.current(), { [LEFT]: leftKey })
  f.dispose()
})
