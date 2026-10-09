export class GatewayTimeoutError extends Error {
  constructor() { super("Upstream request exceeded timeout"); this.name = "GatewayTimeoutError"; }
}
/** Abort the SDK request and reject promptly. This also removes the timeout on settlement. */
export async function withDeadline<T>(operation: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation(controller.signal),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new GatewayTimeoutError());
        }, timeoutMs);
        timer.unref?.();
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
