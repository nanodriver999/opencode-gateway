import { timingSafeEqual } from "node:crypto";

export function createRequestGuard(key: string, rateLimit: number, clock: () => number = Date.now) {
  const expected = Buffer.from("Bearer " + key);
  const clients = new Map<string,{ window: number; count: number }>();
  return {
    authorized(value: unknown) {
      if (typeof value !== "string") return false;
      const received = Buffer.from(value);
      return received.length === expected.length && timingSafeEqual(received, expected);
    },
    allow(ip: string) {
      const now = clock();
      const window = Math.floor(now / 60000);
      const current = clients.get(ip);
      if (current?.window === window) {
        if (current.count >= rateLimit) return false;
        current.count++;
      } else clients.set(ip,{window,count:1});
      if (clients.size > 10000) {
        for (const [address, item] of clients) if (item.window !== window) clients.delete(address);
      }
      return true;
    },
  };
}
