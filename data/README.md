# Equipment catalog

Source of truth: `equipment.json`. Not the HTML pair pages. Not the homepage selects.

## What lives here

- `servers`: one record per PSU inlet we verified (same chassis can need a second record if the inlet changes).
- `pdus`: outlet counts, voltage/current, vendor URL.
- `pair_pages`: which SEO URLs exist. The generator does **not** build every server×PDU combo.

Guide articles (C13 vs C14, NVIDIA, model power-cord hubs) stay hand-written for now.

## Add a server

1. Open the vendor PDF or spec page. Confirm inlet (`C14` / `C20`), voltage, current.
2. Add an object under `servers` with: `id`, `manufacturer`, `model`, `display_name`, `short`, `psu_inlet`, `voltage`, `current`, `source`, `source_title`.
3. `id` is stable (used by the matcher). Do not reuse an id for a different inlet.
4. Optional: `nameplate_note` (true) if wattage SKUs on the same chassis change the inlet. `pair_note` for one extra sentence on pair pages.
5. From the repo root run: `python3 data/generate.py`
6. Check the homepage Find result and any pair page that uses this id.

Do not invent inlet or outlet counts. If the source is unclear, skip the model.

## Add a PDU

1. Confirm outlet counts from the vendor page (`C13`, `C19`, and others such as `5-20R`).
2. Add an object under `pdus` with: `id`, `manufacturer`, `model`, `outlets`, `voltage`, `current`, `locking`, `source`, `source_title`.
3. `outlets` is a count map, for example `"C13": 21, "C19": 3`. Omit a key if that outlet is not present.
4. Run `python3 data/generate.py`.

## Add a public pair URL

1. Server and PDU records must already exist.
2. Append `{ "slug": "existing-url-folder", "server_id": "...", "pdu_id": "..." }` to `pair_pages`.
3. Keep the slug equal to the live path. Do not rename old URLs.
4. Run `python3 data/generate.py`. That overwrites `slug/index.html`, the homepage pair list, and the pair block in `sitemap.xml`.

Do not add a pair page for every combination. Add a URL only when you want it indexed.

## Compatibility (same rules as Find)

- C14 inlet + PDU has C13 → IEC C13–C14
- C20 inlet + PDU has C19 → IEC C19–C20
- C14 inlet + C19 only (no C13) → C13–C20 + 10 A warning
- C20 inlet + C13 only (no C19) → not compatible

Logic: `js/match.js` (browser) and `data/generate.py` (pages). Keep them the same if you change a rule.

## After an edit

One record change updates every generated pair page that uses that id, plus the Find dropdowns (they load `/data/equipment.json` at runtime).
