// lib/showState.ts

import fs   from "fs"
import path from "path"

const STATE_FILE = path.join(process.cwd(), "state.json")

export interface PastSong {
  index:     number
  song:      string
  singer:    string
  startedAt: number
}

export interface ShowState {
  durationMs:    number
  startedAt:     number
  pausedAt:      number
  totalPausedMs: number
  currentIndex:  number
  history:       PastSong[]
  // Which screen is showing on the TV
  screenMode:    "backdrop" | "screen"
  screenId:      string
}

const DEFAULT_STATE: ShowState = {
  durationMs:    3 * 60 * 60 * 1000,
  startedAt:     0,
  pausedAt:      0,
  totalPausedMs: 0,
  currentIndex:  0,
  history:       [],
  screenMode:    "backdrop",
  screenId:      "",
}

export function readState(): ShowState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, "utf-8")
      return { ...DEFAULT_STATE, ...JSON.parse(raw) }
    }
  } catch (e) {
    console.error("[showState] Failed to read state.json:", e)
  }
  return { ...DEFAULT_STATE }
}

export function writeState(state: ShowState): void {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8")
  } catch (e) {
    console.error("[showState] Failed to write state.json:", e)
  }
}

export function msRemaining(state: ShowState): number {
  if (state.startedAt === 0) return state.durationMs
  const effectiveNow = state.pausedAt !== 0 ? state.pausedAt : Date.now()
  const elapsed = effectiveNow - state.startedAt - state.totalPausedMs
  return Math.max(0, state.durationMs - elapsed)
}

export function isRunning(state: ShowState): boolean {
  return state.startedAt !== 0 && state.pausedAt === 0
}

export function isPaused(state: ShowState): boolean {
  return state.startedAt !== 0 && state.pausedAt !== 0
}

export function isNotStarted(state: ShowState): boolean {
  return state.startedAt === 0
}