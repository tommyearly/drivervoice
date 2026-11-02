import { NextResponse } from "next/server";
import { actionReminderEmail, referenceIsOpaque, resolveMode, siteOrigin } from "@/lib/domain";
import { sendMail } from "@/lib/email/send";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (resolveMode(process.env) !== "live") {
    return NextResponse.json({ ok: true, sent: false, reason: "demonstration" });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: true, sent: false, reason: "database_not_configured" });
  const today = new Date().toISOString().slice(0, 10);
  const { data: due, error } = await admin
    .from("actions")
    .select("reference")
    .lt("target_date", today)
    .in("status", ["proposed", "agreed", "in_progress", "awaiting_reply"])
    .limit(20);
  if (error) return NextResponse.json({ ok: true, sent: false, reason: "lookup_failed" });
  const references = (due ?? []).map((row) => row.reference).filter((reference) => referenceIsOpaque(reference));
  if (references.length === 0) return NextResponse.json({ ok: true, sent: false, reason: "none_due" });
  const { data: profiles } = await admin.from("profiles").select("id").eq("status", "active").eq("email_updates", true).limit(50);
  if (!profiles?.length) return NextResponse.json({ ok: true, sent: false, reason: "recipient_not_configured" });
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const emails = new Map(listed.data.users.map((user) => [user.id, user.email]));
  const origin = siteOrigin();
  let count = 0;
  for (const reference of references) {
    for (const profile of profiles) {
      const email = emails.get(profile.id);
      if (!email) continue;
      const result = await sendMail(email, actionReminderEmail({ reference, signInUrl: `${origin}/sign-in`, origin }));
      if (result.sent) count += 1;
      if (!result.sent && result.reason === "provider_not_configured") {
        return NextResponse.json({ ok: true, sent: false, reason: "provider_not_configured" });
      }
    }
  }
  return NextResponse.json({ ok: true, sent: count > 0, count });
}
