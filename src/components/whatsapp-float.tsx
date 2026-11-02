"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MotionConfig, motion } from "framer-motion";
import { DESK_WHATSAPP_NOTE, formatMobile, whatsAppUrl } from "@/lib/phone";

function BubbleIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true">
      <path
        d="M8 10.5c0-2.4 2.2-4.5 6.2-4.5h3.6c4 0 6.2 2.1 6.2 4.5v3.2c0 2.4-2.2 4.5-6.2 4.5h-2.4L10.5 23v-4.2C9 18.2 8 16.8 8 15.2v-4.7Z"
        fill="currentColor"
      />
      <path d="M12.2 12.2h7.6M12.2 15h4.4" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function WhatsAppFloat({ number }: { number: string | null }) {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const desk = number ? whatsAppUrl(number, DESK_WHATSAPP_NOTE) : null;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const onScroll = () => {
      const y = window.scrollY;
      const nearBottom = window.innerHeight + y > document.documentElement.scrollHeight - 180;
      const goingDown = y > lastY.current + 6;
      const goingUp = y < lastY.current - 6;
      lastY.current = y;
      if (nearBottom || (goingDown && y > 72)) setHidden(true);
      else if (goingUp || y < 24) setHidden(false);
    };
    lastY.current = window.scrollY;
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const tucked = hidden && !open;

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className="fixed right-4 z-40 flex w-[min(22rem,calc(100vw-2rem))] flex-col items-end print:hidden"
        style={{ bottom: "calc(1.1rem + var(--dv-banner-space, 0px))" }}
        animate={{ opacity: tucked ? 0 : 1, y: tucked ? 18 : 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        inert={tucked}
        aria-hidden={tucked}
      >
        {open ? (
          <section className="dv-card mb-3 w-full overflow-hidden" aria-label="WhatsApp forum desk">
            <div className="bg-navy px-4 py-3 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber">Forum desk</p>
              <h2 className="mt-1 font-serif text-2xl leading-none">WhatsApp</h2>
            </div>
            <div className="grid gap-3 p-4 text-base">
              {desk && number ? (
                <>
                  <p>Message the coordinators on {formatMobile(number)}. Send this only when you are safely parked or off duty.</p>
                  <p className="text-[var(--dv-muted)]">A WhatsApp chat is not monitored for emergencies, and it is not a confidential case file. Keep incident detail, medical information and negotiation papers off the chat.</p>
                  <a className="touch inline-flex w-fit items-center rounded-full bg-teal px-4 font-semibold text-white" href={desk} target="_blank" rel="noopener noreferrer">
                    Open WhatsApp
                  </a>
                </>
              ) : (
                <>
                  <p>The public WhatsApp number is not on the site yet. This button will open the chat as soon as the forum desk number is added.</p>
                  <p className="text-[var(--dv-muted)]">If you have a driver account, save your own mobile under Account. A coordinator can then message you from the accounts list. That chat is still not an emergency line.</p>
                  <Link className="touch inline-flex w-fit items-center rounded-full bg-navy px-4 font-semibold text-white" href="/contact">
                    Use the contact form
                  </Link>
                </>
              )}
              <Link className="text-sm font-semibold text-teal underline" href="/terms">
                Terms for WhatsApp contact
              </Link>
            </div>
          </section>
        ) : null}
        <button
          type="button"
          className="touch inline-flex items-center gap-2 rounded-full bg-navy py-2 pl-2 pr-4 font-semibold text-white shadow-dv"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-teal text-white">
            <BubbleIcon />
          </span>
          <span className="text-left leading-tight">
            <span className="block text-sm">{open ? "Close" : "WhatsApp"}</span>
            <span className="block text-xs font-medium text-white/70">{number ? "Forum desk" : "Line coming soon"}</span>
          </span>
        </button>
      </motion.div>
    </MotionConfig>
  );
}
