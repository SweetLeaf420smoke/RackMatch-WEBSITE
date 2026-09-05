#!/usr/bin/env python3
"""Build pair SEO pages and homepage catalog lists from data/equipment.json."""
from __future__ import annotations

import json
import re
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "equipment.json"
SITE = "https://rackmatch.vercel.app"
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
        html = pair_html(server, pdu, page["slug"], r, extra)
        out = ROOT / page["slug"] / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(html, encoding="utf-8")
        print("wrote", out.relative_to(ROOT))
    update_index(data)
    update_sitemap(data)
    inject_metrika()
    inject_ga4()
    print("updated index.html and sitemap.xml")


if __name__ == "__main__":
    main()
