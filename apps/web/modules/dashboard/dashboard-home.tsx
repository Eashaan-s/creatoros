"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { DocumentDTO } from "@creatoros/shared";
import {
  ArrowRight,
  BookOpen,
  FileText,
  FlaskConical,
  Linkedin,
  Mail,
  PenLine,
  ScrollText,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { moduleHref } from "@/lib/nav";

const CARDS = [
  {
    title: "Blog",
    description: "Long-form posts with structure and SEO-ready flow.",
    href: "/writer?type=blog",
    icon: PenLine,
    primary: true,
  },
  {
    title: "Research",
    description: "Sources → summaries, insights, flashcards. Academic Mode for papers.",
    href: "/research",
    icon: FlaskConical,
  },
  {
    title: "LinkedIn",
    description: "Professional social posts with platform-native voice.",
    href: "/social?platform=linkedin",
    icon: Linkedin,
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

export function DashboardHome() {
  const [docs, setDocs] = useState<DocumentDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.listDocuments();
        if (!cancelled) setDocs(data.slice(0, 5));
      } catch {
        if (!cancelled) setDocs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative mx-auto max-w-5xl">
      <PageHeader
        title="Dashboard"
        description="Start with Writer — Research and Social are ready when you need them."
        showBack={false}
      />

      <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--card)]/70 px-6 py-10 text-center md:px-12 md:py-14">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,var(--glow),transparent_55%)]" />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative mx-auto max-w-2xl"
        >
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            What do you want to create today?
          </h1>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild variant="accent">
              <Link href="/writer">
                Open Writer
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/research">Research</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/social">Social</Link>
            </Button>
          </div>
        </motion.div>
      </section>

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-tight">Recent work</h2>
          <Link href="/history" className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            View history
          </Link>
        </div>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : docs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)]/40 px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
            No saved drafts yet. Generate in a studio and hit Save — they show up here.
          </p>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-[var(--border)]">
            {docs.map((doc) => (
              <li key={doc.id} className="border-b border-[var(--border)] last:border-0">
                <Link
                  href={moduleHref(doc.module, doc.id)}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition hover:bg-[var(--muted)]/60"
                >
                  <div className="min-w-0 text-left">
                    <p className="truncate font-medium">{doc.title || "Untitled"}</p>
                    <p className="mt-0.5 text-xs capitalize text-[var(--muted-foreground)]">{doc.module}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {CARDS.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * index, duration: 0.35 }}
            >
              <Link
                href={card.href}
                className={`group block h-full rounded-2xl border p-5 text-left transition ${
                  card.primary
                    ? "border-[color-mix(in_oklab,var(--accent)_40%,var(--border))] bg-[var(--card)] hover:border-[var(--accent)]/55"
                    : "border-[var(--border)] bg-[var(--card)]/60 hover:border-[color-mix(in_oklab,var(--accent)_45%,var(--border))] hover:bg-[var(--card)]"
                }`}
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
    </div>
  );
}
