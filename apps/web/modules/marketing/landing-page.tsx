"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronDown, FlaskConical, Info, PenLine, Share2, Sparkles } from "lucide-react";
import { CursorGlow } from "@/components/effects/cursor-glow";
import { AuthCtaGroup } from "@/components/marketing/auth-cta-group";
import { Button } from "@/components/ui/button";
import { HeroDemoReel } from "@/modules/marketing/hero-demo-reel";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    n: "01",
    title: "Brief",
    body: "Set topic, sources, or a social idea — structured inputs, not a chat dump.",
  },
  {
    n: "02",
    title: "Generate",
    body: "Stream a draft into a real editor you can edit while it still lands.",
  },
  {
    n: "03",
    title: "Refine & ship",
    body: "Improve, copy, download, and save to History in one continuous loop.",
  },
];

const MODULES = [
  {
    id: "writer",
    title: "Writer Studio",
    description:
      "Blogs, docs, emails, newsletters, and more — from a clear brief into TipTap you can refine, export, and save.",
    href: "/writer",
    icon: PenLine,
  },
  {
    id: "research",
    title: "Research Studio",
    description:
      "Pull from PDFs, URLs, YouTube, or paste — then generate summaries, insights, and flashcards. Academic Mode adds paper search and IEEE-style learning drafts.",
    href: "/research",
    icon: FlaskConical,
  },
  {
    id: "social",
    title: "Social Studio",
    description: "One idea, multi-platform copy that respects each channel’s voice — LinkedIn, X, Threads, and more.",
    href: "/social",
    icon: Share2,
  },
];

const FAQS = [
  {
    q: "What is CreatorOS?",
    a: "An AI workspace for creators — Writer, Research (with Academic Mode), Social, Editor, and Templates in one place, without a chatbot chat wall.",
  },
  {
    q: "Do I need an account to try it?",
    a: "Locally you can use Dev / local workspace without Clerk. With Clerk configured, sign-in protects the app routes while this landing page stays public.",
  },
  {
    q: "Where do I edit generated drafts?",
    a: "Studios stream a read-only preview. Save the draft, then open it in Editor (or History) to revise, improve, and export.",
  },
  {
    q: "What is Academic Mode?",
    a: "A Research Studio mode for paper search and IEEE-style learning drafts. It’s a learning aid — always verify citations before any formal submission.",
  },
  {
    q: "Can I use my own AI provider?",
    a: "Yes. Settings routes generation through the provider abstraction (Mock locally, OpenRouter live, with stubs for other vendors).",
  },
];

export function LandingPage() {
  const [openIntro, setOpenIntro] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const reduceMotion = useReducedMotion();
  const fade = (delay = 0) =>
    reduceMotion
      ? { initial: false as const, animate: { opacity: 1 }, transition: { duration: 0 } }
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <div className="relative overflow-x-hidden">
      <CursorGlow color="34, 211, 238" size={34} intensity={0.28} />

      <section className="relative min-h-[100svh] overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_18%,rgba(34,211,238,0.18),transparent_58%)]" />
          <div
            className="absolute inset-0 opacity-[0.28]"
            style={{
              backgroundImage:
                "linear-gradient(to right, color-mix(in oklab, var(--border) 55%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--border) 55%, transparent) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
              maskImage: "radial-gradient(ellipse at 50% 35%, black 18%, transparent 70%)",
            }}
          />
        </div>

        <div className="relative mx-auto flex min-h-[100svh] max-w-5xl flex-col items-center justify-center px-5 pb-16 pt-16 text-center md:px-8 md:pb-20 md:pt-20">
          <motion.div {...fade(0)} className="w-full max-w-2xl">
            <div className="mb-6 flex items-center justify-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] text-white shadow-[0_0_28px_var(--glow)]">
                <Sparkles className="h-4 w-4" />
              </span>
            </div>
            <p className="text-5xl font-semibold tracking-tight md:text-6xl lg:text-7xl">CreatorOS</p>
            <h1 className="mx-auto mt-5 max-w-xl text-lg font-medium tracking-tight text-[color-mix(in_oklab,var(--foreground)_88%,transparent)] md:text-2xl">
              Write, research, and publish from one studio.
            </h1>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[var(--muted-foreground)] md:text-base">
              Structured briefs. Streamed drafts. No chatbot clutter.
            </p>
            <div className="mt-8">
              <AuthCtaGroup />
            </div>
          </motion.div>

          <motion.div {...fade(0.12)} className="mt-12 w-full md:mt-14">
            <HeroDemoReel />
          </motion.div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-5xl px-5 py-20 text-center md:px-8 md:py-24">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted-foreground)]">How it works</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-4xl">Brief. Generate. Ship.</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-[var(--muted-foreground)] md:text-base">
          The same loop across Writer, Research, and Social.
        </p>
        <ol className="mt-12 grid gap-10 text-left md:grid-cols-3 md:gap-8">
          {STEPS.map((step, i) => (
            <motion.li
              key={step.n}
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: reduceMotion ? 0 : 0.06 * i, duration: reduceMotion ? 0 : 0.4 }}
            >
              <p className="font-mono text-xs text-[var(--accent)]">{step.n}</p>
              <h3 className="mt-3 text-lg font-semibold tracking-tight">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">{step.body}</p>
            </motion.li>
          ))}
        </ol>
      </section>

      <section className="border-y border-[var(--border)] bg-[var(--card)]/35">
        <div className="mx-auto max-w-3xl px-5 py-20 md:px-8 md:py-24">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Studios</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-4xl">Built for the work, not the chat.</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-[var(--muted-foreground)] md:text-base">
              Writer first — Research and Social round out the loop. Tap{" "}
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[var(--border)] align-middle text-[10px]">
                i
              </span>{" "}
              for a quick intro.
            </p>
          </div>

          <ul className="mt-12 space-y-3">
            {MODULES.map((mod) => {
              const Icon = mod.icon;
              const introOpen = openIntro === mod.id;
              return (
                <li key={mod.id} className="rounded-2xl border border-[var(--border)] bg-[var(--background)]/50">
                  <div className="flex items-center gap-3 px-4 py-4 md:px-5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--muted)]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold tracking-tight md:text-lg">{mod.title}</h3>
                        <button
                          type="button"
                          aria-label={introOpen ? `Hide ${mod.title} intro` : `About ${mod.title}`}
                          aria-expanded={introOpen}
                          onClick={() => setOpenIntro(introOpen ? null : mod.id)}
                          className={cn(
                            "inline-flex h-6 w-6 items-center justify-center rounded-full border text-[11px] transition",
                            introOpen
                              ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--foreground)]"
                              : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)]/50 hover:text-[var(--foreground)]",
                          )}
                        >
                          {introOpen ? <ChevronDown className="h-3 w-3 rotate-180" /> : <Info className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                    <Button asChild variant="outline" size="sm" className="shrink-0">
                      <Link href={mod.href}>
                        Open
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>

                  <AnimatePresence initial={false}>
                    {introOpen ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="border-t border-[var(--border)] px-4 py-4 text-left text-sm leading-relaxed text-[var(--muted-foreground)] md:px-5 md:pl-[4.25rem]">
                          {mod.description}
                        </p>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-16 text-center md:px-8 md:py-20">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Trust</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">Built like a product, not a demo.</h2>
        <ul className="mt-10 grid gap-8 text-left sm:grid-cols-3">
          {[
            { title: "Structured studios", body: "Every module follows the same brief → draft → refine loop." },
            { title: "Grounded research", body: "Sources first — Academic Mode for paper-backed learning drafts." },
            { title: "Your drafts stay yours", body: "Save to History, reopen anytime, export Markdown and HTML." },
          ].map((item) => (
            <li key={item.title}>
              <h3 className="text-sm font-semibold tracking-tight">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="faq" className="border-t border-[var(--border)] bg-[var(--card)]/30">
        <div className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted-foreground)]">FAQ</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">Before you open the studio</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-[var(--muted-foreground)]">
              Quick answers so you know what you’re walking into.
            </p>
          </div>
          <ul className="mt-10 space-y-2">
            {FAQS.map((item, index) => {
              const open = openFaq === index;
              return (
                <li key={item.q} className="rounded-2xl border border-[var(--border)] bg-[var(--background)]/60">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenFaq(open ? null : index)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left md:px-5"
                  >
                    <span className="text-sm font-semibold tracking-tight md:text-[15px]">{item.q}</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition-transform",
                        open && "rotate-180",
                      )}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {open ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <p className="border-t border-[var(--border)] px-4 py-4 text-sm leading-relaxed text-[var(--muted-foreground)] md:px-5">
                          {item.a}
                        </p>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-[var(--border)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(34,211,238,0.12),transparent_55%)]" />
        <div className="relative mx-auto max-w-5xl px-5 py-20 text-center md:px-8 md:py-28">
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">Open the studio.</h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-[var(--muted-foreground)] md:text-base">
            Start with Writer — Research and Social are one click away.
          </p>
          <div className="mt-8">
            <AuthCtaGroup primaryLabel="Open studio" secondaryHref="/writer" secondaryLabel="Writer Studio" />
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] px-5 py-8 md:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--muted-foreground)]">© {new Date().getFullYear()} CreatorOS</p>
          <div className="flex flex-wrap gap-4 text-sm text-[var(--muted-foreground)]">
            <Link href="/privacy" className="hover:text-[var(--foreground)]">
              Privacy
            </Link>
            <Link href="/cookies" className="hover:text-[var(--foreground)]">
              Cookies
            </Link>
            <Link href="/terms" className="hover:text-[var(--foreground)]">
              Terms
            </Link>
            <Link href="/help" className="hover:text-[var(--foreground)]">
              Help
            </Link>
            <Link href="/dashboard" className="hover:text-[var(--foreground)]">
              App
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
