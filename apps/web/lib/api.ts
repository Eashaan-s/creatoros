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

/** Prefer same-origin `/api/v1` on phone/LAN; hit FastAPI directly on desktop localhost. */
function resolveApiBase(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";
  if (typeof window === "undefined") return configured;

  const pageHost = window.location.hostname;
  const isLocalPage = pageHost === "localhost" || pageHost === "127.0.0.1";
  const directLocal =
    process.env.NEXT_PUBLIC_API_DIRECT_URL?.trim() || "http://127.0.0.1:8000/api/v1";

  // Desktop localhost: skip the Next.js API route (adds ~1s+ per call in dev).
  if (isLocalPage && (configured.startsWith("/") || isLocalApiUrl(configured))) {
    return directLocal;
  }

  if (configured.startsWith("/")) return configured;

  try {
    const url = new URL(configured);
    const isLocalApi = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    const isLanPage = !isLocalPage;
    // Phone/LAN can't reach the PC's localhost — use same-origin proxy.
    if (isLocalApi && isLanPage) return "/api/v1";
  } catch {
    // ignore
  }
  return configured;
}

function isLocalApiUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export type TokenGetter = (options?: { skipCache?: boolean }) => Promise<string | null>;

let tokenGetter: TokenGetter | null = null;

export function setApiTokenGetter(getter: TokenGetter) {
  tokenGetter = getter;
}

async function resolveAuthToken(skipCache = false): Promise<string | null> {
  if (!tokenGetter) return null;
  let token = await tokenGetter({ skipCache });
  if (token) return token;
  // Clerk on mobile/LAN can hydrate a beat late after navigation.
  await new Promise((r) => setTimeout(r, 400));
  token = await tokenGetter({ skipCache: true });
  return token;
}

async function authHeaders(json = true, skipCache = false): Promise<HeadersInit> {
  const headers: Record<string, string> = {};
  if (json) headers["Content-Type"] = "application/json";
  const token = await resolveAuthToken(skipCache);
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (!clerkEnabled) {
    // Local workspace only — never invent a user when Clerk is on.
    if (process.env.NEXT_PUBLIC_DEV_AUTH_TOKEN) {
      headers.Authorization = `Bearer ${process.env.NEXT_PUBLIC_DEV_AUTH_TOKEN}`;
    } else {
      headers.Authorization = "Bearer dev:dev_user:dev@creatoros.local";
    }
  } else {
    throw new Error("Not signed in — open Sign in, then try again.");
  }
  return headers;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const apiBase = resolveApiBase();
  const isForm = init?.body instanceof FormData;

  const doFetch = async (skipCache: boolean) => {
    const res = await fetch(`${apiBase}${path}`, {
      ...init,
      headers: {
        ...(await authHeaders(!isForm, skipCache)),
        ...(init?.headers ?? {}),
      },
    });
    return res;
  };

  let res: Response;
  try {
    res = await doFetch(false);
    // One refresh if the cached Clerk JWT was stale.
    if (res.status === 401) {
      res = await doFetch(true);
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Not signed in")) throw err;
    throw new Error(
      "Failed to reach the API. Keep the API server running, use http://<PC-IP>:3000 on phone, and set NEXT_PUBLIC_API_URL=/api/v1.",
    );
  }
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
    // not JSON — proxy/HTML bodies often say only "Internal Server Error"
  }
  const plain = trimmed.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (/^internal server error$/i.test(plain) || status >= 500) {
    return status >= 500
      ? "Server error while reading this file. Confirm the API is running, then try a text PDF or paste the content."
      : plain;
  }
  return plain.length > 280 ? `${plain.slice(0, 280)}…` : plain;
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
  searchAcademicPapers: (query: string, limit = 20) =>
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
  const apiBase = resolveApiBase();

  const doFetch = async (skipCache: boolean) =>
    fetch(`${apiBase}${path}`, {
      method: "POST",
      headers: await authHeaders(true, skipCache),
      body: JSON.stringify(body),
      signal,
    });

  let res: Response;
  try {
    res = await doFetch(false);
    if (res.status === 401) {
      res = await doFetch(true);
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Not signed in")) throw err;
    throw new Error(
      "Failed to reach the API. Keep the API server running, use http://<PC-IP>:3000 on phone, and set NEXT_PUBLIC_API_URL=/api/v1.",
    );
  }

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
