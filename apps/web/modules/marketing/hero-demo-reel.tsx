"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FlaskConical, PenLine, Share2, Sparkles } from "lucide-react";

const SCENES = [
  {
    id: "writer",
    label: "Writer Studio",
    icon: PenLine,
    fields: [
      { label: "Type", value: "Blog" },
      { label: "Topic", value: "Local-first AI tools" },
      { label: "CTA", value: "Try CreatorOS" },
    ],
    draft: [
      "Why local-first AI tools win",
      "Creators need a studio — not another chat wall.",
      "Brief → stream → save → edit in Editor.",
    ],
    durationMs: 4800,
  },
  {
    id: "research",
    label: "Research Studio",
    icon: FlaskConical,
    fields: [
      { label: "Sources", value: "PDF + notes" },
      { label: "Outputs", value: "Summary · Insights" },
      { label: "Mode", value: "Standard / Academic" },
    ],
    draft: [
      "Research pack",
      "Grounded summary from your sources.",
      "Academic Mode adds papers + IEEE-style drafts.",
    ],
    durationMs: 4800,
  },
  {
    id: "social",
    label: "Social Studio",
    icon: Share2,
    fields: [
      { label: "Platforms", value: "LinkedIn · X" },
      { label: "Idea", value: "Ship a studio, not a chat" },
      { label: "Tone", value: "Friendly" },
    ],
    draft: [
      "Platform drafts",
      "LinkedIn: Creators deserve an OS.",
      "X: Stop chatting. Start shipping.",
    ],
    durationMs: 4800,
  },
] as const;

/** Auto-playing, non-interactive product reel — teases studios; full tools live in the app. */
export function HeroDemoReel() {
  const [index, setIndex] = useState(0);
  const scene = SCENES[index];
  const Icon = scene.icon;

  useEffect(() => {
    const t = window.setTimeout(() => {
      setIndex((i) => (i + 1) % SCENES.length);
    }, scene.durationMs);
    return () => window.clearTimeout(t);
  }, [index, scene.durationMs]);

  return (
    <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]/95 shadow-[0_40px_100px_-48px_rgba(0,0,0,0.85)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#3f3f46]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#3f3f46]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#3f3f46]" />
        <span className="ml-2 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
          <Sparkles className="h-3 w-3 text-[var(--accent)]" />
          CreatorOS · studio preview
        </span>
      </div>

      <div className="relative min-h-[300px] md:min-h-[340px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={scene.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 grid md:grid-cols-[220px_1fr]"
          >
            <div className="flex flex-col gap-3 border-b border-[var(--border)] bg-[var(--sidebar)]/50 p-4 md:border-b-0 md:border-r">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-[var(--accent)]" />
                <p className="text-sm font-semibold tracking-tight">{scene.label}</p>
              </div>

              <div className="space-y-2">
                {scene.fields.map((field, i) => (
                  <motion.div
                    key={field.label}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.12 + i * 0.2 }}
                    className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/45 px-2.5 py-2 text-left"
                  >
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                      {field.label}
                    </p>
                    <p className="mt-0.5 text-[12px] font-medium">{field.value}</p>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0, scaleX: 0.7 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 0.85, duration: 0.45 }}
                className="mt-auto origin-left rounded-lg bg-[var(--accent)] px-3 py-2 text-center text-xs font-semibold text-[var(--accent-foreground)]"
              >
                Generate
              </motion.div>
            </div>

            <div className="flex flex-col gap-3 p-4 md:p-5">
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]"
              >
                Streaming draft
              </motion.p>

              <div className="flex-1 space-y-2.5 text-left">
                {scene.draft.map((line, i) => (
                  <motion.p
                    key={line}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 + i * 0.35, duration: 0.4 }}
                    className={
                      i === 0
                        ? "text-sm font-semibold tracking-tight md:text-base"
                        : "text-[12px] leading-relaxed text-[var(--muted-foreground)] md:text-[13px]"
                    }
                  >
                    {line}
                  </motion.p>
                ))}
              </div>

              <div className="mt-auto flex gap-2 pt-2">
                {["Copy", "Improve", "Save"].map((action, i) => (
                  <motion.span
                    key={action}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.6 + i * 0.15 }}
                    className="rounded-md border border-[var(--border)] px-2.5 py-1 text-[10px] text-[var(--muted-foreground)]"
                  >
                    {action}
                  </motion.span>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] px-4 py-3">
        <div className="flex gap-1.5">
          {SCENES.map((s, i) => (
            <span
              key={s.id}
              className={`h-1 w-8 rounded-full transition-colors ${
                i === index ? "bg-[var(--accent)]" : "bg-[var(--muted)]"
              }`}
            />
          ))}
        </div>
        <p className="text-[11px] text-[var(--muted-foreground)]">
          Preview only — open the studio for the full flow
        </p>
      </div>
    </div>
  );
}
