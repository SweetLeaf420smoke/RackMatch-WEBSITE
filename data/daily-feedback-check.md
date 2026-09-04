# Daily feedback check

Once per calendar day on the scheduled tick. Do not run this at the start of every chat.

## How to read

From the repo root: `python3 data/check_feedback.py`

That uses the Google Sheets API (not Gmail IMAP). Feedback already lands in the spreadsheet, including Page URL, Server model, PDU model.

## What to tell the owner

If there is a new real response since the last run, write: page URL, server, PDU, message, contact if present.

Skip rows whose message starts with `TEST IGNORE`.

If nothing new, reply: no new feedback.

## What to tell the owner

If there is a new real response since the last run, write: page URL, server, PDU, message, contact if present.

Skip rows whose message starts with `TEST IGNORE`.

If nothing new, reply: no new feedback.

## What not to do

Do not add every compatible server and PDU pair. Do not invent inlet or outlet data. Do not open a pull request unless the owner asked in that run.

A new catalog page is only for later, when there is demand and a vendor source.
