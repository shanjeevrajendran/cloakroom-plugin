import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Snapshot } from '../../types'
import { EVENT_FILE, RESUME_TEXT, countEvents, homeDir, pauseLeft, pauseText } from './panel'

const PANE = 'cloakroom-panel'
const TITLE = 'Cloakroom'
const REFRESH_MS = 3000
const PAUSE_MINUTES = 10
const LOADING: Snapshot = { setUp: false, counts: null, pausedMin: 0, sig: '' }
// Change the tag when the snapshot's fields change: it declines what an earlier version stored.
const snap = atom({ plugin: 'cloakroom', key: 'snap' } as const, LOADING, { shape: 'snap-2' })

const GREEN = 'rgb(52,199,89)'
const AMBER = 'rgb(214,140,0)'

// Cloakroom's folder when it exists, else null (not installed yet).
async function folder($: EngineInterface): Promise<string | null> {
  const dir = homeDir(await $.env.get('CLOAKROOM_HOME'), await $.env.get('USERPROFILE'), await $.env.get('HOME'))
  return dir && (await $.fs.exists(dir)) ? dir : null
}

// Reads the log and the pause flag into the snapshot. Any failure leaves what is shown.
async function refresh($: EngineInterface) {
  try {
    const dir = await folder($)
    const prev = await read($, snap)
    let next: Snapshot = { setUp: false, counts: null, pausedMin: 0, sig: '-' }
    if (dir) {
      const files = (await $.fs.list(dir)).filter(f => f.kind === 'file' && EVENT_FILE.test(f.name)).sort((a, b) => a.name.localeCompare(b.name))
      const sig = files.map(f => `${f.name}:${f.size}:${f.mtimeMs}`).join('|') || '-'
      let counts = prev.setUp && prev.sig === sig ? prev.counts : undefined
      if (counts === undefined) {
        try {
          // shortcut: a log file over 4 MiB cannot be read by $.fs.read and shows "can't read"; upgrade when a ranged read exists
          const texts = await Promise.all(files.map(f => $.fs.read(`${dir}/${f.name}`)))
          counts = countEvents(texts, await $.session.id())
        } catch {
          counts = null
        }
      }
      const flag = await $.fs.read(`${dir}/pause.json`).catch(() => null)
      next = { setUp: true, counts, pausedMin: pauseLeft(flag, await $.clock.now()), sig }
    }
    await update($, snap, old => (JSON.stringify(old) === JSON.stringify(next) ? old : next))
  } catch {
    // keep the last picture
  }
}

// The same flag `cr: pause` / `cr: resume` use: pause.json holds {"until": epoch seconds}. Nothing else is written.
async function setPause($: EngineInterface, minutes: number) {
  const dir = await folder($)
  if (!dir) return
  await $.fs.write(`${dir}/pause.json`, minutes ? pauseText(await $.clock.now(), minutes) : RESUME_TEXT)
  await refresh($)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'cloakroom-panel', description: 'Open the Cloakroom panel: on or off, this session\'s counts, pause and resume' })
    void $.ui.open({ id: PANE, title: TITLE })
    void refresh($)
    $.clock.every(REFRESH_MS, () => void refresh($))
    return next(e)
  })

  on('command.run', { command: 'cloakroom-panel' }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE })
    void refresh($)
    return { text: 'Cloakroom panel opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const s = await read($, snap)
    const c = s.counts
    const paused = s.pausedMin > 0

    let light: [string, string, string]
    if (!s.sig) light = ['gray', 'Checking Cloakroom…', '']
    else if (!s.setUp) light = ['gray', 'Cloakroom is not set up yet', 'Restart Claude Code once Cloakroom has finished installing.']
    else if (paused) light = [AMBER, 'Prompt checks are paused', `${s.pausedMin} min left. Files and tool results are still protected.`]
    else if (!c) light = [AMBER, "Can't read Cloakroom's log", 'The counts below are not available.']
    else if (!c.seen) light = ['gray', 'Waiting for Cloakroom', 'It checks in when you send a message or Claude uses a tool.']
    else light = [GREEN, 'Cloakroom is on', 'Your private data is masked before Claude sees it.']

    const rows: [string, number | undefined, string][] = [
      ['Masked', c?.masked, 'private values swapped out before Claude saw them'],
      ['Stopped', c?.stopped, 'prompts or commands blocked'],
      ['Held', c?.held, 'commands waiting for your OK'],
      ['Not checked', c?.skipped, 'let through without a full check'],
    ]

    return (
      <Box flexDirection="column">
        <Text bold color={light[0]}>● {light[1]}</Text>
        {light[2] && <Text dimColor>{light[2]}</Text>}
        {s.setUp && (
          <Box flexDirection="column" marginTop={1}>
            <Text bold>This session</Text>
            {rows.map(([name, n, hint]) => (
              <Box flexDirection="column">
                <Text>
                  <Text bold>{n === undefined ? '–' : n}</Text> {name}
                </Text>
                <Text dimColor>  {hint}</Text>
              </Box>
            ))}
          </Box>
        )}
        {s.setUp && (
          <Box flexDirection="column" marginTop={1}>
            {paused ? (
              <Button key="resume" variant="primary" onPress={() => void setPause($, 0)}>
                Resume checks
              </Button>
            ) : (
              <Button key="pause" onPress={() => void setPause($, PAUSE_MINUTES)}>
                {`Pause prompt checks ${PAUSE_MINUTES} min`}
              </Button>
            )}
            <Text dimColor>Pausing stops checks on the prompts you type. Files and tool results stay protected.</Text>
          </Box>
        )}
      </Box>
    )
  })
}
