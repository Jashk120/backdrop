```typescript
"use client"

import { Suspense, useEffect, useRef, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import SaptasurBackdrop   from "@/components/Saptasurbackdrop"
import SaptasurController from "@/components/Saptasurcontroller"
import { SCREENS, getScreen } from "@/lib/screenRegistry"
import CONFIG from "@/backdropConfig"
import type { SongEntry } from "@/backdropConfig"
import type { PastSong } from "@/lib/showState"

// ── Timer display ─────────────────────────────────────────────────────────────

/**
 * Custom hook that manages and formats a countdown timer for display.
 * It reads the current timer state and updates the displayed time and warning flag every second.
 *
 * @param timerState - The current state of the timer (start time, pause time, duration, etc.).
 * @returns An object containing:
 *   - `display`: A formatted string representing the remaining time (e.g., "0:05:30").
 *   - `warn`: A boolean indicating whether less than 30 minutes remain.
 */
function useServerTimer(timerState: TimerState) {
  const [display, setDisplay] = useState("--:--:--")
  const [warn,    setWarn]    = useState(false)
  const ref = useRef(timerState)
  ref.current = timerState

  useEffect(() => {
    /**
     * Calculates the current remaining time and updates the display and warning flag.
     * Is called immediately and then every second via setInterval.
     */
    function tick() {
      const t = ref.current
      if (t.startedAt === 0) { setDisplay("--:--:--"); setWarn(false); return }
      const effectiveNow = t.pausedAt !== 0 ? t.pausedAt : Date.now()
      const elapsed  = effectiveNow - t.startedAt - t.totalPausedMs
      const leftMs   = Math.max(0, t.durationMs - elapsed)
      const leftSec  = Math.floor(leftMs / 1000)
      const h = Math.floor(leftSec / 3600)
      const m = Math.floor((leftSec % 3600) / 60)
      const s = leftSec % 60
      setDisplay(`${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`)
      setWarn(leftMs < 30 * 60 * 1000)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return { display, warn }
}

interface TimerState {
  startedAt:     number
  pausedAt:      number
  totalPausedMs: number
  durationMs:    number
  running:       boolean
}

// ── SSE message shapes ────────────────────────────────────────────────────────
interface SyncMsg {
  type:          "sync"
  currentIndex:  number
  startedAt:     number
  pausedAt:      number
  totalPausedMs: number
  durationMs:    number
  running:       boolean
  history:       PastSong[]
  mode?:         "backdrop" | "screen"
  screenId?:     string
}
interface SongMsg   { type: "song";   currentIndex: number; history: PastSong[] }
interface TimerMsg  { type: "timer";  startedAt: number; pausedAt: number; totalPausedMs: number; durationMs: number; running: boolean }
interface ScreenMsg { type: "screen"; screenId: string; mode: "screen" | "backdrop" }
type SSEMsg = SyncMsg | SongMsg | TimerMsg | ScreenMsg

// ── Inner component ───────────────────────────────────────────────────────────

/**
 * Main inner component for the backdrop page.
 * Manages the current song, timer, screen mode, SSE connection, and control actions.
 * Reads the URL search params to determine if this instance is a controller.
 *
 * @returns The rendered component – either a controller panel, a registered screen, or the backdrop.
 */
function BackdropInner() {
  const searchParams = useSearchParams()
  const isController = searchParams.has("controller")

  const [currentIndex, setCurrentIndex] = useState(0)
  const [song,    setSong]    = useState<SongEntry>(CONFIG.songs[0])
  const [phase,   setPhase]   = useState<"enter" | "exit">("enter")
  const [imgKey,  setImgKey]  = useState(0)
  const [connected, setConnected] = useState(false)
  const [history, setHistory] = useState<PastSong[]>([])

  const [timerState, setTimerState] = useState<TimerState>({
    startedAt: 0, pausedAt: 0, totalPausedMs: 0,
    durationMs: 3 * 60 * 60 * 1000, running: false,
  })

  // ── Screen state ──────────────────────────────────────────────────────────
  const [mode,        setMode]        = useState<"backdrop" | "screen">("backdrop")
  const [screenId,    setScreenId]    = useState<string>(SCREENS[0]?.id ?? "")
  const [screenPhase, setScreenPhase] = useState<"enter" | "exit">("enter")
  const activeScreenId = mode === "screen" ? screenId : null

  const { display: timerDisplay, warn: timerWarn } = useServerTimer(timerState)

  // ── Navigation ────────────────────────────────────────────────────────────

  /**
   * Navigates to the song at the given index by triggering an exit animation and then updating the state.
   *
   * @param nextIndex - The target song index (clamped to valid range).
   */
  const goTo = useCallback((nextIndex: number) => {
    const clamped = Math.min(Math.max(nextIndex, 0), CONFIG.songs.length - 1)
    setPhase("exit")
    setTimeout(() => {
      setCurrentIndex(clamped)
      setSong(CONFIG.songs[clamped])
      setImgKey(k => k + 1)
      setPhase("enter")
    }, 380)
  }, [])

  /**
   * Switches to a specific screen by its ID with an exit/enter animation.
   *
   * @param id - The identifier of the screen to display.
   */
  const goToScreen = useCallback((id: string) => {
    setScreenPhase("exit")
    setTimeout(() => {
      setScreenId(id)
      setMode("screen")
      setScreenPhase("enter")
    }, 380)
  }, [])

  /**
   * Returns to the backdrop view from a screen with an exit animation.
   */
  const goToBackdrop = useCallback(() => {
    setScreenPhase("exit")
    setTimeout(() => setMode("backdrop"), 380)
  }, [])

  // ── Apply SSE ─────────────────────────────────────────────────────────────

  /**
   * Applies a received SSE message by updating the relevant state (sync, song, timer, or screen).
   *
   * @param msg - The parsed SSE message object.
   */
  const applyMsg = useCallback((msg: SSEMsg) => {
    if (msg.type === "sync") {
      goTo(msg.currentIndex)
      setHistory(msg.history)
      setTimerState({
        startedAt: msg.startedAt, pausedAt: msg.pausedAt,
        totalPausedMs: msg.totalPausedMs, durationMs: msg.durationMs,
        running: msg.running,
      })
      if (msg.mode === "screen" && msg.screenId) {
        setScreenId(msg.screenId)
        setMode("screen")
        setScreenPhase("enter")
      }
    } else if (msg.type === "song") {
      goTo(msg.currentIndex)
      setHistory(msg.history)
    } else if (msg.type === "timer") {
      setTimerState({
        startedAt: msg.startedAt, pausedAt: msg.pausedAt,
        totalPausedMs: msg.totalPausedMs, durationMs: msg.durationMs,
        running: msg.running,
      })
    } else if (msg.type === "screen") {
      if (msg.mode === "screen") goToScreen(msg.screenId)
      else goToBackdrop()
    }
  }, [goTo, goToScreen, goToBackdrop])

  // ── SSE connection ────────────────────────────────────────────────────────
  useEffect(() => {
    let es: EventSource
    let retryTimeout: ReturnType<typeof setTimeout>

    /**
     * Establishes a new EventSource connection to the server-sent events endpoint.
     * Updates connection state and applies incoming messages.
     */
    function connect() {
      es = new EventSource("/api/events")
      es.onopen = () => setConnected(true)
      es.onmessage = (e) => {
        setConnected(true)
        try { applyMsg(JSON.parse(e.data) as SSEMsg) } catch { /* heartbeat */ }
      }
      es.onerror = () => {
        setConnected(false)
        es.close()
        retryTimeout = setTimeout(connect, 3000)
      }
    }
    connect()
    return () => { es?.close(); clearTimeout(retryTimeout) }
  }, [applyMsg])

  // ── Control actions ───────────────────────────────────────────────────────

  /**
   * Sends a control action to the server via POST /api/control and updates state with the response.
   *
   * @param action - The action string (e.g., "next", "prev", "start", etc.).
   * @param extra - Optional additional data to include in the request body.
   */
  const sendControl = useCallback(async (action: string, extra?: object) => {
    try {
      const res  = await fetch("/api/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      })
      const data = await res.json()
      if (data.ok) { setConnected(true); applyMsg(data as SSEMsg) }
    } catch { setConnected(false) }
  }, [applyMsg])

  /** Sends a "next" action to advance to the next song. */
  const goNext       = useCallback(() => sendControl("next"),                         [sendControl])
  /** Sends a "prev" action to go back to the previous song. */
  const goPrev       = useCallback(() => sendControl("prev"),                         [sendControl])
  /** Sends a "jump" action to jump to a specific song index. */
  const jumpTo       = useCallback((i: number) => sendControl("jump", { index: i }), [sendControl])
  /** Sends a "start" action to start the timer. */
  const startTimer   = useCallback(() => sendControl("start"),                        [sendControl])
  /** Sends a "pause" action to pause the timer. */
  const pauseTimer   = useCallback(() => sendControl("pause"),                        [sendControl])
  /** Sends a "resume" action to resume the timer. */
  const resumeTimer  = useCallback(() => sendControl("resume"),                       [sendControl])
  /** Sends a "reset" action to reset the timer. */
  const resetTimer   = useCallback(() => sendControl("reset"),                        [sendControl])
  /** Sends a "screen" action to switch to a specific screen. */
  const sendScreen   = useCallback((id: string) =>
    sendControl("screen", { screenId: id, mode: "screen" }),                          [sendControl])
  /** Sends a "screen" action to return to the backdrop. */
  const sendBackdrop = useCallback(() =>
    sendControl("screen", { screenId: "", mode: "backdrop" }),                        [sendControl])

  // ── TV keyboard nav ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isController) return

    /**
     * Handles keyboard events for TV navigation: ArrowRight/ArrowLeft navigate songs, Escape switches to backdrop.
     *
     * @param e - The keyboard event.
     */
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") sendControl("next")
      if (e.key === "ArrowLeft")  sendControl("prev")
      if (e.key === "Escape")     sendBackdrop()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isController, sendControl, sendBackdrop])

  const sharedProps = {
    config: CONFIG, song, currentIndex,
    timerDisplay, timerWarn,
    timerRunning: timerState.running,
    timerStarted: timerState.startedAt !== 0,
  }

  // ── Controller ────────────────────────────────────────────────────────────
  if (isController) {
    return (
      <SaptasurController
        {...sharedProps}
        connected={connected}
        history={history}
        onNext={goNext} onPrev={goPrev} onJump={jumpTo}
        onTimerStart={startTimer} onTimerPause={pauseTimer}
        onTimerResume={resumeTimer} onTimerReset={resetTimer}
        screens={SCREENS}
        activeScreenId={activeScreenId}
        onScreen={sendScreen}
        onBackdrop={sendBackdrop}
      />
    )
  }

  // ── TV: registered screen ─────────────────────────────────────────────────
  if (mode === "screen") {
    const entry = getScreen(screenId)
    if (entry) {
      const Screen = entry.component
      return <Screen
      slideId={screenId}
      phase={screenPhase}
      connected={connected}
    />
    }
  }

  // ── TV: backdrop ──────────────────────────────────────────────────────────
  return (
    <SaptasurBackdrop
      {...sharedProps}
      phase={phase}
      imgKey={imgKey}
      connected={connected}
    />
  )
}

/**
 * Default export component for the backdrop page.
 * Wraps the inner backdrop component in a React Suspense boundary.
 *
 * @returns A Suspense wrapper around BackdropInner.
 */
export default function BackdropPage() {
  return (
    <Suspense fallback={null}>
      <BackdropInner />
    </Suspense>
  )
}
```