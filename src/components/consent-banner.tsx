"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "dv-cookie-choice";

type Decision = "accepted" | "rejected";

interface Choice {
  necessary: true;
  preferences: boolean;
  decision: Decision;
  at: string;
}

function readChoice(): Choice | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Choice>;
    if (parsed.decision !== "accepted" && parsed.decision !== "rejected") return null;
    return {
      necessary: true,
      preferences: Boolean(parsed.preferences),
      decision: parsed.decision,
      at: typeof parsed.at === "string" ? parsed.at : "",
    };
  } catch {
    return null;
  }
}

function writeChoice(decision: Decision, preferences: boolean): Choice {
  const choice: Choice = { necessary: true, preferences, decision, at: new Date().toISOString() };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(choice));
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `dv_cookie_choice=${decision}; Max-Age=15552000; Path=/; SameSite=Lax${secure}`;
  return choice;
}

function ChoiceButtons({ onAccept, onReject, onDetails, detailsLabel }: { onAccept: () => void; onReject: () => void; onDetails?: () => void; detailsLabel?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="touch rounded-full border border-navy/25 bg-white px-4 font-semibold text-navy" onClick={onReject}>
        Reject optional
      </button>
      {onDetails ? (
        <button type="button" className="touch rounded-full border border-navy/25 bg-white px-4 font-semibold text-navy" onClick={onDetails}>
          {detailsLabel}
        </button>
      ) : null}
      <button type="button" className="touch rounded-full bg-teal px-4 font-semibold text-white" onClick={onAccept}>
        Accept
      </button>
    </div>
  );
}

function CategoryNotes() {
  return (
    <div className="grid gap-3 rounded-dv bg-paper p-4 md:grid-cols-2">
      <div>
        <p className="font-semibold">Essential, always on</p>
        <p className="text-[var(--dv-muted)]">The sign-in cookie stays so an invited account can remain signed in. Rejecting optional cookies does not sign you out.</p>
      </div>
      <div>
        <p className="font-semibold">Remembering this answer</p>
        <p className="text-[var(--dv-muted)]">Accept stores a preference cookie for about six months. Reject stores only the refusal, so the notice does not return on every page. No advertising or analytics cookies are used.</p>
      </div>
    </div>
  );
}

export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={className ?? "touch inline-flex items-center rounded-lg px-2 text-left text-white/90 hover:bg-white/10"}
      onClick={() => window.dispatchEvent(new Event("dv-open-cookies"))}
    >
      Cookie settings
    </button>
  );
}

export function CookiePreferenceCard() {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState("");

  useEffect(() => {
    setChoice(readChoice());
    setReady(true);
  }, []);

  function commit(decision: Decision) {
    const next = writeChoice(decision, decision === "accepted");
    setChoice(next);
    setSaved(decision === "rejected" ? "Optional cookies are off. The sign-in cookie is unchanged." : "Your choice is saved on this browser.");
  }

  return (
    <section className="dv-card grid gap-4 p-5" aria-label="Cookie choices">
      <h2 className="text-2xl">Your choice on this browser</h2>
      {ready && choice ? (
        <p>
          Current decision: <span className="font-semibold">{choice.decision === "accepted" ? "accepted" : "optional cookies rejected"}</span>
          {choice.at ? ` · ${choice.at.slice(0, 10)}` : ""}.
        </p>
      ) : (
        <p>No choice is stored on this browser yet.</p>
      )}
      <CategoryNotes />
      <ChoiceButtons onAccept={() => commit("accepted")} onReject={() => commit("rejected")} />
      {saved ? <p role="status">{saved}</p> : null}
    </section>
  );
}

export function ConsentBanner() {
  const panelRef = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [forced, setForced] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setChoice(readChoice());
    setReady(true);
    const open = () => {
      setChoice(readChoice());
      setForced(true);
      setExpanded(true);
    };
    window.addEventListener("dv-open-cookies", open);
    return () => window.removeEventListener("dv-open-cookies", open);
  }, []);

  const visible = ready && (!choice || forced);

  useEffect(() => {
    const root = document.documentElement;
    if (!visible || !panelRef.current) {
      root.style.setProperty("--dv-banner-space", "0px");
      return;
    }
    const element = panelRef.current;
    const apply = () => root.style.setProperty("--dv-banner-space", `${element.offsetHeight + 12}px`);
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(element);
    return () => {
      observer.disconnect();
      root.style.setProperty("--dv-banner-space", "0px");
    };
  }, [visible, expanded]);

  if (!visible) return null;

  function commit(decision: Decision) {
    setChoice(writeChoice(decision, decision === "accepted"));
    setForced(false);
    setExpanded(false);
  }

  return (
    <aside
      ref={panelRef}
      className="fixed inset-x-0 bottom-0 z-50 border-t-4 border-amber bg-white/95 px-4 py-4 shadow-[0_-16px_40px_rgba(16,35,53,0.12)] backdrop-blur print:hidden"
      aria-label="Cookies and privacy"
    >
      <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-[1.4fr_auto] md:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">Cookies and privacy</p>
          <h2 className="mt-1 font-serif text-2xl text-navy md:text-3xl">A sign-in cookie. Everything else waits for a yes.</h2>
          <p className="mt-2 max-w-3xl text-[var(--dv-muted)]">
            Drivers Voice uses an essential cookie so an invited driver can stay signed in. There are no advertising or analytics trackers. Rejecting optional cookies still stores that answer on this browser, so this notice does not follow you from page to page.
          </p>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
            <Link className="underline" href="/cookies">Cookie note</Link>
            <Link className="underline" href="/privacy">Privacy notice</Link>
            <Link className="underline" href="/terms">Terms</Link>
          </p>
        </div>
        <ChoiceButtons
          onAccept={() => commit("accepted")}
          onReject={() => commit("rejected")}
          onDetails={() => setExpanded((value) => !value)}
          detailsLabel={expanded ? "Hide details" : "See details"}
        />
      </div>
      {expanded ? (
        <div className="mx-auto mt-4 max-w-6xl">
          <CategoryNotes />
        </div>
      ) : null}
    </aside>
  );
}
