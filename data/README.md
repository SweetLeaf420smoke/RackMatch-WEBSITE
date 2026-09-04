# Equipment catalog

Source of truth: `equipment.json`. Pair HTML is generated. The site owner does not run Python.

## Who runs generate

The Cursor agent runs `python3 data/generate.py` after catalog edits, then commit + push.

Vercel also runs the same command on every deploy (`vercel.json`).

## What lives here

- `servers`: one record per verified PSU inlet
- `pdus`: outlet counts, voltage/current, vendor URL
- `pair_pages`: which SEO URLs exist. Not every compatible combo.

## Add a server or PDU

Confirm inlet/outlets from the vendor page. Add the JSON object (`id` is stable). Find on the homepage uses it as soon as JSON is live.

Do not invent counts. If the source is unclear, skip the model.

## Add a public pair URL (only with demand)

Demand = user asked, Search Console query, or Feedback with that server and PDU.

1. Server and PDU records already exist
2. Append `{ "slug", "server_id", "pdu_id" }` to `pair_pages`
3. Keep the slug equal to the live path
4. Agent runs generate, tests, pushes

Do not add a pair page for every combination.

## Compatibility

- C14 + C13 on PDU → IEC C13–C14
- C20 + C19 on PDU → IEC C19–C20
- C14 + C19 only → C13–C20 + 10 A warning
- C20 + C13 only → not compatible

Keep `js/match.js` and `data/generate.py` on the same rules.
