"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CONTENT_LENGTHS,
  CONTENT_TONES,
  WRITER_CONTENT_TYPES,
  writerTypeSupportsCta,
  type ContentLength,
  type ContentTone,
  type WriterContentType,
  type WriterGenerateRequest,
} from "@creatoros/shared";
import { toast } from "sonner";
import {
  Copy,
  Download,
  Loader2,
  PenLine,
  RefreshCw,
  Save,
  Sparkles,
  Wand2,
} from "lucide-react";
import { RichEditor } from "@/components/editor/rich-editor";
import { PageHeader } from "@/components/shared/page-header";
import { StudioActionBar } from "@/components/studio/studio-action-bar";
import { StudioCanvasEmpty } from "@/components/studio/studio-canvas-empty";
import { StreamingProgress } from "@/components/studio/streaming-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api, streamWriter } from "@/lib/api";
import { notifySaveToEditInEditor } from "@/lib/studio-notices";
import { downloadTextFile, htmlToMarkdown, markdownToHtml } from "@/lib/utils";

const VALID_TYPES = new Set(WRITER_CONTENT_TYPES.map((t) => t.value));

export function WriterStudio() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const docParam = searchParams.get("doc");
  const initialType =
    typeParam && VALID_TYPES.has(typeParam as WriterContentType)
      ? (typeParam as WriterContentType)
      : "blog";

  const [type, setType] = useState<WriterContentType>(initialType);
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState<ContentTone>("professional");
  const [length, setLength] = useState<ContentLength>("medium");
  const [keywords, setKeywords] = useState("");
  const [cta, setCta] = useState("");
  const [html, setHtml] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    const bootstrap = async () => {
      if (docParam) {
        try {
          const doc = await api.getDocument(docParam);
          setDocumentId(doc.id);
          setHtml(doc.content_html || markdownToHtml(doc.content_markdown));
          setMarkdown(doc.content_markdown || htmlToMarkdown(doc.content_html));
          const meta = doc.prompt_meta || {};
          if (typeof meta.topic === "string") setTopic(meta.topic);
          if (typeof meta.audience === "string") setAudience(meta.audience);
          if (typeof meta.cta === "string") setCta(meta.cta);
          if (typeof meta.tone === "string") setTone(meta.tone as ContentTone);
          if (typeof meta.length === "string") setLength(meta.length as ContentLength);
          if (typeof meta.type === "string" && VALID_TYPES.has(meta.type as WriterContentType)) {
            setType(meta.type as WriterContentType);
          }
          if (Array.isArray(meta.keywords)) setKeywords(meta.keywords.join(", "));
        } catch (err) {
          toast.error((err as Error).message || "Failed to load document");
        }
      }
      // Flatten query history so browser/back UX stays clean; in-app back goes to Dashboard.
      if (typeParam || docParam) {
        router.replace("/writer", { scroll: false });
      }
    };

    void bootstrap();
  }, [docParam, typeParam, router]);

  const canGenerate = topic.trim().length > 0 && !streaming;
  const showCta = writerTypeSupportsCta(type);

  const payload: WriterGenerateRequest = useMemo(
    () => ({
      type,
      topic: topic.trim(),
      audience: audience.trim(),
      tone,
      length,
      keywords: keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
      cta: showCta ? cta.trim() : "",
      document_id: documentId,
    }),
    [type, topic, audience, tone, length, keywords, cta, documentId, showCta],
  );

  async function runGenerate() {
    if (!canGenerate) {
      toast.error("Enter a topic to generate.");
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStreaming(true);
    setMarkdown("");
    setHtml("");
    let acc = "";

    try {
      await streamWriter(
        payload,
        {
          onToken: (text) => {
            acc += text;
            setMarkdown(acc);
            setHtml(markdownToHtml(acc));
          },
          onDone: () => notifySaveToEditInEditor("Draft ready"),
          onError: (message) => toast.error(message),
        },
        controller.signal,
      );
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast.error((err as Error).message || "Generation failed");
      }
    } finally {
      setStreaming(false);
    }
  }

  async function improve() {
    if (!markdown.trim()) {
      toast.error("Generate content first.");
      return;
    }
    setStreaming(true);
    try {
      const result = await api.improveWriter({
        content: markdown,
        document_id: documentId,
      });
      setMarkdown(result.text);
      setHtml(markdownToHtml(result.text));
      toast.success("Improved draft");
    } catch (err) {
      toast.error((err as Error).message || "Improve failed");
    } finally {
      setStreaming(false);
    }
  }

  async function save() {
    if (!markdown.trim()) {
      toast.error("Nothing to save yet.");
      return;
    }
    setSaving(true);
    try {
      const title =
        topic.trim() ||
        WRITER_CONTENT_TYPES.find((t) => t.value === type)?.label ||
        "Untitled";
      const body = {
        module: "writer" as const,
        title,
        content_html: html || markdownToHtml(markdown),
        content_markdown: markdown,
        prompt_meta: { ...payload },
        status: "saved" as const,
      };
      if (documentId) {
        const updated = await api.updateDocument(documentId, body);
        setDocumentId(updated.id);
      } else {
        const created = await api.createDocument(body);
        setDocumentId(created.id);
      }
      toast.success("Saved to History", {
        description: "Open it from Editor or History to make edits.",
        duration: 4000,
      });
    } catch (err) {
      toast.error((err as Error).message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function copyContent() {
    void navigator.clipboard.writeText(markdown || htmlToMarkdown(html));
    toast.success("Copied");
  }

  function downloadContent() {
    const base = (topic || "creatoros-draft").replace(/\s+/g, "-").toLowerCase();
    downloadTextFile(`${base}.md`, markdown || htmlToMarkdown(html), "text/markdown");
    downloadTextFile(`${base}.html`, html || markdownToHtml(markdown), "text/html");
    toast.success("Downloaded Markdown + HTML");
  }

  return (
    <div>
      <PageHeader
        title="Writer Studio"
        description="Brief in. Polished draft out — streamed into a rich editor you can refine and save."
        backHref="/dashboard"
        backLabel="Dashboard"
      />

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <form
          className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)]/70 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void runGenerate();
          }}
        >
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as WriterContentType)}>
              <SelectTrigger>
                <SelectValue placeholder="Content type" />
              </SelectTrigger>
              <SelectContent>
                {WRITER_CONTENT_TYPES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Topic</Label>
            <Textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What should this piece cover?"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Audience</Label>
            <Input
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="Founders, engineers, marketers…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={(v) => setTone(v as ContentTone)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TONES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Length</Label>
              <Select value={length} onValueChange={(v) => setLength(v as ContentLength)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_LENGTHS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Keywords</Label>
            <Input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="comma, separated, keywords"
            />
          </div>

          {showCta ? (
            <div className="space-y-2">
              <Label>CTA</Label>
              <Input
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                placeholder="Book a demo / Subscribe / Learn more"
              />
            </div>
          ) : null}

          <Button type="submit" className="w-full" variant="accent" disabled={!canGenerate}>
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {streaming ? "Generating…" : "Generate"}
          </Button>
        </form>

        <div className="space-y-3">
          <StudioActionBar
            status={
              streaming
                ? "Streaming into the editor…"
                : markdown
                  ? documentId
                    ? "Draft saved — keep refining or export."
                    : "Unsaved draft — Save, then edit in Editor."
                  : "Fill the brief, then Generate."
            }
          >
            <Button variant="outline" size="sm" onClick={copyContent} disabled={!markdown}>
              <Copy className="h-4 w-4" /> Copy
            </Button>
            <Button variant="outline" size="sm" onClick={downloadContent} disabled={!markdown}>
              <Download className="h-4 w-4" /> Download
            </Button>
            <Button variant="outline" size="sm" onClick={() => void runGenerate()} disabled={!canGenerate}>
              <RefreshCw className="h-4 w-4" /> Regenerate
            </Button>
            <Button variant="outline" size="sm" onClick={() => void improve()} disabled={streaming || !markdown}>
              <Wand2 className="h-4 w-4" /> Improve
            </Button>
            <Button size="sm" onClick={() => void save()} disabled={saving || !markdown}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </StudioActionBar>

          <StreamingProgress active={streaming} />

          {!markdown && !streaming ? (
            <StudioCanvasEmpty
              icon={PenLine}
              title="Your draft canvas is empty"
              description="Fill the brief on the left and generate to stream content into TipTap."
            />
          ) : (
            <RichEditor
              content={html}
              onChange={(next) => {
                setHtml(next);
                setMarkdown(htmlToMarkdown(next));
              }}
              editable={false}
            />
          )}
        </div>
      </div>
    </div>
  );
}
