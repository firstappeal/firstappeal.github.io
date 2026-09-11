"""
Causelist Scraper for Patna High Court
---------------------------------------
1. Opens the causelist page. The server sets a cookie 'CaptchaImageText'
   with the plaintext 3-digit captcha answer.
2. Gets ALL dates from the dropdown.
3. For each date not already in Supabase, downloads the PDF and saves FA cases.
4. Deletes any records older than 30 days.
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
        return set(row.get('date', '') for row in r.json())
    print("Could not read existing dates:", r.status_code, r.text[:200])
    return set()


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
        print(f"  ✓ Saved {len(cases)} FA cases for {date_str}.")
    else:
        print(f"  ✗ Supabase error {r.status_code}: {r.text[:300]}")


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


# ── Fetch one date's PDF ──────────────────────────────────────────────────────
def fetch_date(date_val, date_text):
    """
    Tries up to 10 times to fetch the PDF for a given date.
    Returns True on success, False on failure.
    """
    for attempt in range(1, 11):
        try:
            sess = requests.Session()
            sess.verify = False

            r = sess.get(HC_URL, timeout=15)
            soup = BeautifulSoup(r.text, 'html.parser')

            # Read captcha answer from cookie
            captcha_answer = sess.cookies.get('CaptchaImageText', '')
            if not re.match(r'^\d+$', captcha_answer):
                print(f"    Attempt {attempt}: no captcha cookie, retrying...")
                time.sleep(2)
                continue

            # Build form
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
                cases = extract_fa_cases(resp.content)
                save_to_supabase(date_text, cases)
                return True
            else:
                print(f"    Attempt {attempt}: got HTML (captcha={captcha_answer}, retrying...)")

        except Exception as e:
            print(f"    Attempt {attempt} exception: {e}")

        time.sleep(2)

    print(f"  ✗ Failed to fetch {date_text} after 10 attempts.")
    return False


# ── Main ──────────────────────────────────────────────────────────────────────
def run():
    print("=== Causelist Scraper Started ===")

    # Get all available dates from the website dropdown
    r = requests.get(HC_URL, verify=False, timeout=15)
    soup = BeautifulSoup(r.text, 'html.parser')
    sel = soup.find('select', {'name': 'ctl00$MainContent$ddlDate'})
    if not sel:
        print("ERROR: Date dropdown not found.")
        sys.exit(1)

    all_options = []
    for opt in sel.find_all('option'):
        text = opt.text.strip()
        val  = opt.get('value', '')
        if re.match(r'^\d{1,2}-[A-Za-z]+-\d{4}$', text):
            all_options.append({'value': val, 'text': text})

    print(f"Found {len(all_options)} dates in dropdown: {[o['text'] for o in all_options]}")

    # Get dates already in Supabase
    existing = get_existing_dates()
    print(f"Already have data for: {sorted(existing)}")

    # Process each missing date
    missing = [o for o in all_options if o['text'] not in existing]
    if not missing:
        print("All dates already fetched. Nothing to do.")
    else:
        print(f"\nFetching {len(missing)} missing date(s)...")
        for opt in missing:
            print(f"\n→ Fetching {opt['text']}...")
            fetch_date(opt['value'], opt['text'])

    delete_old_records()
    print("\n=== Done ===")


if __name__ == '__main__':
    run()
