// lib/sseClients.ts
declare global {
  // eslint-disable-next-line no-var
  var __sseClients: Set<ReadableStreamDefaultController> | undefined
}

if (!global.__sseClients) {
  global.__sseClients = new Set()
}

export const sseClients = global.__sseClients

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