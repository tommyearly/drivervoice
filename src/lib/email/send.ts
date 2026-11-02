import "server-only";
import { Resend } from "resend";
import type { Mail } from "@/lib/domain";

export async function sendMail(to: string, mail: Mail): Promise<{ sent: boolean; reason?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return { sent: false, reason: "provider_not_configured" };
  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({ from, to, subject: mail.subject, text: mail.text });
    if (error) return { sent: false, reason: "provider_error" };
    return { sent: true };
  } catch {
    return { sent: false, reason: "provider_error" };
  }
}
