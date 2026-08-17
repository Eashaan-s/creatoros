"""Source text extraction for Research Studio."""

from __future__ import annotations

import io
import re
from typing import Literal
from urllib.parse import parse_qs, urlparse

import httpx
from bs4 import BeautifulSoup
from docx import Document as DocxDocument
from pypdf import PdfReader

ResearchSourceKind = Literal["pdf", "docx", "txt", "url", "youtube", "paste"]

MAX_CHARS = 80_000

BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
}


def truncate(text: str, limit: int = MAX_CHARS) -> str:
    cleaned = re.sub(r"\n{3,}", "\n\n", text).strip()
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[:limit] + "\n\n[Truncated for length]"


def extract_txt(data: bytes) -> str:
    for encoding in ("utf-8", "utf-16", "latin-1"):
        try:
            return truncate(data.decode(encoding))
        except UnicodeDecodeError:
            continue
    return truncate(data.decode("utf-8", errors="ignore"))


def extract_pdf(data: bytes) -> str:
    reader = PdfReader(io.BytesIO(data))
    parts: list[str] = []
    for page in reader.pages:
        text = page.extract_text() or ""
        if text.strip():
            parts.append(text)
    if not parts:
        raise ValueError("No extractable text found in PDF (it may be image-only).")
    return truncate("\n\n".join(parts))


def extract_docx(data: bytes) -> str:
    document = DocxDocument(io.BytesIO(data))
    parts = [p.text.strip() for p in document.paragraphs if p.text and p.text.strip()]
    if not parts:
        raise ValueError("No extractable text found in DOCX.")
    return truncate("\n\n".join(parts))


def kind_from_filename(filename: str) -> ResearchSourceKind:
    lower = filename.lower()
    if lower.endswith(".pdf"):
        return "pdf"
    if lower.endswith(".docx"):
        return "docx"
    if lower.endswith(".txt") or lower.endswith(".md"):
        return "txt"
    raise ValueError("Unsupported file type. Use PDF, DOCX, or TXT.")


def extract_file(filename: str, data: bytes) -> tuple[ResearchSourceKind, str]:
    kind = kind_from_filename(filename)
    if kind == "pdf":
        return kind, extract_pdf(data)
    if kind == "docx":
        return kind, extract_docx(data)
    return kind, extract_txt(data)


def _youtube_video_id(url: str) -> str | None:
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    if "youtu.be" in host:
        return parsed.path.lstrip("/").split("/")[0] or None
    if "youtube.com" in host:
        if parsed.path.startswith("/watch"):
            return parse_qs(parsed.query).get("v", [None])[0]
        if parsed.path.startswith("/embed/") or parsed.path.startswith("/shorts/"):
            return parsed.path.split("/")[2] if len(parsed.path.split("/")) > 2 else None
    return None


def _html_to_text(html: str, fallback_title: str) -> tuple[str, str]:
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "noscript", "nav", "footer", "header", "iframe"]):
        tag.decompose()
    title = (
        soup.title.string.strip()
        if soup.title and soup.title.string
        else fallback_title
    )[:512]
    text = soup.get_text("\n")
    return title, truncate(text)


async def _fetch_html_direct(url: str) -> str:
    async with httpx.AsyncClient(timeout=45.0, follow_redirects=True) as client:
        response = await client.get(url, headers=BROWSER_HEADERS)
        if response.status_code in {401, 403, 429}:
            raise PermissionError(
                f"This website blocked automated access ({response.status_code}). "
                "Try pasting the page text, or upload a PDF/TXT export."
            )
        response.raise_for_status()
        return response.text


async def _fetch_html_via_jina(url: str) -> str:
    """Fallback reader for sites that block direct scrapes."""
    reader_url = f"https://r.jina.ai/{url}"
    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
        response = await client.get(
            reader_url,
            headers={
                **BROWSER_HEADERS,
                "Accept": "text/plain,text/markdown,*/*",
                "X-Return-Format": "markdown",
            },
        )
        if response.status_code >= 400:
            raise ValueError(
                "Could not fetch this page (site blocked scraping). "
                "Paste the article text or upload a PDF/TXT instead."
            )
        return response.text


async def extract_url(url: str) -> tuple[ResearchSourceKind, str, str]:
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    video_id = _youtube_video_id(url)
    if video_id:
        return await extract_youtube(url)

    html: str | None = None
    used_jina = False
    try:
        html = await _fetch_html_direct(url)
    except PermissionError:
        html = await _fetch_html_via_jina(url)
        used_jina = True
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code in {401, 403, 429}:
            html = await _fetch_html_via_jina(url)
            used_jina = True
        else:
            raise ValueError(
                f"Could not fetch URL (HTTP {exc.response.status_code}). "
                "Paste the page text or upload a file instead."
            ) from exc
    except Exception as exc:  # noqa: BLE001
        try:
            html = await _fetch_html_via_jina(url)
            used_jina = True
        except Exception:
            raise ValueError(
                "Could not fetch this website. Paste the page text or upload a PDF/TXT instead."
            ) from exc

    if used_jina:
        # Jina returns markdown/plain already
        content = truncate(html or "")
        title = urlparse(url).netloc or "Web page"
        if len(content) < 40:
            raise ValueError(
                "Could not extract meaningful text from that URL. "
                "Paste the article text instead."
            )
        return "url", title[:512], content

    title, content = _html_to_text(html or "", url)
    if len(content) < 40:
        # Retry via reader if DOM was mostly empty/JS-rendered
        try:
            markdown = await _fetch_html_via_jina(url)
            content = truncate(markdown)
            if len(content) >= 40:
                return "url", title, content
        except Exception:  # noqa: BLE001
            pass
        raise ValueError(
            "Could not extract meaningful text (page may be JavaScript-only). "
            "Paste the article text instead."
        )
    return "url", title, content


def _transcript_to_text(entries: list[dict]) -> str:
    return " ".join(str(item.get("text", "")).strip() for item in entries if item.get("text"))


async def extract_youtube(url: str) -> tuple[ResearchSourceKind, str, str]:
    video_id = _youtube_video_id(url)
    if not video_id:
        raise ValueError("Invalid YouTube URL.")

    try:
        from youtube_transcript_api import YouTubeTranscriptApi
    except ImportError as exc:
        raise ValueError(
            "YouTube transcript support is not installed. Paste the transcript instead."
        ) from exc

    text = ""
    try:
        # Prefer listing available transcripts, then fetch the best match.
        listing = YouTubeTranscriptApi.list_transcripts(video_id)
        transcript = None
        try:
            transcript = listing.find_transcript(["en", "en-US", "en-GB"])
        except Exception:  # noqa: BLE001
            try:
                transcript = listing.find_generated_transcript(["en", "en-US", "en-GB"])
            except Exception:  # noqa: BLE001
                # Fall back to first available transcript in any language
                for item in listing:
                    transcript = item
                    break

        if transcript is not None:
            entries = transcript.fetch()
            text = _transcript_to_text(entries)
        else:
            entries = YouTubeTranscriptApi.get_transcript(video_id, languages=["en", "en-US", "en-GB"])
            text = _transcript_to_text(entries)
    except Exception:
        try:
            entries = YouTubeTranscriptApi.get_transcript(video_id)
            text = _transcript_to_text(entries)
        except Exception as exc:  # noqa: BLE001
            raise ValueError(
                "YouTube blocked transcript access for this video "
                "(private, disabled captions, or region-locked). "
                "Open the video, show transcript, then paste it below."
            ) from exc

    content = truncate(text)
    if len(content) < 20:
        raise ValueError(
            "Transcript was empty. Paste the transcript manually in Research Studio."
        )
    return "youtube", f"YouTube {video_id}", content
