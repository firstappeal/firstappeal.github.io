import requests
from bs4 import BeautifulSoup
import io, time, re, sys
import pytesseract
from PIL import Image, ImageFilter
import fitz
from datetime import datetime, timedelta

try:
    with open('shared/db.js', 'r') as f:
        content = f.read()
    SUPA_URL = re.search(r"SUPA_URL\s*=\s*'([^']+)'", content).group(1)
    SUPA_KEY = re.search(r"SUPA_KEY\s*=\s*'([^']+)'", content).group(1)
except Exception as e:
    print("Failed to read Supabase credentials:", e)
    sys.exit(1)

def extract_cases_from_pdf(pdf_bytes):
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    results = []
    overall_date = "Unknown Date"
    current_bench = ""
    
    for i, page in enumerate(doc):
        lines = page.get_text().split('\n')
        
        # Only check for overall date on the first page
        if i == 0:
            for line in lines[:20]:
                if re.match(r'^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)', line.strip()):
                    overall_date = line.strip()
                    break

        for j, line in enumerate(lines):
            line_clean = line.strip()
            
            # Update current bench if Court No. block is found
            if "Court No." in line_clean:
                bench_parts = []
                for k in range(j + 1, min(j + 10, len(lines))):
                    if "SNo" in lines[k] or "Case No" in lines[k] or "LT Party Detail" in lines[k]:
                        break
                    part = lines[k].strip()
                    if part:
                        bench_parts.append(part)
                if bench_parts:
                    current_bench = " ".join(bench_parts).strip()
            
            # Fallback for Hon'ble if no Court No. has been seen yet
            elif line_clean.startswith("Hon'ble") and not current_bench:
                bench_parts = [line_clean]
                for k in range(j + 1, min(j + 5, len(lines))):
                    if lines[k].strip().startswith("& Hon'ble"):
                        bench_parts.append(lines[k].strip())
                    else:
                        break
                current_bench = " ".join(bench_parts).strip()
            
            fa_cases = re.findall(r'FA/\d+/\d+', line_clean)
            if fa_cases:
                for c in fa_cases:
                    # Provide a default if somehow it's still empty
                    b_str = current_bench if current_bench else "Unknown Bench"
                    results.append({"date": overall_date, "judge": b_str, "case_no": c})
                    
    return results, overall_date

def get_existing_dates():
    headers = {'apikey': SUPA_KEY, 'Authorization': f'Bearer {SUPA_KEY}'}
    r = requests.get(f"{SUPA_URL}/rest/v1/cause_lists?select=date", headers=headers)
    if r.status_code == 200:
        return [row.get('date') for row in r.json() if row.get('date')]
    return []

def upload_to_supabase(cases, overall_date):
    headers = {
        'apikey': SUPA_KEY, 'Authorization': f'Bearer {SUPA_KEY}',
        'Content-Type': 'application/json', 'Prefer': 'return=representation'
    }
    payload = {"header": {"date": overall_date}, "cases": cases, "date": overall_date}
    r = requests.post(f"{SUPA_URL}/rest/v1/cause_lists", json=payload, headers=headers)
    if r.status_code in [200, 201]:
        print(f"Successfully uploaded causelist for {overall_date} ({len(cases)} cases).")
    else:
        print("Failed to upload to Supabase:", r.status_code, r.text)

def delete_old_causelists():
    headers = {'apikey': SUPA_KEY, 'Authorization': f'Bearer {SUPA_KEY}', 'Content-Type': 'application/json'}
    thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
    r = requests.delete(f"{SUPA_URL}/rest/v1/cause_lists?created_at=lt.{thirty_days_ago}", headers=headers)
    if r.status_code in [200, 204]: print("Successfully deleted old causelists.")

def parse_date_str(d_str):
    try: return datetime.strptime(d_str, '%d-%b-%Y')
    except: return None

def get_dropdown_options(soup):
    sel = soup.find('select', {'name': 'ctl00$MainContent$ddlDate'})
    options = []
    if not sel: return options
    for opt in sel.find_all('option'):
        val = opt.get('value')
        text = opt.text.strip()
        dt = parse_date_str(text)
        if dt and dt >= datetime(2026, 9, 1): # On or after 01-Sep-2026
            options.append({'value': val, 'text': text})
    return options

def fetch_specific_date(val, date_text, base_data):
    url = "https://patnahighcourt.gov.in/causelists/entire/clist"
    for attempt in range(20):
        try:
            sess = requests.Session()
            sess.verify = False
            r = sess.get(url, timeout=15)
            soup = BeautifulSoup(r.text, 'html.parser')
            data = base_data.copy()
            for inp in soup.find_all('input'):
                name = inp.get('name')
                if name: data[name] = inp.get('value', '')
            data['ctl00$MainContent$ddlDate'] = val
            
            captcha_img = soup.find('img', alt='Captcha')
            if not captcha_img: continue
            
            img_url = "https://patnahighcourt.gov.in" + captcha_img['src']
            r_img = sess.get(img_url, timeout=10)
            img = Image.open(io.BytesIO(r_img.content)).convert('L')
            
            img = img.point(lambda x: 0 if x < 140 else 255, '1')
            text = pytesseract.image_to_string(img, config='--psm 8 -c tessedit_char_whitelist=0123456789').strip()
            text = re.sub(r'\D', '', text)
            if len(text) != 3:
                img = img.filter(ImageFilter.MinFilter(3))
                text = pytesseract.image_to_string(img, config='--psm 8 -c tessedit_char_whitelist=0123456789').strip()
                text = re.sub(r'\D', '', text)
            if not text: continue
            if len(text) > 3: text = text[:3]
            if len(text) < 3: text = text.ljust(3, '0')
            
            data['ctl00$MainContent$txtCaptcha'] = text
            data['ctl00$MainContent$btnSearch'] = 'Show'
            
            r_post = sess.post(url, data=data, timeout=30)
            if 'pdf' in r_post.headers.get('Content-Type', '').lower():
                print(f"Success fetching PDF for {date_text}")
                cases, overall_date = extract_cases_from_pdf(r_post.content)
                upload_to_supabase(cases, overall_date)
                return True
        except Exception as e:
            pass
        time.sleep(1)
    print(f"Failed to fetch {date_text} after 20 attempts.")
    return False

def fetch_and_process():
    url = "https://patnahighcourt.gov.in/causelists/entire/clist"
    r = requests.get(url, verify=False)
    soup = BeautifulSoup(r.text, 'html.parser')
    options = get_dropdown_options(soup)
    
    existing = get_existing_dates()
    
    base_data = {'ctl00$MainContent$ddlType': 'Entire Cause List'}
    for opt in options:
        day_str = str(int(opt['text'].split('-')[0])) # '10' or '1'
        mon_str = opt['text'].split('-')[1] # 'Sep'
        
        found = False
        for ex in existing:
            if ex and day_str in ex and mon_str in ex:
                found = True
                break
        
        if found:
            print(f"Already have records for {opt['text']} (skipped)")
        else:
            print(f"Missing records for {opt['text']}, fetching...")
            fetch_specific_date(opt['value'], opt['text'], base_data)

    delete_old_causelists()

if __name__ == '__main__':
    fetch_and_process()
