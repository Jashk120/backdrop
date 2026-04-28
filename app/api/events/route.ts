```typescript
// app/api/events/route.ts

import { NextRequest } from "next/server"
import { sseClients }  from "@/lib/sseClients"
import { readState, msRemaining, isRunning } from "@/lib/showState"

export const dynamic = "force-dynamic"

/**
 * Handles GET requests for Server-Sent Events (SSE) streaming endpoint.
 * 
 * Establishes an SSE connection with the client, sends an initial sync event
 * containing the current show state, and maintains the connection with periodic
 * heartbeats. When the client disconnects, the connection is cleaned up.
 *
 * @param req - The incoming Next.js request object containing the signal for abort handling.
 * @returns A Response object with an SSE stream that sends event data to the client.
 */
export async function GET(req: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      sseClients.add(controller)

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
          mode:          state.screenMode,   // restores TV view on reconnect
          screenId:      state.screenId,
        })}\n\n`)
      } catch { /* ignore */ }

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
```