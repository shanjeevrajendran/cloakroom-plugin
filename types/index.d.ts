// The panel's snapshot of Cloakroom: refreshed by a timer, drawn from here.
// setUp: Cloakroom's folder exists. counts: this session's totals, null when the log cannot be read.
export type Snapshot = {
  setUp: boolean
  counts: { masked: number; stopped: number; held: number; skipped: number; seen: number } | null
  pausedMin: number
  sig: string
}

declare module 'claude-code' {
  interface PluginState {
    cloakroom: { snap: Shaped<Snapshot> }
  }
}
