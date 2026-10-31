// What the panel reads from Cloakroom's event log and pause flag. Pure functions: counts, minutes, paths.
// Only numbers come out of the log; a line's other fields (targets, placeholders) are never kept.

// seen: log lines of this session, i.e. Cloakroom's hooks have run in it (a `pass` line counts)
export type Counts = { masked: number; stopped: number; held: number; skipped: number; seen: number }
export const ZERO: Counts = { masked: 0, stopped: 0, held: 0, skipped: 0, seen: 0 }

// events-YYYY-MM.jsonl (0.6.0 on) and the older events.jsonl, events.1.jsonl
export const EVENT_FILE = /^events(-\d{4}-\d{2}|\.1)?\.jsonl$/

// Counted as `cloakroom report` counts them: one per kind found (one when a line names none), by action.
// block and deny are both "stopped"; a skipped check is its own line.
export function countEvents(texts: string[], session: string): Counts {
  const out = { ...ZERO }
  for (const text of texts) {
    for (const line of text.split('\n')) {
      let ev: unknown
      try {
        ev = JSON.parse(line)
      } catch {
        continue
      }
      if (!ev || typeof ev !== 'object') continue
      const e = ev as Record<string, unknown>
      if (e.session !== session) continue
      out.seen++
      if (e.event === 'skipped') {
        out.skipped++
        continue
      }
      const key = e.action === 'masked' ? 'masked' : e.action === 'held' ? 'held' : e.action === 'deny' || e.action === 'block' ? 'stopped' : null
      if (!key) continue
      const kinds = e.kinds && typeof e.kinds === 'object' ? Object.entries(e.kinds) : []
      out[key] += kinds.length ? kinds.reduce((sum, [k, n]) => sum + (k ? (Number.isFinite(n) && n > 0 ? Math.trunc(n as number) : 0) : 1), 0) : 1
    }
  }
  return out
}

// Minutes left on a prompt-check pause: pause.json holds {"until": epoch seconds}. 0 when missing, past or unreadable.
export function pauseLeft(text: string | null, nowMs: number): number {
  let until: unknown
  try {
    until = JSON.parse(text ?? '').until
  } catch {
    return 0
  }
  if (typeof until !== 'number' || !Number.isFinite(until)) return 0
  const left = until - nowMs / 1000
  return left > 0 ? Math.ceil(Math.trunc(left) / 60) : 0
}

export const pauseText = (nowMs: number, minutes: number) => JSON.stringify({ until: nowMs / 1000 + 60 * minutes })
// Resume: an expired flag is what the Python side reads as "not paused" (it deletes the file; the mod cannot).
export const RESUME_TEXT = JSON.stringify({ until: 0 })

// Cloakroom's folder as the Python side picks it: CLOAKROOM_HOME, else ~/.cloakroom (USERPROFILE on Windows).
// "/" joins on every platform: Windows accepts it too.
export function homeDir(cloakroomHome?: string, userProfile?: string, home?: string): string | null {
  const base = userProfile || home
  const dir = cloakroomHome || (base ? `${base}/.cloakroom` : '')
  return dir ? dir.replace(/[\\/]+$/, '') : null
}
