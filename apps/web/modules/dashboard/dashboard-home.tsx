"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  BookOpen,
  FileText,
  FlaskConical,
  Linkedin,
  Mail,
  PenLine,
  ScrollText,
} from "lucide-react";

const CARDS = [
  {
    title: "Blog",
    description: "Long-form posts with structure and SEO-ready flow.",
    href: "/writer?type=blog",
    icon: PenLine,
  },
  {
    title: "LinkedIn",
    description: "Professional social posts with platform-native voice.",
    href: "/social?platform=linkedin",
    icon: Linkedin,
  },
  {
    title: "Research",
    description: "Summaries, insights, and flashcards from source material.",
    href: "/research",
    icon: FlaskConical,
  },
  {
    title: "Documentation",
    description: "Technical docs that stay clear and scannable.",
    href: "/writer?type=tech_docs",
    icon: FileText,
  },
  {
    title: "Email",
    description: "Outreach and product emails with a sharp CTA.",
    href: "/writer?type=email",
    icon: Mail,
  },
  {
    title: "Resume",
    description: "Start from a polished template and refine in Editor.",
    href: "/templates",
    icon: ScrollText,
  },
  {
    title: "Proposal",
    description: "Business and project proposals ready to customize.",
    href: "/templates",
    icon: BookOpen,
  },
];

export function CreateHero() {
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--card)]/70 px-6 py-10 md:px-10 md:py-14">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,var(--glow),transparent_45%)]" />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative"
      >
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          CreatorOS
        </p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">
          What do you want to create today?
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-[var(--muted-foreground)] md:text-base">
          One workspace to generate, edit, research, and publish — without a chatbot cluttering the flow.
        </p>
      </motion.div>
    </section>
  );
}

export function ModuleCardGrid() {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {CARDS.map((card, index) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * index, duration: 0.35 }}
          >
            <Link
              href={card.href}
              className="group block h-full rounded-2xl border border-[var(--border)] bg-[var(--card)]/60 p-5 transition hover:border-[color-mix(in_oklab,var(--accent)_45%,var(--border))] hover:bg-[var(--card)]"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--muted)] transition group-hover:border-[var(--accent)]/40">
                <Icon className="h-4 w-4" />
              </div>
              <h3 className="text-lg font-semibold tracking-tight">{card.title}</h3>
              <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">{card.description}</p>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
