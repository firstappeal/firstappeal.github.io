"""
Causelist Scraper for Patna High Court
---------------------------------------
1. Opens the causelist page and reads the dropdown.
2. Picks the LATEST (first) date from the dropdown.
3. If that date is already in Supabase, exits — nothing to do.
4. Tries up to 30 times to solve the captcha and download the PDF.
5. Parses FA cases + judge names from the PDF.
6. Saves to Supabase with the date string exactly as shown in the dropdown (e.g. "11-Sep-2026").
7. Deletes any records older than 30 days.
"""

import requests
from bs4 import BeautifulSoup
import io, time, re, sys
import pytesseract
from PIL import Image, ImageFilter, ImageEnhance
import fitz                   # PyMuPDF
from datetime import datetime, timedelta
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ── Read Supabase credentials from shared/db.js ──────────────────────────────
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
    """
    Parses an entire-causelist PDF and extracts every FA case with its judge.
    Returns a list of dicts: [{case_no, judge}, ...]
    """
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

            # Also catch benches announced by "Hon'ble" without a preceding Court No.
            elif line.startswith("Hon'ble") and "Court No." not in "".join(lines[max(0,j-5):j]):
                bench_parts = [line]
                for k in range(j + 1, min(j + 6, len(lines))):
                    if lines[k].startswith("& Hon'ble"):
                        bench_parts.append(lines[k])
                    else:
                        break
                current_judge = " ".join(bench_parts).strip()

            # Find every FA/NNN/YYYY on this line
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


# ── Captcha solver ────────────────────────────────────────────────────────────
def solve_captcha(sess, soup):
    """
    Tries multiple image processing strategies to read the 3-digit captcha.
    Returns the digit string, or None if all strategies fail.
    """
    captcha_tag = soup.find('img', alt='Captcha')
    if not captcha_tag:
        return None

    img_url = "https://patnahighcourt.gov.in" + captcha_tag['src']
    r = sess.get(img_url, timeout=10)
    raw = Image.open(io.BytesIO(r.content))

    strategies = []

    # Strategy 1: greyscale + threshold
    g = raw.convert('L')
    strategies.append(g.point(lambda x: 0 if x < 128 else 255, '1'))

    # Strategy 2: higher threshold
    strategies.append(g.point(lambda x: 0 if x < 160 else 255, '1'))

    # Strategy 3: contrast boost then threshold
    enhanced = ImageEnhance.Contrast(g).enhance(3.0)
    strategies.append(enhanced.point(lambda x: 0 if x < 128 else 255, '1'))

    # Strategy 4: erode (MinFilter) then threshold
    eroded = g.filter(ImageFilter.MinFilter(3))
    strategies.append(eroded.point(lambda x: 0 if x < 128 else 255, '1'))

    cfg = '--psm 8 -c tessedit_char_whitelist=0123456789'
    for img in strategies:
        text = re.sub(r'\D', '', pytesseract.image_to_string(img, config=cfg))
        if len(text) == 3:
            return text
        if len(text) > 3:
            return text[:3]

    # Last resort: take whatever digits we got from strategy 1
    text = re.sub(r'\D', '', pytesseract.image_to_string(strategies[0], config=cfg))
    if text:
        return text[:3].ljust(3, '0')
    return None


# ── Main fetch loop ───────────────────────────────────────────────────────────
def get_latest_date_option():
    """Returns {'value': ..., 'text': 'DD-Mon-YYYY'} for the most recent date."""
    r = requests.get(HC_URL, verify=False, timeout=15)
    soup = BeautifulSoup(r.text, 'html.parser')
    sel  = soup.find('select', {'name': 'ctl00$MainContent$ddlDate'})
    if not sel:
        print("ERROR: Date dropdown not found on page.")
        return None, None, None

    # The first <option> in the dropdown is usually the most recent date
    for opt in sel.find_all('option'):
        text = opt.text.strip()
        val  = opt.get('value', '')
        # Only accept DD-Mon-YYYY format (the real dates, skip blank/placeholder)
        if re.match(r'^\d{1,2}-[A-Za-z]+-\d{4}$', text):
            return val, text, soup

    print("ERROR: No valid date option found in dropdown.")
    return None, None, None


def fetch_and_save_latest():
    print("=== Causelist Scraper Started ===")

    # Step 1: get the latest date from dropdown
    val, date_text, _ = get_latest_date_option()
    if not val:
        sys.exit(1)
    print(f"Latest causelist date on website: {date_text}")

    # Step 2: check if we already have it
    existing = get_existing_dates()
    if date_text in existing:
        print(f"Already have records for {date_text}. Nothing to do.")
        delete_old_records()
        sys.exit(0)

    # Step 3: try up to 30 times to solve captcha + download PDF
    print(f"Fetching PDF for {date_text}...")
    for attempt in range(1, 31):
        try:
            sess = requests.Session()
            sess.verify = False

            # Fresh page load each attempt (captcha changes every load)
            r = sess.get(HC_URL, timeout=15)
            soup = BeautifulSoup(r.text, 'html.parser')

            # Build form data from page inputs
            form_data = {'ctl00$MainContent$ddlType': 'Entire Cause List'}
            for inp in soup.find_all('input'):
                name = inp.get('name')
                if name:
                    form_data[name] = inp.get('value', '')
            form_data['ctl00$MainContent$ddlDate'] = val

            # Solve captcha
            captcha_text = solve_captcha(sess, soup)
            if not captcha_text:
                print(f"  Attempt {attempt}: captcha read failed, retrying...")
                time.sleep(1)
                continue

            print(f"  Attempt {attempt}: captcha={captcha_text}")
            form_data['ctl00$MainContent$txtCaptcha'] = captcha_text
            form_data['ctl00$MainContent$btnSearch']  = 'Show'

            resp = sess.post(HC_URL, data=form_data, timeout=30)
            ctype = resp.headers.get('Content-Type', '').lower()

            if 'pdf' in ctype:
                print(f"  PDF received ({len(resp.content)} bytes). Parsing...")
                cases = extract_fa_cases(resp.content)
                print(f"  Found {len(cases)} FA cases.")
                save_to_supabase(date_text, cases)
                delete_old_records()
                print("=== Done ===")
                sys.exit(0)
            else:
                print(f"  Attempt {attempt}: got HTML (wrong captcha or error), retrying...")

        except Exception as e:
            print(f"  Attempt {attempt} exception: {e}")

        time.sleep(1)

    print(f"FAILED: Could not download PDF for {date_text} after 30 attempts.")
    sys.exit(1)


if __name__ == '__main__':
    fetch_and_save_latest()
