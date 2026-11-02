import { normaliseMobile } from "@/lib/phone";

/** Bump this when the terms change so drivers are asked to accept them again. */
export const TERMS_VERSION = "2026-11-02";

export interface SignupContact {
  mobile: string | null;
  whatsappConsent: boolean;
  termsAcceptedAt: string | null;
  termsVersion: string | null;
}

export function signupComplete(state: SignupContact | null): boolean {
  if (!state?.mobile || !state.whatsappConsent || !state.termsAcceptedAt) return false;
  return state.termsVersion === TERMS_VERSION;
}

export function readPendingSignup(raw: string | undefined): { mobile: string } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { mobile?: unknown };
    if (typeof parsed.mobile !== "string") return null;
    const mobile = normaliseMobile(parsed.mobile);
    return mobile ? { mobile } : null;
  } catch {
    return null;
  }
}
