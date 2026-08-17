"use client";

import { useEffect, useState } from "react";
import type { AIProviderName, UserSettingsDTO } from "@creatoros/shared";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

const PROVIDERS: { value: AIProviderName; label: string }[] = [
  { value: "mock", label: "Mock (local)" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "openai", label: "OpenAI (stub)" },
  { value: "anthropic", label: "Anthropic (stub)" },
  { value: "gemini", label: "Gemini (stub)" },
  { value: "groq", label: "Groq (stub)" },
  { value: "ollama", label: "Ollama (stub)" },
  { value: "azure_openai", label: "Azure OpenAI (stub)" },
];

export function SettingsView() {
  const { setTheme } = useTheme();
  const [settings, setSettings] = useState<UserSettingsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const data = await api.getSettings();
        setSettings(data);
        setTheme(data.theme === "system" ? "dark" : data.theme);
      } catch (err) {
        toast.error((err as Error).message || "Failed to load settings");
      } finally {
        setLoading(false);
      }
    })();
  }, [setTheme]);

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await api.updateSettings({
        theme: settings.theme,
        ai_provider: settings.ai_provider,
        ai_model: settings.ai_model,
        temperature: settings.temperature,
        max_tokens: settings.max_tokens,
      });
      setSettings(updated);
      setTheme(updated.theme === "system" ? "dark" : updated.theme);
      toast.success("Settings saved");
    } catch (err) {
      toast.error((err as Error).message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full max-w-xl" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Theme, provider routing, and generation defaults. Modules never talk to vendors directly."
      />

      <div className="max-w-xl space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--card)]/70 p-5">
        <div className="space-y-2">
          <Label>Theme</Label>
          <Select
            value={settings.theme}
            onValueChange={(v) =>
              setSettings({ ...settings, theme: v as UserSettingsDTO["theme"] })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>AI Provider</Label>
          <Select
            value={settings.ai_provider}
            onValueChange={(v) =>
              setSettings({ ...settings, ai_provider: v as AIProviderName })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Model</Label>
          <Input
            value={settings.ai_model}
            onChange={(e) => setSettings({ ...settings, ai_model: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Temperature</Label>
            <Input
              type="number"
              min={0}
              max={2}
              step={0.1}
              value={settings.temperature}
              onChange={(e) =>
                setSettings({ ...settings, temperature: Number(e.target.value) })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Max tokens</Label>
            <Input
              type="number"
              min={64}
              max={16000}
              step={64}
              value={settings.max_tokens}
              onChange={(e) =>
                setSettings({ ...settings, max_tokens: Number(e.target.value) })
              }
            />
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-[var(--border)] p-3 text-xs text-[var(--muted-foreground)]">
          API keys are platform-managed in Phase 1 via <code>AI_API_KEY</code>. Per-user encrypted keys land in Phase 2.
        </div>

        <Button onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </div>
  );
}
