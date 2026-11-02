/** International form, such as +353871234567. Irish numbers starting with 0 are treated as +353. */
export function normaliseMobile(input: string): string | null {
  const compact = input.trim().replace(/[\s().-]/g, "");
  if (!compact) return null;
  let body = compact;
  if (body.startsWith("+")) body = body.slice(1);
  else if (body.startsWith("00")) body = body.slice(2);
  else if (body.startsWith("0")) body = `353${body.slice(1)}`;
  if (!/^[1-9]\d{7,14}$/.test(body)) return null;
  return `+${body}`;
}

export function formatMobile(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  if (digits.startsWith("353") && digits.length === 12) {
    return `+353 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return e164.startsWith("+") ? e164 : `+${digits}`;
}

export function whatsAppUrl(e164: string, message?: string): string {
  const digits = e164.replace(/\D/g, "");
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** Public forum desk number. Leave NEXT_PUBLIC_WHATSAPP_NUMBER empty until it is ready. */
export function publishedWhatsAppNumber(): string | null {
  const raw = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim() ?? "";
  if (!raw) return null;
  return normaliseMobile(raw);
}

export const DRIVER_WHATSAPP_NOTE = "Hello, this is a Drivers Voice coordinator following up on your forum account.";
export const DESK_WHATSAPP_NOTE = "Hello Drivers Voice. I am off duty and have a question about the forum.";
