import { expect, mock, test } from 'claude-code/testing'

import { RESUME_TEXT, countEvents, homeDir, pauseLeft, pauseText } from './panel'

const ev = (o: object) => JSON.stringify({ id: 'a', ts: '2026-10-30T10:00:00', tool: 'Bash', target: '', kinds: {}, placeholders: [], ...o })
// A value that must never be shown: it sits in the fields the panel does not read.
const SECRET = 'canary-value-do-not-show'
const LOG = [
  ev({ session: 'S1', event: 'start', action: 'pass' }),
  ev({ session: 'S1', event: 'post', action: 'masked', kinds: { SECRET: 2, EMAIL: 1 }, target: SECRET, placeholders: [SECRET] }),
  ev({ session: 'S1', event: 'prompt', action: 'block', kinds: { PHONE: 1 } }),
  ev({ session: 'S1', event: 'pre', action: 'deny' }),
  ev({ session: 'S1', event: 'pre', action: 'held', kinds: { SECRET: 1 } }),
  ev({ session: 'S1', event: 'skipped', action: 'skipped', reason: 'too-large', check: SECRET }),
  ev({ session: 'S1', event: 'prompt', action: 'control' }),
  ev({ session: 'OTHER', event: 'post', action: 'masked', kinds: { EMAIL: 9 } }),
  'not json',
  '[1]',
  'null',
].join('\n')

test('counts match the report: kinds summed, deny and block are stopped, other sessions left out', () => {
  expect(countEvents([LOG], 'S1')).toEqual({ masked: 3, stopped: 2, held: 1, skipped: 1, seen: 7 })
  expect(countEvents([LOG], 'OTHER')).toEqual({ masked: 9, stopped: 0, held: 0, skipped: 0, seen: 1 })
  expect(countEvents([LOG, LOG], 'S1').masked).toBe(6)
  expect(countEvents([''], 'S1')).toEqual({ masked: 0, stopped: 0, held: 0, skipped: 0, seen: 0 })
  // a kind count that is not a positive number counts nothing; a line with no kinds counts one
  expect(countEvents([ev({ session: 'S1', action: 'masked', kinds: { A: -2, B: 'x', C: 1.9 } })], 'S1').masked).toBe(1)
  // every key holds a number, never text from the log
  for (const n of Object.values(countEvents([LOG], 'S1'))) expect(typeof n).toBe('number')
})

test('pause minutes, the flag it writes, and the folder', () => {
  expect(pauseLeft(null, 0)).toBe(0)
  expect(pauseLeft('garbage', 0)).toBe(0)
  expect(pauseLeft('{"until":"x"}', 0)).toBe(0)
  expect(pauseLeft(pauseText(1_000_000, 10), 1_000_000)).toBe(10)
  expect(pauseLeft(pauseText(1_000_000, 10), 1_000_000 + 9 * 60_000 + 1000)).toBe(1)
  expect(pauseLeft(pauseText(1_000_000, 10), 1_000_000 + 600_000)).toBe(0)
  expect(pauseLeft(RESUME_TEXT, 5)).toBe(0)
  expect(homeDir('/x/cr/', 'C:\\Users\\a', '/home/a')).toBe('/x/cr')
  expect(homeDir(undefined, 'C:\\Users\\a', '/home/a')).toBe('C:\\Users\\a/.cloakroom')
  expect(homeDir(undefined, undefined, '/home/a')).toBe('/home/a/.cloakroom')
  expect(homeDir(undefined, undefined, undefined)).toBeNull()
})

const PANE = {
  plugin: 'cloakroom',
  component: 'Pane',
  requestId: 'cloakroom-panel',
  props: { title: 'Cloakroom', isFocused: false, bodyColumns: 40, placement: 'dock', scroll: { offset: 0, bodyRows: 20 }, view: {} },
} as const

// Cloakroom's folder in memory: the files the panel reads and the writes it makes.
async function world($: any, on: any, files: Record<string, string>) {
  const writes: [string, string][] = []
  const st = { exists: true, unreadable: false }
  mock.env(on, { CLOAKROOM_HOME: '/cr' })
  const clock = mock.clock(on, { now: 1_000_000_000 })
  on('command.register', () => ({ value: { command: 'cloakroom-panel' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.id', () => ({ value: 'S1' }))
  on('fs.exists', (_: any, e: any) => ({ value: st.exists && e.path === '/cr' }))
  on('fs.list', () => ({ value: Object.keys(files).map(name => ({ name, kind: 'file', size: files[name].length, mtimeMs: 1, isLink: false })) }))
  on('fs.read', (_: any, e: any) => {
    const name = e.path.replace('/cr/', '')
    if (st.unreadable) throw new Error('too big')
    if (!(name in files)) throw new Error('ENOENT')
    return { value: files[name] }
  })
  on('fs.write', (_: any, e: any) => {
    writes.push([e.path, e.text])
    files[e.path.replace('/cr/', '')] = e.text
    return { value: undefined }
  })
  on('session.start', (_: any, e: any) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  return { writes, clock, st }
}

async function shown($: any) {
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const text = (await ui.findAll({ type: 'Text' })).map((t: { text: string }) => t.text).join(' | ') as string
  return { ui, text }
}

test('the panel shows on, this session\'s counts, and never a value', async ($, on) => {
  await world($, on, { 'events-2026-10.jsonl': LOG })
  const { ui, text } = await shown($)
  expect(text).toContain('Cloakroom is on')
  expect(text).toMatch(/3.*Masked/)
  expect(text).toMatch(/2.*Stopped/)
  expect(text).toMatch(/1.*Held/)
  expect(text).toMatch(/1.*Not checked/)
  expect(text).not.toContain(SECRET)
  expect(text).not.toContain('EMAIL')
  await ui.unmount()
})

test('pause writes the flag Cloakroom reads, resume clears it, the light follows', async ($, on) => {
  const { writes } = await world($, on, { 'events-2026-10.jsonl': LOG })
  let { ui, text } = await shown($)
  expect(text).not.toContain('paused')
  await ui.press({ key: 'pause' })
  expect(writes).toHaveLength(1)
  expect(writes[0][0]).toBe('/cr/pause.json')
  expect(pauseLeft(writes[0][1], 1_000_000_000)).toBe(10)
  await ui.unmount()
  ;({ ui, text } = await shown($))
  expect(text).toContain('Prompt checks are paused')
  await ui.press({ key: 'resume' })
  expect(writes[1]).toEqual(['/cr/pause.json', RESUME_TEXT])
  await ui.unmount()
  ;({ ui, text } = await shown($))
  expect(text).toContain('Cloakroom is on')
  await ui.unmount()
})

test('no folder, no hook lines yet, and an unreadable log each say so in plain words', async ($, on) => {
  const files: Record<string, string> = {}
  const { st } = await world($, on, files)
  st.exists = false
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  let r = await shown($)
  expect(r.text).toContain('not set up yet')
  expect(r.text).not.toContain('Masked')
  await r.ui.unmount()

  st.exists = true
  files['events-2026-10.jsonl'] = ev({ session: 'ELSE', action: 'masked' })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  r = await shown($)
  expect(r.text).toContain('Waiting for Cloakroom')
  await r.ui.unmount()

  st.unreadable = true
  files['events-2026-11.jsonl'] = 'x'
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  r = await shown($)
  expect(r.text).toContain("Can't read Cloakroom's log")
  await r.ui.unmount()
})
