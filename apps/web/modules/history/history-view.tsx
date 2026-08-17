"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DocumentDTO } from "@creatoros/shared";
import { toast } from "sonner";
import { Copy, ExternalLink, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { History as HistoryIcon } from "lucide-react";

export function HistoryView() {
  const router = useRouter();
  const [docs, setDocs] = useState<DocumentDTO[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await api.listDocuments();
      setDocs(data);
    } catch (err) {
      toast.error((err as Error).message || "Failed to load history");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onDelete(id: string) {
    try {
      await api.deleteDocument(id);
      setDocs((prev) => prev.filter((d) => d.id !== id));
      toast.success("Deleted");
    } catch (err) {
      toast.error((err as Error).message || "Delete failed");
    }
  }

  async function onDuplicate(id: string) {
    try {
      const clone = await api.duplicateDocument(id);
      setDocs((prev) => [clone, ...prev]);
      toast.success("Duplicated");
    } catch (err) {
      toast.error((err as Error).message || "Duplicate failed");
    }
  }

  return (
    <div>
      <PageHeader
        title="History"
        description="Every saved generation lives here — reopen, duplicate, or export later."
      />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : docs.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="No documents yet"
          description="Generate something in Writer Studio and hit Save to populate History."
          actionLabel="Open Writer Studio"
          onAction={() => router.push("/writer")}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--muted)]/60 text-[var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Module</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr key={doc.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-4 py-3 font-medium">{doc.title}</td>
                  <td className="px-4 py-3 capitalize text-[var(--muted-foreground)]">{doc.module}</td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">
                    {new Date(doc.updated_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button asChild size="icon" variant="ghost">
                        <Link
                          href={
                            doc.module === "social"
                              ? `/social?doc=${doc.id}`
                              : doc.module === "research"
                                ? `/research?doc=${doc.id}`
                                : `/writer?doc=${doc.id}`
                          }
                          title="Open document"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => void onDuplicate(doc.id)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => void onDelete(doc.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
