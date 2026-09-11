"""
Causelist Scraper for Patna High Court
---------------------------------------
1. Opens the causelist page — the server sets a cookie 'CaptchaImageText'
   with the plaintext answer (a 3-digit number).
2. Picks the LATEST (first) date from the dropdown.
3. If that date is already in Supabase, exits — nothing to do.
4. Submits the form with the captcha answer from the cookie.
5. Parses FA cases + judge names from the returned PDF.
6. Saves to Supabase with the date string (e.g. "11-Sep-2026").
7. Deletes any records older than 30 days.
"""

import requests
from bs4 import BeautifulSoup
import io, re, sys, time
import fitz  # PyMuPDF
from datetime import datetime, timedelta
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ── Supabase credentials from shared/db.js ────────────────────────────────────
try:
    with open('shared/db.js', 'r') as f:
        _js = f.read()
    SUPA_URL = re.search(r"SUPA_URL\s*=\s*'([^']+)'", _js).group(1)
    SUPA_KEY = re.search(r"SUPA_KEY\s*=\s*'([^']+)'", _js).group(1)
    print("Supabase credentials loaded.")
except Exception as e:
    print("ERROR: Failed to read Supabase credentials:", e)
    sys.exit(1)

HEADERS_SB = {
    'apikey':        SUPA_KEY,
    'Authorization': f'Bearer {SUPA_KEY}',
    'Content-Type':  'application/json',
    'Prefer':        'return=representation',
}
HC_URL = "https://patnahighcourt.gov.in/causelists/entire/clist"


# ── PDF Parsing ───────────────────────────────────────────────────────────────
def extract_fa_cases(pdf_bytes):
    """Extracts every FA/NNN/YYYY case with its judge name."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    results = []
    current_judge = "Unknown Bench"

    for page in doc:
        lines = [l.strip() for l in page.get_text().split('\n')]

        for j, line in enumerate(lines):
            # Detect a new court / bench block
            if "Court No." in line:
                bench_parts = []
                for k in range(j + 1, min(j + 12, len(lines))):
                    if any(kw in lines[k] for kw in ("SNo", "Case No", "LT Party", "Serial")):
                        break
                    if lines[k]:
                        bench_parts.append(lines[k])
                if bench_parts:
                    current_judge = " ".join(bench_parts).strip()

            elif line.startswith("Hon'ble"):
                # Catch bench announced without Court No.
                bench_parts = [line]
                for k in range(j + 1, min(j + 6, len(lines))):
                    if lines[k].startswith("& Hon'ble"):
                        bench_parts.append(lines[k])
                    else:
                        break
                current_judge = " ".join(bench_parts).strip()

            for case_no in re.findall(r'FA/\d+/\d+', line):
                results.append({"case_no": case_no, "judge": current_judge})

    return results


# ── Supabase helpers ──────────────────────────────────────────────────────────
def get_existing_dates():
    r = requests.get(
        f"{SUPA_URL}/rest/v1/cause_lists?select=date&limit=200",
        headers=HEADERS_SB, timeout=15
    )
    if r.status_code == 200:
        return [row.get('date', '') for row in r.json()]
    print("Could not read existing dates:", r.status_code, r.text[:200])
    return []


def save_to_supabase(date_str, cases):
    payload = {
        "date":   date_str,
        "header": {"date": date_str},
        "cases":  cases,
    }
    r = requests.post(
        f"{SUPA_URL}/rest/v1/cause_lists",
        json=payload, headers=HEADERS_SB, timeout=20
    )
    if r.status_code in (200, 201):
        print(f"✓ Saved {len(cases)} FA cases for {date_str}.")
    else:
        print(f"✗ Supabase error {r.status_code}: {r.text[:300]}")


def delete_old_records():
    cutoff = (datetime.utcnow() - timedelta(days=30)).isoformat()
    r = requests.delete(
        f"{SUPA_URL}/rest/v1/cause_lists?created_at=lt.{cutoff}",
        headers=HEADERS_SB, timeout=15
    )
    if r.status_code in (200, 204):
        print("✓ Old records (>30 days) deleted.")
    else:
        print("Warning: could not delete old records:", r.status_code)


# ── Main ──────────────────────────────────────────────────────────────────────
def fetch_and_save_latest():
    print("=== Causelist Scraper Started ===")

    for attempt in range(1, 16):
        try:
            sess = requests.Session()
            sess.verify = False

            # Step 1: GET the page — server sets CaptchaImageText cookie
            r = sess.get(HC_URL, timeout=15)
            soup = BeautifulSoup(r.text, 'html.parser')

            # Step 2: Read captcha answer from cookie
            captcha_answer = sess.cookies.get('CaptchaImageText', '')
            if not captcha_answer or not re.match(r'^\d{3}$', captcha_answer):
                print(f"Attempt {attempt}: No CaptchaImageText cookie (got '{captcha_answer}'), retrying...")
                time.sleep(2)
                continue
            print(f"Attempt {attempt}: captcha answer from cookie = {captcha_answer}")

            # Step 3: Get the latest date from dropdown
            sel = soup.find('select', {'name': 'ctl00$MainContent$ddlDate'})
            if not sel:
                print("ERROR: Date dropdown not found on page.")
                sys.exit(1)

            date_val = None
            date_text = None
            for opt in sel.find_all('option'):
                text = opt.text.strip()
                val  = opt.get('value', '')
                if re.match(r'^\d{1,2}-[A-Za-z]+-\d{4}$', text):
                    date_val  = val
                    date_text = text
                    break

            if not date_text:
                print("ERROR: No valid date option in dropdown.")
                sys.exit(1)
            print(f"Latest date on website: {date_text}")

            # Step 4: Check if we already have it
            existing = get_existing_dates()
            if date_text in existing:
                print(f"Already have records for {date_text}. Nothing to do.")
                delete_old_records()
                sys.exit(0)

            # Step 5: Build form and POST
            form_data = {'ctl00$MainContent$ddlType': 'Entire Cause List'}
            for inp in soup.find_all('input'):
                name = inp.get('name')
                if name:
                    form_data[name] = inp.get('value', '')
            form_data['ctl00$MainContent$ddlDate']    = date_val
            form_data['ctl00$MainContent$txtCaptcha'] = captcha_answer
            form_data['ctl00$MainContent$btnSearch']  = 'Show'

            resp = sess.post(HC_URL, data=form_data, timeout=30)
            ctype = resp.headers.get('Content-Type', '').lower()

            if 'pdf' in ctype:
                print(f"✓ PDF received ({len(resp.content)} bytes). Parsing FA cases...")
                cases = extract_fa_cases(resp.content)
                print(f"  Found {len(cases)} FA cases.")
                save_to_supabase(date_text, cases)
                delete_old_records()
                print("=== Done ===")
                sys.exit(0)
            else:
                # Wrong captcha or session mismatch — retry
                print(f"Attempt {attempt}: Server returned HTML (captcha rejected or session issue). Retrying...")
                time.sleep(2)

        except Exception as e:
            print(f"Attempt {attempt} exception: {e}")
            time.sleep(2)

    print("FAILED: Could not download PDF after 15 attempts.")
    sys.exit(1)


if __name__ == '__main__':
    fetch_and_save_latest()
