"use client"

import type { BackdropConfig, SongEntry } from "../backdropConfig"
import type { PastSong } from "../lib/showState"
import type { SlideEntry } from "./SaptasurSlide"

interface ControllerProps {
  config:        BackdropConfig
  song:          SongEntry
  currentIndex:  number
  timerDisplay:  string
  timerWarn:     boolean
  timerRunning:  boolean
  timerStarted:  boolean
  connected:     boolean
  history:       PastSong[]
  onNext:        () => void
  onPrev:        () => void
  onJump:        (index: number) => void
  onTimerStart:  () => void
  onTimerPause:  () => void
  onTimerResume: () => void
  onTimerReset:  () => void
  // ── Slide controls ──────────────────────────────────────────────────────
  slides:        SlideEntry[]
  activeSlideId: string | null   // null = backdrop is showing
  onSlide:       (slideId: string) => void
  onBackdrop:    () => void
}

export default function SaptasurController({
  config, song, currentIndex,
  timerDisplay, timerWarn, timerRunning, timerStarted,
  connected, history,
  onNext, onPrev, onJump,
  onTimerStart, onTimerPause, onTimerResume, onTimerReset,
  slides, activeSlideId, onSlide, onBackdrop,
}: ControllerProps) {

  const timerColor    = timerWarn ? "#C0614A" : "#D4956A"
  const isSlideMode   = activeSlideId !== null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #111116; }

        .ctrl-root {
          min-height: 100svh;
          background: #111116;
          color: #E6E1D8;
          font-family: 'Outfit', sans-serif;
          display: flex; flex-direction: column;
          padding-bottom: 48px;
          max-width: 480px; margin: 0 auto;
        }

        /* ── header ── */
        .ctrl-header {
          padding: 16px 16px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          display: flex; align-items: center; justify-content: space-between;
        }
        .ctrl-status { display:flex; align-items:center; gap:7px; }
        .ctrl-status-dot {
          width:7px; height:7px; border-radius:50%;
          transition: background 0.4s, box-shadow 0.4s;
        }
        .ctrl-status-dot.on  { background:#5DB075; box-shadow:0 0 6px #5DB07588; }
        .ctrl-status-dot.off { background:#C0614A; }
        .ctrl-status-text { font-size:10px; letter-spacing:0.12em; text-transform:uppercase; color:#5C5A57; }

        /* ── mode badge ── */
        .ctrl-mode-badge {
          font-size:9px; letter-spacing:0.18em; text-transform:uppercase;
          padding:3px 9px; border-radius:99px;
          border:1px solid;
          transition: all 0.3s;
        }
        .ctrl-mode-badge.slide    { color:#A78BFA; border-color:rgba(167,139,250,0.35); background:rgba(167,139,250,0.08); }
        .ctrl-mode-badge.backdrop { color:#3a3a44; border-color:rgba(255,255,255,0.06); background:transparent; }

        /* ── timer card ── */
        .ctrl-timer-card {
          margin: 14px 16px 0;
          background: #1C1C24;
          border: 1px solid rgba(212,149,106,0.15);
          border-radius: 12px;
          padding: 14px 16px;
        }
        .ctrl-timer-label {
          font-size: 8px; letter-spacing: 0.28em; text-transform: uppercase;
          color: #5C5A57; margin-bottom: 6px;
        }
        .ctrl-timer-row { display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .ctrl-timer-display {
          font-size: 32px; font-weight: 500; letter-spacing: 0.08em;
          transition: color 1s; font-variant-numeric: tabular-nums;
        }
        .ctrl-timer-btns { display:flex; gap:8px; }
        .ctrl-tbtn {
          height: 36px; padding: 0 14px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: #252530;
          color: #E6E1D8; font-family:'Outfit',sans-serif;
          font-size: 12px; font-weight: 500;
          cursor: pointer; white-space: nowrap;
          transition: background 0.15s, transform 0.1s;
          -webkit-tap-highlight-color: transparent;
        }
        .ctrl-tbtn:active { transform: scale(0.94); background:#2e2e3a; }
        .ctrl-tbtn.start  { border-color:rgba(93,176,117,0.4); color:#5DB075; }
        .ctrl-tbtn.pause  { border-color:rgba(212,149,106,0.4); color:#D4956A; }
        .ctrl-tbtn.resume { border-color:rgba(93,176,117,0.4); color:#5DB075; }
        .ctrl-tbtn.reset  { border-color:rgba(192,97,74,0.3); color:#C0614A; font-size:11px; }

        /* ── now playing card ── */
        .ctrl-now-card {
          margin: 12px 16px 0;
          background: #1C1C24;
          border: 1px solid rgba(212,149,106,0.15);
          border-radius: 12px;
          padding: 14px;
          display: flex; gap: 12px; align-items: center;
        }
        .ctrl-thumb {
          width:52px; height:66px; border-radius:6px;
          object-fit:cover; object-position:center top;
          flex-shrink:0; filter:brightness(0.9);
        }
        .ctrl-thumb-placeholder {
          width:52px; height:66px; border-radius:6px;
          background:#2A2A34; flex-shrink:0;
          display:flex; align-items:center; justify-content:center;
          font-size:10px; color:#5C5A57;
        }
        .ctrl-now-info { flex:1; min-width:0; }
        .ctrl-now-label { font-size:8px; letter-spacing:0.28em; text-transform:uppercase; color:#D4956A; opacity:0.7; margin-bottom:3px; }
        .ctrl-now-song  { font-size:17px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.2; margin-bottom:3px; }
        .ctrl-now-singer{ font-size:12px; color:#9E9A94; font-weight:300; }
        .ctrl-now-film  { font-size:11px; color:#5C5A57; font-style:italic; margin-top:2px; }

        /* ── progress ── */
        .ctrl-progress-wrap { margin:12px 16px 0; display:flex; align-items:center; gap:10px; }
        .ctrl-progress-bar  { flex:1; height:3px; background:#2A2A34; border-radius:99px; overflow:hidden; }
        .ctrl-progress-fill { height:100%; background:#D4956A; border-radius:99px; transition:width 0.4s ease; }
        .ctrl-progress-text { font-size:11px; color:#5C5A57; white-space:nowrap; }

        /* ── nav buttons ── */
        .ctrl-nav { margin:12px 16px 0; display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .ctrl-nav-btn {
          height:60px; border-radius:10px;
          border:1px solid rgba(255,255,255,0.08);
          background:#1C1C24;
          color:#E6E1D8; font-family:'Outfit',sans-serif;
          font-size:13px; font-weight:500; letter-spacing:0.04em;
          cursor:pointer;
          display:flex; align-items:center; justify-content:center; gap:8px;
          transition:background 0.15s, transform 0.1s;
          -webkit-tap-highlight-color:transparent;
        }
        .ctrl-nav-btn:active  { transform:scale(0.96); background:#252530; }
        .ctrl-nav-btn:disabled{ opacity:0.3; cursor:not-allowed; transform:none; }
        .ctrl-nav-btn.prev    { border-color:rgba(124,158,191,0.2); color:#7C9EBF; }
        .ctrl-nav-btn.next    { border-color:rgba(212,149,106,0.3); color:#D4956A; }
        .ctrl-nav-btn svg     { width:18px; height:18px; flex-shrink:0; }

        /* ── section label ── */
        .ctrl-section-label {
          margin:22px 16px 8px;
          font-size:8px; letter-spacing:0.3em; text-transform:uppercase; color:#5C5A57;
        }

        /* ── slides section ── */
        .ctrl-slides { margin:0 16px; display:flex; flex-direction:column; gap:8px; }

        .ctrl-slide-back {
          height:44px; border-radius:10px;
          border:1px solid rgba(167,139,250,0.25);
          background:rgba(167,139,250,0.06);
          color:#A78BFA; font-family:'Outfit',sans-serif;
          font-size:12px; font-weight:500; letter-spacing:0.05em;
          cursor:pointer;
          display:flex; align-items:center; justify-content:center; gap:8px;
          transition:background 0.15s, transform 0.1s;
          -webkit-tap-highlight-color:transparent;
        }
        .ctrl-slide-back:active { transform:scale(0.97); background:rgba(167,139,250,0.12); }

        .ctrl-slide-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }

        .ctrl-slide-btn {
          border-radius:10px;
          border:1px solid rgba(255,255,255,0.08);
          background:#1C1C24;
          color:#E6E1D8; font-family:'Outfit',sans-serif;
          font-size:12px; font-weight:400;
          cursor:pointer; padding:0;
          overflow:hidden;
          display:flex; flex-direction:column;
          transition:border-color 0.15s, transform 0.1s;
          -webkit-tap-highlight-color:transparent;
          text-align:left;
        }
        .ctrl-slide-btn:active    { transform:scale(0.96); }
        .ctrl-slide-btn.active-slide {
          border-color:rgba(167,139,250,0.5);
          background:#1e1a2e;
        }
        .ctrl-slide-thumb {
          width:100%; aspect-ratio:16/9;
          object-fit:cover; object-position:center top;
          display:block;
          background:#2A2A34;
        }
        .ctrl-slide-thumb-placeholder {
          width:100%; aspect-ratio:16/9;
          background:#2A2A34;
          display:flex; align-items:center; justify-content:center;
          font-size:20px; color:#3a3a44;
        }
        .ctrl-slide-label {
          padding:8px 10px 10px;
          font-size:11px; color:#9E9A94;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
          display:flex; align-items:center; gap:6px;
        }
        .ctrl-slide-active-dot {
          width:5px; height:5px; border-radius:50%; background:#A78BFA; flex-shrink:0;
        }

        /* ── song list ── */
        .ctrl-list { margin:0 16px; display:flex; flex-direction:column; gap:5px; }
        .ctrl-list-item {
          padding:11px 14px; border-radius:8px;
          border:1px solid transparent; background:#1C1C24;
          display:flex; align-items:center; gap:12px;
          cursor:pointer;
          transition:background 0.15s, border-color 0.15s, transform 0.1s;
          -webkit-tap-highlight-color:transparent;
        }
        .ctrl-list-item:active  { transform:scale(0.985); }
        .ctrl-list-item.active  { background:#22222E; border-color:rgba(212,149,106,0.35); }
        .ctrl-list-num          { font-size:11px; color:#5C5A57; width:20px; text-align:center; flex-shrink:0; }
        .ctrl-list-item.active .ctrl-list-num { color:#D4956A; }
        .ctrl-list-info         { flex:1; min-width:0; }
        .ctrl-list-song         { font-size:13px; font-weight:400; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .ctrl-list-singer       { font-size:11px; color:#5C5A57; font-weight:300; margin-top:1px; }
        .ctrl-list-dot          { width:6px; height:6px; border-radius:50%; background:#D4956A; flex-shrink:0; opacity:0; transition:opacity 0.2s; }
        .ctrl-list-item.active .ctrl-list-dot { opacity:1; }

        /* ── history ── */
        .ctrl-history { margin:0 16px; display:flex; flex-direction:column; gap:5px; }
        .ctrl-hist-item {
          padding:10px 14px; border-radius:8px;
          background:#181820; border:1px solid rgba(255,255,255,0.04);
          display:flex; align-items:center; gap:12px;
        }
        .ctrl-hist-num  { font-size:11px; color:#3a3a44; width:20px; text-align:center; flex-shrink:0; }
        .ctrl-hist-info { flex:1; min-width:0; }
        .ctrl-hist-song { font-size:12px; color:#5C5A57; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .ctrl-hist-singer{ font-size:10px; color:#3a3a44; margin-top:1px; }
        .ctrl-hist-check{ color:#5DB075; font-size:13px; flex-shrink:0; }
      `}</style>

      <div className="ctrl-root">

        {/* Header */}
        <div className="ctrl-header">
          <div className="ctrl-status">
            <div className={`ctrl-status-dot ${connected ? "on" : "off"}`} />
            <span className="ctrl-status-text">{connected ? "Live" : "Disconnected"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className={`ctrl-mode-badge ${isSlideMode ? "slide" : "backdrop"}`}>
              {isSlideMode ? "Slide" : "Backdrop"}
            </div>
            <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#3a3a44" }}>
              Saptasur
            </div>
          </div>
        </div>

        {/* Timer card */}
        <div className="ctrl-timer-card">
          <div className="ctrl-timer-label">Show Timer</div>
          <div className="ctrl-timer-row">
            <div className="ctrl-timer-display" style={{ color: timerColor }} suppressHydrationWarning>
              {timerDisplay}
            </div>
            <div className="ctrl-timer-btns">
              {!timerStarted && (
                <button className="ctrl-tbtn start" onClick={onTimerStart}>Start</button>
              )}
              {timerStarted && timerRunning && (
                <button className="ctrl-tbtn pause" onClick={onTimerPause}>Pause</button>
              )}
              {timerStarted && !timerRunning && (
                <button className="ctrl-tbtn resume" onClick={onTimerResume}>Resume</button>
              )}
              {timerStarted && (
                <button className="ctrl-tbtn reset" onClick={onTimerReset}>Reset</button>
              )}
            </div>
          </div>
        </div>

        {/* Now playing */}
        <div className="ctrl-now-card">
          {song.singer.image
            ? <img className="ctrl-thumb" src={song.singer.image} alt={song.singer.name} /> // eslint-disable-line
            : <div className="ctrl-thumb-placeholder">?</div>
          }
          <div className="ctrl-now-info">
            <div className="ctrl-now-label">Now showing</div>
            <div className="ctrl-now-song">{song.song}</div>
            <div className="ctrl-now-singer">{song.singer.name}</div>
            <div className="ctrl-now-film">{song.film} · {song.year}</div>
          </div>
        </div>

        {/* Progress */}
        <div className="ctrl-progress-wrap">
          <div className="ctrl-progress-bar">
            <div className="ctrl-progress-fill" style={{ width: `${((currentIndex + 1) / config.songs.length) * 100}%` }} />
          </div>
          <div className="ctrl-progress-text">{currentIndex + 1} / {config.songs.length}</div>
        </div>

        {/* Prev / Next */}
        <div className="ctrl-nav">
          <button className="ctrl-nav-btn prev" onClick={onPrev} disabled={currentIndex === 0}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Previous
          </button>
          <button className="ctrl-nav-btn next" onClick={onNext} disabled={currentIndex === config.songs.length - 1}>
            Next
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* ── Slides ── */}
        {slides.length > 0 && <>
          <div className="ctrl-section-label">Slides — tap to display on screen</div>
          <div className="ctrl-slides">

            {/* Back to backdrop button — only shown when a slide is active */}
            {isSlideMode && (
              <button className="ctrl-slide-back" onClick={onBackdrop}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Back to Backdrop
              </button>
            )}

            <div className="ctrl-slide-grid">
              {slides.map(slide => {
                const isActive = activeSlideId === slide.id
                return (
                  <button
                    key={slide.id}
                    className={`ctrl-slide-btn${isActive ? " active-slide" : ""}`}
                    onClick={() => isActive ? onBackdrop() : onSlide(slide.id)}
                  >
                    {slide.src
                      ? <img className="ctrl-slide-thumb" src={slide.src} alt={slide.alt} />
                      : <div className="ctrl-slide-thumb-placeholder">🖼</div>
                    }
                    <div className="ctrl-slide-label">
                      {isActive && <div className="ctrl-slide-active-dot" />}
                      {slide.alt}
                    </div>
                  </button>
                )
              })}
            </div>

          </div>
        </>}

        {/* Song list */}
        <div className="ctrl-section-label">All Songs — tap to jump</div>
        <div className="ctrl-list">
          {config.songs.map((s, i) => (
            <div key={i} className={`ctrl-list-item${i === currentIndex ? " active" : ""}`} onClick={() => onJump(i)}>
              <div className="ctrl-list-num">{i + 1}</div>
              <div className="ctrl-list-info">
                <div className="ctrl-list-song">{s.song}</div>
                <div className="ctrl-list-singer">{s.singer.name}</div>
              </div>
              <div className="ctrl-list-dot" />
            </div>
          ))}
        </div>

        {/* History */}
        {history.length > 0 && <>
          <div className="ctrl-section-label">Already Performed</div>
          <div className="ctrl-history">
            {[...history].reverse().map((h, i) => (
              <div key={i} className="ctrl-hist-item">
                <div className="ctrl-hist-num">{h.index + 1}</div>
                <div className="ctrl-hist-info">
                  <div className="ctrl-hist-song">{h.song}</div>
                  <div className="ctrl-hist-singer">{h.singer}</div>
                </div>
                <div className="ctrl-hist-check">✓</div>
              </div>
            ))}
          </div>
        </>}

      </div>
    </>
  )
}