```tsx
"use client"

import type { BackdropConfig, SongEntry } from "../backdropConfig"
import type { PastSong } from "../lib/showState"
import type { ScreenEntry } from "../lib/screenRegistry"

/**
 * Props for the SaptasurController component.
 *
 * @property config - The full backdrop configuration including the song list.
 * @property song - The currently displayed song entry.
 * @property currentIndex - The index of the current song within the config's song list.
 * @property timerDisplay - The formatted timer string (e.g., "00:00").
 * @property timerWarn - Whether the timer has entered a warning state.
 * @property timerRunning - Whether the timer is currently running.
 * @property timerStarted - Whether the timer has ever been started.
 * @property connected - Whether the controller is connected to the display.
 * @property history - List of songs that have already been performed.
 * @property onNext - Callback to advance to the next song.
 * @property onPrev - Callback to go back to the previous song.
 * @property onJump - Callback to jump to a specific song index.
 * @property onTimerStart - Callback to start the timer.
 * @property onTimerPause - Callback to pause the timer.
 * @property onTimerResume - Callback to resume the timer.
 * @property onTimerReset - Callback to reset the timer.
 * @property screens - List of available overlay screens.
 * @property activeScreenId - ID of the currently active screen, or null if backdrop is showing.
 * @property onScreen - Callback to activate a specific screen by its ID.
 * @property onBackdrop - Callback to switch back to the backdrop.
 */
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
  // ── Screen controls ─────────────────────────────────────────────────────
  screens:        ScreenEntry[]
  activeScreenId: string | null   // null = backdrop is showing
  onScreen:       (screenId: string) => void
  onBackdrop:     () => void
}

/**
 * Renders the main control panel for the Saptasur backdrop system.
 * Displays the show timer, now‑playing card, navigation, screen selection,
 * song list with jump functionality, and performance history.
 *
 * @param props - The component props.
 * @param props.config - The full backdrop configuration including the song list.
 * @param props.song - The currently displayed song entry.
 * @param props.currentIndex - The index of the current song within the config's song list.
 * @param props.timerDisplay - The formatted timer string (e.g., "00:00").
 * @param props.timerWarn - Whether the timer has entered a warning state.
 * @param props.timerRunning - Whether the timer is currently running.
 * @param props.timerStarted - Whether the timer has ever been started.
 * @param props.connected - Whether the controller is connected to the display.
 * @param props.history - List of songs that have already been performed.
 * @param props.onNext - Callback to advance to the next song.
 * @param props.onPrev - Callback to go back to the previous song.
 * @param props.onJump - Callback to jump to a specific song index.
 * @param props.onTimerStart - Callback to start the timer.
 * @param props.onTimerPause - Callback to pause the timer.
 * @param props.onTimerResume - Callback to resume the timer.
 * @param props.onTimerReset - Callback to reset the timer.
 * @param props.screens - List of available overlay screens.
 * @param props.activeScreenId - ID of the currently active screen, or null if backdrop is showing.
 * @param props.onScreen - Callback to activate a specific screen by its ID.
 * @param props.onBackdrop - Callback to switch back to the backdrop.
 * @returns A JSX element representing the controller UI.
 */
export default function SaptasurController({
  config, song, currentIndex,
  timerDisplay, timerWarn, timerRunning, timerStarted,
  connected, history,
  onNext, onPrev, onJump,
  onTimerStart, onTimerPause, onTimerResume, onTimerReset,
  screens, activeScreenId, onScreen, onBackdrop,
}: ControllerProps) {

  const timerColor   = timerWarn ? "#C0614A" : "#D4956A"
  const isScreenMode = activeScreenId !== null
  const activeScreen = screens.find(s => s.id === activeScreenId)

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
          padding:3px 9px; border-radius:99px; border:1px solid;
          transition: all 0.3s;
        }
        .ctrl-mode-badge.screen   { color:#A78BFA; border-color:rgba(167,139,250,0.35); background:rgba(167,139,250,0.08); }
        .ctrl-mode-badge.backdrop { color:#3a3a44; border-color:rgba(255,255,255,0.06); background:transparent; }

        /* ── timer card ── */
        .ctrl-timer-card {
          margin: 14px 16px 0;
          background: #1C1C24;
          border: 1px solid rgba(212,149,106,0.15);
          border-radius: 12px;
          padding: 14px 16px;
        }
        .ctrl-timer-label { font-size:8px; letter-spacing:0.28em; text-transform:uppercase; color:#5C5A57; margin-bottom:6px; }
        .ctrl-timer-row { display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .ctrl-timer-display {
          font-size:32px; font-weight:500; letter-spacing:0.08em;
          transition:color 1s; font-variant-numeric:tabular-nums;
        }
        .ctrl-timer-btns { display:flex; gap:8px; }
        .ctrl-tbtn {
          height:36px; padding:0 14px; border-radius:8px;
          border:1px solid rgba(255,255,255,0.1); background:#252530;
          color:#E6E1D8; font-family:'Outfit',sans-serif;
          font-size:12px; font-weight:500; cursor:pointer; white-space:nowrap;
          transition:background 0.15s, transform 0.1s;
          -webkit-tap-highlight-color:transparent;
        }
        .ctrl-tbtn:active { transform:scale(0.94); background:#2e2e3a; }
        .ctrl-tbtn.start  { border-color:rgba(93,176,117,0.4);  color:#5DB075; }
        .ctrl-tbtn.pause  { border-color:rgba(212,149,106,0.4); color:#D4956A; }
        .ctrl-tbtn.resume { border-color:rgba(93,176,117,0.4);  color:#5DB075; }
        .ctrl-tbtn.reset  { border-color:rgba(192,97,74,0.3);   color:#C0614A; font-size:11px; }

        /* ── now playing card ── */
        .ctrl-now-card {
          margin:12px 16px 0; background:#1C1C24;
          border:1px solid rgba(212,149,106,0.15); border-radius:12px;
          padding:14px; display:flex; gap:12px; align-items:center;
        }
        .ctrl-thumb { width:52px; height:66px; border-radius:6px; object-fit:cover; object-position:center top; flex-shrink:0; filter:brightness(0.9); }
        .ctrl-thumb-placeholder { width:52px; height:66px; border-radius:6px; background:#2A2A34; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:10px; color:#5C5A57; }
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
          border:1px solid rgba(255,255,255,0.08); background:#1C1C24;
          color:#E6E1D8; font-family:'Outfit',sans-serif;
          font-size:13px; font-weight:500; letter-spacing:0.04em; cursor:pointer;
          display:flex; align-items:center; justify-content:center; gap:8px;
          transition:background 0.15s, transform 0.1s;
          -webkit-tap-highlight-color:transparent;
        }
        .ctrl-nav-btn:active   { transform:scale(0.96); background:#252530; }
        .ctrl-nav-btn:disabled { opacity:0.3; cursor:not-allowed; transform:none; }
        .ctrl-nav-btn.prev     { border-color:rgba(124,158,191,0.2); color:#7C9EBF; }
        .ctrl-nav-btn.next     { border-color:rgba(212,149,106,0.3); color:#D4956A; }
        .ctrl-nav-btn svg      { width:18px; height:18px; flex-shrink:0; }

        /* ── section label ── */
        .ctrl-section-label { margin:22px 16px 8px; font-size:8px; letter-spacing:0.3em; text-transform:uppercase; color:#5C5A57; }

        /* ── screens section ── */
        .ctrl-screens { margin:0 16px; display:flex; flex-direction:column; gap:6px; }

        .ctrl-screen-back {
          height:44px; border-radius:10px;
          border:1px solid rgba(167,139,250,0.25);
          background:rgba(167,139,250,0.06);
          color:#A78BFA; font-family:'Outfit',sans-serif;
          font-size:12px; font-weight:500; letter-spacing:0.05em; cursor:pointer;
          display:flex; align-items:center; justify-content:center; gap:8px;
          transition:background 0.15s, transform 0.1s;
          -webkit-tap-highlight-color:transparent;
        }
        .ctrl-screen-back:active { transform:scale(0.97); background:rgba(167,139,250,0.12); }

        .ctrl-screen-btn {
          height:52px; border-radius:10px;
          border:1px solid rgba(255,255,255,0.07); background:#1C1C24;
          color:#E6E1D8; font-family:'Outfit',sans-serif;
          font-size:13px; font-weight:400; cursor:pointer;
          display:flex; align-items:center; justify-content:space-between;
          padding:0 16px; gap:12px;
          transition:background 0.15s, border-color 0.15s, transform 0.1s;
          -webkit-tap-highlight-color:transparent;
          text-align:left;
        }
        .ctrl-screen-btn:active      { transform:scale(0.985); }
        .ctrl-screen-btn.active-screen {
          border-color:rgba(167,139,250,0.45);
          background:#1e1a2e;
          color:#C4B5FD;
        }
        .ctrl-screen-label { flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .ctrl-screen-live {
          font-size:8px; letter-spacing:0.2em; text-transform:uppercase;
          color:#A78BFA; background:rgba(167,139,250,0.12);
          border:1px solid rgba(167,139,250,0.25);
          padding:2px 7px; border-radius:99px; flex-shrink:0;
        }
        .ctrl-screen-arrow { color:#3a3a44; flex-shrink:0; }
        .ctrl-screen-btn.active-screen .ctrl-screen-arrow { color:#A78BFA; }

        /* ── song list ── */
        .ctrl-list { margin:0 16px; display:flex; flex-direction:column; gap:5px; }
        .ctrl-list-item {
          padding:11px 14px; border-radius:8px;
          border:1px solid transparent; background:#1C1C24;
          display:flex; align-items:center; gap:12px; cursor:pointer;
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
        .ctrl-hist-num   { font-size:11px; color:#3a3a44; width:20px; text-align:center; flex-shrink:0; }
        .ctrl-hist-info  { flex:1; min-width:0; }
        .ctrl-hist-song  { font-size:12px; color:#5C5A57; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .ctrl-hist-singer{ font-size:10px; color:#3a3a44; margin-top:1px; }
        .ctrl-hist-check { color:#5DB075; font-size:13px; flex-shrink:0; }
      `}</style>

      <div className="ctrl-root">

        {/* Header */}
        <div className="ctrl-header">
          <div className="ctrl-status">
            <div className={`ctrl-status-dot ${connected ? "on" : "off"}`} />
            <span className="ctrl-status-text">{connected ? "Live" : "Disconnected"}</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div className={`ctrl-mode-badge ${isScreenMode ? "screen" : "backdrop"}`}>
              {isScreenMode ? (activeScreen?.label ?? "Screen") : "Backdrop"}
            </div>
            <div style={{ fontSize:11, letterSpacing:"0.2em", textTransform:"uppercase", color:"#3a3a44" }}>
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
              {!timerStarted && <button className="ctrl-tbtn start"  onClick={onTimerStart}>Start</button>}
              {timerStarted && timerRunning  && <button className="ctrl-tbtn pause"  onClick={onTimerPause}>Pause</button>}
              {timerStarted && !timerRunning && <button className="ctrl-tbtn resume" onClick={onTimerResume}>Resume</button>}
              {timerStarted && <button className="ctrl-tbtn reset" onClick={onTimerReset}>Reset</button>}
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
            <div className="ctrl-progress-fill" style={{ width:`${((currentIndex+1)/config.songs.length)*100}%` }} />
          </div>
          <div className="ctrl-progress-text">{currentIndex+1} / {config.songs.length}</div>
        </div>

        {/* Prev / Next */}
        <div className="ctrl-nav">
          <button className="ctrl-nav-btn prev" onClick={onPrev} disabled={currentIndex === 0}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Previous
          </button>
          <button className="ctrl-nav-btn next" onClick={onNext} disabled={currentIndex === config.songs.length-1}>
            Next
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        {/* ── Screens ── */}
        {screens.length > 0 && <>
          <div className="ctrl-section-label">Screens — tap to display on TV</div>
          <div className="ctrl-screens">

            {/* Back to backdrop — only when a screen is live */}
            {isScreenMode && (
              <button className="ctrl-screen-back" onClick={onBackdrop}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                Back to Backdrop
              </button>
            )}

            {screens.map(screen => {
              const isActive = activeScreenId === screen.id
              return (
                <button
                  key={screen.id}
                  className={`ctrl-screen-btn${isActive ? " active-screen" : ""}`}
                  onClick={() => isActive ? onBackdrop() : onScreen(screen.id)}
                >
                  <span className="ctrl-screen-label">{screen.label}</span>
                  {isActive
                    ? <span className="ctrl-screen-live">Live</span>
                    : <span className="ctrl-screen-arrow">›</span>
                  }
                </button>
              )
            })}

          </div>
        </>}

        {/* Song list */}
        <div className="ctrl-section-label">All Songs — tap to jump</div>
        <div className="ctrl-list">
          {config.songs.map((s, i) => (
            <div key={i} className={`ctrl-list-item${i===currentIndex?" active":""}`} onClick={() => onJump(i)}>
              <div className="ctrl-list-num">{i+1}</div>
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
                <div className="ctrl-hist-num">{h.index+1}</div>
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
```