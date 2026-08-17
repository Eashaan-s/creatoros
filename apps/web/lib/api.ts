import type {
  AcademicGenerateRequest,
  AcademicImproveRequest,
  AcademicSearchResponse,
  DocumentCreateRequest,
  DocumentDTO,
  DocumentUpdateRequest,
  ResearchExtractResponse,
  ResearchGenerateRequest,
  ResearchImproveRequest,
  SocialGenerateRequest,
  SocialImproveRequest,
  UserDTO,
  UserSettingsDTO,
  UserSettingsUpdateRequest,
  WriterGenerateRequest,
  WriterImproveRequest,
} from "@creatoros/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export type TokenGetter = () => Promise<string | null>;

let tokenGetter: TokenGetter | null = null;

export function setApiTokenGetter(getter: TokenGetter) {
  tokenGetter = getter;
}

async function authHeaders(json = true): Promise<HeadersInit> {
  const headers: Record<string, string> = {};
  if (json) headers["Content-Type"] = "application/json";
  const token = tokenGetter ? await tokenGetter() : null;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (process.env.NEXT_PUBLIC_DEV_AUTH_TOKEN) {
    headers.Authorization = `Bearer ${process.env.NEXT_PUBLIC_DEV_AUTH_TOKEN}`;
  } else {
    headers.Authorization = "Bearer dev:dev_user:dev@creatoros.local";
  }
  return headers;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(await authHeaders(!(init?.body instanceof FormData))),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(formatApiError(detail, res.status));
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

function formatApiError(raw: string, status: number): string {
  const trimmed = raw.trim();
  if (!trimmed) return `Request failed (${status})`;
  try {
    const parsed = JSON.parse(trimmed) as { detail?: unknown };
    if (typeof parsed.detail === "string") return parsed.detail;
    if (Array.isArray(parsed.detail)) {
      return parsed.detail
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object" && "msg" in item) {
            return String((item as { msg: unknown }).msg);
          }
          return JSON.stringify(item);
        })
        .join("; ");
    }
  } catch {
    // not JSON
  }
  return trimmed.length > 280 ? `${trimmed.slice(0, 280)}…` : trimmed;
}

export const api = {
  me: () => request<UserDTO>("/me"),
  getSettings: () => request<UserSettingsDTO>("/settings"),
  updateSettings: (body: UserSettingsUpdateRequest) =>
    request<UserSettingsDTO>("/settings", { method: "PATCH", body: JSON.stringify(body) }),
  listDocuments: (module?: string) =>
    request<DocumentDTO[]>(`/documents${module ? `?module=${module}` : ""}`),
  getDocument: (id: string) => request<DocumentDTO>(`/documents/${id}`),
  createDocument: (body: DocumentCreateRequest) =>
    request<DocumentDTO>("/documents", { method: "POST", body: JSON.stringify(body) }),
  updateDocument: (id: string, body: DocumentUpdateRequest) =>
    request<DocumentDTO>(`/documents/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteDocument: (id: string) => request<void>(`/documents/${id}`, { method: "DELETE" }),
  duplicateDocument: (id: string) =>
    request<DocumentDTO>(`/documents/${id}/duplicate`, { method: "POST" }),
  improveWriter: (body: WriterImproveRequest) =>
    request<{ text: string; run_id?: string; provider: string; model: string }>("/writer/improve", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  improveSocial: (body: SocialImproveRequest) =>
    request<{ text: string; run_id?: string; provider: string; model: string }>("/social/improve", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  improveResearch: (body: ResearchImproveRequest) =>
    request<{ text: string; run_id?: string; provider: string; model: string }>("/research/improve", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  searchAcademicPapers: (query: string, limit = 8) =>
    request<AcademicSearchResponse>("/research/papers/search", {
      method: "POST",
      body: JSON.stringify({ query, limit }),
    }),
  improveAcademic: (body: AcademicImproveRequest) =>
    request<{ text: string; run_id?: string; provider: string; model: string }>(
      "/research/academic/improve",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    ),
  extractResearchFile: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<ResearchExtractResponse>("/research/extract/file", {
      method: "POST",
      body: form,
    });
  },
  extractResearchUrl: (url: string) =>
    request<ResearchExtractResponse>("/research/extract/url", {
      method: "POST",
      body: JSON.stringify({ url }),
    }),
  extractResearchYoutube: (url: string) =>
    request<ResearchExtractResponse>("/research/extract/youtube", {
      method: "POST",
      body: JSON.stringify({ url }),
    }),
  extractResearchPaste: (title: string, content: string) =>
    request<ResearchExtractResponse>("/research/extract/paste", {
      method: "POST",
      body: JSON.stringify({ title, content }),
    }),
};

export type SSEHandlers = {
  onToken: (text: string) => void;
  onDone: (meta: { run_id?: string; provider?: string; model?: string }) => void;
  onError: (message: string) => void;
};

async function streamSSE(
  path: string,
  body: unknown,
  handlers: SSEHandlers,
  signal?: AbortSignal,
) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: await authHeaders(true),
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) {
    const detail = await res.text();
    throw new Error(formatApiError(detail, res.status));
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.type === "token") handlers.onToken(data.text ?? "");
        else if (data.type === "done") handlers.onDone(data);
        else if (data.type === "error") handlers.onError(data.message ?? "Stream error");
      } catch {
        // ignore malformed chunks
      }
    }
  }
}

export async function streamWriter(
  body: WriterGenerateRequest,
  handlers: SSEHandlers,
  signal?: AbortSignal,
) {
  return streamSSE("/writer/stream", body, handlers, signal);
}

export async function streamSocial(
  body: SocialGenerateRequest,
  handlers: SSEHandlers,
  signal?: AbortSignal,
) {
  return streamSSE("/social/stream", body, handlers, signal);
}

export async function streamResearch(
  body: ResearchGenerateRequest,
  handlers: SSEHandlers,
  signal?: AbortSignal,
) {
  return streamSSE("/research/stream", body, handlers, signal);
}

export async function streamAcademic(
  body: AcademicGenerateRequest,
  handlers: SSEHandlers,
  signal?: AbortSignal,
) {
  return streamSSE("/research/academic/stream", body, handlers, signal);
}
