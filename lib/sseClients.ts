```typescript
// lib/sseClients.ts

/**
 * Global augmentation to ensure the SSE clients set is available across module reloads.
 */
declare global {
  // eslint-disable-next-line no-var
  var __sseClients: Set<ReadableStreamDefaultController> | undefined
}

if (!global.__sseClients) {
  global.__sseClients = new Set()
}

/** The singleton set of active SSE client controllers. */
export const sseClients = global.__sseClients

/**
 * Broadcasts an object as a Server-Sent Event to all connected clients.
 *
 * @param data - The data object to be serialized and sent to each client.
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