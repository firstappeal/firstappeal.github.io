const fs = require('fs');
const https = require('https');

const SUPA_URL = 'rbcrkmmlywvnkpqzexuh.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiY3JrbW1seXd2bmtwcXpleHVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4NjU4MDksImV4cCI6MjEwMDQ0MTgwOX0.2V5qdZXPSr8UCKWvRT0htUpIG6Hy7nm8Ruv2Eg-jpjY';

const casesDbContent = fs.readFileSync('./notice_form/cases_db.js', 'utf8');

let CASES_DB = {};
// Strip 'const CASES_DB = ' and trailing semicolon
let jsonStr = casesDbContent.replace('const CASES_DB = ', '');
if (jsonStr.endsWith(';\n')) jsonStr = jsonStr.slice(0, -2);
if (jsonStr.endsWith(';')) jsonStr = jsonStr.slice(0, -1);

try {
  CASES_DB = JSON.parse(jsonStr);
} catch (e) {
  console.error("Error parsing cases_db.js. Evaluated fallback...");
  eval(casesDbContent);
  if (typeof CASES_DB === 'undefined') throw e;
}

function postData(path, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const options = {
      hostname: SUPA_URL,
      port: 443,
      path: path,
      method: 'POST',
      headers: {
        'apikey': SUPA_KEY,
        'Authorization': 'Bearer ' + SUPA_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body);
        } else {
          reject(new Error(`Status ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(payload);
    req.end();
  });
}

async function seedData() {
  const cases = Object.entries(CASES_DB).map(([key, data]) => {
    const parts = key.split('/');
    let caseNo = parts[1] || '';
    let caseYear = parts[2] || '';
    if (parts.length === 2) {
      caseNo = parts[0];
      caseYear = parts[1];
    }
    
    return {
      case_no: caseNo,
      case_year: caseYear,
      data_json: { appellant: data.appellant, respondent: data.respondent }
    };
  });

  const batchSize = 1000;
  for (let i = 0; i < cases.length; i += batchSize) {
    const batch = cases.slice(i, i + batchSize);
    console.log(`Inserting batch ${i / batchSize + 1} (${batch.length} items)...`);
    
    try {
      await postData('/rest/v1/case_records', batch);
      console.log(`Batch ${i / batchSize + 1} inserted successfully.`);
    } catch (err) {
      console.error('Error inserting batch:', err.message);
    }
  }
  console.log('Seeding completed.');
}

seedData();
