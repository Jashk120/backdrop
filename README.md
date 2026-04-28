# Saptasur Backdrop

## Overview

Saptasur Backdrop is a Next.js application designed for live event stage management. It provides real-time backdrop display with synchronized song navigation, countdown timer, and screen management. The system uses Server-Sent Events (SSE) for live synchronization between a controller interface (phone/tablet) and TV displays.

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

## Features

- **Real-time song navigation**: Uses SSE to synchronize the TV display with a remote controller.
- **Countdown timer**: Tracks show duration; supports start, pause, resume, and reset actions.
- **Screen management**: Switches between a backdrop mode (song display) and other pluggable screens (e.g., fullscreen slides).
- **File-based state persistence**: The current show state is stored in `state.json` on the server.
- **Modular screen registry**: New screen components can be added via the registry without modifying core logic.
- **Controller UI**: Optimized for phone/tablet use, provides full control over the show.

## File Structure

```
saptasur-backdrop/
├── public/
│   └── assets/
│       ├── school-logo.png
│       ├── ngo1-logo.png
│       └── ngo2-logo.png
├── app/
│   ├── page.tsx                     # Main page (TV display or controller depending on query)
│   ├── api/
│   │   ├── control/route.ts         # POST /api/control – handle control actions
│   │   └── events/route.ts          # GET /api/events – SSE endpoint
│   └── layout.tsx                   # Root layout (fonts, etc.)
├── components/
│   ├── Saptasurbackdrop.tsx         # Full-screen TV backdrop component
│   ├── SaptasurController.tsx       # Controller UI component
│   └── SaptasurSlide.tsx            # Fullscreen image slide component
├── lib/
│   ├── showState.ts                 # Show state read/write helpers
│   ├── sseClients.ts                # SSE client management and broadcast
│   └── screenRegistry.tsx           # Pluggable screen registry
├── backdropConfig.ts                # Song list, logos, duration configuration
└── state.json                       # Persistent state (auto-generated)
```

## Usage

### 1. Launching the application

Run the development server:

```bash
npm run dev
```

Open `http://localhost:3000` for the TV display.  
Open `http://localhost:3000?control` for the controller interface (phone/tablet).

### 2. Control API (`POST /api/control`)

Send control actions from any client to change the show state.

```bash
# Jump to song index 3
curl -X POST http://localhost:3000/api/control \
  -H "Content-Type: application/json" \
  -d '{"action": "jump", "index": 3}'

# Start the timer
curl -X POST http://localhost:3000/api/control \
  -H "Content-Type: application/json" \
  -d '{"action": "start"}'

# Switch to screen mode with the "ABC" screen
curl -X POST http://localhost:3000/api/control \
  -H "Content-Type: application/json" \
  -d '{"action": "screen", "screenId": "ABC", "mode": "screen"}'

# Return to backdrop mode
curl -X POST http://localhost:3000/api/control \
  -H "Content-Type: application/json" \
  -d '{"action": "screen", "mode": "backdrop"}'
```

### 3. SSE Event Stream (`GET /api/events`)

Connect to the SSE endpoint to receive real-time updates.

```javascript
const eventSource = new EventSource("http://localhost:3000/api/events");

eventSource.addEventListener("sync", (event) => {
  const data = JSON.parse(event.data);
  console.log("Initial state:", data);
});

eventSource.addEventListener("song", (event) => {
  const data = JSON.parse(event.data);
  console.log("Song changed to index:", data.currentIndex);
});

eventSource.addEventListener("timer", (event) => {
  const data = JSON.parse(event.data);
  console.log("Timer update:", data);
});

eventSource.addEventListener("screen", (event) => {
  const data = JSON.parse(event.data);
  console.log("Screen changed:", data.screenId, data.mode);
});
```

### 4. Implementing a custom screen

Register a new screen component in `lib/screenRegistry.tsx`:

```tsx
// lib/screenRegistry.tsx
import { ScreenEntry } from "./screenRegistry";

const CustomScreen: React.FC<{ slideId?: string; phase: string; connected: boolean }> = ({
  slideId,
  phase,
  connected,
}) => {
  return (
    <div style={{ background: "green", height: "100vh", color: "white" }}>
      <h1>Custom Screen</h1>
      <p>Slide ID: {slideId}</p>
      <p>Phase: {phase}</p>
      <p>Connected: {connected ? "✅" : "❌"}</p>
    </div>
  );
};

export const SCREENS: ScreenEntry[] = [
  { id: "saptasur-slide", label: "Saptasur Slide", component: null }, // placeholder
  { id: "ABC", label: "ABC Screen", component: CustomScreen },
];
```

### 5. Using the backdrop component directly

```tsx
// Example usage of SaptasurBackdrop
import SaptasurBackdrop from "@/components/Saptasurbackdrop";
import { CONFIG } from "@/backdropConfig";
import { SongEntry } from "@/backdropConfig";

const song: SongEntry = CONFIG.songs[0];

function MyComponent() {
  return (
    <SaptasurBackdrop
      config={CONFIG}
      song={song}
      currentIndex={0}
      phase="enter"
      imgKey={Date.now()}
      timerDisplay="02:30:00"
      timerWarn={false}
      timerRunning={true}
      timerStarted={true}
      connected={true}
    />
  );
}
```

## Setup

### Prerequisites

- Node.js 18+ and npm/yarn
- File system write access (for `state.json`)

### Installation

1. Clone the repository.
2. Install dependencies:

```bash
npm install
```

3. Place logo images in `public/assets/`:
   - `school-logo.png`
   - `ngo1-logo.png`
   - `ngo2-logo.png`

4. (Optional) Configure the song list and show duration in `backdropConfig.ts`.

5. Run the development server:

```bash
npm run dev
```

### Build for production

```bash
npm run build
npm start
```

### Environment Variables

No environment variables are required beyond standard Next.js defaults.

## Notes

- **State persistence**: The application writes state to `state.json` in the project root. Ensure the server process has write permissions.
- **Single-server recommended**: SSE connections rely on a single server instance for consistency across clients. Load balancing may break state synchronization.
- **SSE heartbeat**: The server sends a heartbeat every 25 seconds to keep connections alive. Clients should handle reconnection on disconnect.
- **Image assets**: Singer portraits are loaded from Cloudinary URLs embedded in the song entries. You may replace them with local paths or other CDN URLs.
- **Screen registry**: Screen components receive `{ slideId, phase, connected }` props. The `phase` prop can be `"enter"` or `"exit"` for transition animations.
- **Timer display**: The countdown timer shows the remaining show time. If the timer reaches zero, a warning state (`timerWarn`) is set.
- **Controller interface**: The controller UI is optimized for mobile viewports. It includes a full song list, navigation buttons, timer controls, and screen selection.