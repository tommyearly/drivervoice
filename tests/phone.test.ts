import { describe, expect, it } from "vitest";
import { formatMobile, normaliseMobile, whatsAppUrl } from "@/lib/phone";
import { readPendingSignup, signupComplete, TERMS_VERSION } from "@/lib/consent";

describe("mobile numbers", () => {
  it("treats an Irish mobile starting with 0 as +353", () => {
    expect(normaliseMobile("087 123 4567")).toBe("+353871234567");
    expect(formatMobile("+353871234567")).toBe("+353 87 123 4567");
  });

  it("accepts international form and rejects blanks", () => {
    expect(normaliseMobile("+353871234567")).toBe("+353871234567");
    expect(normaliseMobile("00353871234567")).toBe("+353871234567");
    expect(normaliseMobile("")).toBeNull();
    expect(normaliseMobile("123")).toBeNull();
  });

  it("builds a WhatsApp link without putting a name in the message", () => {
    const url = whatsAppUrl("+353871234567", "Hello");
    expect(url.startsWith("https://wa.me/353871234567?text=")).toBe(true);
  });
});

describe("signup consent", () => {
  it("requires the current terms version, a mobile number, and WhatsApp consent", () => {
    expect(signupComplete(null)).toBe(false);
    expect(signupComplete({
      mobile: "+353871234567",
      whatsappConsent: true,
      termsAcceptedAt: "2026-11-02T00:00:00.000Z",
      termsVersion: TERMS_VERSION,
    })).toBe(true);
    expect(signupComplete({
      mobile: "+353871234567",
      whatsappConsent: true,
      termsAcceptedAt: "2026-11-02T00:00:00.000Z",
      termsVersion: "2020-01-01",
    })).toBe(false);
  });

  it("ignores a pending cookie that is not a mobile number", () => {
    expect(readPendingSignup(undefined)).toBeNull();
    expect(readPendingSignup("{")).toBeNull();
    expect(readPendingSignup(JSON.stringify({ mobile: "087 123 4567" }))).toEqual({ mobile: "+353871234567" });
  });
});
