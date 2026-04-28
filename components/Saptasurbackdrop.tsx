```typescript
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
/**
 * A logo component that displays an image with a text fallback.
 * Handles image load failures gracefully by showing the fallback text.
 *
 * @param src - The source URL for the logo image.
 * @param fallback - The text to display if the image fails to load or is not available.
 * @param ngo - Optional flag to apply NGO-specific styling to the fallback.
 * @param className - Optional additional CSS class names to apply.
 * @returns A div containing either the logo image or a text fallback.
 */
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
/**
 * The main backdrop component for the Saptasur event display.
 * Renders a full-screen stage backdrop with singer portrait, logos, song information, and timer.
 *
 * @param config - The backdrop configuration containing logo paths and display settings.
 * @param song - The current song entry containing singer details and song information.
 * @param currentIndex - The index of the current song in the playlist.
 * @param phase - The animation phase, either "enter" for appearing or "exit" for disappearing.
 * @param imgKey - A key used to trigger re-renders of the portrait image.
 * @param timerDisplay - The formatted timer string to display.
 * @param timerWarn - Flag indicating whether the timer should show a warning state.
 * @param timerRunning - Flag indicating whether the timer is currently running.
 * @param timerStarted - Flag indicating whether the timer has been started.
 * @param connected - Flag indicating whether the remote connection is active.
 * @returns The complete backdrop display element.
 */
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
```