"""Academic paper discovery via OpenAlex + Semantic Scholar."""

from __future__ import annotations

from typing import Any

import httpx

from app.schemas import AcademicPaperOut

OPENALEX_URL = "https://api.openalex.org/works"
SEMANTIC_URL = "https://api.semanticscholar.org/graph/v1/paper/search"
USER_AGENT = "CreatorOS/0.1 (academic-research; mailto:creatoros@local.dev)"


def _authors_from_openalex(work: dict[str, Any]) -> list[str]:
    names: list[str] = []
    for authorship in work.get("authorships") or []:
        author = authorship.get("author") or {}
        name = author.get("display_name")
        if name:
            names.append(str(name))
    return names[:12]


def _venue_from_openalex(work: dict[str, Any]) -> str | None:
    primary = work.get("primary_location") or {}
    source = primary.get("source") or {}
    name = source.get("display_name")
    return str(name) if name else None


def _doi_from_openalex(work: dict[str, Any]) -> str | None:
    doi = work.get("doi")
    if not doi:
        return None
    return str(doi).replace("https://doi.org/", "").replace("http://doi.org/", "")


def _url_from_openalex(work: dict[str, Any]) -> str | None:
    primary = work.get("primary_location") or {}
    landing = primary.get("landing_page_url")
    if landing:
        return str(landing)
    doi = work.get("doi")
    if doi:
        return str(doi)
    openalex_id = work.get("id")
    return str(openalex_id) if openalex_id else None


def _year_from_openalex(work: dict[str, Any]) -> int | None:
    year = work.get("publication_year")
    try:
        return int(year) if year is not None else None
    except (TypeError, ValueError):
        return None


async def search_openalex(query: str, limit: int = 8) -> list[AcademicPaperOut]:
    params = {
        "search": query,
        "per_page": limit,
        "mailto": "creatoros@local.dev",
        "sort": "relevance_score:desc",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            OPENALEX_URL,
            params=params,
            headers={"User-Agent": USER_AGENT},
        )
        response.raise_for_status()
        data = response.json()

    papers: list[AcademicPaperOut] = []
    for work in data.get("results") or []:
        title = (work.get("title") or work.get("display_name") or "").strip()
        if not title:
            continue
        abstract_inverted = work.get("abstract_inverted_index")
        abstract = ""
        if isinstance(abstract_inverted, dict):
            # Reconstruct approximate abstract from inverted index
            positions: list[tuple[int, str]] = []
            for word, idxs in abstract_inverted.items():
                for idx in idxs:
                    positions.append((int(idx), str(word)))
            positions.sort(key=lambda x: x[0])
            abstract = " ".join(word for _, word in positions)
        papers.append(
            AcademicPaperOut(
                id=str(work.get("id") or title),
                title=title,
                abstract=abstract[:4000],
                year=_year_from_openalex(work),
                authors=_authors_from_openalex(work),
                venue=_venue_from_openalex(work),
                doi=_doi_from_openalex(work),
                url=_url_from_openalex(work),
                source="openalex",
                citation_count=work.get("cited_by_count"),
            )
        )
    return papers


async def search_semantic_scholar(query: str, limit: int = 8) -> list[AcademicPaperOut]:
    params = {
        "query": query,
        "limit": limit,
        "fields": "title,abstract,year,authors,externalIds,url,venue,citationCount",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            SEMANTIC_URL,
            params=params,
            headers={"User-Agent": USER_AGENT},
        )
        response.raise_for_status()
        data = response.json()

    papers: list[AcademicPaperOut] = []
    for item in data.get("data") or []:
        title = (item.get("title") or "").strip()
        if not title:
            continue
        authors = [a.get("name") for a in (item.get("authors") or []) if a.get("name")]
        external = item.get("externalIds") or {}
        doi = external.get("DOI")
        papers.append(
            AcademicPaperOut(
                id=str(item.get("paperId") or title),
                title=title,
                abstract=(item.get("abstract") or "")[:4000],
                year=item.get("year"),
                authors=[str(a) for a in authors][:12],
                venue=item.get("venue"),
                doi=str(doi) if doi else None,
                url=item.get("url"),
                source="semantic_scholar",
                citation_count=item.get("citationCount"),
            )
        )
    return papers


async def search_papers(query: str, limit: int = 8) -> list[AcademicPaperOut]:
    """Prefer OpenAlex; fall back to Semantic Scholar if needed."""
    errors: list[str] = []
    try:
        papers = await search_openalex(query, limit=limit)
        if papers:
            return papers
    except Exception as exc:  # noqa: BLE001
        errors.append(f"OpenAlex: {exc}")

    try:
        papers = await search_semantic_scholar(query, limit=limit)
        if papers:
            return papers
    except Exception as exc:  # noqa: BLE001
        errors.append(f"Semantic Scholar: {exc}")

    if errors:
        raise RuntimeError("; ".join(errors))
    return []
