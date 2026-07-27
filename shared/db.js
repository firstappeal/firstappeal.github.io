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
    if (!r.ok) throw new Error(`UPDATE ${table} failed: ${r.status}`);
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
    async getCaseRecords() {
      return sbGet('case_records', 'limit=10000');
    },

    async insertCaseRecord(body) {
      return sbInsert('case_records', {
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
    },

    async updateCaseRecord(id, body) {
      return sbUpdate('case_records', { id }, {
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
    },

    async deleteCaseRecord(id) {
      return sbDelete('case_records', { id });
    },

    // ── LCR CALLS ────────────────────────────────────────────
    async getLcrCalls() {
      const rows = await sbGet('lcr_calls', 'limit=1000');
      return rows.map(r => ({
        ...r.data_json,
        id:        r.id,
        saved_at:  r.created_at
      }));
    },

    async insertLcrCall(body) {
      return sbInsert('lcr_calls', { data_json: body });
    },

    async updateLcrStatus(id, status) {
      const rows = await sbGet('lcr_calls', `id=eq.${id}`);
      if (!rows.length) return;
      const updated = { ...rows[0].data_json, lcr_status: status };
      return sbUpdate('lcr_calls', { id }, { data_json: updated });
    },

    // ── NOTICE FORMS ─────────────────────────────────────────
    async getNoticeForms() {
      const rows = await sbGet('notice_forms', 'limit=500');
      return rows.map(r => ({ ...r.data_json, saved_at: r.created_at }));
    },

    async insertNoticeForm(body) {
      return sbInsert('notice_forms', { data_json: body });
    },

    // ── DIRECT NOTICES ───────────────────────────────────────
    async getDirectNotices() {
      const rows = await sbGet('direct_notices', 'limit=500');
      return rows.map(r => ({ ...r.data_json, saved_at: r.created_at }));
    },

    async insertDirectNotice(body) {
      return sbInsert('direct_notices', { data_json: body });
    },

    // ── CAUSE LISTS ──────────────────────────────────────────
    async getCauseLists() {
      const rows = await sbGet('cause_lists', 'limit=100');
      return rows.map(r => ({
        id:         r.id,
        created_at: r.created_at,
        header:     r.header_json || {},
        cases:      r.cases_json  || []
      }));
    },

    async insertCauseList(header, cases) {
      return sbInsert('cause_lists', { header_json: header, cases_json: cases });
    },

    // ── FILE TRACKING ────────────────────────────────────────
    async getFileTracking() {
      const rows = await sbGet('file_tracking_state', 'limit=1');
      return rows.length ? (rows[0].data_json || []) : [];
    },

    async saveFileTracking(data) {
      return sbInsert('file_tracking_state', { data_json: data });
    },

    // ── ANALYTICS ────────────────────────────────────────────
    async getAnalytics() {
      const [lcrRows, noticeRows, directRows, causeRows, trackRows, crRows] = await Promise.all([
        sbGet('lcr_calls',           'limit=1000'),
        sbGet('notice_forms',        'limit=500'),
        sbGet('direct_notices',      'limit=500'),
        sbGet('cause_lists',         'limit=100'),
        sbGet('file_tracking_state', 'limit=1'),
        sbGet('case_records',        'limit=1&select=id')  // just for count
      ]);

      const mapJson = rows => rows.map(r => ({ ...r.data_json, id: r.id, saved_at: r.created_at }));

      // Get actual case record count
      const countResp = await fetch(
        `${SUPA_URL}/rest/v1/case_records?select=id`,
        { headers: { ...HEADERS, 'Prefer': 'count=exact', 'Range-Unit': 'items', 'Range': '0-0' } }
      );
      const crCount = parseInt(countResp.headers.get('Content-Range')?.split('/')[1] || '0', 10);

      return {
        status:              'success',
        lcr_calls:           mapJson(lcrRows),
        notice_forms:        mapJson(noticeRows),
        direct_notices:      mapJson(directRows),
        cause_lists:         causeRows.map(r => ({ cases: r.cases_json || [] })),
        file_tracking:       trackRows.length ? (trackRows[0].data_json || []) : [],
        case_records:        [],   // don't load all 5k for analytics
        case_records_count:  crCount
      };
    }
  };

  console.log('PortalDB (Supabase adapter) loaded ✓');
})();
