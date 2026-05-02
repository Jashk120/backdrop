```typescript
// app/api/events/route.ts

import { NextRequest } from "next/server"
import { sseClients }  from "@/lib/sseClients"
import { readState, msRemaining, isRunning } from "@/lib/showState"

export const dynamic = "force-dynamic"

/**
 * Handles GET requests to establish a Server-Sent Events (SSE) connection.
 * Streams real-time show state updates and heartbeat signals to connected clients.
 *
 * @param req - The incoming Next.js request object containing the abort signal.
 * @returns A Response object with an SSE stream including sync data and heartbeats.
 * @remarks The stream sends an initial sync message with the full show state,
 *          followed by periodic heartbeat pings every 25 seconds.
 *          On client disconnect, the heartbeat interval is cleared and the
 *          controller is removed from the SSE clients set.
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