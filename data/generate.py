#!/usr/bin/env python3
"""Build pair SEO pages and homepage catalog lists from data/equipment.json."""
from __future__ import annotations

import json
import re
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "equipment.json"
SITE = "https://rackmatch.net"
GSC = "Op8AESilG-2JBeSHhb3C3REZSKV5EnoilcB01g9pOek"
YM = "112306015"
GA = "G-PPCCYQHCFD"
GSC_META = f'  <meta name="google-site-verification" content="{GSC}">'
METRIKA_HEAD = f"""  <!-- Yandex.Metrika counter -->
  <script type="text/javascript">
   (function(m,e,t,r,i,k,a){{
    m[i]=m[i]||function(){{(m[i].a=m[i].a||[]).push(arguments)}};
    m[i].l=1*new Date();
    for (var j = 0; j < document.scripts.length; j++) {{if (document.scripts[j].src === r) {{ return; }}}}
    k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
   }})(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id={YM}', 'ym');
   ym({YM}, 'init', {{ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true}});
  </script>
  <noscript><div><img src="https://mc.yandex.ru/watch/{YM}" style="position:absolute; left:-9999px;" alt="" /></div></noscript>
  <!-- /Yandex.Metrika counter -->
"""
GA4_HEAD = f"""  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id={GA}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){{dataLayer.push(arguments);}}
    gtag('js', new Date());
    gtag('config', '{GA}');
  </script>
"""


def has_outlet(pdu: dict, kind: str) -> bool:
    outlets = pdu.get("outlets") or {}
    return int(outlets.get(kind, 0) or 0) > 0


def article(word: str) -> str:
    return "an" if word[:1].lower() in "aeiou" else "a"


def match(server: dict, pdu: dict) -> dict:
    inlet = server["psu_inlet"]
    has_c13 = has_outlet(pdu, "C13")
    has_c19 = has_outlet(pdu, "C19")
    v, a = server["voltage"], server["current"]
    pv, pa = pdu["voltage"], pdu["current"]
    lock = pdu.get("locking") or "n/a"
    pdu_a = article(pdu["model"])
    if inlet == "C14" and has_c13:
        return {
            "ok": True,
            "cable": "IEC C13–C14 jumper",
            "cable_short": "IEC C13–C14",
            "kind": "c13c14",
            "connector": (
                f"C13 into the {server['short']} C14 inlet; "
                f"C14 into {pdu_a} {pdu['model']} C13 outlet"
            ),
            "va": f"Server PSU {v} / {a}. PDU {pv}, {pa}",
            "lock": lock,
            "note": "",
        }
    if inlet == "C20" and has_c19:
        lock_row = lock
        if "C13" in lock and "C19" not in lock.split("this pair")[0]:
            lock_row = lock + "; this pair uses C19"
        return {
            "ok": True,
            "cable": "IEC C19–C20 jumper",
            "cable_short": "IEC C19–C20",
            "kind": "c19c20",
            "connector": (
                f"C19 into the {server['short']} C20 inlet; "
                f"C20 into {pdu_a} {pdu['model']} C19 outlet"
            ),
            "va": f"Server PSU {v} / {a}. PDU {pv}, {pa}",
            "lock": lock_row,
            "note": "",
        }
    if inlet == "C14" and has_c19 and not has_c13:
        return {
            "ok": True,
            "cable": "IEC C13–C20 jumper",
            "cable_short": "IEC C13–C20",
            "kind": "c13c20",
            "connector": (
                f"C13 into the {server['short']} C14 inlet; "
                f"C20 into {pdu_a} {pdu['model']} C19 outlet"
            ),
            "va": f"Server PSU {v} / max {a} on this jumper. PDU {pv}, {pa}",
            "lock": lock,
            "note": "C13/C14 is 10 A class. Do not treat this as a 16 A feed.",
        }
    if inlet == "C20" and has_c13 and not has_c19:
        return {
            "ok": False,
            "cable": "No standard match",
            "cable_short": "",
            "kind": "c20_c13only",
            "connector": (
                f"Server C20 inlet needs a C19 outlet on the PDU. "
                f"{pdu['model']} has C13 only"
            ),
            "va": f"Server PSU {v} / {a} vs PDU C13-only, {pv}, {pa}",
            "lock": "n/a",
            "note": "C13 outlet is 10 A class. This PSU inlet is 16 A class. Do not use a cheater adapter.",
        }
    keys = ", ".join((pdu.get("outlets") or {}).keys())
    return {
        "ok": False,
        "cable": "No standard match",
        "cable_short": "",
        "kind": "none",
        "connector": f"Outlet set {keys} vs inlet {inlet}",
        "va": f"{v} / {a}",
        "lock": "n/a",
        "note": "",
    }


def format_outlets(pdu: dict) -> str:
    parts = []
    for kind, n in (pdu.get("outlets") or {}).items():
        parts.append(f"{n} × {kind}")
    if not parts:
        return "no listed outlets"
    if len(parts) == 1:
        return parts[0]
    return ", ".join(parts[:-1]) + " and " + parts[-1]


def by_id(items: list, item_id: str) -> dict:
    for item in items:
        if item["id"] == item_id:
            return item
    raise KeyError(item_id)


def compatible_slug(data: dict, server_id: str, skip_slug: str) -> str | None:
    servers = {s["id"]: s for s in data["servers"]}
    pdus = {p["id"]: p for p in data["pdus"]}
    for page in data["pair_pages"]:
        if page["slug"] == skip_slug or page["server_id"] != server_id:
            continue
        r = match(servers[page["server_id"]], pdus[page["pdu_id"]])
        if r["ok"]:
            return page["slug"]
    return None


def why_html(server: dict, pdu: dict, r: dict, extra_links: str) -> str:
    outlets = format_outlets(pdu)
    note = server.get("pair_note") or ""
    if r["kind"] == "c13c14":
        body = (
            f"This catalog lists the {escape(server['short'])} inlet as IEC C14. "
            f"{escape(pdu['manufacturer'])} lists {escape(pdu['model'])} as {escape(outlets)}. "
            f"For this inlet, plug into a C13 outlet with a C13–C14 jumper."
        )
        if has_outlet(pdu, "C19"):
            body += " Do not use a C19–C20 jumper on this PSU. C19 outlets are for a C20 inlet."
        if note:
            body += " " + escape(note)
        return f"<h2>Why this cable</h2>\n    <p>{body}</p>"
    if r["kind"] == "c19c20":
        body = (
            f"A {escape(server['short'])} PSU in this catalog uses a C20 inlet. "
            f"{escape(pdu['manufacturer'])} lists {escape(pdu['model'])} as {escape(outlets)}. "
            f"Use a C19 outlet and a C19–C20 jumper. A C13–C14 cord does not fit this inlet."
        )
        if note:
            body += " " + escape(note)
        return f"<h2>Why this cable</h2>\n    <p>{body}</p>"
    if r["kind"] == "c13c20":
        body = (
            f"The {escape(server['short'])} inlet is C14. "
            f"{escape(pdu['model'])} has C19 and no C13. "
            f"A C13–C20 jumper is the documented fallback. {escape(r['note'])}"
        )
        return f"<h2>Why this cable</h2>\n    <p>{body}</p>"
    if r["kind"] == "c20_c13only":
        body = (
            f"{escape(pdu['manufacturer'])} lists {escape(pdu['model'])} as {escape(outlets)}. "
            f"There is no C19. A {escape(server['short'])} PSU here uses a C20 inlet. "
            f"C13 will not plug into C20, and the C13 path is 10 A class against a 16 A class inlet."
        )
        bits = [f"<h2>Why there is no match</h2>\n    <p>{body}</p>"]
        if extra_links:
            bits.append(f"    <p>{extra_links}</p>")
        if r["note"]:
            bits.append(f'    <p class="warn">{escape(r["note"])}</p>')
        return "\n".join(bits)
    return f"<h2>Why there is no match</h2>\n    <p>{escape(r['connector'])}</p>"


def pair_html(server: dict, pdu: dict, slug: str, r: dict, extra_links: str) -> str:
    title_pair = f"{server['manufacturer']} {server['model']} + {pdu['manufacturer']} {pdu['model']}"
    h1 = f"{title_pair} Power Cable"
    if r["ok"]:
        if server.get("nameplate_note"):
            lead = f"<p><b>Compatible</b> for the 2400 W PSU. Required cable: {escape(r['cable_short'])}.</p>"
        else:
            lead = f"<p><b>Compatible.</b> Required cable: {escape(r['cable_short'])}.</p>"
        desc = (
            f"{title_pair}: {r['cable_short']} jumper. "
            f"PDU outlets: {format_outlets(pdu)}."
        )
    else:
        if server.get("nameplate_note"):
            lead = "<p><b>Not compatible</b> for the 2400 W PSU. No standard jumper.</p>"
        else:
            lead = "<p><b>Not compatible.</b> No standard jumper.</p>"
        desc = (
            f"{title_pair}: not directly compatible. "
            f"PDU outlets: {format_outlets(pdu)}."
        )
    footer = "Check the live nameplate and the vendor PDF before you order cable."
    if server.get("nameplate_note"):
        footer += " High-watt PSUs on the same chassis can change the inlet."
    why = why_html(server, pdu, r, extra_links)
    kit = ""
    if r["ok"]:
        kit_url = f"../bom/?server={server['id']}&pdu={pdu['id']}&qty=10"
        kit = (
            "<h2>Cabling a whole rack?</h2>\n"
            f"    <p>Build the cable list for 10 × {escape(server['model'])} with 2 × {escape(pdu['manufacturer'])} {escape(pdu['model'])} (A/B feeds), "
            "then request a free quote for the complete cable kit.</p>\n"
            f'    <p><a href="{kit_url}">Build the rack cable kit →</a></p>'
        )
    return f"""<!DOCTYPE html>
<!-- generated from data/equipment.json; run python3 data/generate.py -->
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{escape(h1)}</title>
  <meta name="description" content="{escape(desc)}">
  <meta name="robots" content="index, follow">
{GSC_META}
{METRIKA_HEAD}{GA4_HEAD}  <link rel="canonical" href="{SITE}/{slug}/">
  <link rel="stylesheet" href="../pair.css">
</head>
<body>
  <header>
    <a href="../">home</a>
    <a href="../suggest/">Suggest a correction / Add equipment</a>
  </header>
  <main>
    <h1>{escape(h1)}</h1>
    {lead}
    <table>
      <tr><td>Connector</td><td>{escape(r["connector"])}</td></tr>
      <tr><td>Voltage / current</td><td>{escape(r["va"])}</td></tr>
      <tr><td>Locking</td><td>{escape(r["lock"])}</td></tr>
    </table>
    {why}
    {kit}
    <h2>Sources</h2>
    <p>Server: <a href="{escape(server["source"])}" target="_blank" rel="noopener">{escape(server["source_title"])}</a></p>
    <p>PDU: <a href="{escape(pdu["source"])}" target="_blank" rel="noopener">{escape(pdu["source_title"])}</a></p>
    <footer>{escape(footer)}</footer>
  </main>
</body>
</html>
"""


def inject_ga4() -> None:
    marker = "  <!-- /Yandex.Metrika counter -->"
    for path in ROOT.rglob("index.html"):
        text = path.read_text(encoding="utf-8")
        if GA in text:
            continue
        if marker not in text:
            raise SystemExit(f"missing Metrika marker in {path.relative_to(ROOT)}")
        path.write_text(text.replace(marker, marker + "\n" + GA4_HEAD.rstrip(), 1), encoding="utf-8")
        print("ga4", path.relative_to(ROOT))


def inject_metrika() -> None:
    for path in ROOT.rglob("index.html"):
        text = path.read_text(encoding="utf-8")
        if "Yandex.Metrika counter" in text:
            continue
        if GSC_META not in text:
            raise SystemExit(f"missing GSC meta in {path.relative_to(ROOT)}")
        path.write_text(text.replace(GSC_META, GSC_META + "\n" + METRIKA_HEAD.rstrip(), 1), encoding="utf-8")
        print("metrika", path.relative_to(ROOT))


ICON_LINKS = (
    '  <link rel="icon" href="/favicon.ico" sizes="any">\n'
    '  <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48.png">\n'
    '  <link rel="apple-touch-icon" href="/apple-touch-icon.png">'
)


def inject_icons() -> None:
    for path in ROOT.rglob("index.html"):
        if "seo-workspace" in path.parts:
            continue
        text = path.read_text(encoding="utf-8")
        if 'href="/favicon.ico"' in text:
            continue
        text = text.replace('  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\'/%3E">\n', "")
        if "</head>" not in text:
            continue
        path.write_text(text.replace("</head>", ICON_LINKS + "\n</head>", 1), encoding="utf-8")


RELATED_SKIP = {"bom", "rfq", "suggest", "embed", "seo-workspace", "press", "js", "data", "scripts"}
TOOLS = ["pdu-calculator", "homelab-power-cost-calculator", "power-connector-guide"]


def page_group(slug: str) -> str:
    if slug in TOOLS:
        return "tool"
    if re.search(r"-(apc|eaton|raritan)-", slug):
        return "pair"
    if slug.endswith("-power-cord") and slug.split("-")[0] in ("dell", "hpe", "nvidia", "lenovo"):
        return "server"
    if slug.startswith(("nvidia", "dgx")):
        return "server"
    return "guide"


def inject_related() -> None:
    pages = {}
    for d in sorted(ROOT.iterdir()):
        f = d / "index.html"
        if not d.is_dir() or d.name in RELATED_SKIP or not f.exists():
            continue
        m = re.search(r"<h1[^>]*>([^<]+)", f.read_text(encoding="utf-8"))
        if m:
            pages[d.name] = m.group(1).strip()
    groups = {}
    for slug in pages:
        groups.setdefault(page_group(slug), []).append(slug)

    def score(a: str, b: str) -> int:
        wa, wb = set(a.split("-")), set(b.split("-"))
        return len(wa & wb)

    for slug, title in pages.items():
        g = page_group(slug)
        same = sorted((x for x in groups[g] if x != slug), key=lambda x: (-score(slug, x), x))
        others = sorted((x for x in pages if page_group(x) != g and x not in TOOLS),
                        key=lambda x: (-score(slug, x), x))
        pick = same[:4]
        for t in TOOLS:
            if t != slug and t not in pick:
                pick.append(t)
        for x in others:
            if len(pick) >= 9:
                break
            if x not in pick:
                pick.append(x)
        items = "".join(
            f'<li><a href="../{x}/">{escape(pages[x])}</a></li>' for x in pick[:9]
        )
        block = (
            "<!-- RELATED -->\n"
            '    <section class="related">\n'
            "      <h2>You may also need</h2>\n"
            f"      <ul>{items}</ul>\n"
            '      <p><a href="../bom/">Build the full rack cord list</a> &middot; '
            '<a href="../">All guides</a></p>\n'
            "    </section>\n"
            "    <!-- /RELATED -->"
        )
        f = ROOT / slug / "index.html"
        text = f.read_text(encoding="utf-8")
        if "<!-- RELATED -->" in text:
            text = re.sub(r"<!-- RELATED -->.*?<!-- /RELATED -->", lambda _: block, text, flags=re.S)
        else:
            text = text.replace("  </main>", "    " + block + "\n  </main>", 1)
        f.write_text(text, encoding="utf-8")


FAQ = json.loads((ROOT / "data" / "faq.json").read_text(encoding="utf-8"))
PAIR_FAQ: dict = {}
GROUP_NAMES = {"guide": "Guides", "server": "Server power cords", "pair": "Server + PDU pairs", "tool": "Tools"}


def git_date(path: Path, first: bool) -> str:
    import subprocess
    args = ["git", "log", "--format=%ad", "--date=short", "--", str(path.relative_to(ROOT))]
    if first:
        args.insert(2, "--diff-filter=A")
    out = subprocess.run(args, cwd=ROOT, capture_output=True, text=True).stdout.split()
    if not out:
        from datetime import date
        return date.today().isoformat()
    return out[-1] if first else out[0]


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:60]


def faq_for(slug: str, title: str) -> list:
    if slug in PAIR_FAQ:
        return PAIR_FAQ[slug]
    if slug in FAQ:
        return FAQ[slug]
    g = page_group(slug)
    if g == "server":
        key = "_dgx" if ("nvidia" in slug or "dgx" in slug) else "_server"
        name = title.replace(" power cord", "")
        return [[q.replace("{name}", name), a.replace("{name}", name)] for q, a in FAQ[key]]
    return []


def sub_block(text: str, name: str, block: str, anchor: str, before: bool = True) -> str:
    start, end = f"<!-- {name} -->", f"<!-- /{name} -->"
    full = start + block + end
    if start in text:
        return re.sub(re.escape(start) + r".*?" + re.escape(end), lambda _: full, text, flags=re.S)
    if anchor not in text:
        return text
    return text.replace(anchor, (full + "\n" + anchor) if before else (anchor + full), 1)


def enhance_pages() -> None:
    pages = {}
    for d in sorted(ROOT.iterdir()):
        f = d / "index.html"
        if not d.is_dir() or d.name in RELATED_SKIP or not f.exists():
            continue
        m = re.search(r"<h1[^>]*>([^<]+)", f.read_text(encoding="utf-8"))
        if m:
            pages[d.name] = m.group(1).strip()
    groups: dict = {}
    for slug in pages:
        groups.setdefault(page_group(slug), []).append(slug)
    cols = []
    for g in ("guide", "tool", "server", "pair"):
        links = "".join(f'<li><a href="../{x}/">{escape(pages[x])}</a></li>' for x in groups.get(g, []))
        if g == "tool":
            links = '<li><a href="../">Server-PDU matcher</a></li><li><a href="../bom/">Rack cord BOM builder</a></li>' + links + '<li><a href="../rackmatch-power-cheat-sheet.pdf">Power cheat sheet (PDF)</a></li>'
        cols.append(f'<div><h3>{GROUP_NAMES[g]}</h3><ul>{links}</ul></div>')
    sitefoot = '\n  <nav class="sitefoot" aria-label="All pages">' + "".join(cols) + '<p>RackMatch: rack power cord and PDU compatibility reference. <a href="../suggest/">Suggest a correction</a></p></nav>\n  '

    for slug, title in pages.items():
        f = ROOT / slug / "index.html"
        text = f.read_text(encoding="utf-8")
        url = f"{SITE}/{slug}/"
        g = page_group(slug)
        published, modified = git_date(f, True), git_date(f, False)
        human = modified
        # breadcrumbs + byline
        crumbs = f'<nav class="crumbs"><a href="../">RackMatch</a> › <span>{GROUP_NAMES[g]}</span> › <span>{escape(title)}</span></nav>\n    '
        text = sub_block(text, "CRUMBS", crumbs, "<h1", before=True) if "<!-- CRUMBS -->" not in text else sub_block(text, "CRUMBS", crumbs, "<h1")
        byline = f'\n    <p class="byline">By the RackMatch team · Updated <time datetime="{modified}">{human}</time> · Sources linked on the page</p>'
        h1_end = text.find("</h1>")
        if "<!-- BYLINE -->" in text:
            text = sub_block(text, "BYLINE", byline, "")
        elif h1_end != -1:
            text = text[: h1_end + 5] + "<!-- BYLINE -->" + byline + "<!-- /BYLINE -->" + text[h1_end + 5 :]
        # ids on h2 inside main content (before RELATED/FAQ)
        body_end = min([i for i in (text.find("<!-- FAQ -->"), text.find("<!-- RELATED -->"), text.find("</main>")) if i != -1])
        head, tail = text[:body_end], text[body_end:]
        heads = []
        def add_id(m):
            inner = m.group(2)
            hid = m.group(1) or slugify(re.sub("<[^>]+>", "", inner))
            heads.append((hid, re.sub("<[^>]+>", "", inner)))
            return f'<h2 id="{hid}">{inner}</h2>'
        head = re.sub(r'<h2(?: id="([^"]+)")?>(.*?)</h2>', add_id, head)
        text = head + tail
        # FAQ
        faq = faq_for(slug, title)
        if faq:
            items = "".join(f"<details><summary>{escape(q)}</summary><p>{escape(a)}</p></details>" for q, a in faq)
            fblock = f'\n    <section class="faq" id="faq">\n      <h2>Frequently asked questions</h2>\n      {items}\n    </section>\n    '
            text = sub_block(text, "FAQ", fblock, "<!-- RELATED -->")
            heads.append(("faq", "Frequently asked questions"))
        # TOC
        if len(heads) >= 3:
            lis = "".join(f'<li><a href="#{h}">{escape(t)}</a></li>' for h, t in heads)
            toc = f'\n    <nav class="toc"><b>On this page</b><ol>{lis}</ol></nav>\n    '
            first_h2 = text.find("<h2 id=")
            if "<!-- TOC -->" in text:
                text = sub_block(text, "TOC", toc, "")
            elif first_h2 != -1:
                text = text[:first_h2] + "<!-- TOC -->" + toc + "<!-- /TOC -->\n    " + text[first_h2:]
        # diagram on pair and server pages
        if "<!-- FIG -->" not in text and g in ("pair", "server") and "nvidia" not in slug:
            fig = ('<!-- FIG --><figure class="diagram"><img src="/img/server-pdu-jumpers.svg" width="680" height="300" '
                   'style="max-width:100%;height:auto" alt="Diagram of which jumper joins a server PSU inlet to a PDU outlet: '
                   'C13-C14, C19-C20, or C13-C20" loading="lazy"><figcaption>Server inlet → jumper → PDU outlet.</figcaption></figure><!-- /FIG -->')
            k = text.find("</table>")
            if k != -1:
                text = text[: k + 8] + "\n    " + fig + text[k + 8 :]
            else:
                k = text.find("</p>", text.find("<!-- /BYLINE -->") + 20)
                text = text[: k + 4] + "\n    " + fig + text[k + 4 :]
        # site footer
        text = sub_block(text, "SITEFOOT", sitefoot, "</body>")
        # JSON-LD
        dm = re.search(r'<meta name="description" content="([^"]*)"', text)
        graph = [
            {"@type": "TechArticle", "@id": url + "#article", "headline": title, "description": dm.group(1) if dm else title,
             "url": url, "mainEntityOfPage": url, "datePublished": published, "dateModified": modified, "inLanguage": "en",
             "image": SITE + "/icon-192.png",
             "author": {"@type": "Organization", "name": "RackMatch", "url": SITE + "/"},
             "publisher": {"@type": "Organization", "name": "RackMatch", "url": SITE + "/", "logo": {"@type": "ImageObject", "url": SITE + "/icon-192.png"}}},
            {"@type": "BreadcrumbList", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "RackMatch", "item": SITE + "/"},
                {"@type": "ListItem", "position": 2, "name": GROUP_NAMES[g]},
                {"@type": "ListItem", "position": 3, "name": title, "item": url}]},
        ]
        if faq:
            graph.append({"@type": "FAQPage", "mainEntity": [
                {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]})
        ld = '\n  <script type="application/ld+json">' + json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False) + "</script>\n  "
        text = sub_block(text, "LD", ld, "</head>")
        f.write_text(text, encoding="utf-8")


def replace_block(text: str, start: str, end: str, inner: str) -> str:
    pattern = re.compile(re.escape(start) + r".*?" + re.escape(end), re.S)
    if not pattern.search(text):
        raise SystemExit(f"missing markers {start} … {end}")
    return pattern.sub(start + inner + end, text)


def update_index(data: dict) -> None:
    path = ROOT / "index.html"
    text = path.read_text(encoding="utf-8")
    servers = ", ".join(s["display_name"] for s in data["servers"])
    pdus = ", ".join(f"{p['manufacturer']} {p['model']}" for p in data["pdus"])
    lis = []
    s_by = {s["id"]: s for s in data["servers"]}
    p_by = {p["id"]: p for p in data["pdus"]}
    for page in data["pair_pages"]:
        s = s_by[page["server_id"]]
        p = p_by[page["pdu_id"]]
        label = f"{s['manufacturer']} {s['model']} + {p['manufacturer']} {p['model']}"
        lis.append(f'        <li><a href="./{page["slug"]}/">{escape(label)}</a></li>')
    text = replace_block(
        text,
        "<!-- CATALOG_SERVERS -->",
        "<!-- /CATALOG_SERVERS -->",
        f"Servers: {escape(servers)}.",
    )
    text = replace_block(
        text,
        "<!-- CATALOG_PDUS -->",
        "<!-- /CATALOG_PDUS -->",
        f"PDUs: {escape(pdus)}.",
    )
    text = replace_block(
        text,
        "<!-- PAIR_LIST -->\n",
        "\n      <!-- /PAIR_LIST -->",
        "\n".join(lis),
    )
    path.write_text(text, encoding="utf-8")


def update_sitemap(data: dict) -> None:
    path = ROOT / "sitemap.xml"
    text = path.read_text(encoding="utf-8")
    urls = []
    for page in data["pair_pages"]:
        urls.append(
            "  <url>\n"
            f"    <loc>{SITE}/{page['slug']}/</loc>\n"
            "    <changefreq>weekly</changefreq>\n"
            "    <priority>0.8</priority>\n"
            "  </url>"
        )
    text = replace_block(
        text,
        "  <!-- PAIR_URLS -->\n",
        "\n  <!-- /PAIR_URLS -->",
        "\n".join(urls),
    )
    path.write_text(text, encoding="utf-8")


def self_check(data: dict) -> None:
    s = by_id(data["servers"], "dell-r650")
    p = by_id(data["pdus"], "apc-ap8941")
    r = match(s, p)
    assert r["ok"] and r["kind"] == "c13c14", r
    s = by_id(data["servers"], "dell-r760-2400")
    p = by_id(data["pdus"], "raritan-px3-5496v")
    r = match(s, p)
    assert (not r["ok"]) and r["kind"] == "c20_c13only", r
    p = by_id(data["pdus"], "apc-ap8941")
    r = match(s, p)
    assert r["ok"] and r["kind"] == "c19c20", r


def main() -> None:
    data = json.loads(DATA.read_text(encoding="utf-8"))
    self_check(data)
    servers = {s["id"]: s for s in data["servers"]}
    pdus = {p["id"]: p for p in data["pdus"]}
    for page in data["pair_pages"]:
        server = servers[page["server_id"]]
        pdu = pdus[page["pdu_id"]]
        r = match(server, pdu)
        extra = ""
        if not r["ok"]:
            extra_parts = ["Fix: a PDU with C19 outlets and an IEC C19–C20 jumper."]
            alt = compatible_slug(data, server["id"], page["slug"])
            if alt:
                alt_page = next(x for x in data["pair_pages"] if x["slug"] == alt)
                alt_pdu = pdus[alt_page["pdu_id"]]
                extra_parts.append(
                    f'Example on this site: <a href="../{alt}/">'
                    f"{escape(server['short'])} + {escape(alt_pdu['model'])}</a>."
                )
            extra_parts.append(
                'See also <a href="../c13-pdu-c19-server/">C13 PDU, C19 server</a>.'
            )
            extra = " ".join(extra_parts)
        pname = f"{server['manufacturer']} {server['model']}"
        pdname = f"{pdu['manufacturer']} {pdu['model']}"
        if r["ok"]:
            a1 = f"An {r['cable_short']} jumper. {r['connector']}."
        else:
            a1 = f"There is no standard cord for this pair. {r['connector']}. Use a PDU with C19 outlets and a C19–C20 jumper."
        PAIR_FAQ[page["slug"]] = [
            [f"What power cable connects the {pname} to the {pdname}?", a1],
            [f"What outlets does the {pdname} have?", f"The vendor lists {format_outlets(pdu)}, input {pdu['voltage']}, {pdu['current']}."],
            [f"Does the {pname} need locking power cords?", f"Not required for a standard install. Locking option on this PDU: {r['lock']}."],
            ["Should both server PSUs go into the same PDU?", "No. Use two PDUs on separate circuits (A and B feeds), one PSU in each, and size each PDU for the full load."],
        ]
        html = pair_html(server, pdu, page["slug"], r, extra)
        out = ROOT / page["slug"] / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(html, encoding="utf-8")
        print("wrote", out.relative_to(ROOT))
    update_index(data)
    update_sitemap(data)
    inject_metrika()
    inject_ga4()
    inject_icons()
    inject_related()
    enhance_pages()
    print("updated index.html and sitemap.xml")


if __name__ == "__main__":
    main()
