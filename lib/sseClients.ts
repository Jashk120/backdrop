```typescript
// lib/sseClients.ts
declare global {
  // eslint-disable-next-line no-var
  var __sseClients: Set<ReadableStreamDefaultController> | undefined
}

if (!global.__sseClients) {
  global.__sseClients = new Set()
}

export const sseClients = global.__sseClients

/**
 * Broadcasts a data object to all connected SSE clients.
 *
 * Serializes the data as a JSON string and enqueues it to each client's stream
 * controller. If a client has disconnected (enqueue fails), it is automatically
 * removed from the client set.
 *
 * @param data - The data object to broadcast to all clients.
 * @returns void
 */
export function broadcast(data: object) {
  const payload = `data: ${JSON.stringify(data)}\n\n`
  for (const ctrl of sseClients) {
    try {
      ctrl.enqueue(payload)
    } catch {
      sseClients.delete(ctrl)
    }
  }
}
```