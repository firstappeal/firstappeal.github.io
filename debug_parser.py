import re

with open('/home/ubuntu/Desktop/Cloud/court_portal/partynames_default.txt', 'r') as f:
    lines = f.readlines()

case_nos = set()
for line in lines:
    line = line.strip()
    m = re.match(r'^\d+\s+FA/(\d{1,5})/(\d{4})$', line)
    if m:
        case_nos.add(f"FA/{m.group(1)}/{m.group(2)}")

print(f"Total FA headers found: {len(case_nos)}")

current_case = None
extracted = set()

for line in lines:
    line = line.strip()
    if not line: continue
    
    m = re.match(r'^\d+\s+FA/(\d{1,5})/(\d{4})$', line)
    if m:
        current_case = f"FA/{m.group(1)}/{m.group(2)}"
        continue
        
    if current_case:
        if re.match(r'^\d+$', line):
            extracted.add(current_case)
            current_case = None

missing = case_nos - extracted
print(f"Total extracted: {len(extracted)}")
print(f"Missing (example 10): {list(missing)[:10]}")
