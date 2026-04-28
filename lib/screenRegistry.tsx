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
 * Props passed to each screen component for rendering on the TV display.
 *
 * @property slideId - The unique identifier of the slide.
 * @property phase - The animation phase (enter or exit).
 * @property connected - Whether the controller is connected.
 */
export interface ScreenProps {
  slideId: string
  phase:     "enter" | "exit"
  connected: boolean
}

/**
 * Defines a screen entry in the registry, mapping an id and label to a React component.
 *
 * @property id - Unique key used in state.json.
 * @property label - Display label shown in the controller button.
 * @property component - The React component to render on TV.
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

// Lookup by id — used in page.tsx to render the right component
/**
 * Looks up a screen entry by its unique identifier.
 *
 * @param id - The id of the screen to find.
 * @returns The matching ScreenEntry, or undefined if not found.
 */
export function getScreen(id: string): ScreenEntry | undefined {
  return SCREENS.find(s => s.id === id)
}
```