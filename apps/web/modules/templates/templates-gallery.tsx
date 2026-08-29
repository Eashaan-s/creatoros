"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, BookOpen, Loader2, PenLine } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { STARTER_TEMPLATES, templateToHtml } from "@/modules/templates/starter-templates";

export function TemplatesGallery() {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function launchInEditor(templateId: string) {
    const template = STARTER_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    setBusyId(templateId);
    try {
      const html = templateToHtml(template.markdown);
      const doc = await api.createDocument({
        module: "templates",
        title: template.title,
        content_html: html,
        content_markdown: template.markdown,
        status: "draft",
        prompt_meta: { template_id: template.id, category: template.category },
      });
      toast.success(`Opened “${template.title}” in Editor`);
      router.push(`/editor?doc=${doc.id}`);
    } catch (err) {
      toast.error((err as Error).message || "Could not create template draft");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Templates"
        description="Starters for resumes, proposals, PRDs, and more — open in Editor, or jump to Writer to generate from a brief."
        backHref="/dashboard"
        backLabel="Dashboard"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {STARTER_TEMPLATES.map((template) => {
          const busy = busyId === template.id;
          return (
            <article
              key={template.id}
              className="flex h-full flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)]/70 p-5"
            >
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                {template.category}
              </p>
              <h3 className="mt-2 text-lg font-semibold tracking-tight">{template.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--muted-foreground)]">
                {template.description}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="accent"
                  disabled={busyId !== null}
                  onClick={() => void launchInEditor(template.id)}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
                  Open in Editor
                  <ArrowRight className="h-4 w-4" />
                </Button>
                {template.writerType ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/writer?type=${template.writerType}`}>
                      <PenLine className="h-4 w-4" />
                      Generate in Writer
                    </Link>
                  </Button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
