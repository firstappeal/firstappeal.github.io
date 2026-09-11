"""
Causelist Scraper for Patna High Court
---------------------------------------
1. Opens the causelist page. Server sets 'CaptchaImageText' cookie.
2. Gets dates from dropdown. Filters to keep only dates from within the last 30 days.
3. For each missing date, downloads PDF and saves FA cases.
4. Deletes any records older than 30 days by parsing the actual causelist date.
"""

import requests
from bs4 import BeautifulSoup
import io, re, sys, time
import fitz
from datetime import datetime, timedelta
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

try:
    with open('shared/db.js', 'r') as f:
        _js = f.read()
    SUPA_URL = re.search(r"SUPA_URL\s*=\s*'([^']+)'", _js).group(1)
    SUPA_KEY = re.search(r"SUPA_KEY\s*=\s*'([^']+)'", _js).group(1)
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

def extract_fa_cases(pdf_bytes):
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

def get_existing_dates():
    r = requests.get(f"{SUPA_URL}/rest/v1/cause_lists?select=date&limit=200", headers=HEADERS_SB, timeout=15)
    if r.status_code == 200:
        return set(row.get('date', '') for row in r.json())
    return set()

def save_to_supabase(date_str, cases):
    payload = {"date": date_str, "header": {"date": date_str}, "cases": cases}
    r = requests.post(f"{SUPA_URL}/rest/v1/cause_lists", json=payload, headers=HEADERS_SB, timeout=20)
    if r.status_code in (200, 201):
        print(f"  ✓ Saved {len(cases)} FA cases for {date_str}.")
    else:
        print(f"  ✗ Supabase error {r.status_code}: {r.text[:300]}")

def delete_old_records():
    r = requests.get(f"{SUPA_URL}/rest/v1/cause_lists?select=id,date&limit=1000", headers=HEADERS_SB, timeout=15)
    if r.status_code != 200:
        print("Warning: could not fetch records for deletion:", r.status_code)
        return
    
    cutoff_date = datetime.now() - timedelta(days=31) # Keep last 30 days
    deleted_count = 0
    
    for row in r.json():
        row_id = row.get('id')
        date_str = row.get('date', '')
        try:
            # Parse DD-Mon-YYYY (e.g. 11-Sep-2026)
            row_date = datetime.strptime(date_str, '%d-%b-%Y')
            if row_date < cutoff_date:
                requests.delete(f"{SUPA_URL}/rest/v1/cause_lists?id=eq.{row_id}", headers=HEADERS_SB)
                deleted_count += 1
        except Exception:
            # If date format is weird, skip
            pass
    if deleted_count > 0:
        print(f"✓ Deleted {deleted_count} records older than 30 days.")
    else:
        print("✓ No records older than 30 days found.")

def fetch_date(date_val, date_text):
    for attempt in range(1, 11):
        try:
            sess = requests.Session()
            sess.verify = False
            r = sess.get(HC_URL, timeout=15)
            soup = BeautifulSoup(r.text, 'html.parser')
            captcha_answer = sess.cookies.get('CaptchaImageText', '')
            if not re.match(r'^\d+$', captcha_answer):
                time.sleep(2)
                continue

            form_data = {'ctl00$MainContent$ddlType': 'Entire Cause List'}
            for inp in soup.find_all('input'):
                if inp.get('name'):
                    form_data[inp.get('name')] = inp.get('value', '')
            form_data['ctl00$MainContent$ddlDate'] = date_val
            form_data['ctl00$MainContent$txtCaptcha'] = captcha_answer
            form_data['ctl00$MainContent$btnSearch'] = 'Show'

            resp = sess.post(HC_URL, data=form_data, timeout=30)
            if 'pdf' in resp.headers.get('Content-Type', '').lower():
                cases = extract_fa_cases(resp.content)
                save_to_supabase(date_text, cases)
                return True
        except Exception:
            pass
        time.sleep(2)
    print(f"  ✗ Failed to fetch {date_text}.")
    return False

def run():
    print("=== Causelist Scraper Started ===")
    r = requests.get(HC_URL, verify=False, timeout=15)
    soup = BeautifulSoup(r.text, 'html.parser')
    sel = soup.find('select', {'name': 'ctl00$MainContent$ddlDate'})
    if not sel:
        sys.exit(1)

    cutoff = datetime(2026, 8, 1) # User requested from 01.08.2026 onwards
    # We also apply a 30-day cutoff
    rolling_cutoff = datetime.now() - timedelta(days=31)
    effective_cutoff = max(cutoff, rolling_cutoff)

    all_options = []
    for opt in sel.find_all('option'):
        text = opt.text.strip()
        val = opt.get('value', '')
        if re.match(r'^\d{1,2}-[A-Za-z]+-\d{4}$', text):
            try:
                dt = datetime.strptime(text, '%d-%b-%Y')
                if dt >= effective_cutoff:
                    all_options.append({'value': val, 'text': text})
            except Exception:
                pass

    print(f"Found {len(all_options)} dates within range (>= {effective_cutoff.strftime('%d-%b-%Y')}): {[o['text'] for o in all_options]}")

    existing = get_existing_dates()
    missing = [o for o in all_options if o['text'] not in existing]
    
    if missing:
        print(f"\nFetching {len(missing)} missing date(s)...")
        for opt in missing:
            print(f"→ Fetching {opt['text']}...")
            fetch_date(opt['value'], opt['text'])
    else:
        print("All dates already fetched.")

    delete_old_records()
    print("\n=== Done ===")

if __name__ == '__main__':
    run()
