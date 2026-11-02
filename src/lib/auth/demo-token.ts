import { createHmac, timingSafeEqual } from "crypto";

export const DEMO_USER_IDS = [
  "demo-driver-a",
  "demo-driver-b",
  "demo-reviewer",
  "demo-coordinator",
  "demo-editor",
  "demo-publisher",
  "demo-tech",
  "demo-survey",
  "demo-pending",
] as const;

export type DemoUserId = (typeof DEMO_USER_IDS)[number];

function secret(): string {
  return process.env.DEMO_SESSION_SECRET || "demo-only-not-for-production";
}

export function signDemoToken(userId: string): string | null {
  if (!DEMO_USER_IDS.includes(userId as DemoUserId)) return null;
  const mac = createHmac("sha256", secret()).update(userId).digest("base64url");
  return `${userId}.${mac}`;
}

export function verifyDemoToken(token: string | undefined): string | null {
  if (!token) return null;
  const splitAt = token.lastIndexOf(".");
  if (splitAt <= 0) return null;
  const userId = token.slice(0, splitAt);
  const mac = token.slice(splitAt + 1);
  const expected = createHmac("sha256", secret()).update(userId).digest("base64url");
  const given = Buffer.from(mac);
  const wanted = Buffer.from(expected);
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return null;
  if (!DEMO_USER_IDS.includes(userId as DemoUserId)) return null;
  return userId;
}

export function sessionUserFromDemoCookie(mode: "demo" | "live", token: string | undefined): string | null {
  if (mode !== "demo") return null;
  return verifyDemoToken(token);
}
