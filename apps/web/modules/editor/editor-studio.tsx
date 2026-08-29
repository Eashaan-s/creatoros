"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { DocumentDTO } from "@creatoros/shared";
import { toast } from "sonner";
import {
  Copy,
  Download,
  FileText,
  Loader2,
  Save,
  Wand2,
} from "lucide-react";
import { RichEditor } from "@/components/editor/rich-editor";
import { PageHeader } from "@/components/shared/page-header";
import { StudioActionBar } from "@/components/studio/studio-action-bar";
import { StudioCanvasEmpty } from "@/components/studio/studio-canvas-empty";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { downloadTextFile, htmlToMarkdown, markdownToHtml } from "@/lib/utils";

export function EditorStudio() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const docParam = searchParams.get("doc");
  const bootstrapped = useRef(false);

  const [docs, setDocs] = useState<DocumentDTO[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [title, setTitle] = useState("Untitled draft");
  const [html, setHtml] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [saving, setSaving] = useState(false);
  const [improving, setImproving] = useState(false);
  const [dirty, setDirty] = useState(false);

  async function refreshList() {
    setLoadingList(true);
    try {
      const data = await api.listDocuments();
      setDocs(data);
    } catch (err) {
      toast.error((err as Error).message || "Failed to load documents");
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    void refreshList();
  }, []);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    const bootstrap = async () => {
      if (!docParam) return;
      try {
        const doc = await api.getDocument(docParam);
        setDocumentId(doc.id);
        setTitle(doc.title || "Untitled draft");
        const nextHtml = doc.content_html || markdownToHtml(doc.content_markdown);
        setHtml(nextHtml);
        setMarkdown(doc.content_markdown || htmlToMarkdown(nextHtml));
        setDirty(false);
      } catch (err) {
        toast.error((err as Error).message || "Failed to load document");
      } finally {
        router.replace("/editor", { scroll: false });
      }
    };

    void bootstrap();
  }, [docParam, router]);

  const hasDoc = Boolean(documentId || html || markdown);

  const status = useMemo(() => {
    if (!hasDoc) return "Open a document from the list, History, or Templates.";
    if (improving) return "Improving draft…";
    if (dirty) return "Unsaved changes";
    if (documentId) return "Saved — keep editing anytime.";
    return "New draft — Save to keep it in History.";
  }, [dirty, documentId, hasDoc, improving]);

  async function openDoc(doc: DocumentDTO) {
    setDocumentId(doc.id);
    setTitle(doc.title || "Untitled draft");
    const nextHtml = doc.content_html || markdownToHtml(doc.content_markdown);
    setHtml(nextHtml);
    setMarkdown(doc.content_markdown || htmlToMarkdown(nextHtml));
    setDirty(false);
  }

  function onEditorChange(next: string) {
    setHtml(next);
    setMarkdown(htmlToMarkdown(next));
    setDirty(true);
  }

  async function save() {
    if (!html && !markdown) return;
    setSaving(true);
    try {
      const body = {
        title: title.trim() || "Untitled draft",
        content_html: html || markdownToHtml(markdown),
        content_markdown: markdown || htmlToMarkdown(html),
        status: "saved" as const,
        prompt_meta: { source: "editor" },
      };
      if (documentId) {
        const updated = await api.updateDocument(documentId, body);
        setDocumentId(updated.id);
        setTitle(updated.title);
      } else {
        const created = await api.createDocument({
          module: "editor",
          ...body,
        });
        setDocumentId(created.id);
        setTitle(created.title);
      }
      setDirty(false);
      toast.success("Saved");
      void refreshList();
    } catch (err) {
      toast.error((err as Error).message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function improve() {
    if (!markdown && !html) return;
    setImproving(true);
    try {
      const result = await api.improveWriter({
        content: markdown || htmlToMarkdown(html),
        instruction: "Polish clarity, grammar, and flow. Keep structure and meaning.",
        document_id: documentId,
      });
      const nextMd = result.text;
      setMarkdown(nextMd);
      setHtml(markdownToHtml(nextMd));
      setDirty(true);
      toast.success("Improved");
    } catch (err) {
      toast.error((err as Error).message || "Improve failed");
    } finally {
      setImproving(false);
    }
  }

  function copyContent() {
    void navigator.clipboard.writeText(markdown || htmlToMarkdown(html));
    toast.success("Copied");
  }

  function downloadContent() {
    const base = (title || "creatoros-draft").replace(/\s+/g, "-").toLowerCase();
    downloadTextFile(`${base}.md`, markdown || htmlToMarkdown(html), "text/markdown");
    downloadTextFile(`${base}.html`, html || markdownToHtml(markdown), "text/html");
    toast.success("Downloaded Markdown + HTML");
  }

  function newBlank() {
    setDocumentId(null);
    setTitle("Untitled draft");
    setHtml("<p></p>");
    setMarkdown("");
    setDirty(true);
  }

  return (
    <div>
      <PageHeader
        title="Editor"
        description="Open any saved draft, refine in TipTap, improve with AI, and save back to History."
        backHref="/dashboard"
        backLabel="Dashboard"
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/templates">Templates</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={newBlank}>
              New blank
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--card)]/70 p-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              Documents
            </p>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
              <Link href="/history">History</Link>
            </Button>
          </div>
          {loadingList ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : docs.length === 0 ? (
            <p className="px-1 py-4 text-xs leading-relaxed text-[var(--muted-foreground)]">
              No documents yet. Start from{" "}
              <Link href="/templates" className="text-[var(--accent)] hover:underline">
                Templates
              </Link>{" "}
              or generate in Writer.
            </p>
          ) : (
            <ul className="max-h-[70vh] space-y-1 overflow-y-auto">
              {docs.map((doc) => {
                const active = doc.id === documentId;
                return (
                  <li key={doc.id}>
                    <button
                      type="button"
                      onClick={() => void openDoc(doc)}
                      className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                        active
                          ? "border-[var(--accent)]/40 bg-[var(--muted)]"
                          : "border-transparent hover:border-[var(--border)] hover:bg-[var(--muted)]/50"
                      }`}
                    >
                      <p className="truncate text-sm font-medium">{doc.title || "Untitled"}</p>
                      <p className="mt-0.5 text-[11px] capitalize text-[var(--muted-foreground)]">
                        {doc.module} · {new Date(doc.updated_at).toLocaleDateString()}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <div className="space-y-3">
          {hasDoc ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="editor-title">Title</Label>
                <Input
                  id="editor-title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="Document title"
                />
              </div>

              <StudioActionBar status={status}>
                <Button variant="outline" size="sm" onClick={copyContent} disabled={!markdown && !html}>
                  <Copy className="h-4 w-4" /> Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadContent}
                  disabled={!markdown && !html}
                >
                  <Download className="h-4 w-4" /> Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void improve()}
                  disabled={improving || (!markdown && !html)}
                >
                  {improving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  Improve
                </Button>
                <Button size="sm" onClick={() => void save()} disabled={saving || (!markdown && !html)}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </Button>
              </StudioActionBar>

              <RichEditor
                content={html}
                onChange={onEditorChange}
                editable={!improving}
                placeholder="Start editing…"
              />
            </>
          ) : (
            <StudioCanvasEmpty
              icon={FileText}
              title="Pick a document to edit"
              description="Choose from the list, open something from History, or launch a starter from Templates."
            />
          )}
        </div>
      </div>
    </div>
  );
}
