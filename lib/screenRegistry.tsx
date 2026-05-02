```typescript
// lib/screenRegistry.tsx
//
// ── HOW TO ADD A NEW SCREEN ───────────────────────────────────────────────────
//
//  1. Create your component anywhere (e.g. components/LataBio.tsx)
//  2. Add one entry to SCREENS below — give it an id, label, and component
//  3. That's it. It appears in the controller automatically.
//
// The component receives:  { phase: "enter" | "exit", connected: boolean }
// Use `phase` to animate in/out (same pattern as SaptasurSlide).
// ─────────────────────────────────────────────────────────────────────────────

import type { ComponentType } from "react"
import SaptasurSlide          from "@/components/SaptasurSlide"
import ABC from "@/components/ABC"
// import LataBio             from "@/components/LataBio"
// import NgoVideo            from "@/components/NgoVideo"
// import WelcomeScreen       from "@/components/WelcomeScreen"

/**
 * Props passed to every screen component rendered by the registry.
 *
 * @property slideId - Unique identifier for the current slide.
 * @property phase - Whether the slide is entering ('enter') or exiting ('exit') view.
 * @property connected - Indicates if the device is connected to a control server.
 */
export interface ScreenProps {
  slideId: string
  phase:     "enter" | "exit"
  connected: boolean
}

/**
 * Describes a single screen entry in the registry.
 *
 * @property id - Unique key used to identify the screen (e.g., in state.json).
 * @property label - Human-readable label displayed in the controller button.
 * @property component - The React component to render for this screen.
 */
export interface ScreenEntry {
  id:        string                        // unique key, used in state.json
  label:     string                        // shown in controller button
  component: ComponentType<ScreenProps>    // the React component to render on TV
}

export const SCREENS: ScreenEntry[] = [
  {
    id:        "poster",
    label:     "Event Poster",
    component: SaptasurSlide,
  },  {
    id:        "ABV",
    label:     "ABC Poster",
    component: ABC,
  },


  // ── Add new screens below ─────────────────────────────────────────────────
  // {
  //   id:        "lata-bio",
  //   label:     "Lata Mangeshkar — Life",
  //   component: LataBio,
  // },
  // {
  //   id:        "ngo-video",
  //   label:     "NGO Promo Video",
  //   component: NgoVideo,
  // },
  // {
  //   id:        "welcome",
  //   label:     "Welcome Screen",
  //   component: WelcomeScreen,
  // },
]

/**
 * Looks up a screen entry by its unique identifier.
 *
 * @param id - The unique id of the screen to find.
 * @returns The matching ScreenEntry object, or undefined if not found.
 */
export function getScreen(id: string): ScreenEntry | undefined {
  return SCREENS.find(s => s.id === id)
}
```