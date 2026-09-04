#!/usr/bin/env python3
"""Read RackMatch feedback rows via Google Sheets API. No Chrome, no IMAP."""
from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

SHEET_ID = "1At7v0iErDZshwZ5_51VXpXsiyRNkXf2FFhv12ixBtD0"
RANGE = "Form Responses 1!A:F"
CREDS = Path("/Users/sick/Documents/Cursor/OZON RNP/.ozon_credentials.json")


def access_token(cred: dict) -> str:
    data = urllib.parse.urlencode(
        {
            "client_id": cred["client_id"],
            "client_secret": cred["client_secret"],
            "refresh_token": cred["refresh_token"],
            "grant_type": "refresh_token",
        }
    ).encode()
    req = urllib.request.Request("https://oauth2.googleapis.com/token", data=data)
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)["access_token"]


def rows() -> list[list[str]]:
    cred = json.loads(CREDS.read_text(encoding="utf-8"))
    token = access_token(cred)
    q = urllib.parse.quote(RANGE, safe="")
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}/values/{q}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req) as resp:
        payload = json.load(resp)
    return payload.get("values") or []


def main() -> None:
    if not CREDS.is_file():
        raise SystemExit(f"missing credentials: {CREDS}")
    data = rows()
    if not data:
        print("no rows")
        return
    header = data[0]
    body = data[1:]
    print("header:", " | ".join(header))
    print("count:", len(body))
    for line in body[-5:]:
        padded = line + [""] * (len(header) - len(line))
        print("---")
        for name, value in zip(header, padded):
            print(f"{name}: {value}")


if __name__ == "__main__":
    try:
        main()
    except urllib.error.HTTPError as exc:
        raise SystemExit(f"HTTP {exc.code}: {exc.read()[:200]!r}") from exc
