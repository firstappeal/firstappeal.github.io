import re
import json

with open('/home/ubuntu/Desktop/Cloud/court_portal/partynames.txt', 'r') as f:
    text = f.read()

cases = {}
# Find all lines containing "FA/"
for line in text.split('\n'):
    line = line.strip()
    if 'FA/' in line and ' VS. ' in line:
        # e.g., "1       FA/227/1966    Bidya Singh VS. Shrimati Jaya Devi                                    11"
        # Match case number
        m = re.search(r'FA/(\d{1,5})/(\d{4})\s+(.*?)\s+VS\.\s+(.*?)\s+(\d+)$', line)
        if m:
            case_no = m.group(1)
            case_year = m.group(2)
            appellant = m.group(3).strip()
            respondent = m.group(4).strip()
            
            key = f"FA/{case_no}/{case_year}"
            cases[key] = {
                "appellant": appellant,
                "respondent": respondent
            }

print(f"Extracted {len(cases)} cases.")
with open('/home/ubuntu/Desktop/Cloud/court_portal/shared/cases_db.js', 'w') as f:
    f.write(f"const CASES_DB = {json.dumps(cases, indent=2)};\n")
