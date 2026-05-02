```typescript
// lib/showState.ts

import fs   from "fs"
import path from "path"

const STATE_FILE = path.join(process.cwd(), "state.json")

/**
 * Represents a song that has been played in the past.
 */
export interface PastSong {
  index:     number
  song:      string
  singer:    string
  startedAt: number
}

/**
 * Represents the complete state of the show, including timing, history, and screen configuration.
 */
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

/**
 * Reads the current show state from the state file.
 * If the file does not exist or an error occurs, returns a default state.
 *
 * @returns A ShowState object representing the current state.
 */
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

/**
 * Writes the given show state to the state file.
 *
 * @param state - The ShowState object to persist.
 */
export function writeState(state: ShowState): void {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8")
  } catch (e) {
    console.error("[showState] Failed to write state.json:", e)
  }
}

/**
 * Calculates the remaining time in milliseconds for the show.
 * If the show has not started, returns the full duration.
 *
 * @param state - The current show state.
 * @returns The number of milliseconds remaining (non-negative).
 */
export function msRemaining(state: ShowState): number {
  if (state.startedAt === 0) return state.durationMs
  const effectiveNow = state.pausedAt !== 0 ? state.pausedAt : Date.now()
  const elapsed = effectiveNow - state.startedAt - state.totalPausedMs
  return Math.max(0, state.durationMs - elapsed)
}

/**
 * Checks whether the show is currently running (started and not paused).
 *
 * @param state - The current show state.
 * @returns True if the show is running, false otherwise.
 */
export function isRunning(state: ShowState): boolean {
  return state.startedAt !== 0 && state.pausedAt === 0
}

/**
 * Checks whether the show is currently paused.
 *
 * @param state - The current show state.
 * @returns True if the show is paused, false otherwise.
 */
export function isPaused(state: ShowState): boolean {
  return state.startedAt !== 0 && state.pausedAt !== 0
}

/**
 * Checks whether the show has not yet started.
 *
 * @param state - The current show state.
 * @returns True if the show has not started, false otherwise.
 */
export function isNotStarted(state: ShowState): boolean {
  return state.startedAt === 0
}
```