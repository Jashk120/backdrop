"use client"

// components/SaptasurSlide.tsx
// A fullscreen slide component that shows a single image.
// Controlled from phone via SSE + /api/control (action: "slide").
// Drop images into /public/slides/ and register them in SLIDES below.

import { useEffect, useRef, useState } from "react"

// ── Slide registry ─────────────────────────────────────────────────────────
// Add your images here. `id` is what the controller sends.
export interface SlideEntry {
  id:      string
  src:     string   // path relative to /public
  alt:     string
  caption?: string  // optional text overlay
}

export const SLIDES: SlideEntry[] = [
  {
    id:      "poster",
    src:     "/assets/media-desktop-tere-sur-aur-mere-geet-2026-0-2026-3-13-t-5-49-50.avif",
    alt:     "Tere Sur Aur Mere Geet 2026 — event poster",
    caption: undefined,
  },
  // add more slides here:
  // { id: "lata-1", src: "/slides/lata-1.jpg", alt: "Lata Mangeshkar", caption: "The Nightingale of India" },
]

// ── Types ──────────────────────────────────────────────────────────────────
interface Props {
  slideId:   string                           // which slide to show
  phase:     "enter" | "exit"                 // transition state
  connected: boolean
}

// ── Component ──────────────────────────────────────────────────────────────
export default function SaptasurSlide({ slideId, phase, connected }: Props) {
  const slide = SLIDES.find(s => s.id === slideId) ?? SLIDES[0]
  const [loaded, setLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  // Reset loaded state whenever slide changes
  useEffect(() => {
    setLoaded(false)
  }, [slideId])

  // If image is already cached, mark loaded immediately
  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true)
  }, [slideId])

  return (
    <div
      style={{
        position:        "fixed",
        inset:           0,
        backgroundColor: "#000",
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        overflow:        "hidden",

        // Transition in/out driven by parent phase
        opacity:    phase === "enter" ? 1 : 0,
        transform:  phase === "enter" ? "scale(1)" : "scale(1.03)",
        transition: "opacity 380ms ease, transform 380ms ease",
      }}
    >
      {/* ── Main image ── */}
      <img
        ref={imgRef}
        src={slide.src}
        alt={slide.alt}
        onLoad={() => setLoaded(true)}
        style={{
          width:      "100%",
          height:     "100%",
          objectFit:  "contain",  // change to "cover" if you want it to fill the screen
          display:    "block",

          // Fade in once loaded to avoid flash
          opacity:    loaded ? 1 : 0,
          transition: "opacity 600ms ease",
        }}
      />

      {/* ── Optional caption overlay ── */}
      {slide.caption && (
        <div
          style={{
            position:       "absolute",
            bottom:         "2.5rem",
            left:           "50%",
            transform:      "translateX(-50%)",
            background:     "rgba(0,0,0,0.55)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            color:          "#fff",
            fontFamily:     "'Georgia', serif",
            fontSize:       "clamp(1rem, 2.5vw, 1.75rem)",
            letterSpacing:  "0.08em",
            padding:        "0.6em 1.8em",
            borderRadius:   "0.4em",
            pointerEvents:  "none",
            textAlign:      "center",
            opacity:        loaded ? 1 : 0,
            transition:     "opacity 800ms ease 200ms",
          }}
        >
          {slide.caption}
        </div>
      )}

      {/* ── Connection dot (top-right, subtle) ── */}
      <div
        style={{
          position:        "absolute",
          top:             "1rem",
          right:           "1rem",
          width:           "0.5rem",
          height:          "0.5rem",
          borderRadius:    "50%",
          backgroundColor: connected ? "#22c55e" : "#ef4444",
          opacity:         0.6,
          transition:      "background-color 0.4s ease",
          pointerEvents:   "none",
        }}
      />
    </div>
  )
}
