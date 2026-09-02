/* ============================================================
   SHARED CASE RECORD AUTO-SYNC MODAL SCRIPT
   ============================================================ */

(function() {
  // Inject CSS dynamically if not present
  if (!document.getElementById('crModalStyles')) {
    const link = document.createElement('link');
    link.id = 'crModalStyles';
    link.rel = 'stylesheet';
    link.href = '../shared/case_record_modal.css';
    document.head.appendChild(link);
  }

  /**
   * Prompts user with a Case Record completion modal before printing/saving.
   * @param {Object} extractedData  - Data parsed from the current form (LCR, Notice, etc.)
   * @param {Function} onSaveSuccess - Callback invoked after saving record to master DB
   * @param {Function} onSkip        - Callback if user clicks Skip (no DB update, no action)
   * @param {Function} onPrintOnly   - Callback for "Print Only" / "Save Only" (no DB update)
   *                                   Falls back to onSaveSuccess if not provided.
   */
  window.promptSaveCaseRecord = async function(extractedData, onSaveSuccess, onSkip, onPrintOnly) {
    // Check if record already exists in backend database
    let existingRecord = null;
    let lcrCallRecord = null;

    try {
      if (window.PortalDB) {
        // Use Supabase adapter to get just this specific case record
        if (typeof window.PortalDB.getSingleCaseRecord === 'function') {
          existingRecord = await window.PortalDB.getSingleCaseRecord(extractedData.case_type || 'First Appeal', extractedData.case_no, extractedData.case_year);
        } else {
          // Fallback if not available
          const records = await window.PortalDB.getCaseRecords();
          existingRecord = records.find(r =>
            String(r.case_no)   === String(extractedData.case_no) &&
            String(r.case_year) === String(extractedData.case_year) &&
            (r.case_type || '').toLowerCase() === (extractedData.case_type || 'First Appeal').toLowerCase()
          );
        }
        
        const lcrCalls = await window.PortalDB.getLcrCalls();
        lcrCallRecord = lcrCalls.find(l =>
          String(l.case_no) === String(extractedData.case_no) &&
          (String(l.case_year) === String(extractedData.case_year) || !extractedData.case_year)
        );
      }
    } catch (e) {
      console.warn('Backend query error:', e);
    }

    // Determine lower court details (prefer LCR call form extracted data, then saved LCR call record, then existing record)
    const lc_court = extractedData.lc_court || (lcrCallRecord ? (lcrCallRecord.court_of_the || lcrCallRecord.recipient_title) : (existingRecord ? existingRecord.lc_court : ''));
    const lc_case_type = extractedData.lc_case_type || (lcrCallRecord ? lcrCallRecord.arising_out_of : (existingRecord ? existingRecord.lc_case_type : ''));
    const lc_case_no = extractedData.lc_case_no || (lcrCallRecord ? lcrCallRecord.appeal_from_no : (existingRecord ? existingRecord.lc_case_no : ''));
    const lc_case_year = extractedData.lc_case_year || (lcrCallRecord ? lcrCallRecord.appeal_from_year : (existingRecord ? existingRecord.lc_case_year : ''));

    // Merge existing details if found
    const data = {
      id: existingRecord ? existingRecord.id : null,
      case_type: extractedData.case_type || (existingRecord ? existingRecord.case_type : 'First Appeal'),
      case_no: extractedData.case_no || (existingRecord ? existingRecord.case_no : ''),
      case_year: extractedData.case_year || (existingRecord ? existingRecord.case_year : ''),
      appellant: extractedData.appellant || (existingRecord ? existingRecord.appellant : ''),
      respondent: extractedData.respondent || (existingRecord ? existingRecord.respondent : ''),
      lc_court: lc_court,
      lc_case_type: lc_case_type,
      lc_case_no: lc_case_no,
      lc_case_year: lc_case_year,
      date_of_judgment: extractedData.date_of_judgment || (existingRecord ? existingRecord.date_of_judgment : ''),
      date_of_decree_award: extractedData.date_of_decree_award || (existingRecord ? existingRecord.date_of_decree_award : ''),
      date_of_filing_fa: extractedData.date_of_filing_fa || (existingRecord ? existingRecord.date_of_filing_fa : ''),
      suit_value: extractedData.suit_value || (existingRecord ? existingRecord.suit_value : ''),
      appeal_value: extractedData.appeal_value || (existingRecord ? existingRecord.appeal_value : ''),
      record_room_bundle_no: extractedData.record_room_bundle_no || (existingRecord ? existingRecord.record_room_bundle_no : '')
    };

    // Auto-generate default bundle number if missing
    if (!data.record_room_bundle_no && data.case_no && data.case_year) {
      data.record_room_bundle_no = `RR-FA-${data.case_year}/${data.case_no}`;
    }

    // Create Modal Element
    const modalDiv = document.createElement('div');
    modalDiv.className = 'cr-modal-overlay no-print';
    modalDiv.innerHTML = `
      <div class="cr-modal-card">
        <div class="cr-modal-header">
          <h3><i class="fa-solid fa-box-archive"></i> Save & Sync to Case Records Master System</h3>
          <button type="button" class="cr-modal-close" id="crCloseBtn">&times;</button>
        </div>

        <div class="cr-modal-body">
          <div class="cr-alert-banner">
            <i class="fa-solid fa-circle-info fa-lg"></i>
            <div>
              <strong>Auto-Sync Master Case Record:</strong> Lower court details from the LCR Call form have been automatically mapped below. You may fill any additional master record details now, or save as-is (blank fields allowed) to update the Master Records database.
            </div>
          </div>

          <form id="crSyncForm">
            <!-- SECTION 1: HIGH COURT APPEAL -->
            <div class="cr-form-section" style="margin-bottom: 12px;">
              <div class="cr-section-title"><i class="fa-solid fa-gavel"></i> High Court Case Info</div>
              <div class="cr-form-row cols-4">
                <div class="cr-form-group">
                  <label>Case Type</label>
                  <input type="text" id="cr_case_type" value="First Appeal" class="cr-form-control" readonly style="background: rgba(255,255,255,0.08); cursor: not-allowed;">
                </div>
                <div class="cr-form-group">
                  <label>Case No.</label>
                  <input type="text" id="cr_case_no" value="${escapeAttr(data.case_no)}" class="cr-form-control">
                </div>
                <div class="cr-form-group">
                  <label>Year</label>
                  <input type="text" id="cr_case_year" value="${escapeAttr(data.case_year)}" class="cr-form-control">
                </div>
                <div class="cr-form-group">
                  <label>Date of Filing FA</label>
                  <input type="date" id="cr_date_of_filing_fa" value="${escapeAttr(data.date_of_filing_fa)}" class="cr-form-control">
                </div>
              </div>
            </div>

            <!-- SECTION 2: PARTIES -->
            <div class="cr-form-section" style="margin-bottom: 12px;">
              <div class="cr-section-title"><i class="fa-solid fa-users"></i> Parties</div>
              <div class="cr-form-row cols-2">
                <div class="cr-form-group">
                  <label>Appellant Name</label>
                  <input type="text" id="cr_appellant" value="${escapeAttr(data.appellant)}" class="cr-form-control">
                </div>
                <div class="cr-form-group">
                  <label>Respondent Name</label>
                  <input type="text" id="cr_respondent" value="${escapeAttr(data.respondent)}" class="cr-form-control">
                </div>
              </div>
            </div>

            <!-- SECTION 3: LOWER COURT & DATES -->
            <div class="cr-form-section" style="margin-bottom: 12px;">
              <div class="cr-section-title"><i class="fa-solid fa-landmark"></i> Lower Court & Judgment Details</div>
              
              <!-- LC Court -->
              <div class="cr-form-row">
                <div class="cr-form-group" style="width: 100%;">
                  <label>Court Name / Designation</label>
                  <input type="text" id="cr_lc_court" value="${escapeAttr(data.lc_court)}" class="cr-form-control" placeholder="e.g. Subordinate Judge I, Patna">
                </div>
              </div>
              
              <!-- LC Case Details -->
              <div class="cr-form-row cols-3" style="margin-top: 8px;">
                <div class="cr-form-group">
                  <label>LC Case Type</label>
                  <input type="text" id="cr_lc_case_type" value="${escapeAttr(data.lc_case_type)}" class="cr-form-control" placeholder="e.g. Title Suit">
                </div>
                <div class="cr-form-group">
                  <label>LC Case No.</label>
                  <input type="text" id="cr_lc_case_no" value="${escapeAttr(data.lc_case_no)}" class="cr-form-control" placeholder="e.g. 12">
                </div>
                <div class="cr-form-group">
                  <label>LC Case Year</label>
                  <input type="text" id="cr_lc_case_year" value="${escapeAttr(data.lc_case_year)}" class="cr-form-control" placeholder="e.g. 2021">
                </div>
              </div>

              <!-- Dates -->
              <div class="cr-form-row cols-2" style="margin-top: 8px;">
                <div class="cr-form-group">
                  <label>Date of Judgment</label>
                  <input type="date" id="cr_date_of_judgment" value="${escapeAttr(data.date_of_judgment)}" class="cr-form-control">
                </div>
                <div class="cr-form-group">
                  <label>Date of Decree / Award</label>
                  <input type="date" id="cr_date_of_decree_award" value="${escapeAttr(data.date_of_decree_award)}" class="cr-form-control">
                </div>
              </div>
            </div>

            <!-- SECTION 4: VALUATION & RECORD ROOM -->
            <div class="cr-form-section">
              <div class="cr-section-title"><i class="fa-solid fa-box"></i> Valuation & Record Room Storage</div>
              <div class="cr-form-row cols-3">
                <div class="cr-form-group">
                  <label>Suit Value (₹)</label>
                  <input type="text" id="cr_suit_value" value="${escapeAttr(data.suit_value)}" class="cr-form-control" placeholder="e.g. ₹ 50,000/-">
                </div>
                <div class="cr-form-group">
                  <label>Appeal Value (₹)</label>
                  <input type="text" id="cr_appeal_value" value="${escapeAttr(data.appeal_value)}" class="cr-form-control" placeholder="e.g. ₹ 50,000/-">
                </div>
                <div class="cr-form-group">
                  <label>Record Room Bundle No.</label>
                  <input type="text" id="cr_record_room_bundle_no" value="${escapeAttr(data.record_room_bundle_no)}" class="cr-form-control" placeholder="e.g. RR-FA-1973/03">
                </div>
              </div>
            </div>
          </form>
        </div>

        <div class="cr-modal-footer">
          <button type="button" class="cr-btn cr-btn-cancel" id="crSkipBtn" title="Close this dialog without any action">
            ✕ Skip
          </button>
          <button type="button" class="cr-btn cr-btn-print" id="crPrintOnlyBtn" title="Proceed without updating master records">
            <i class="fa-solid fa-print"></i> Print Only / Save Only
          </button>
          <button type="button" class="cr-btn cr-btn-primary" id="crSaveSubmitBtn">
            <i class="fa-solid fa-floppy-disk"></i> Update Master Records &amp; Proceed
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modalDiv);

    // Helpers inside modal closure
    function closeModal() {
      if (document.body.contains(modalDiv)) {
        document.body.removeChild(modalDiv);
      }
    }

    document.getElementById('crCloseBtn').addEventListener('click', closeModal);

    // Skip – close without doing anything
    document.getElementById('crSkipBtn').addEventListener('click', () => {
      closeModal();
      // No callback — truly skip all actions
    });

    // Print Only / Save Only – proceed without updating master records
    document.getElementById('crPrintOnlyBtn').addEventListener('click', () => {
      closeModal();
      const cb = typeof onPrintOnly === 'function' ? onPrintOnly : (typeof onSaveSuccess === 'function' ? onSaveSuccess : null);
      if (cb) cb();
    });

    document.getElementById('crSaveSubmitBtn').addEventListener('click', async () => {
      const recordPayload = {
        id: data.id,
        case_type: document.getElementById('cr_case_type').value || 'First Appeal',
        case_no: document.getElementById('cr_case_no').value || '',
        case_year: document.getElementById('cr_case_year').value || '',
        date_of_filing_fa: document.getElementById('cr_date_of_filing_fa').value || '',
        appellant: document.getElementById('cr_appellant').value || '',
        respondent: document.getElementById('cr_respondent').value || '',
        lc_court: document.getElementById('cr_lc_court').value || '',
        lc_case_type: document.getElementById('cr_lc_case_type').value || '',
        lc_case_no: document.getElementById('cr_lc_case_no').value || '',
        lc_case_year: document.getElementById('cr_lc_case_year').value || '',
        date_of_judgment: document.getElementById('cr_date_of_judgment').value || '',
        date_of_decree_award: document.getElementById('cr_date_of_decree_award').value || '',
        suit_value: document.getElementById('cr_suit_value').value || '',
        appeal_value: document.getElementById('cr_appeal_value').value || '',
        record_room_bundle_no: document.getElementById('cr_record_room_bundle_no').value || ''
      };

      try {
        if (window.PortalDB) {
          if (recordPayload.id) {
            await window.PortalDB.updateCaseRecord(recordPayload.id, recordPayload);
          } else {
            await window.PortalDB.insertCaseRecord(recordPayload);
          }
          console.log('Master Case Record saved to Supabase.');
        }
      } catch (err) {
        console.warn('Supabase sync warning:', err);
      }

      closeModal();
      if (typeof onSaveSuccess === 'function') onSaveSuccess();
    });
  };

  function escapeAttr(str) {
    if (!str) return '';
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
})();
