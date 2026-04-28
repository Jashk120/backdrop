# CONTEXT.md

## Repository Overview

**Saptasur Backdrop** is a Next.js application designed for live event stage management. It provides real-time backdrop display with synchronized song navigation, countdown timer, and screen management. The system uses Server-Sent Events (SSE) for live synchronization between a controller interface (phone/tablet) and TV displays.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js App                              │
│                                                                 │
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────────────┐  │
│  │  TV Display   │   │  Controller  │   │   SSE Endpoint     │  │
│  │  (page.tsx)   │   │  (?control)  │   │   /api/events      │  │
│  └──────┬───────┘   └──────┬───────┘   └─────────┬───────────┘  │
│         │                  │                      │              │
│         └──────────────────┴──────────────────────┘              │
│                            │                                     │
│                    ┌───────┴────────┐                            │
│                    │  /api/control  │                             │
│                    └───────┬────────┘                            │
│                            │                                     │
│                    ┌───────┴────────┐                            │
│                    │  state.json    │                             │
│                    │  (file system) │                             │
│                    └────────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

## Key Modules

### 1. Configuration (`backdropConfig.ts`)
- Defines `BackdropConfig`, `SongEntry`, and `Singer` types
- Contains the complete song list with metadata (song title, singer, original track, film, year, story)
- Configures logos (school + 2 NGOs) and show duration (default: 3 hours)
- Singleton export `CONFIG` used throughout the app

### 2. State Management (`lib/showState.ts`)
- File-based persistence via `state.json`
- `ShowState` interface: `currentIndex`, `startedAt`, `pausedAt`, `totalPausedMs`, `history`, `screenMode`, `screenId`
- Helper functions: `readState()`, `writeState()`, `msRemaining()`, `isRunning()`, `isPaused()`, `isNotStarted()`

### 3. SSE Infrastructure (`lib/sseClients.ts`)
- Global singleton `Set<ReadableStreamDefaultController>` for managing SSE connections
- `broadcast(data)` function sends JSON payloads to all connected clients
- Handles dead connection cleanup

### 4. Screen Registry (`lib/screenRegistry.tsx`)
- Registry of pluggable screen components
- `ScreenEntry` interface: `id`, `label`, `component`
- `getScreen(id)` lookup function
- Currently registered: `SaptasurSlide` (poster display), `ABC` (test component)

### 5. Components

#### `SaptasurBackdrop`
- Full-screen TV display component
- Features: blurred singer background, portrait image, top bar (logos), song info overlay, timer display, SSE connection indicator
- Animation phases: "enter"/"exit" with 380ms transitions

#### `SaptasurController`
- Phone/tablet control panel
- Features: timer controls (start/pause/resume/reset), now-playing card, progress bar, navigation (prev/next), screen selection, full song list with jump-to, performance history

#### `SaptasurSlide`
- Reusable fullscreen image slide component
- Configurable via `SLIDES` array in component file
- Supports captions, fade-in on load, connection status dot

### 6. API Routes

#### `POST /api/control`
- Accepts `ControlPayload`: `action`, optional `index`, `screenId`, `mode`
- Actions:
  - Song navigation: `next`, `prev`, `jump` (with index)
  - Timer: `start`, `pause`, `resume`, `reset`
  - Screen: `screen` (with `screenId` and `mode`)
- Writes updated state, broadcasts via SSE

#### `GET /api/events`
- SSE streaming endpoint
- Sends `sync` event on connect (full state)
- Heartbeat every 25 seconds
- Broadcasts: `song`, `timer`, `screen` event types

## Setup Assumptions

1. **Node.js & Next.js** runtime environment
2. **File system write access** for `state.json` persistence
3. **Environment variables**: None required beyond standard Next.js setup
4. **External dependencies**:
   - `next`, `react`, `react-dom`
   - Google Fonts (Geist Sans, Geist Mono)
   - Cloudinary-hosted images for singer portraits
5. **Asset placement**:
   - Logo images in `/public/assets/`
   - Fonts via CSS import (Outfit for controller, Geist for main layout)
6. **Build command**: Standard Next.js build (e.g., `next build`)
7. **Runtime**: Server must maintain SSE connections; single-server recommended for state consistency

## Key Flows

### Show Operation Flow

1. **Start**: Open TV display (`/`), optionally add `?controller` for phone UI
2. **SSE Connection**: Both clients connect to `/api/events`, receive initial `sync` event
3. **Song Navigation**: 
   - Controller sends `next`/`prev`/`jump` to `/api/control`
   - Server updates `state.json`, broadcasts `song` event
   - TV display receives event, animates song transition (exit 380ms → enter 380ms)
4. **Timer Management**:
   - Start → Server records `startedAt`
   - Pause → Server records `pausedAt`
   - Resume → Server adjusts `totalPausedMs`
   - Reset → Clears all timer state
   - Client-side timer ticks every second for display
5. **Screen Switching**:
   - Controller sends `screen` action with `screenId` and mode
   - TV displays registered screen component with slideId/phase props
   - Backdrop mode restores song display

### Connection Lifecycle
```
Client connects → SSE stream opens → Sync event sent → 
Heartbeat every 25s → Event broadcasts → 
Client disconnects → Cleanup (clearInterval, remove from set)
```

## Notable Interfaces

### `ShowState` (lib/showState.ts)
```typescript
interface ShowState {
  durationMs:    number    // Total show duration in ms
  startedAt:     number    // Timestamp when timer started (0 = not started)
  pausedAt:      number    // Timestamp when paused (0 = not paused)
  totalPausedMs: number    // Cumulative paused time
  currentIndex:  number    // Current song index
  history:       PastSong[] // Array of completed songs
  screenMode:    "backdrop" | "screen"
  screenId:      string    // Active screen ID when in screen mode
}
```

### `SSEMsg` (page.tsx)
```typescript
type SSEMsg = 
  | { type: "sync"; currentIndex: number; startedAt: number; pausedAt: number; 
      totalPausedMs: number; durationMs: number; running: boolean; 
      history: PastSong[]; mode?: "backdrop" | "screen"; screenId?: string }
  | { type: "song"; currentIndex: number; history: PastSong[] }
  | { type: "timer"; startedAt: number; pausedAt: number; totalPausedMs: number; 
      durationMs: number; running: boolean }
  | { type: "screen"; screenId: string; mode: "screen" | "backdrop" }
```

### `ControlPayload` (app/api/control/route.ts)
```typescript
interface ControlPayload {
  action:    "next" | "prev" | "jump" | "start" | "pause" | "resume" | "reset" | "screen"
  index?:    number
  screenId?: string
  mode?:     "screen" | "backdrop"
}
```

### `BackdropDisplayProps` (components/Saptasurbackdrop.tsx)
```typescript
interface BackdropDisplayProps {
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
```

### `ScreenEntry` (lib/screenRegistry.tsx)
```typescript
interface ScreenEntry {
  id:        string
  label:     string
  component: ComponentType<ScreenProps>  // Receives { slideId, phase, connected }
}
```

### `BackdropConfig` (backdropConfig.ts)
```typescript
interface BackdropConfig {
  durationHours: number
  logos: {
    school: string  // Path to school logo
    ngo1:   string  // Path to first NGO logo
    ngo2:   string  // Path to second NGO logo
  }
  songs: SongEntry[]
}
```