// lib/showState.ts
//
// Single source of truth for show state, persisted to state.json on disk.
// Survives server restarts. All API routes read/write through here.

import fs   from "fs"
import path from "path"

const STATE_FILE = path.join(process.cwd(), "state.json")

export interface PastSong {
  index:     number
  song:      string
  singer:    string
  startedAt: number // unix ms when it was shown
}

export interface ShowState {
  // Timer
  durationMs:    number  // total show duration in ms
  startedAt:     number  // unix ms when timer was started (0 = not started)
  pausedAt:      number  // unix ms when paused (0 = not paused)
  totalPausedMs: number  // accumulated paused time so far

  // Song
  currentIndex: number

  // History
  history: PastSong[]

  // Slide display
  slideMode: "backdrop" | "slide"
  slideId:   string
}

const DEFAULT_STATE: ShowState = {
  durationMs:    3 * 60 * 60 * 1000,
  startedAt:     0,
  pausedAt:      0,
  totalPausedMs: 0,
  currentIndex:  0,
  history:       [],
  slideMode:     "backdrop",
  slideId:       "",
}

// ── Read ──────────────────────────────────────────────────────────────────────
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

// ── Write ─────────────────────────────────────────────────────────────────────
export function writeState(state: ShowState): void {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8")
  } catch (e) {
    console.error("[showState] Failed to write state.json:", e)
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Milliseconds remaining given current state */
export function msRemaining(state: ShowState): number {
  if (state.startedAt === 0) return state.durationMs

  const effectiveNow = state.pausedAt !== 0
    ? state.pausedAt
    : Date.now()

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