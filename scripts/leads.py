"""Collect fresh forum/Reddit threads about rack power for manual replies.
Writes leads/leads.md (newest first). Runs in GitHub Actions."""
import re, sys, time, html, json, urllib.request, urllib.error, xml.etree.ElementTree as ET
from datetime import datetime, timezone

UA = "Mozilla/5.0 (rackmatch-leads; +https://rackmatch.net)"
SUBS = ["homelab", "HomeDataCenter", "sysadmin", "homelabsales", "datacenter", "networking", "livesound"]
FEEDS = [("reddit", "https://www.reddit.com/r/" + "+".join(SUBS) + "/new/.rss?limit=100")]
FEEDS.append(("STH", "https://forums.servethehome.com/index.php?forums/-/index.rss"))
KW = re.compile(r"\b(psu|psus|pdu|pdus|ups|power ?(supply|cord|cable|draw|usage|consumption|strip|distribution|budget)|c1[349]|c20|nema|l[56]-\d\d|breaker|circuit|outlet|amps?|watt|redundan\w*|battery|inverter|3090|4090|5090|gpu|rack)\b", re.I)
LIVE_KW = re.compile(r"\b(rack|power|ups|generator|distro|breaker|outlet)\b", re.I)

def get(url):
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read()
        except urllib.error.HTTPError as ex:
            if ex.code == 429 and attempt < 3:
                time.sleep(20 * (attempt + 1)); continue
            raise

ns = {"a": "http://www.w3.org/2005/Atom"}
rows, status = [], []
for name, url in FEEDS:
    try:
        root = ET.fromstring(get(url))
        n = 0
        entries = root.findall("a:entry", ns) or root.findall(".//item")
        for e in entries:
            title = (e.findtext("a:title", default="", namespaces=ns) or e.findtext("title") or "").strip()
            link_el = e.find("a:link", ns)
            link = link_el.get("href") if link_el is not None else (e.findtext("link") or "")
            when = e.findtext("a:published", default="", namespaces=ns) or e.findtext("a:updated", default="", namespaces=ns) or e.findtext("pubDate") or ""
            body = html.unescape(re.sub(r"<[^>]+>", " ", e.findtext("a:content", default="", namespaces=ns) or e.findtext("description") or ""))
            text = title + " " + body[:1500]
            src = name
            cat = e.find("a:category", ns)
            if cat is not None and cat.get("label"): src = cat.get("label")
            rx = LIVE_KW if src.lower() == "r/livesound" else KW
            if rx.search(text):
                hits = sorted({m.group(0).lower() for m in rx.finditer(text)})[:6]
                excerpt = re.sub(r"\s+", " ", body).replace("submitted by", "|by").strip()[:400]
                rows.append((when[:16], src, title, link, ", ".join(hits), excerpt))
                n += 1
        status.append(f"{name}: ok, {len(entries)} items, {n} matches")
    except Exception as ex:
        status.append(f"{name}: ERROR {ex}")
    time.sleep(2)

rows.sort(reverse=True)

def reddit_comments(link):
    """Return list of 'author: text' for a Reddit post via its .rss (post + comments)."""
    root = ET.fromstring(get(link.rstrip("/") + "/.rss?limit=25"))
    out = []
    for e in root.findall("a:entry", ns)[1:]:
        a = e.findtext("a:author/a:name", default="", namespaces=ns).replace("/u/", "")
        t = html.unescape(re.sub(r"<[^>]+>", " ", e.findtext("a:content", default="", namespaces=ns)))
        t = re.sub(r"\s+", " ", t).strip()
        out.append(f"{a}: {t[:220]}")
    return out

def sth_comments(link):
    page = get(link).decode("utf-8", "replace")
    authors = re.findall(r'<article class="message[^"]*"[^>]*data-author="([^"]+)"', page)
    bodies = re.findall(r'<div class="bbWrapper">(.*?)</div>\s*<div class="js-selectToQuoteEnd', page, re.S)
    out = []
    for a, b in list(zip(authors, bodies))[1:]:
        t = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", b))).strip()
        out.append(f"{a}: {t[:220]}")
    return out

SKIP = re.compile(r"r/homelabsales", re.I)
detailed = []
for w, src, t, l, k, x in rows:
    if SKIP.search(src) or len(detailed) >= 15:
        detailed.append(None); continue
    try:
        time.sleep(4)
        detailed.append(sth_comments(l) if src == "STH" else reddit_comments(l))
    except Exception as ex:
        detailed.append([f"(comments not loaded: {ex})"])
now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
out = [f"# RackMatch leads — updated {now}", "", "## Sources", *[f"- {s}" for s in status], "", "## Threads (newest first)", ""]
for (w, src, t, l, k, x), cm in zip(rows, detailed):
    out.append(f"- {w} | {src} | [{t}]({l}) | {k}\n  > {x}")
    if cm is not None:
        out.append(f"  - comments: {len(cm)}")
        out += [f"    - {c}" for c in cm[:8]]
import pathlib
p = pathlib.Path("leads"); p.mkdir(exist_ok=True)
(p / "leads.md").write_text("\n".join(out) + "\n", encoding="utf-8")
print("\n".join(status))
