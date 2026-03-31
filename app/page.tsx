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
function useServerTimer(timerState: TimerState) {
  const [display, setDisplay] = useState("--:--:--")
  const [warn,    setWarn]    = useState(false)
  const ref = useRef(timerState)
  ref.current = timerState

  useEffect(() => {
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

  const goToScreen = useCallback((id: string) => {
    setScreenPhase("exit")
    setTimeout(() => {
      setScreenId(id)
      setMode("screen")
      setScreenPhase("enter")
    }, 380)
  }, [])

  const goToBackdrop = useCallback(() => {
    setScreenPhase("exit")
    setTimeout(() => setMode("backdrop"), 380)
  }, [])

  // ── Apply SSE ─────────────────────────────────────────────────────────────
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

  const goNext       = useCallback(() => sendControl("next"),                         [sendControl])
  const goPrev       = useCallback(() => sendControl("prev"),                         [sendControl])
  const jumpTo       = useCallback((i: number) => sendControl("jump", { index: i }), [sendControl])
  const startTimer   = useCallback(() => sendControl("start"),                        [sendControl])
  const pauseTimer   = useCallback(() => sendControl("pause"),                        [sendControl])
  const resumeTimer  = useCallback(() => sendControl("resume"),                       [sendControl])
  const resetTimer   = useCallback(() => sendControl("reset"),                        [sendControl])
  const sendScreen   = useCallback((id: string) =>
    sendControl("screen", { screenId: id, mode: "screen" }),                          [sendControl])
  const sendBackdrop = useCallback(() =>
    sendControl("screen", { screenId: "", mode: "backdrop" }),                        [sendControl])

  // ── TV keyboard nav ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isController) return
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

export default function BackdropPage() {
  return (
    <Suspense fallback={null}>
      <BackdropInner />
    </Suspense>
  )
}