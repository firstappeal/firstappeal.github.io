/* ============================================================
   shared/db.js  —  Supabase Database Adapter
   Replaces all fetch('/api/...') calls across the portal.
   Usage: Include this script before any module script.
         All modules call window.PortalDB.* methods.
   ============================================================ */

(function () {
  const SUPA_URL = 'https://rbcrkmmlywvnkpqzexuh.supabase.co';
  const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiY3JrbW1seXd2bmtwcXpleHVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4NjU4MDksImV4cCI6MjEwMDQ0MTgwOX0.2V5qdZXPSr8UCKWvRT0htUpIG6Hy7nm8Ruv2Eg-jpjY';

  const HEADERS = {
    'apikey':        SUPA_KEY,
    'Authorization': 'Bearer ' + SUPA_KEY,
    'Content-Type':  'application/json',
    'Prefer':        'return=representation'
  };

  function syncToLocalCasesCache(records) {
    try {
      const recs = Array.isArray(records) ? records : [records];
      const localStore = JSON.parse(localStorage.getItem('phc_local_cases_db') || '{}');
      recs.forEach(r => {
        const cType = r.case_type || 'FA';
        const code = cType === 'First Appeal' ? 'FA' : cType;
        if (r.case_no && r.case_year) {
          const key = `${code}/${r.case_no}/${r.case_year}`;
          const val = { appellant: r.appellant || '', respondent: r.respondent || '' };
          localStore[key] = val;
          if (typeof CASES_DB !== 'undefined') {
            CASES_DB[key] = val;
          }
        }
      });
      localStorage.setItem('phc_local_cases_db', JSON.stringify(localStore));
    } catch(e) {
      console.warn('Local cases cache sync error:', e);
    }
  }

  function mergeLocalCases() {
    try {
      const savedLocal = JSON.parse(localStorage.getItem('phc_local_cases_db') || '{}');
      if (typeof CASES_DB !== 'undefined') {
        Object.assign(CASES_DB, savedLocal);
      }
    } catch(e) {}
  }
  mergeLocalCases();
  if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', mergeLocalCases);
  }

  // ── Low-level helpers ───────────────────────────────────────

  async function sbGet(table, params = '') {
    const r = await fetch(`${SUPA_URL}/rest/v1/${table}?order=id.desc${params ? '&' + params : ''}`, {
      headers: HEADERS
    });
    if (!r.ok) throw new Error(`GET ${table} failed: ${r.status}`);
    return r.json();
  }

  async function sbInsert(table, body) {
    const r = await fetch(`${SUPA_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(body)
    });
    if (!r.ok) {
      const err = await r.text();
      throw new Error(`INSERT ${table} failed: ${r.status} — ${err}`);
    }
    return r.json();
  }

  async function sbUpdate(table, match, body) {
    const qs = Object.entries(match).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
    const r = await fetch(`${SUPA_URL}/rest/v1/${table}?${qs}`, {
      method: 'PATCH',
      headers: HEADERS,
      body: JSON.stringify(body)
    });
    if (!r.ok) {
        const err = await r.text();
        throw new Error(`UPDATE ${table} failed: ${r.status} - ${err}`);
    }
    return r.json();
  }

  async function sbDelete(table, match) {
    const qs = Object.entries(match).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
    const r = await fetch(`${SUPA_URL}/rest/v1/${table}?${qs}`, {
      method: 'DELETE',
      headers: { ...HEADERS, 'Prefer': 'return=minimal' }
    });
    if (!r.ok) throw new Error(`DELETE ${table} failed: ${r.status}`);
    return true;
  }

  // ── Public API (mirrors old Python /api/* endpoints) ────────

  window.PortalDB = {

    // ── CASE RECORDS ─────────────────────────────────────────
    async getSingleCaseRecord(caseType, caseNo, caseYear) {
      if (!caseNo || !caseYear) return null;
      const r = await fetch(`${SUPA_URL}/rest/v1/case_records?case_type=eq.${encodeURIComponent(caseType)}&case_no=eq.${encodeURIComponent(caseNo)}&case_year=eq.${encodeURIComponent(caseYear)}&limit=1`, {
        headers: HEADERS
      });
      if (!r.ok) return null;
      const data = await r.json();
      return data.length > 0 ? data[0] : null;
    },

    async getCaseRecords(select = '*') {
      const countResp = await fetch(
        `${SUPA_URL}/rest/v1/case_records?select=id`,
        { headers: { ...HEADERS, 'Prefer': 'count=exact', 'Range-Unit': 'items', 'Range': '0-0' } }
      );
      const total = parseInt(countResp.headers.get('Content-Range')?.split('/')[1] || '0', 10);
      
      const limit = 1000;
      const pages = Math.ceil(total / limit);
      const promises = [];
      
      for (let i = 0; i < pages; i++) {
        promises.push(
          fetch(`${SUPA_URL}/rest/v1/case_records?select=${encodeURIComponent(select)}&order=id.desc&limit=${limit}&offset=${i * limit}`, {
            headers: HEADERS
          }).then(async r => {
            if (!r.ok) throw new Error(`GET case_records failed: ${r.status}`);
            return r.json();
          })
        );
      }
      
      const results = await Promise.all(promises);
      return results.flat();
    },

    async getRecentCaseRecords(limit = 1000) {
      const r = await fetch(`${SUPA_URL}/rest/v1/case_records?select=case_no,case_year,appellant,respondent&order=created_at.desc&limit=${limit}`, {
        headers: HEADERS
      });
      if (!r.ok) return [];
      return r.json();
    },

    async insertCaseRecord(body) {
      const result = await sbInsert('case_records', {
        case_type:             body.case_type || 'First Appeal',
        case_no:               body.case_no   || '',
        case_year:             body.case_year || '',
        appellant:             body.appellant  || '',
        respondent:            body.respondent || '',
        lc_case_type:          body.lc_case_type || '',
        lc_case_no:            body.lc_case_no   || '',
        lc_case_year:          body.lc_case_year  || '',
        lc_court:              body.lc_court      || '',
        date_of_judgment:      body.date_of_judgment      || '',
        date_of_decree_award:  body.date_of_decree_award  || '',
        date_of_filing_fa:     body.date_of_filing_fa     || '',
        suit_value:            body.suit_value             || '',
        appeal_value:          body.appeal_value           || '',
        record_room_bundle_no: body.record_room_bundle_no  || '',
        dealing_assistant:     body.dealing_assistant       || '',
        data_json:             body
      });
      syncToLocalCasesCache(body);
      return result;
    },

    async bulkInsertCaseRecords(records, chunkSize = 150) {
      if (!records || records.length === 0) return [];
      const formattedRecords = records.map(body => ({
        case_type:             body.case_type || 'First Appeal',
        case_no:               body.case_no   || '',
        case_year:             body.case_year || '',
        appellant:             body.appellant  || '',
        respondent:            body.respondent || '',
        lc_case_type:          body.lc_case_type || '',
        lc_case_no:            body.lc_case_no   || '',
        lc_case_year:          body.lc_case_year  || '',
        lc_court:              body.lc_court      || '',
        date_of_judgment:      body.date_of_judgment      || '',
        date_of_decree_award:  body.date_of_decree_award  || '',
        date_of_filing_fa:     body.date_of_filing_fa     || '',
        suit_value:            body.suit_value             || '',
        appeal_value:          body.appeal_value           || '',
        record_room_bundle_no: body.record_room_bundle_no  || '',
        dealing_assistant:     body.dealing_assistant       || '',
        data_json:             body
      }));

      const results = [];
      for (let i = 0; i < formattedRecords.length; i += chunkSize) {
        const chunk = formattedRecords.slice(i, i + chunkSize);
        try {
          const res = await sbInsert('case_records', chunk);
          if (Array.isArray(res)) results.push(...res);
        } catch (e) {
          console.warn(`Bulk insert chunk failed (${i} to ${i + chunkSize}):`, e);
        }
      }
      syncToLocalCasesCache(records);
      return results;
    },

    async updateCaseRecord(id, body) {
      return sbUpdate('case_records', { id }, body);
    },

    async syncMasterLowerCourtDetails(caseType, caseNo, caseYear, lcDetails) {
      if (!caseNo || !caseYear) return;
      try {
        const r = await fetch(`${SUPA_URL}/rest/v1/case_records?case_type=eq.${encodeURIComponent(caseType)}&case_no=eq.${encodeURIComponent(caseNo)}&case_year=eq.${encodeURIComponent(caseYear)}`, {
          headers: HEADERS
        });
        const data = await r.json();
        if (data && data.length > 0) {
          const record = data[0];
          const updateBody = {};
          let needsUpdate = false;
          
          if (!record.lc_court && lcDetails.lc_court) { updateBody.lc_court = lcDetails.lc_court; needsUpdate = true; }
          if (!record.lc_case_type && lcDetails.lc_case_type) { updateBody.lc_case_type = lcDetails.lc_case_type; needsUpdate = true; }
          if (!record.lc_case_no && lcDetails.lc_case_no) { updateBody.lc_case_no = lcDetails.lc_case_no; needsUpdate = true; }
          if (!record.lc_case_year && lcDetails.lc_case_year) { updateBody.lc_case_year = lcDetails.lc_case_year; needsUpdate = true; }
          if (!record.date_of_judgment && lcDetails.date_of_judgment) { updateBody.date_of_judgment = lcDetails.date_of_judgment; needsUpdate = true; }
          if (!record.date_of_decree_award && lcDetails.date_of_decree_award) { updateBody.date_of_decree_award = lcDetails.date_of_decree_award; needsUpdate = true; }
          
          if (needsUpdate) {
            await fetch(`${SUPA_URL}/rest/v1/case_records?id=eq.${record.id}`, {
              method: 'PATCH',
              headers: { ...HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
              body: JSON.stringify(updateBody)
            });
            console.log('Master case record auto-synced with new LC details.');
          }
        }
      } catch (err) {
        console.warn('Auto-sync to master record failed:', err);
      }
    },


    async deleteCaseRecord(id) {
      return sbDelete('case_records', { id });
    },

    // ── LCR CALLS ────────────────────────────────────────────
    async getLcrCalls() {
      const rows = await sbGet('lcr_calls', 'limit=1000');
      return rows.map(r => ({
        ...(r.data_json || r),
        id:        r.id,
        saved_at:  r.created_at
      }));
    },

    async insertLcrCall(body) {
      return sbInsert('lcr_calls', body);
    },

    async updateLcrStatus(id, status) {
      try {
        return await sbUpdate('lcr_calls', { id }, { lcr_status: status });
      } catch (err) {
        console.error("Failed to update LCR status. Make sure the 'lcr_status' column exists in Supabase 'lcr_calls' table.", err);
      }
    },

    async deleteLcrCall(id) {
      return sbDelete('lcr_calls', { id });
    },

    async checkCaseExists(caseType, caseNo, caseYear) {
      const r = await fetch(`${SUPA_URL}/rest/v1/case_records?case_type=eq.${encodeURIComponent(caseType)}&case_no=eq.${encodeURIComponent(caseNo)}&case_year=eq.${encodeURIComponent(caseYear)}&select=id`, {
        headers: { ...HEADERS, 'Prefer': 'count=exact', 'Range': '0-0', 'Range-Unit': 'items' }
      });
      const count = parseInt(r.headers.get('Content-Range')?.split('/')[1] || '0', 10);
      return count > 0;
    },

    // ── NOTICE FORMS ─────────────────────────────────────────
    async getNoticeForms() {
      const rows = await sbGet('notice_forms', 'limit=500');
      return rows.map(r => ({ ...(r.data || r.data_json || r), saved_at: r.created_at, id: r.id }));
    },

    async insertNoticeForm(body) {
      return sbInsert('notice_forms', { caseNo: body.caseNo || '', data: body });
    },

    // ── DIRECT NOTICES ───────────────────────────────────────
    async getDirectNotices() {
      const rows = await sbGet('direct_notices', 'limit=500');
      return rows.map(r => ({ ...(r.data_json || r), saved_at: r.created_at, id: r.id }));
    },

    async insertDirectNotice(body) {
      return sbInsert('direct_notices', body);
    },

    async deleteDirectNotice(id) {
      return sbDelete('direct_notices', { id });
    },

    // ── CAUSE LISTS ──────────────────────────────────────────
    async getCauseLists() {
      const rows = await sbGet('cause_lists', 'limit=100');
      return rows.map(r => ({
        id:         r.id,
        created_at: r.created_at,
        header:     r.header || r.header_json || {},
        cases:      r.cases || r.cases_json  || []
      }));
    },

    async insertCauseList(header, cases) {
      return sbInsert('cause_lists', { header: header, cases: cases, date: header.date || null });
    },

    async deleteCauseList(id) {
      return sbDelete('cause_lists', { id });
    },

    // ── FILE TRACKING ────────────────────────────────────────
    async getFileTracking() {
      const rows = await sbGet('file_tracking_state', 'limit=1');
      return rows.length ? (rows[0].data || []) : [];
    },

    async saveFileTracking(data) {
      // Use upsert: check if a row exists, update it, otherwise insert
      const existing = await sbGet('file_tracking_state', 'limit=1');
      if (existing.length > 0) {
        return sbUpdate('file_tracking_state', { id: existing[0].id }, { data: data });
      }
      return sbInsert('file_tracking_state', { data: data });
    },

    // ── ORDER COMMUNICATIONS ─────────────────────────────────
    async getOrderCommunications() {
      const rows = await sbGet('order_communications', 'limit=500');
      return rows.map(r => ({ ...(r.data_json || r), saved_at: r.created_at, id: r.id }));
    },

    async insertOrderCommunication(body) {
      return sbInsert('order_communications', body);
    },

    async deleteOrderCommunication(id) {
      return sbDelete('order_communications', { id });
    },

    // ── ANALYTICS ────────────────────────────────────────────
    async getAnalytics() {
      let lcrRows = [], noticeRows = [], directRows = [], causeRows = [], trackRows = [], crCount = 0;
      try {
        const countPromise = fetch(
          `${SUPA_URL}/rest/v1/case_records?select=id`,
          { headers: { ...HEADERS, 'Prefer': 'count=exact', 'Range-Unit': 'items', 'Range': '0-0' } }
        ).then(r => parseInt(r.headers.get('Content-Range')?.split('/')[1] || '0', 10)).catch(() => 0);

        const results = await Promise.allSettled([
          sbGet('lcr_calls',           'limit=1000'),
          sbGet('notice_forms',        'limit=500'),
          sbGet('direct_notices',      'limit=500'),
          sbGet('cause_lists',         'limit=100'),
          sbGet('file_tracking_state', 'limit=1'),
          countPromise
        ]);
        if (results[0].status === 'fulfilled') lcrRows = results[0].value;
        if (results[1].status === 'fulfilled') noticeRows = results[1].value;
        if (results[2].status === 'fulfilled') directRows = results[2].value;
        if (results[3].status === 'fulfilled') causeRows = results[3].value;
        if (results[4].status === 'fulfilled') trackRows = results[4].value;
        if (results[5].status === 'fulfilled') crCount = results[5].value;
      } catch (e) {
        console.warn('Analytics fetch error, using local data', e);
      }

      // Map safely resolving flattened or nested schemas
      const mapJson = rows => (rows || []).map(r => ({ ...(r.data_json || r.data || r), id: r.id, saved_at: r.created_at }));
      const compliances = await this.getCompliances();

      return {
        status:              'success',
        lcr_calls:           mapJson(lcrRows),
        notice_forms:        mapJson(noticeRows),
        direct_notices:      mapJson(directRows),
        cause_lists:         causeRows.map(r => ({ cases: r.cases || r.cases_json || [], saved_at: r.created_at })),
        file_tracking:       trackRows.length ? (trackRows[0].data || []) : [],
        compliances:         compliances || [],
        case_records:        [],   // don't load all 5k for analytics
        case_records_count:  crCount
      };
    },

    // ── COMPLIANCE RECORDS ───────────────────────────────────
    async getCompliances() {
      let remote = [];
      try {
        const rows = await sbGet('compliances', 'limit=1000');
        remote = rows.map(r => ({ ...(r.data_json || r), id: r.id, created_at: r.created_at }));
      } catch (e) {
        // offline or table does not exist
      }
      let local = [];
      try {
        local = JSON.parse(localStorage.getItem('phc_compliance_records') || '[]');
      } catch (e) { local = []; }

      if (remote.length > 0) {
        const map = new Map();
        local.forEach(item => map.set(String(item.id), item));
        remote.forEach(item => map.set(String(item.id), item));
        const merged = Array.from(map.values()).sort((a,b) => new Date(b.created_at || b.order_date || 0) - new Date(a.created_at || a.order_date || 0));
        try { localStorage.setItem('phc_compliance_records', JSON.stringify(merged)); } catch(err){}
        return merged;
      }
      return local;
    },

    async insertCompliance(body) {
      const id = body.id || ('comp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));
      const record = {
        ...body,
        id: id,
        created_at: body.created_at || new Date().toISOString(),
        status: body.status || 'pending'
      };
      try {
        const local = JSON.parse(localStorage.getItem('phc_compliance_records') || '[]');
        local.unshift(record);
        localStorage.setItem('phc_compliance_records', JSON.stringify(local));
      } catch (e) { console.warn('Local storage compliance insert error:', e); }

      try {
        await sbInsert('compliances', {
          id: record.id,
          case_no: record.case_no || '',
          case_year: record.case_year || '',
          dealing_assistant: record.dealing_assistant || '',
          order_date: record.order_date || '',
          deadline: record.deadline || '',
          status: record.status || 'pending',
          directions: record.directions || '',
          data_json: record
        });
      } catch (e) {
        // offline mode or supabase table missing
      }
      return record;
    },

    async updateCompliance(id, updates) {
      let updatedRecord = null;
      try {
        const local = JSON.parse(localStorage.getItem('phc_compliance_records') || '[]');
        const idx = local.findIndex(r => String(r.id) === String(id));
        if (idx !== -1) {
          local[idx] = { ...local[idx], ...updates, updated_at: new Date().toISOString() };
          updatedRecord = local[idx];
          localStorage.setItem('phc_compliance_records', JSON.stringify(local));
        }
      } catch (e) { console.warn('Local storage compliance update error:', e); }

      try {
        await sbUpdate('compliances', { id }, {
          ...(updates.status ? { status: updates.status } : {}),
          ...(updates.compliance_date ? { compliance_date: updates.compliance_date } : {}),
          ...(updates.compliance_remarks ? { compliance_remarks: updates.compliance_remarks } : {}),
          data_json: updatedRecord || updates
        });
      } catch (e) {
        // offline mode
      }
      return updatedRecord || { id, ...updates };
    },

    async deleteCompliance(id) {
      try {
        let local = JSON.parse(localStorage.getItem('phc_compliance_records') || '[]');
        local = local.filter(r => String(r.id) !== String(id));
        localStorage.setItem('phc_compliance_records', JSON.stringify(local));
      } catch (e) { console.warn('Local storage compliance delete error:', e); }

      try {
        await sbDelete('compliances', { id });
      } catch (e) {
        // offline mode
      }
      return true;
    },

    // ── OFFICIAL LETTERS ─────────────────────────────────────
    async getOfficialLetters() {
      const rows = await sbGet('official_letters', 'limit=500');
      return rows.map(r => ({
        id:          r.id,
        letter_no:   r.letter_no   || '',
        letter_date: r.letter_date || '',
        sender_title:r.sender_title|| '',
        to_title:    r.to_title    || '',
        to_address:  r.to_address  || '',
        subject_text:r.subject_text|| '',
        salutation:  r.salutation  || '',
        closing:     r.closing     || '',
        signatory:   r.signatory   || '',
        body_html:   r.body_html   || '',
        saved_at:    r.created_at
      }));
    },

    async insertOfficialLetter(body) {
      return sbInsert('official_letters', {
        letter_no:    body.letter_no    || '',
        letter_date:  body.letter_date  || '',
        sender_title: body.sender_title || '',
        to_title:     body.to_title     || '',
        to_address:   body.to_address   || '',
        subject_text: body.subject_text || '',
        salutation:   body.salutation   || '',
        closing:      body.closing      || '',
        signatory:    body.signatory    || '',
        body_html:    body.body_html    || ''
      });
    },

    async deleteOfficialLetter(id) {
      return sbDelete('official_letters', { id });
    },

    syncLocalCases: mergeLocalCases,
    recordCaseLocally(caseType, caseNo, caseYear, appellant, respondent) {
      syncToLocalCasesCache({
        case_type: caseType,
        case_no: caseNo,
        case_year: caseYear,
        appellant: appellant,
        respondent: respondent
      });
    }

  };

  console.log('PortalDB (Supabase adapter) loaded ✓');
})();
