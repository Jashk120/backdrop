```typescript
// app/api/control/route.ts

import { NextRequest, NextResponse } from "next/server"
import { broadcast } from "@/lib/sseClients"
import { readState, writeState, msRemaining, isRunning, isPaused, isNotStarted } from "@/lib/showState"
import CONFIG from "@/backdropConfig"

export const dynamic = "force-dynamic"

type Action =
  | "next" | "prev" | "jump"
  | "start" | "pause" | "resume" | "reset"
  | "screen"

interface ControlPayload {
  action:    Action
  index?:    number
  screenId?: string
  mode?:     "screen" | "backdrop"
}

/**
 * Handles POST requests to control the backdrop show.
 *
 * Processes actions for song navigation (next, prev, jump), screen display mode,
 * and timer control (start, pause, resume, reset). Updates the shared show state
 * and broadcasts the changes to all connected SSE clients.
 *
 * @param req - The incoming HTTP request containing a JSON body with an action and optional parameters.
 * @returns A JSON response indicating success (`ok: true`) along with the updated payload,
 *          or an error response with status 400 if the request body is invalid JSON.
 */
export async function POST(req: NextRequest) {
  let body: ControlPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const state = readState()
  const { action, index } = body
  const max = CONFIG.songs.length - 1
  const now = Date.now()

  // ── Song navigation ───────────────────────────────────────────────────────
  if (action === "next" || action === "prev" || action === "jump") {
    let nextIndex = state.currentIndex
    if (action === "next") nextIndex = Math.min(state.currentIndex + 1, max)
    if (action === "prev") nextIndex = Math.max(state.currentIndex - 1, 0)
    if (action === "jump" && typeof index === "number")
      nextIndex = Math.min(Math.max(index, 0), max)

    if (nextIndex !== state.currentIndex) {
      const currentSong = CONFIG.songs[state.currentIndex]
      const alreadyLogged = state.history.at(-1)?.index === state.currentIndex
      if (!alreadyLogged) {
        state.history.push({
          index:     state.currentIndex,
          song:      currentSong.song,
          singer:    currentSong.singer.name,
          startedAt: now,
        })
      }
    }

    state.currentIndex = nextIndex
    writeState(state)
    const payload = { type: "song", currentIndex: state.currentIndex, history: state.history }
    broadcast(payload)
    return NextResponse.json({ ok: true, ...payload })
  }

  // ── Screen display ────────────────────────────────────────────────────────
  if (action === "screen") {
    const targetMode   = body.mode     ?? "screen"
    const targetScreen = body.screenId ?? ""

    state.screenMode = targetMode
    state.screenId   = targetScreen
    writeState(state)

    const payload = { type: "screen" as const, screenId: targetScreen, mode: targetMode }
    broadcast(payload)
    return NextResponse.json({ ok: true, ...payload })
  }

  // ── Timer control ─────────────────────────────────────────────────────────
  if (action === "start" && isNotStarted(state)) {
    state.startedAt = now; state.pausedAt = 0; state.totalPausedMs = 0
  }
  if (action === "pause" && isRunning(state)) {
    state.pausedAt = now
  }
  if (action === "resume" && isPaused(state)) {
    state.totalPausedMs += now - state.pausedAt; state.pausedAt = 0
  }
  if (action === "reset") {
    state.startedAt = 0; state.pausedAt = 0; state.totalPausedMs = 0
  }

  writeState(state)
  const timerPayload = {
    type:          "timer",
    startedAt:     state.startedAt,
    pausedAt:      state.pausedAt,
    totalPausedMs: state.totalPausedMs,
    durationMs:    state.durationMs,
    msRemaining:   msRemaining(state),
    running:       isRunning(state),
  }
  broadcast(timerPayload)
  return NextResponse.json({ ok: true, ...timerPayload })
}
```