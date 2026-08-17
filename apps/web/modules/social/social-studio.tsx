"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CONTENT_TONES,
  SOCIAL_PLATFORMS,
  type ContentTone,
  type SocialGenerateRequest,
  type SocialPlatform,
} from "@creatoros/shared";
import { toast } from "sonner";
import {
  Copy,
  Download,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
  Wand2,
} from "lucide-react";
import { RichEditor } from "@/components/editor/rich-editor";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api, streamSocial } from "@/lib/api";
import { cn, downloadTextFile, htmlToMarkdown, markdownToHtml } from "@/lib/utils";

const VALID_PLATFORMS = new Set(SOCIAL_PLATFORMS.map((p) => p.value));

export function SocialStudio() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const platformParam = searchParams.get("platform");
  const docParam = searchParams.get("doc");

  const initialPlatforms: SocialPlatform[] =
    platformParam && VALID_PLATFORMS.has(platformParam as SocialPlatform)
      ? [platformParam as SocialPlatform]
      : ["linkedin", "twitter", "instagram"];

  const [idea, setIdea] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState<ContentTone>("professional");
  const [platforms, setPlatforms] = useState<SocialPlatform[]>(initialPlatforms);
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
          if (typeof meta.idea === "string") setIdea(meta.idea);
          if (typeof meta.audience === "string") setAudience(meta.audience);
          if (typeof meta.tone === "string") setTone(meta.tone as ContentTone);
          if (Array.isArray(meta.platforms)) {
            setPlatforms(
              meta.platforms.filter((p): p is SocialPlatform => VALID_PLATFORMS.has(p as SocialPlatform)),
            );
          }
        } catch (err) {
          toast.error((err as Error).message || "Failed to load document");
        }
      }
      if (platformParam || docParam) {
        router.replace("/social", { scroll: false });
      }
    };

    void bootstrap();
  }, [docParam, platformParam, router]);

  const canGenerate = idea.trim().length > 0 && platforms.length > 0 && !streaming;

  const payload: SocialGenerateRequest = useMemo(
    () => ({
      idea: idea.trim(),
      platforms,
      tone,
      audience: audience.trim(),
      document_id: documentId,
    }),
    [idea, platforms, tone, audience, documentId],
  );

  function togglePlatform(platform: SocialPlatform) {
    setPlatforms((prev) => {
      if (prev.includes(platform)) {
        if (prev.length === 1) {
          toast.error("Keep at least one platform selected");
          return prev;
        }
        return prev.filter((p) => p !== platform);
      }
      return [...prev, platform];
    });
  }

  async function runGenerate() {
    if (!canGenerate) {
      toast.error("Enter an idea and select at least one platform.");
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
      await streamSocial(
        payload,
        {
          onToken: (text) => {
            acc += text;
            setMarkdown(acc);
            setHtml(markdownToHtml(acc));
          },
          onDone: () => toast.success("Social drafts ready"),
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
      const result = await api.improveSocial({
        content: markdown,
        document_id: documentId,
      });
      setMarkdown(result.text);
      setHtml(markdownToHtml(result.text));
      toast.success("Improved drafts");
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
      const title = idea.trim().slice(0, 80) || "Social draft";
      const body = {
        module: "social" as const,
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
      toast.success("Saved to History");
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
    const base = (idea || "social-draft").replace(/\s+/g, "-").slice(0, 40).toLowerCase();
    downloadTextFile(`${base}.md`, markdown || htmlToMarkdown(html), "text/markdown");
    downloadTextFile(`${base}.html`, html || markdownToHtml(markdown), "text/html");
    toast.success("Downloaded Markdown + HTML");
  }

  return (
    <div>
      <PageHeader
        title="Social Studio"
        description="One idea → platform-native drafts for LinkedIn, X, Instagram, and more."
        backHref="/"
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
            <Label>Idea</Label>
            <Textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="What’s the post about? One clear idea is enough."
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Audience</Label>
            <Input
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="Founders, developers, creators…"
            />
          </div>

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
            <Label>Platforms</Label>
            <div className="flex flex-wrap gap-2">
              {SOCIAL_PLATFORMS.map((p) => {
                const active = platforms.includes(p.value);
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => togglePlatform(p.value)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs transition",
                      active
                        ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--foreground)]"
                        : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]",
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Button type="submit" className="w-full" variant="accent" disabled={!canGenerate}>
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {streaming ? "Generating…" : "Generate"}
          </Button>
        </form>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
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
          </div>

          {!markdown && !streaming ? (
            <div className="flex min-h-[480px] items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)]/40 px-6 text-center">
              <div>
                <p className="text-sm font-medium">No social drafts yet</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Pick platforms, enter one idea, and generate platform-native copy.
                </p>
              </div>
            </div>
          ) : (
            <RichEditor
              content={html}
              onChange={(next) => {
                setHtml(next);
                setMarkdown(htmlToMarkdown(next));
              }}
              editable={!streaming}
            />
          )}
        </div>
      </div>
    </div>
  );
}
