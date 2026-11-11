"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ACADEMIC_DETAILS,
  ACADEMIC_PAGE_WORDS,
  MAX_ACADEMIC_REFERENCES,
  MAX_RESEARCH_UPLOAD_BYTES,
  MAX_RESEARCH_UPLOAD_MB,
  RESEARCH_OUTPUTS,
  type AcademicDetail,
  type AcademicPages,
  type AcademicPaper,
  type ResearchGenerateRequest,
  type ResearchOutputType,
  type ResearchSourcePayload,
} from "@creatoros/shared";
import { toast } from "sonner";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Copy,
  Download,
  FileUp,
  FlaskConical,
  GraduationCap,
  Loader2,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Trash2,
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
import { Textarea } from "@/components/ui/textarea";
import { api, streamAcademic, streamResearch } from "@/lib/api";
import { notifySaveToEditInEditor } from "@/lib/studio-notices";
import { cn, downloadTextFile, htmlToMarkdown, markdownToHtml } from "@/lib/utils";

type SourceItem = ResearchSourcePayload & { id: string };
type StudioMode = "standard" | "academic";

export function ResearchStudio() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const docParam = searchParams.get("doc");

  const [mode, setMode] = useState<StudioMode>("standard");
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [outputs, setOutputs] = useState<ResearchOutputType[]>([
    "summary",
    "key_insights",
    "faqs",
  ]);
  const [focus, setFocus] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [youtubeInput, setYoutubeInput] = useState("");
  const [pasteTitle, setPasteTitle] = useState("Pasted notes");
  const [pasteContent, setPasteContent] = useState("");
  const [extracting, setExtracting] = useState(false);

  // Academic
  const [topic, setTopic] = useState("");
  const [researchQuestion, setResearchQuestion] = useState("");
  const [field, setField] = useState("");
  const [paperQuery, setPaperQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [paperHits, setPaperHits] = useState<AcademicPaper[]>([]);
  const [selectedPapers, setSelectedPapers] = useState<AcademicPaper[]>([]);
  const [academicPages, setAcademicPages] = useState<AcademicPages>(3);
  const [academicDetail, setAcademicDetail] = useState<AcademicDetail>("thorough");
  const [customWords, setCustomWords] = useState("");
  const reduceMotion = useReducedMotion();

  const [html, setHtml] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bootstrapped = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const parsedCustomWords = useMemo(() => {
    const n = Number.parseInt(customWords.trim(), 10);
    if (!Number.isFinite(n)) return null;
    return Math.min(5000, Math.max(600, n));
  }, [customWords]);

  const estimatedWords = parsedCustomWords ?? ACADEMIC_PAGE_WORDS[academicPages];
  const lengthHint = parsedCustomWords
    ? `~${estimatedWords} words (custom)`
    : `~${estimatedWords} words · ~${academicPages} page${academicPages === 1 ? "" : "s"}`;

  function resetStudioWorkspace() {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
    setExtracting(false);
    setSearching(false);
    setSources([]);
    setOutputs(["summary", "key_insights", "faqs"]);
    setFocus("");
    setUrlInput("");
    setYoutubeInput("");
    setPasteTitle("Pasted notes");
    setPasteContent("");
    setTopic("");
    setResearchQuestion("");
    setField("");
    setPaperQuery("");
    setPaperHits([]);
    setSelectedPapers([]);
    setAcademicPages(3);
    setAcademicDetail("thorough");
    setCustomWords("");
    setHtml("");
    setMarkdown("");
    setDocumentId(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function switchMode(next: StudioMode) {
    if (next === mode) return;
    resetStudioWorkspace();
    setMode(next);
    toast.message(next === "academic" ? "Academic Mode" : "Standard Mode", {
      description: "Fresh workspace — previous inputs and canvas were cleared.",
    });
  }

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
          if (meta.mode === "academic") {
            setMode("academic");
            if (typeof meta.topic === "string") setTopic(meta.topic);
            if (typeof meta.research_question === "string") setResearchQuestion(meta.research_question);
            if (typeof meta.field === "string") setField(meta.field);
            if (Array.isArray(meta.papers)) setSelectedPapers(meta.papers as AcademicPaper[]);
            if (typeof meta.pages === "number" && meta.pages >= 1 && meta.pages <= 5) {
              setAcademicPages(meta.pages as AcademicPages);
            }
            if (
              meta.detail === "overview" ||
              meta.detail === "thorough" ||
              meta.detail === "exhaustive"
            ) {
              setAcademicDetail(meta.detail);
            }
            if (typeof meta.target_words === "number") {
              setCustomWords(String(meta.target_words));
            }
          }
          if (typeof meta.focus === "string") setFocus(meta.focus);
          if (Array.isArray(meta.outputs)) setOutputs(meta.outputs as ResearchOutputType[]);
          if (Array.isArray(meta.sources)) {
            setSources(
              (meta.sources as ResearchSourcePayload[]).map((s, i) => ({
                ...s,
                id: `restored-${i}`,
              })),
            );
          }
        } catch (err) {
          toast.error((err as Error).message || "Failed to load document");
        }
      }
      if (docParam) router.replace("/research", { scroll: false });
    };

    void bootstrap();
  }, [docParam, router]);

  const canGenerateStandard = sources.length > 0 && outputs.length > 0 && !streaming && !extracting;
  const canGenerateAcademic =
    topic.trim().length > 0 &&
    (selectedPapers.length > 0 || sources.length > 0) &&
    !streaming &&
    !extracting &&
    !searching;

  const standardPayload: ResearchGenerateRequest = useMemo(
    () => ({
      sources: sources.map(({ kind, title, content, origin }) => ({ kind, title, content, origin })),
      outputs,
      focus: focus.trim(),
      document_id: documentId,
    }),
    [sources, outputs, focus, documentId],
  );

  function toggleOutput(value: ResearchOutputType) {
    setOutputs((prev) => {
      if (prev.includes(value)) {
        if (prev.length === 1) {
          toast.error("Keep at least one output selected");
          return prev;
        }
        return prev.filter((o) => o !== value);
      }
      return [...prev, value];
    });
  }

  function addSource(source: ResearchSourcePayload) {
    setSources((prev) => {
      if (prev.length >= MAX_ACADEMIC_REFERENCES) {
        toast.error(`You can attach up to ${MAX_ACADEMIC_REFERENCES} reference files`);
        return prev;
      }
      return [
        ...prev,
        { ...source, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` },
      ];
    });
  }

  function togglePaper(paper: AcademicPaper) {
    setSelectedPapers((prev) => {
      if (prev.some((p) => p.id === paper.id)) {
        return prev.filter((p) => p.id !== paper.id);
      }
      if (prev.length >= MAX_ACADEMIC_REFERENCES) {
        toast.error(`You can select up to ${MAX_ACADEMIC_REFERENCES} reference papers`);
        return prev;
      }
      return [...prev, paper];
    });
  }

  async function onUpload(file: File) {
    if (file.size > MAX_RESEARCH_UPLOAD_BYTES) {
      toast.error(`“${file.name}” is too large (max ${MAX_RESEARCH_UPLOAD_MB}MB)`);
      return;
    }
    if (sources.length >= MAX_ACADEMIC_REFERENCES) {
      toast.error(`You can attach up to ${MAX_ACADEMIC_REFERENCES} reference files`);
      return;
    }
    setExtracting(true);
    try {
      const extracted = await api.extractResearchFile(file);
      addSource({
        kind: extracted.kind,
        title: extracted.title,
        content: extracted.content,
        origin: extracted.origin,
      });
      toast.success(`Added ${extracted.title}`);
    } catch (err) {
      toast.error((err as Error).message || "Upload failed");
    } finally {
      setExtracting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onUploadMany(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    const room = MAX_ACADEMIC_REFERENCES - sources.length;
    if (room <= 0) {
      toast.error(`You can attach up to ${MAX_ACADEMIC_REFERENCES} reference files`);
      return;
    }
    const batch = files.slice(0, room);
    if (files.length > room) {
      toast.message(`Only ${room} more file${room === 1 ? "" : "s"} can be added (max ${MAX_ACADEMIC_REFERENCES})`);
    }

    const oversized = batch.filter((f) => f.size > MAX_RESEARCH_UPLOAD_BYTES);
    for (const file of oversized) {
      toast.error(`“${file.name}” is too large (max ${MAX_RESEARCH_UPLOAD_MB}MB)`);
    }
    const eligible = batch.filter((f) => f.size <= MAX_RESEARCH_UPLOAD_BYTES);
    if (eligible.length === 0) return;

    setExtracting(true);
    const concurrency = 4;
    let ok = 0;
    let failed = 0;
    let cursor = 0;

    async function worker() {
      while (cursor < eligible.length) {
        const index = cursor;
        cursor += 1;
        const file = eligible[index];
        try {
          const extracted = await api.extractResearchFile(file);
          addSource({
            kind: extracted.kind,
            title: extracted.title,
            content: extracted.content,
            origin: extracted.origin,
          });
          ok += 1;
        } catch (err) {
          failed += 1;
          toast.error(`“${file.name}”: ${(err as Error).message || "Upload failed"}`);
        }
      }
    }

    try {
      await Promise.all(
        Array.from({ length: Math.min(concurrency, eligible.length) }, () => worker()),
      );
      if (ok > 0) {
        toast.success(ok === 1 ? "Added 1 file" : `Added ${ok} files`);
      }
      if (failed > 0 && ok === 0) {
        toast.error("No files could be attached");
      }
    } finally {
      setExtracting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onAddUrl() {
    if (!urlInput.trim()) return;
    setExtracting(true);
    try {
      const extracted = await api.extractResearchUrl(urlInput.trim());
      addSource({
        kind: extracted.kind,
        title: extracted.title,
        content: extracted.content,
        origin: extracted.origin,
      });
      setUrlInput("");
      toast.success("URL source added");
    } catch (err) {
      toast.error((err as Error).message || "URL extract failed");
    } finally {
      setExtracting(false);
    }
  }

  async function onAddYoutube() {
    if (!youtubeInput.trim()) return;
    setExtracting(true);
    try {
      const extracted = await api.extractResearchYoutube(youtubeInput.trim());
      addSource({
        kind: extracted.kind,
        title: extracted.title,
        content: extracted.content,
        origin: extracted.origin,
      });
      setYoutubeInput("");
      toast.success("YouTube transcript added");
    } catch (err) {
      toast.error((err as Error).message || "YouTube extract failed. Paste the transcript instead.");
    } finally {
      setExtracting(false);
    }
  }

  async function onAddPaste() {
    if (!pasteContent.trim()) {
      toast.error("Paste some text first");
      return;
    }
    setExtracting(true);
    try {
      const extracted = await api.extractResearchPaste(pasteTitle.trim() || "Pasted notes", pasteContent);
      addSource({
        kind: extracted.kind,
        title: extracted.title,
        content: extracted.content,
        origin: extracted.origin,
      });
      setPasteContent("");
      toast.success("Pasted source added");
    } catch (err) {
      toast.error((err as Error).message || "Paste failed");
    } finally {
      setExtracting(false);
    }
  }

  async function onSearchPapers() {
    if (paperQuery.trim().length < 2) {
      toast.error("Enter a longer search query");
      return;
    }
    setSearching(true);
    try {
      const result = await api.searchAcademicPapers(paperQuery.trim(), 20);
      setPaperHits(result.papers);
      if (result.papers.length === 0) toast.message("No papers found — try another query");
      else toast.success(`Found ${result.papers.length} papers`);
    } catch (err) {
      toast.error((err as Error).message || "Paper search failed");
    } finally {
      setSearching(false);
    }
  }

  async function runGenerate() {
    if (mode === "academic") {
      if (!canGenerateAcademic) {
        toast.error("Enter a topic and select at least one paper or source.");
        return;
      }
    } else if (!canGenerateStandard) {
      toast.error("Add at least one source and one output type.");
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
      if (mode === "academic") {
        await streamAcademic(
          {
            topic: topic.trim(),
            research_question: researchQuestion.trim(),
            field: field.trim(),
            papers: selectedPapers,
            sources: sources.map(({ kind, title, content, origin }) => ({
              kind,
              title,
              content,
              origin,
            })),
            pages: academicPages,
            detail: academicDetail,
            target_words: parsedCustomWords,
            document_id: documentId,
          },
          {
            onToken: (text) => {
              acc += text;
              setMarkdown(acc);
              setHtml(markdownToHtml(acc));
            },
            onDone: () => notifySaveToEditInEditor("IEEE learning draft ready"),
            onError: (message) => toast.error(message),
          },
          controller.signal,
        );
      } else {
        await streamResearch(
          standardPayload,
          {
            onToken: (text) => {
              acc += text;
              setMarkdown(acc);
              setHtml(markdownToHtml(acc));
            },
            onDone: () => notifySaveToEditInEditor("Research pack ready"),
            onError: (message) => toast.error(message),
          },
          controller.signal,
        );
      }
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
      const result =
        mode === "academic"
          ? await api.improveAcademic({
              content: markdown,
              document_id: documentId,
              pages: academicPages,
              detail: academicDetail,
              target_words: parsedCustomWords,
            })
          : await api.improveResearch({ content: markdown, document_id: documentId });
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
        mode === "academic"
          ? topic.trim().slice(0, 80) || "IEEE learning draft"
          : focus.trim().slice(0, 80) || sources[0]?.title || "Research pack";

      const body = {
        module: "research" as const,
        title,
        content_html: html || markdownToHtml(markdown),
        content_markdown: markdown,
        prompt_meta:
          mode === "academic"
            ? {
                mode: "academic",
                topic,
                research_question: researchQuestion,
                field,
                pages: academicPages,
                detail: academicDetail,
                target_words: parsedCustomWords ?? estimatedWords,
                papers: selectedPapers,
                sources: sources.map((s) => ({
                  kind: s.kind,
                  title: s.title,
                  origin: s.origin,
                  content: s.content.slice(0, 20000),
                })),
              }
            : {
                mode: "standard",
                focus,
                outputs,
                sources: sources.map((s) => ({
                  kind: s.kind,
                  title: s.title,
                  origin: s.origin,
                  content: s.content.slice(0, 20000),
                })),
              },
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
    const base = (
      mode === "academic" ? topic || "ieee-draft" : focus || sources[0]?.title || "research-pack"
    )
      .replace(/\s+/g, "-")
      .slice(0, 40)
      .toLowerCase();
    downloadTextFile(`${base}.md`, markdown || htmlToMarkdown(html), "text/markdown");
    downloadTextFile(`${base}.html`, html || markdownToHtml(markdown), "text/html");
    toast.success("Downloaded Markdown + HTML");
  }

  return (
    <div className={cn(mode === "academic" && "academic-jade")}>
      <PageHeader
        title="Research Studio"
        description={
          mode === "academic"
            ? "Academic Mode — search papers, ground your draft, and produce an IEEE-style learning paper."
            : "Upload sources or paste material — generate summaries, insights, FAQs, flashcards, and more."
        }
        backHref="/dashboard"
        backLabel="Dashboard"
        actions={
          <div className="inline-flex items-center gap-1 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/60 p-1.5 shadow-sm">
            <button
              type="button"
              onClick={() => switchMode("standard")}
              className={cn(
                "rounded-xl px-4 py-2.5 text-sm font-semibold tracking-tight transition",
                mode === "standard"
                  ? "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--card)] hover:text-[var(--foreground)]",
              )}
            >
              Standard
            </button>
            <button
              type="button"
              onClick={() => switchMode("academic")}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold tracking-tight transition",
                mode === "academic"
                  ? "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm ring-1 ring-[color-mix(in_oklab,var(--accent)_40%,transparent)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--card)] hover:text-[var(--foreground)]",
              )}
            >
              <GraduationCap className="h-4 w-4" />
              Academic
            </button>
          </div>
        }
      />

      {mode === "academic" ? (
        <p className="mb-5 rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 px-3 py-2 text-xs text-[var(--muted-foreground)]">
          Learning aid only — verify citations before any course submission. Prefer real papers from search + your uploads.
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">
        <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)]/70 p-4">
          {mode === "academic" ? (
            <>
              <div className="space-y-2">
                <Label>Paper topic</Label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Massive MIMO beamforming for 5G RAN"
                />
              </div>
              <div className="space-y-2">
                <Label>Research question</Label>
                <Textarea
                  value={researchQuestion}
                  onChange={(e) => setResearchQuestion(e.target.value)}
                  placeholder="What question should the paper answer?"
                />
              </div>
              <div className="space-y-2">
                <Label>Field</Label>
                <Input
                  value={field}
                  onChange={(e) => setField(e.target.value)}
                  placeholder="ECE / CS / Biomedical…"
                />
              </div>

              <AnimatePresence initial={false}>
                <motion.div
                  key="academic-length"
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.25 }}
                  className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--muted)]/35 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Label className="mb-0">Paper length</Label>
                    <span className="font-mono text-[11px] text-[var(--muted-foreground)]">{lengthHint}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {([1, 2, 3, 4, 5] as AcademicPages[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setAcademicPages(p);
                          setCustomWords("");
                        }}
                        className={cn(
                          "min-w-9 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition",
                          academicPages === p && !parsedCustomWords
                            ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
                            : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)]/50 hover:text-[var(--foreground)]",
                        )}
                      >
                        {p}p
                      </button>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <Label>Detail</Label>
                    <div className="grid gap-1.5">
                      {ACADEMIC_DETAILS.map((d) => (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => setAcademicDetail(d.value)}
                          className={cn(
                            "rounded-lg border px-2.5 py-2 text-left transition",
                            academicDetail === d.value
                              ? "border-[var(--accent)] bg-[var(--accent)]/10"
                              : "border-[var(--border)] hover:bg-[var(--card)]",
                          )}
                        >
                          <p className="text-xs font-semibold tracking-tight">{d.label}</p>
                          <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">{d.hint}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Custom words (optional)</Label>
                    <Input
                      inputMode="numeric"
                      value={customWords}
                      onChange={(e) => setCustomWords(e.target.value.replace(/[^\d]/g, ""))}
                      placeholder="e.g. 2500 (overrides pages)"
                    />
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      Leave blank to use page presets. Range 600–5000.
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="space-y-2">
                <Label>Find papers (OpenAlex / Semantic Scholar)</Label>
                <div className="flex gap-2">
                  <Input
                    value={paperQuery}
                    onChange={(e) => setPaperQuery(e.target.value)}
                    placeholder="Search scholarly literature…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void onSearchPapers();
                      }
                    }}
                  />
                  <Button type="button" variant="secondary" disabled={searching} onClick={() => void onSearchPapers()}>
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {paperHits.length > 0 ? (
                <div className="max-h-72 space-y-2 overflow-y-auto">
                  {paperHits.map((paper) => {
                    const selected = selectedPapers.some((p) => p.id === paper.id);
                    return (
                      <button
                        key={paper.id}
                        type="button"
                        onClick={() => togglePaper(paper)}
                        className={cn(
                          "w-full rounded-xl border px-3 py-2 text-left transition",
                          selected
                            ? "border-[var(--accent)] bg-[var(--accent)]/10"
                            : "border-[var(--border)] hover:bg-[var(--muted)]/50",
                        )}
                      >
                        <p className="text-sm font-medium leading-snug">{paper.title}</p>
                        <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                          {(paper.authors.slice(0, 2).join(", ") || "Unknown authors") +
                            (paper.year ? ` · ${paper.year}` : "") +
                            (paper.venue ? ` · ${paper.venue}` : "")}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {selectedPapers.length > 0 ? (
                <div className="space-y-2">
                  <Label>
                    Selected papers ({selectedPapers.length}/{MAX_ACADEMIC_REFERENCES})
                  </Label>
                  <ul className="space-y-1.5">
                    {selectedPapers.map((p, idx) => (
                      <li
                        key={p.id}
                        className="flex items-start justify-between gap-2 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs"
                      >
                        <span className="min-w-0 truncate">
                          [{idx + 1}] {p.title}
                        </span>
                        <button type="button" onClick={() => togglePaper(p)} className="text-[var(--muted-foreground)]">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : null}

          <div className="space-y-2">
            <Label>
              {mode === "academic" ? "Reference files (PDF / DOCX / TXT)" : "Upload PDF / DOCX / TXT"}
            </Label>
            <p className="text-[11px] text-[var(--muted-foreground)]">
              Up to {MAX_ACADEMIC_REFERENCES} files · {MAX_RESEARCH_UPLOAD_MB}MB each
              {mode === "academic" ? " · combine with selected papers" : ""}
            </p>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.md,application/pdf"
              className="hidden"
              onChange={(e) => {
                const list = e.target.files;
                if (list?.length) void onUploadMany(list);
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={extracting || sources.length >= MAX_ACADEMIC_REFERENCES}
              onClick={() => fileRef.current?.click()}
            >
              {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
              {sources.length >= MAX_ACADEMIC_REFERENCES
                ? `Limit reached (${MAX_ACADEMIC_REFERENCES})`
                : "Choose files"}
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Website URL</Label>
            <div className="flex gap-2">
              <Input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://…" />
              <Button type="button" variant="secondary" disabled={extracting} onClick={() => void onAddUrl()}>
                Add
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>YouTube URL</Label>
            <div className="flex gap-2">
              <Input
                value={youtubeInput}
                onChange={(e) => setYoutubeInput(e.target.value)}
                placeholder="https://youtube.com/watch?v=…"
              />
              <Button type="button" variant="secondary" disabled={extracting} onClick={() => void onAddYoutube()}>
                Add
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Paste text / transcript</Label>
            <Input value={pasteTitle} onChange={(e) => setPasteTitle(e.target.value)} placeholder="Source title" />
            <Textarea
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              placeholder="Paste notes, paper excerpts, or a transcript…"
            />
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={extracting}
              onClick={() => void onAddPaste()}
            >
              Add pasted source
            </Button>
          </div>

          {sources.length > 0 ? (
            <div className="space-y-2">
              <Label>
                Sources ({sources.length}/{MAX_ACADEMIC_REFERENCES})
              </Label>
              <ul className="space-y-2">
                {sources.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-start justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.title}</p>
                      <p className="text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]">
                        {s.kind} · {s.content.length.toLocaleString()} chars
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => setSources((prev) => prev.filter((x) => x.id !== s.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {mode === "standard" ? (
            <>
              <div className="space-y-2">
                <Label>Focus (optional)</Label>
                <Input
                  value={focus}
                  onChange={(e) => setFocus(e.target.value)}
                  placeholder="e.g. pricing implications for startups"
                />
              </div>
              <div className="space-y-2">
                <Label>Outputs</Label>
                <div className="flex flex-wrap gap-2">
                  {RESEARCH_OUTPUTS.map((item) => {
                    const active = outputs.includes(item.value);
                    return (
                      <button
                        key={item.value}
                        type="button"
                        title={item.hint}
                        onClick={() => toggleOutput(item.value)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs transition",
                          active
                            ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--foreground)]"
                            : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]",
                        )}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}

          <Button
            type="button"
            className="w-full"
            variant="accent"
            disabled={mode === "academic" ? !canGenerateAcademic : !canGenerateStandard}
            onClick={() => void runGenerate()}
          >
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {streaming
              ? "Generating…"
              : mode === "academic"
                ? "Generate IEEE draft"
                : "Generate research pack"}
          </Button>
        </div>

        <div className="space-y-3">
          <StudioActionBar
            status={
              streaming
                ? mode === "academic"
                  ? "Streaming IEEE learning draft…"
                  : "Streaming research pack…"
                : markdown
                  ? documentId
                    ? "Draft saved — keep refining or export."
                    : "Unsaved draft — Save, then edit in Editor."
                  : mode === "academic"
                    ? "Search papers, add sources, then generate."
                    : "Add sources, pick outputs, then generate."
            }
          >
            <Button variant="outline" size="sm" onClick={copyContent} disabled={!markdown}>
              <Copy className="h-4 w-4" /> Copy
            </Button>
            <Button variant="outline" size="sm" onClick={downloadContent} disabled={!markdown}>
              <Download className="h-4 w-4" /> Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void runGenerate()}
              disabled={mode === "academic" ? !canGenerateAcademic : !canGenerateStandard}
            >
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

          <StreamingProgress
            active={streaming}
            label={mode === "academic" ? "Streaming IEEE draft…" : "Streaming research pack…"}
          />

          {!markdown && !streaming ? (
            <StudioCanvasEmpty
              icon={mode === "academic" ? GraduationCap : FlaskConical}
              title={mode === "academic" ? "IEEE canvas is empty" : "Research canvas is empty"}
              description={
                mode === "academic"
                  ? "Search papers, add sources, then generate a structured learning draft."
                  : "Add sources, pick outputs, then generate a grounded research pack."
              }
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
