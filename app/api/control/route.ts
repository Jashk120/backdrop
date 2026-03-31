// app/api/control/route.ts
// Phone POSTs here for all actions: song navigation + timer control.
// State is persisted to state.json and broadcast to all SSE clients.

import { NextRequest, NextResponse } from "next/server"
import { broadcast }  from "@/lib/sseClients"
import { readState, writeState, msRemaining, isRunning, isPaused, isNotStarted } from "@/lib/showState"
import CONFIG from "@/backdropConfig"

export const dynamic = "force-dynamic"

type Action =
  | "next" | "prev" | "jump"                  // song navigation
  | "start" | "pause" | "resume" | "reset"     // timer control
  | "slide"                                     // slide display

interface ControlPayload {
  action:   Action
  index?:   number                // for "jump"
  slideId?: string                // for "slide"
  mode?:    "slide" | "backdrop"  // for "slide"
}

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
    if (action === "jump" && typeof index === "number") {
      nextIndex = Math.min(Math.max(index, 0), max)
    }

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

    const payload = {
      type:         "song",
      currentIndex: state.currentIndex,
      history:      state.history,
    }
    broadcast(payload)
    return NextResponse.json({ ok: true, ...payload })
  }

  // ── Slide display ─────────────────────────────────────────────────────────
  if (action === "slide") {
    const targetMode  = body.mode    ?? "slide"
    const targetSlide = body.slideId ?? ""

    // Persist so reconnecting TV restores the same view
    state.slideMode = targetMode
    state.slideId   = targetSlide
    writeState(state)

    const slidePayload = {
      type:    "slide" as const,
      slideId: targetSlide,
      mode:    targetMode,
    }
    broadcast(slidePayload)
    return NextResponse.json({ ok: true, ...slidePayload })
  }

  // ── Timer control ─────────────────────────────────────────────────────────
  if (action === "start") {
    if (isNotStarted(state)) {
      state.startedAt     = now
      state.pausedAt      = 0
      state.totalPausedMs = 0
    }
  }

  if (action === "pause") {
    if (isRunning(state)) {
      state.pausedAt = now
    }
  }

  if (action === "resume") {
    if (isPaused(state)) {
      state.totalPausedMs += now - state.pausedAt
      state.pausedAt = 0
    }
  }

  if (action === "reset") {
    state.startedAt     = 0
    state.pausedAt      = 0
    state.totalPausedMs = 0
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