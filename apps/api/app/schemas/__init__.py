from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


WriterContentType = Literal[
    "blog",
    "newsletter",
    "tech_docs",
    "email",
    "cold_email",
    "sales_copy",
    "landing_page",
    "product_description",
    "press_release",
    "whitepaper",
]

ContentTone = Literal[
    "professional",
    "casual",
    "witty",
    "friendly",
    "authoritative",
    "academic",
]

ContentLength = Literal["short", "medium", "long"]
DocumentModule = Literal["writer", "social", "research", "editor", "templates"]
DocumentStatus = Literal["draft", "saved", "archived"]
Theme = Literal["dark", "light", "system"]
AIProviderName = Literal[
    "mock",
    "openrouter",
    "openai",
    "anthropic",
    "gemini",
    "groq",
    "ollama",
    "azure_openai",
]


class UserOut(BaseModel):
    id: str
    clerk_user_id: str
    email: str
    name: str | None = None
    avatar_url: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserSettingsOut(BaseModel):
    id: str
    user_id: str
    theme: Theme
    ai_provider: AIProviderName
    ai_model: str
    temperature: float
    max_tokens: int
    preferences: dict[str, Any] = Field(default_factory=dict)

    model_config = {"from_attributes": True}


class UserSettingsUpdate(BaseModel):
    theme: Theme | None = None
    ai_provider: AIProviderName | None = None
    ai_model: str | None = None
    temperature: float | None = Field(default=None, ge=0, le=2)
    max_tokens: int | None = Field(default=None, ge=64, le=16000)
    preferences: dict[str, Any] | None = None


class WriterGenerateRequest(BaseModel):
    type: WriterContentType
    topic: str = Field(min_length=1, max_length=500)
    audience: str = Field(default="", max_length=500)
    tone: ContentTone = "professional"
    length: ContentLength = "medium"
    keywords: list[str] = Field(default_factory=list)
    cta: str = Field(default="", max_length=500)
    document_id: str | None = None


class WriterImproveRequest(BaseModel):
    content: str = Field(min_length=1)
    instruction: str = "Improve clarity, structure, and polish while preserving meaning."
    document_id: str | None = None


class WriterGenerateResponse(BaseModel):
    text: str
    provider: str
    model: str
    run_id: str | None = None
    tokens_in: int = 0
    tokens_out: int = 0


SocialPlatform = Literal[
    "linkedin",
    "twitter",
    "instagram",
    "facebook",
    "reddit",
    "medium",
    "devto",
    "threads",
]


class SocialGenerateRequest(BaseModel):
    idea: str = Field(min_length=1, max_length=2000)
    platforms: list[SocialPlatform] = Field(min_length=1)
    tone: ContentTone = "professional"
    audience: str = Field(default="", max_length=500)
    document_id: str | None = None


class SocialImproveRequest(BaseModel):
    content: str = Field(min_length=1)
    instruction: str = "Improve clarity and platform-native voice while preserving meaning."
    document_id: str | None = None


class SocialGenerateResponse(BaseModel):
    text: str
    provider: str
    model: str
    run_id: str | None = None
    tokens_in: int = 0
    tokens_out: int = 0


ResearchSourceKind = Literal["pdf", "docx", "txt", "url", "youtube", "paste"]
ResearchOutputType = Literal[
    "summary",
    "key_insights",
    "mindmap",
    "faqs",
    "flashcards",
    "citations",
    "questions",
]


class ResearchSourcePayload(BaseModel):
    kind: ResearchSourceKind
    title: str = Field(min_length=1, max_length=512)
    content: str = Field(min_length=1)
    origin: str | None = None


class ResearchGenerateRequest(BaseModel):
    sources: list[ResearchSourcePayload] = Field(min_length=1, max_length=25)
    outputs: list[ResearchOutputType] = Field(min_length=1)
    focus: str = Field(default="", max_length=1000)
    document_id: str | None = None


class ResearchImproveRequest(BaseModel):
    content: str = Field(min_length=1)
    instruction: str = "Improve clarity and structure of this research output while preserving meaning."
    document_id: str | None = None


class ResearchGenerateResponse(BaseModel):
    text: str
    provider: str
    model: str
    run_id: str | None = None
    tokens_in: int = 0
    tokens_out: int = 0


class ResearchExtractResponse(BaseModel):
    kind: ResearchSourceKind
    title: str
    content: str
    origin: str | None = None
    char_count: int


class ResearchUrlExtractRequest(BaseModel):
    url: str = Field(min_length=1, max_length=2000)


class ResearchYoutubeExtractRequest(BaseModel):
    url: str = Field(min_length=1, max_length=2000)


class ResearchPasteExtractRequest(BaseModel):
    title: str = Field(default="Pasted notes", max_length=512)
    content: str = Field(min_length=1)


class AcademicPaperOut(BaseModel):
    id: str
    title: str
    abstract: str = ""
    year: int | None = None
    authors: list[str] = Field(default_factory=list)
    venue: str | None = None
    doi: str | None = None
    url: str | None = None
    source: Literal["openalex", "semantic_scholar", "upload", "paste"] = "openalex"
    citation_count: int | None = None


class AcademicSearchRequest(BaseModel):
    query: str = Field(min_length=2, max_length=500)
    limit: int = Field(default=20, ge=1, le=40)


class AcademicSearchResponse(BaseModel):
    query: str
    papers: list[AcademicPaperOut]


class AcademicGenerateRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=500)
    research_question: str = Field(default="", max_length=1000)
    field: str = Field(default="", max_length=200)
    papers: list[AcademicPaperOut] = Field(default_factory=list, max_length=25)
    sources: list[ResearchSourcePayload] = Field(default_factory=list, max_length=25)
    pages: Literal[1, 2, 3, 4, 5] = 3
    detail: Literal["overview", "thorough", "exhaustive"] = "thorough"
    target_words: int | None = Field(default=None, ge=600, le=5000)
    document_id: str | None = None


class AcademicImproveRequest(BaseModel):
    content: str = Field(min_length=1)
    instruction: str = (
        "Improve academic clarity and IEEE-style structure while preserving citations and meaning."
    )
    document_id: str | None = None
    pages: Literal[1, 2, 3, 4, 5] | None = None
    detail: Literal["overview", "thorough", "exhaustive"] | None = None
    target_words: int | None = Field(default=None, ge=600, le=5000)


class DocumentCreate(BaseModel):
    module: DocumentModule
    title: str = Field(min_length=1, max_length=512)
    content_html: str = ""
    content_markdown: str = ""
    prompt_meta: dict[str, Any] = Field(default_factory=dict)
    status: DocumentStatus = "saved"


class DocumentUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=512)
    content_html: str | None = None
    content_markdown: str | None = None
    prompt_meta: dict[str, Any] | None = None
    status: DocumentStatus | None = None


class DocumentOut(BaseModel):
    id: str
    user_id: str
    module: DocumentModule
    title: str
    content_html: str
    content_markdown: str
    prompt_meta: dict[str, Any]
    status: DocumentStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
