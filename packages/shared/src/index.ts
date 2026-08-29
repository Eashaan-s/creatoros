/** Shared API contracts between CreatorOS web and future clients. */

export type WriterContentType =
  | "blog"
  | "newsletter"
  | "tech_docs"
  | "email"
  | "cold_email"
  | "sales_copy"
  | "landing_page"
  | "product_description"
  | "press_release"
  | "whitepaper";

export type ContentTone =
  | "professional"
  | "casual"
  | "witty"
  | "friendly"
  | "authoritative"
  | "academic";

export type ContentLength = "short" | "medium" | "long";

export type DocumentModule =
  | "writer"
  | "social"
  | "research"
  | "editor"
  | "templates";

export type DocumentStatus = "draft" | "saved" | "archived";

export type AIProviderName =
  | "mock"
  | "openrouter"
  | "openai"
  | "anthropic"
  | "gemini"
  | "groq"
  | "ollama"
  | "azure_openai";

export interface WriterGenerateRequest {
  type: WriterContentType;
  topic: string;
  audience: string;
  tone: ContentTone;
  length: ContentLength;
  keywords: string[];
  cta: string;
  document_id?: string | null;
}

export interface WriterImproveRequest {
  content: string;
  instruction?: string;
  document_id?: string | null;
}

export interface DocumentDTO {
  id: string;
  user_id: string;
  module: DocumentModule;
  title: string;
  content_html: string;
  content_markdown: string;
  prompt_meta: Record<string, unknown>;
  status: DocumentStatus;
  created_at: string;
  updated_at: string;
}

export interface DocumentCreateRequest {
  module: DocumentModule;
  title: string;
  content_html: string;
  content_markdown: string;
  prompt_meta?: Record<string, unknown>;
  status?: DocumentStatus;
}

export interface DocumentUpdateRequest {
  title?: string;
  content_html?: string;
  content_markdown?: string;
  prompt_meta?: Record<string, unknown>;
  status?: DocumentStatus;
}

export interface UserSettingsDTO {
  id: string;
  user_id: string;
  theme: "dark" | "light" | "system";
  ai_provider: AIProviderName;
  ai_model: string;
  temperature: number;
  max_tokens: number;
  preferences: Record<string, unknown>;
}

export interface UserSettingsUpdateRequest {
  theme?: "dark" | "light" | "system";
  ai_provider?: AIProviderName;
  ai_model?: string;
  temperature?: number;
  max_tokens?: number;
  preferences?: Record<string, unknown>;
}

export interface UserDTO {
  id: string;
  clerk_user_id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export const WRITER_CONTENT_TYPES: { value: WriterContentType; label: string }[] = [
  { value: "blog", label: "Blog Writer" },
  { value: "newsletter", label: "Newsletter" },
  { value: "tech_docs", label: "Technical Documentation" },
  { value: "email", label: "Email Writer" },
  { value: "cold_email", label: "Cold Email" },
  { value: "sales_copy", label: "Sales Copy" },
  { value: "landing_page", label: "Landing Page" },
  { value: "product_description", label: "Product Description" },
  { value: "press_release", label: "Press Release" },
  { value: "whitepaper", label: "Whitepaper" },
];

/** Content types where a call-to-action field is relevant. */
export const WRITER_TYPES_WITH_CTA: WriterContentType[] = [
  "blog",
  "newsletter",
  "email",
  "cold_email",
  "sales_copy",
  "landing_page",
  "product_description",
  "press_release",
];

export function writerTypeSupportsCta(type: WriterContentType): boolean {
  return WRITER_TYPES_WITH_CTA.includes(type);
}

export const CONTENT_TONES: { value: ContentTone; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "witty", label: "Witty" },
  { value: "friendly", label: "Friendly" },
  { value: "authoritative", label: "Authoritative" },
  { value: "academic", label: "Academic" },
];

export const CONTENT_LENGTHS: { value: ContentLength; label: string }[] = [
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long" },
];

export type SocialPlatform =
  | "linkedin"
  | "twitter"
  | "instagram"
  | "facebook"
  | "reddit"
  | "medium"
  | "devto"
  | "threads";

export interface SocialGenerateRequest {
  idea: string;
  platforms: SocialPlatform[];
  tone: ContentTone;
  audience: string;
  document_id?: string | null;
}

export interface SocialImproveRequest {
  content: string;
  instruction?: string;
  document_id?: string | null;
}

export const SOCIAL_PLATFORMS: { value: SocialPlatform; label: string }[] = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "twitter", label: "Twitter / X Thread" },
  { value: "instagram", label: "Instagram Caption" },
  { value: "facebook", label: "Facebook" },
  { value: "reddit", label: "Reddit" },
  { value: "medium", label: "Medium" },
  { value: "devto", label: "Dev.to" },
  { value: "threads", label: "Threads" },
];

export type ResearchSourceKind = "pdf" | "docx" | "txt" | "url" | "youtube" | "paste";

export type ResearchOutputType =
  | "summary"
  | "key_insights"
  | "mindmap"
  | "faqs"
  | "flashcards"
  | "citations"
  | "questions";

export interface ResearchSourcePayload {
  kind: ResearchSourceKind;
  title: string;
  content: string;
  origin?: string;
}

export interface ResearchGenerateRequest {
  sources: ResearchSourcePayload[];
  outputs: ResearchOutputType[];
  focus?: string;
  document_id?: string | null;
}

export interface ResearchImproveRequest {
  content: string;
  instruction?: string;
  document_id?: string | null;
}

export interface ResearchExtractResponse {
  kind: ResearchSourceKind;
  title: string;
  content: string;
  origin?: string;
  char_count: number;
}

export const RESEARCH_OUTPUTS: { value: ResearchOutputType; label: string; hint: string }[] = [
  { value: "summary", label: "Summary", hint: "Clear executive overview" },
  { value: "key_insights", label: "Key Insights", hint: "Bullet takeaways" },
  { value: "mindmap", label: "Mindmap", hint: "Nested outline map" },
  { value: "faqs", label: "FAQs", hint: "Q&A from the material" },
  { value: "flashcards", label: "Flashcards", hint: "Study cards" },
  { value: "citations", label: "Citations", hint: "Source-backed notes" },
  { value: "questions", label: "Questions", hint: "Discussion prompts" },
];

export interface AcademicPaper {
  id: string;
  title: string;
  abstract: string;
  year: number | null;
  authors: string[];
  venue: string | null;
  doi: string | null;
  url: string | null;
  source: "openalex" | "semantic_scholar" | "upload" | "paste";
  citation_count?: number | null;
}

export interface AcademicSearchRequest {
  query: string;
  limit?: number;
}

export interface AcademicSearchResponse {
  query: string;
  papers: AcademicPaper[];
}

export interface AcademicGenerateRequest {
  topic: string;
  research_question?: string;
  field?: string;
  papers: AcademicPaper[];
  sources?: ResearchSourcePayload[];
  document_id?: string | null;
}

export interface AcademicImproveRequest {
  content: string;
  instruction?: string;
  document_id?: string | null;
}
