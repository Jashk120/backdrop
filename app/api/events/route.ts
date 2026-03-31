// app/api/events/route.ts
// TV connects here. On connect, immediately sends full current state.
// Subsequent updates are pushed by /api/control via broadcast().

import { NextRequest } from "next/server"
import { sseClients }  from "@/lib/sseClients"
import { readState, msRemaining, isRunning } from "@/lib/showState"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      sseClients.add(controller)

      // Send full state immediately so TV syncs on connect / reconnect
      const state = readState()
      try {
        controller.enqueue(`data: ${JSON.stringify({
          type:          "sync",
          currentIndex:  state.currentIndex,
          startedAt:     state.startedAt,
          pausedAt:      state.pausedAt,
          totalPausedMs: state.totalPausedMs,
          durationMs:    state.durationMs,
          msRemaining:   msRemaining(state),
          running:       isRunning(state),
          history:       state.history,
          // Slide state — restores TV to correct view on reconnect
          mode:          state.slideMode,
          slideId:       state.slideId,
        })}\n\n`)
      } catch { /* ignore */ }

      // Keep-alive heartbeat every 25s
      const heartbeat = setInterval(() => {
        try { controller.enqueue(": heartbeat\n\n") }
        catch { clearInterval(heartbeat) }
      }, 25_000)

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat)
        sseClients.delete(controller)
        try { controller.close() } catch { /* already closed */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type":      "text/event-stream",
      "Cache-Control":     "no-cache, no-transform",
      "Connection":        "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}