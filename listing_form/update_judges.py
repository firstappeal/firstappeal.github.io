#!/usr/bin/env python3
"""
Patna High Court - Sitting Judges Scraper & Updater
Fetches https://patnahighcourt.gov.in/judgel and updates judges_db.js.
Can be executed directly from terminal anytime:
    python3 update_judges.py
"""

import sys
import os
import json
import re
from datetime import datetime
import urllib.request
import ssl
from bs4 import BeautifulSoup

TARGET_URL = "https://patnahighcourt.gov.in/judgel"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(SCRIPT_DIR, "judges_db.js")

def fetch_judges():
    print(f"Fetching sitting judges from {TARGET_URL}...")
    # Setup SSL context that handles potential cert issues on government servers
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    req = urllib.request.Request(
        TARGET_URL,
        headers={
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
    )

    try:
        with urllib.request.urlopen(req, context=ctx, timeout=20) as response:
            html = response.read().decode("utf-8", errors="replace")
    except Exception as e:
        print(f"Error fetching URL: {e}", file=sys.stderr)
        return None

    soup = BeautifulSoup(html, "html.parser")
    table = soup.find("table", id="ctl00_MainContent_gvList")
    if not table:
        # Fallback: search for any table containing "Date of Appointment"
        for t in soup.find_all("table"):
            if "Appointment" in t.get_text():
                table = t
                break

    if not table:
        print("Could not locate judges table in HTML page.", file=sys.stderr)
        return None

    tbody = table.find("tbody") or table
    rows = tbody.find_all("tr")
    judges = []

    for r in rows:
        cols = r.find_all("td")
        if len(cols) >= 2:
            raw_name = cols[1].get_text()
            cleaned = " ".join(raw_name.split())
            # Ensure it's not a header row
            if cleaned and not cleaned.lower().startswith("name") and "hon" in cleaned.lower():
                judges.append(cleaned)

    return judges

def main():
    judges = fetch_judges()
    if not judges:
        print("Failed to extract judges list from website.", file=sys.stderr)
        sys.exit(1)

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    js_content = f"""/**
 * Patna High Court - Sitting Judges Master Database
 * Source: {TARGET_URL}
 * Synced: {now_str}
 * Total Judges: {len(judges)}
 */

window.PATNA_HIGH_COURT_JUDGES = {json.dumps(judges, indent=2, ensure_ascii=False)};
"""

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(js_content)

    print(f"Success! Updated {OUTPUT_FILE} with {len(judges)} judges as of {now_str}.")
    for idx, j in enumerate(judges, 1):
        print(f"  {idx:2d}. {j}")

if __name__ == "__main__":
    main()
