import urllib.request
import json

SUPA_URL = 'https://rbcrkmmlywvnkpqzexuh.supabase.co'
SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiY3JrbW1seXd2bmtwcXpleHVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4NjU4MDksImV4cCI6MjEwMDQ0MTgwOX0.2V5qdZXPSr8UCKWvRT0htUpIG6Hy7nm8Ruv2Eg-jpjY'

with open('./notice_form/cases_db.js', 'r') as f:
    content = f.read()

# basic parsing of json in js
content = content.replace('const CASES_DB = ', '').strip()
if content.endswith(';'):
    content = content[:-1]
    
cases_db = json.loads(content)

records = []
for key, data in cases_db.items():
    parts = key.split('/')
    case_no = parts[1] if len(parts) > 1 else ''
    case_year = parts[2] if len(parts) > 2 else ''
    if len(parts) == 2:
        case_no, case_year = parts[0], parts[1]
        
    records.append({
        'case_no': case_no,
        'case_year': case_year,
        'data_json': {'appellant': data.get('appellant'), 'respondent': data.get('respondent')}
    })

batch_size = 1000
for i in range(0, len(records), batch_size):
    batch = records[i:i+batch_size]
    print(f"Inserting batch {i//batch_size + 1} ({len(batch)} items)...")
    
    req = urllib.request.Request(f"{SUPA_URL}/rest/v1/case_records", method="POST")
    req.add_header('apikey', SUPA_KEY)
    req.add_header('Authorization', 'Bearer ' + SUPA_KEY)
    req.add_header('Content-Type', 'application/json')
    req.add_header('Prefer', 'return=minimal')
    
    data = json.dumps(batch).encode('utf-8')
    try:
        urllib.request.urlopen(req, data=data)
        print(f"Batch {i//batch_size + 1} inserted successfully.")
    except urllib.error.HTTPError as e:
        print(f"Error inserting batch: {e.read().decode('utf-8')}")
        
print("Seeding completed.")
