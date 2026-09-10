import requests
from bs4 import BeautifulSoup
import io, time, re, sys
import pytesseract
from PIL import Image, ImageFilter
import fitz
from datetime import datetime, timedelta

# Extract Supabase credentials from db.js
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
    
    for page in doc:
        lines = page.get_text().split('\n')
        date_str = ""
        judges = []
        for line in lines[:20]:
            line = line.strip()
            if not line: continue
            if re.match(r'^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)', line):
                date_str = line
                if overall_date == "Unknown Date":
                    overall_date = date_str
            if line.startswith("Hon'ble"):
                judges.append(line)
            elif line.startswith("& Hon'ble"):
                judges.append(line)
        text = "\n".join(lines)
        fa_cases = re.findall(r'FA/\d+/\d+', text)
        if fa_cases:
            j_str = " ".join(judges).strip()
            for c in fa_cases:
                results.append({"date": date_str, "judge": j_str, "case_no": c})
                
    return results, overall_date

def upload_to_supabase(cases, overall_date):
    headers = {
        'apikey': SUPA_KEY,
        'Authorization': f'Bearer {SUPA_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }
    
    # Check if a causelist for this date already exists to prevent duplicate runs
    r_check = requests.get(f"{SUPA_URL}/rest/v1/cause_lists?date=eq.{overall_date}", headers=headers)
    if r_check.status_code == 200 and len(r_check.json()) > 0:
        print(f"Causelist for {overall_date} already exists. Skipping upload.")
    else:
        payload = {
            "header": {"date": overall_date},
            "cases": cases,
            "date": overall_date
        }
        
        r = requests.post(f"{SUPA_URL}/rest/v1/cause_lists", json=payload, headers=headers)
        if r.status_code in [200, 201]:
            print(f"Successfully uploaded causelist for {overall_date} ({len(cases)} cases) to Supabase.")
        else:
            print("Failed to upload to Supabase:", r.status_code, r.text)

def delete_old_causelists():
    headers = {
        'apikey': SUPA_KEY,
        'Authorization': f'Bearer {SUPA_KEY}',
        'Content-Type': 'application/json'
    }
    # Calculate date 30 days ago
    thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
    
    print(f"Deleting causelists older than {thirty_days_ago}...")
    r = requests.delete(f"{SUPA_URL}/rest/v1/cause_lists?created_at=lt.{thirty_days_ago}", headers=headers)
    if r.status_code in [200, 204]:
        print("Successfully deleted old causelists.")
    else:
        print("Failed to delete old causelists:", r.status_code, r.text)

def fetch_and_process():
    url = "https://patnahighcourt.gov.in/causelists/entire/clist"
    for attempt in range(50):
        try:
            sess = requests.Session()
            sess.verify = False
            r = sess.get(url, timeout=15)
            soup = BeautifulSoup(r.text, 'html.parser')
            data = {}
            for inp in soup.find_all('input'):
                name = inp.get('name')
                if name:
                    data[name] = inp.get('value', '')
            
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
            
            if not text:
                continue
                
            if len(text) > 3: text = text[:3]
            if len(text) < 3: text = text.ljust(3, '0')
            
            data['ctl00$MainContent$txtCaptcha'] = text
            data['ctl00$MainContent$btnSearch'] = 'Show'
            
            r_post = sess.post(url, data=data, timeout=30)
            if 'pdf' in r_post.headers.get('Content-Type', '').lower():
                print(f"Success on attempt {attempt+1}! Parsing PDF...")
                cases, overall_date = extract_cases_from_pdf(r_post.content)
                print(f"Extracted {len(cases)} FA cases for date: {overall_date}.")
                upload_to_supabase(cases, overall_date)
                delete_old_causelists()
                return
            
        except Exception as e:
            print(f"Attempt {attempt+1} failed:", e)
        time.sleep(2)
        
    print("Failed to bypass captcha after 50 attempts.")
    sys.exit(1)

if __name__ == '__main__':
    fetch_and_process()
