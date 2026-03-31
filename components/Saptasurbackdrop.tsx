"use client"

import { useState, useEffect } from "react"
import type { BackdropConfig, SongEntry } from "../backdropConfig"

export interface BackdropDisplayProps {
  config:       BackdropConfig
  song:         SongEntry
  currentIndex: number
  phase:        "enter" | "exit"
  imgKey:       number
  timerDisplay: string
  timerWarn:    boolean
  timerRunning: boolean
  timerStarted: boolean
  connected:    boolean
}

// ─── Logo ─────────────────────────────────────────────────────────────────────
function Logo({
  src,
  fallback,
  ngo = false,
  className = "",
}: {
  src:        string
  fallback:   string
  ngo?:       boolean
  className?: string
}) {
  const [failed, setFailed]   = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted || !src || failed) {
    return (
      <div className={`logo fallback ${ngo ? "ngo" : ""} ${className}`.trim()}>
        {fallback}
      </div>
    )
  }

  return (
    <div className={`logo ${className}`.trim()}>
      <img src={src} alt={fallback} onError={() => setFailed(true)} />
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SaptasurBackdrop({
  config, song, currentIndex, phase, imgKey,
  timerDisplay, timerWarn, timerRunning, timerStarted,
  connected,
}: BackdropDisplayProps) {

  const timerClass = timerWarn  ? "timer-warn"
    : !timerStarted             ? "timer-idle"
    : !timerRunning             ? "timer-paused"
    : ""

  return (
    <div className="stage-root">

      {/* BLURRED ATMOSPHERIC BG */}
      <div className="bg-blur" style={{ backgroundImage: `url(${song.singer.image})` }} />
      <div className="vignette" />
      <div className="grain" />

      {/* PORTRAIT — bleeds in from left */}
      <div className={`portrait-wrap ${phase}`} key={`p-${imgKey}`}>
        <div className="portrait-mask">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="portrait-img"
            src={song.singer.image}
            alt={song.singer.name}
          />
        </div>
      </div>

      {/* TOP BAR */}
      <div className="topbar">
        <div className="org-block">
          <Logo className="w-[250px] h-[250px]" src={config.logos.school} fallback="SSV" />
        </div>
        <div className="ngo-logos">
          <Logo src={config.logos.ngo1} fallback="NGO 1" ngo />
          <Logo src={config.logos.ngo2} fallback="NGO 2" ngo />
        </div>
      </div>

      {/* TEXT — layered over right side */}
      <div className={`text-layer ${phase}`} key={`t-${currentIndex}`}>
        <div className="now-tag">Now on stage</div>
        <div className="singer-label">{song.singer.name}</div>
        <div className="song-title">{song.song}</div>
        <div className="rule" />
        <div className="subtitle">
          {song.lataOriginal}
          {song.film && <><span className="subtitle-accent"> · </span>{song.film}</>}
          {song.year && <><span className="subtitle-accent">, </span>{song.year}</>}
        </div>
        {song.story && (
          <div className="subtitle-desc">{song.story}</div>
        )}
      </div>

      {/* TIMER */}
      <div className="timer-wrap">
        <span className="timer-label">Timer</span>
        <div
          suppressHydrationWarning
          className={`timer-value ${timerClass}`}
        >
          {timerDisplay}
        </div>
      </div>

      {/* SSE dot */}
      <div
        className={`sse-dot ${connected ? "on" : "off"}`}
        title={connected ? "Remote connected" : "Remote not connected"}
      />
    </div>
  )
}