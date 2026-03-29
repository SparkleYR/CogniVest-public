"""
news_agent.py — Indian financial news RSS scraper with in-memory cache.

Fetches headlines from ET Markets, Moneycontrol, Business Standard, and Livemint.
Caches results for 15 minutes. Each source is independently fault-tolerant.
"""

import re
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import requests

# ── In-memory cache ───────────────────────────────────────────────────────────
_CACHE: dict = {"data": [], "fetched_at": 0.0}
_TTL = 900  # 15 minutes

# ── RSS source registry ───────────────────────────────────────────────────────
_SOURCES = [
    {
        "name": "ET Markets",
        "url": "https://economictimes.indiatimes.com/markets/rss.cms",
        "color_key": "amber",
    },
    {
        "name": "Moneycontrol",
        "url": "https://www.moneycontrol.com/rss/marketsindia.xml",
        "color_key": "green",
    },
    {
        "name": "Business Standard",
        "url": "https://www.business-standard.com/rss/markets-106.rss",
        "color_key": "teal",
    },
    {
        "name": "Livemint",
        "url": "https://www.livemint.com/rss/markets",
        "color_key": "accent",
    },
]

_REQUEST_TIMEOUT = 8  # seconds per source
_MAX_ITEMS = 25


# ── Helpers ───────────────────────────────────────────────────────────────────

def _strip_html(text: str) -> str:
    """Remove HTML tags and decode common HTML entities."""
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", "", text)
    text = (
        text.replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", '"')
            .replace("&#39;", "'")
            .replace("&nbsp;", " ")
            .replace("&#8216;", "\u2018")
            .replace("&#8217;", "\u2019")
            .replace("&#8220;", "\u201c")
            .replace("&#8221;", "\u201d")
    )
    return " ".join(text.split())  # collapse whitespace


def _parse_pub_date(raw: str | None) -> datetime:
    """Parse RFC-2822 pubDate string. Falls back to utcnow() on any error."""
    if not raw:
        return datetime.now(timezone.utc)
    try:
        dt = parsedate_to_datetime(raw.strip())
        # Ensure timezone-aware for consistent ISO formatting
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return datetime.now(timezone.utc)


def _get_element_text(parent: ET.Element, tag: str) -> str:
    """Safely get text from a child element, returning '' if absent."""
    el = parent.find(tag)
    if el is None:
        return ""
    return (el.text or "").strip()


# ── Per-source fetch ──────────────────────────────────────────────────────────

def _fetch_one_source(source: dict) -> list[dict]:
    """
    Fetch and parse a single RSS 2.0 feed.
    Returns a list of item dicts on success, [] on any failure.
    """
    items: list[dict] = []
    try:
        resp = requests.get(
            source["url"],
            timeout=_REQUEST_TIMEOUT,
            headers={"User-Agent": "CogniVest-NewsBot/1.0"},
        )
        resp.raise_for_status()
        root = ET.fromstring(resp.content)
    except Exception:
        return items

    channel = root.find("channel")
    if channel is None:
        return items

    for item_el in channel.findall("item"):
        title = _strip_html(_get_element_text(item_el, "title"))
        if not title:
            continue

        link = _get_element_text(item_el, "link")
        pub_dt = _parse_pub_date(_get_element_text(item_el, "pubDate") or None)
        raw_desc = _get_element_text(item_el, "description")
        summary = _strip_html(raw_desc)
        if len(summary) > 200:
            summary = summary[:197] + "…"

        items.append(
            {
                "title": title,
                "source": source["name"],
                "color_key": source["color_key"],
                "url": link,
                "published_at": pub_dt.isoformat(),
                "summary": summary,
            }
        )

    return items


# ── Public entry point ────────────────────────────────────────────────────────

def fetch_market_news() -> list[dict]:
    """
    Return up to 25 recent Indian financial news headlines from all configured
    RSS sources, sorted newest-first.

    Results are cached for 15 minutes (per Uvicorn worker process). On total
    fetch failure the stale cache is returned (may be [] on first call).
    """
    now = time.monotonic()
    if now - _CACHE["fetched_at"] < _TTL and _CACHE["data"]:
        return _CACHE["data"]

    all_items: list[dict] = []
    for source in _SOURCES:
        all_items.extend(_fetch_one_source(source))

    if not all_items:
        # All sources failed — return whatever stale data we have
        return _CACHE["data"]

    # Sort newest-first. ISO 8601 strings are lexicographically sortable.
    all_items.sort(key=lambda x: x["published_at"], reverse=True)
    result = all_items[:_MAX_ITEMS]

    _CACHE["data"] = result
    _CACHE["fetched_at"] = now
    return result
