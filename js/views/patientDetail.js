/* ============================================
   Patient Detail View - 5 Tabs (Inline Forms)
   ============================================ */
window.PatientDetailView = (function() {

  var activeTab = 'overview';
  var _clickHandler = null;
  var _sessionDateParam = null; // set via query param from "Start Session Note"

  // Sub-view state for inline forms
  var sub = {
    sessionsView: 'list',    // list | form
    sessionsEditId: null,
    exercisesView: 'list',   // list | form
    exercisesEditId: null,
    rxView: 'list',          // list | form
    rxEditId: null,
    billingView: 'list',     // list | form
    bookingView: 'list',     // list | form
    printExpanded: false,
    rxPrintExpanded: false,
    editingPatient: false
  };

  function resetSub() {
    sub.sessionsView = 'list';
    sub.sessionsEditId = null;
    sub.exercisesView = 'list';
    sub.exercisesEditId = null;
    sub.rxView = 'list';
    sub.rxEditId = null;
    sub.billingView = 'list';
    sub.bookingView = 'list';
    sub.printExpanded = false;
    sub.rxPrintExpanded = false;
    sub.editingPatient = false;
  }

  function render(container, patientId) {
    // Parse query params from patientId (e.g., "abc123?tab=sessions&newSession=1&sessionDate=2026-02-10")
    var params = {};
    var qIdx = patientId.indexOf('?');
    if (qIdx !== -1) {
      var qs = patientId.substring(qIdx + 1);
      patientId = patientId.substring(0, qIdx);
      var pairs = qs.split('&');
      for (var pi = 0; pi < pairs.length; pi++) {
        var eqIdx = pairs[pi].indexOf('=');
        if (eqIdx > 0) params[decodeURIComponent(pairs[pi].substring(0, eqIdx))] = decodeURIComponent(pairs[pi].substring(eqIdx + 1));
      }
    }

    var patient = Store.getPatient(patientId);
    if (!patient) {
      container.innerHTML = '<div class="empty-state"><p>Patient not found</p><a href="#/patients" class="btn btn-primary mt-2">Back to Patients</a></div>';
      return;
    }

    App.setPageTitle(patient.name);
    activeTab = params.tab || 'overview';
    var tabFeatureMap = { exercises: 'exercises', prescriptions: 'prescriptions', billing: 'billing' };
    if (tabFeatureMap[activeTab] && !Store.isFeatureEnabled(tabFeatureMap[activeTab])) {
      activeTab = 'overview';
    }
    resetSub();

    // Auto-open new session form if requested via query param
    if (params.newSession === '1') {
      activeTab = 'sessions';
      sub.sessionsView = 'form';
      sub.sessionsEditId = null;
      _sessionDateParam = params.sessionDate || null;
    }

    renderDetail(container, patient);
  }

  function renderDetail(container, patient) {
    var html = '';

    // Back link
    html += '<a href="#/patients" class="back-link">';
    html += '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>';
    html += 'Back to Patients</a>';

    // Patient header
    html += '<div class="patient-header">';
    html += '<div class="patient-avatar">' + Utils.getInitials(patient.name) + '</div>';
    html += '<div class="patient-header-info">';
    html += '<h2>' + Utils.escapeHtml(patient.name) + '</h2>';
    html += '<p>' + Utils.escapeHtml(patient.diagnosis || 'No diagnosis') + '</p>';
    if (patient.tags && patient.tags.length > 0) {
      html += '<div style="margin-top:0.35rem;">';
      for (var ti = 0; ti < patient.tags.length; ti++) {
        var tagObj = Store.getTag(patient.tags[ti]);
        if (tagObj) {
          html += '<span class="tag-badge" style="background:' + tagObj.color + ';">' + Utils.escapeHtml(tagObj.name) + '</span>';
        }
      }
      html += '</div>';
    }
    html += '</div>';
    html += '<div class="patient-header-actions">';
    html += '<span class="badge ' + (patient.status === 'active' ? 'badge-success' : 'badge-gray') + '" style="margin-right:0.5rem;font-size:0.8rem;padding:0.25rem 0.75rem;">' + (patient.status || 'active') + '</span>';
    html += '<button class="btn btn-secondary" id="print-patient-btn">';
    html += '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>';
    html += 'Print</button>';
    html += '</div></div>';

    // Tabs
    html += '<div class="tabs">';
    html += tabBtn('overview', 'Overview');
    html += tabBtn('history', 'History');
    html += tabBtn('sessions', 'Treatment Notes');
    if (Store.isFeatureEnabled('exercises')) html += tabBtn('exercises', 'HEP');
    if (Store.isFeatureEnabled('prescriptions')) html += tabBtn('prescriptions', 'Prescriptions');
    if (Store.isFeatureEnabled('billing')) html += tabBtn('billing', 'Billing');
    html += '</div>';

    // Tab content
    html += '<div id="tab-overview" class="tab-content' + (activeTab === 'overview' ? ' active' : '') + '">';
    html += renderOverview(patient);
    html += '</div>';

    html += '<div id="tab-history" class="tab-content' + (activeTab === 'history' ? ' active' : '') + '">';
    html += renderHistory(patient);
    html += '</div>';

    html += '<div id="tab-sessions" class="tab-content' + (activeTab === 'sessions' ? ' active' : '') + '">';
    html += renderSessions(patient);
    html += '</div>';

    if (Store.isFeatureEnabled('exercises')) {
      html += '<div id="tab-exercises" class="tab-content' + (activeTab === 'exercises' ? ' active' : '') + '">';
      html += renderExercises(patient);
      html += '</div>';
    }

    if (Store.isFeatureEnabled('prescriptions')) {
      html += '<div id="tab-prescriptions" class="tab-content' + (activeTab === 'prescriptions' ? ' active' : '') + '">';
      html += renderPrescriptions(patient);
      html += '</div>';
    }

    if (Store.isFeatureEnabled('billing')) {
      html += '<div id="tab-billing" class="tab-content' + (activeTab === 'billing' ? ' active' : '') + '">';
      html += renderBilling(patient);
      html += '</div>';
    }

    container.innerHTML = html;
    bindEvents(container, patient);
    bindInlineForms(container, patient);
  }

  function tabBtn(id, label) {
    return '<button class="tab-btn' + (activeTab === id ? ' active' : '') + '" data-tab="' + id + '">' + label + '</button>';
  }

  // ==================== OVERVIEW TAB ====================
  function renderOverview(patient) {
    var html = '';

    // Edit Patient form (inline, replaces read-only view when editing)
    if (sub.editingPatient) {
      html += renderEditPatientForm(patient);
      return html;
    }

    // Book Next Visit inline form (when active)
    if (sub.bookingView === 'form') {
      html += renderBookNextVisitForm(patient);
    }

    // Top action bar: Edit + Book Next Visit
    html += '<div style="display:flex;gap:0.5rem;margin-bottom:1rem;">';
    html += '<button class="btn btn-primary" id="edit-patient-info-btn">';
    html += '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
    html += ' Edit Patient</button>';
    html += '<button class="btn btn-secondary" id="book-next-visit-btn">';
    html += '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
    html += ' Book Visit</button>';
    html += '</div>';

    // Next/Last Visit info cards
    var allAppts = Store.getAppointmentsByPatient(patient.id);
    var todayStr = Utils.today();
    var nextAppt = null;
    var lastVisit = null;
    for (var vi = 0; vi < allAppts.length; vi++) {
      var vap = allAppts[vi];
      if (vap.status === 'scheduled' && vap.date >= todayStr) {
        if (!nextAppt || vap.date < nextAppt.date || (vap.date === nextAppt.date && vap.time < nextAppt.time)) {
          nextAppt = vap;
        }
      }
      if (vap.status === 'completed') {
        if (!lastVisit || vap.date > lastVisit.date || (vap.date === lastVisit.date && vap.time > lastVisit.time)) {
          lastVisit = vap;
        }
      }
    }

    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1rem;">';
    html += '<div class="visit-info-card">';
    html += '<div class="visit-info-icon next"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>';
    html += '<div class="visit-info-detail">';
    html += '<div class="visit-label">Next Appointment</div>';
    if (nextAppt) {
      html += '<div class="visit-value">' + Utils.formatDate(nextAppt.date) + ' at ' + Utils.formatTime(nextAppt.time) + '</div>';
    } else {
      html += '<div class="visit-value" style="color:var(--gray-400);">None scheduled</div>';
    }
    html += '</div></div>';
    html += '<div class="visit-info-card">';
    html += '<div class="visit-info-icon last"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div>';
    html += '<div class="visit-info-detail">';
    html += '<div class="visit-label">Last Visit</div>';
    if (lastVisit) {
      html += '<div class="visit-value">' + Utils.formatDate(lastVisit.date) + '</div>';
    } else {
      html += '<div class="visit-value" style="color:var(--gray-400);">No visits yet</div>';
    }
    html += '</div></div>';
    html += '</div>';

    // Patient info card (includes contact + emergency contact)
    html += '<div class="card mb-2"><div class="card-header"><h3>Patient Information</h3></div><div class="card-body">';
    html += '<div class="info-grid">';
    html += infoItem('Full Name', patient.name);
    html += infoItem('Date of Birth', Utils.formatDate(patient.dob) + (patient.dob ? ' (Age ' + Utils.calculateAge(patient.dob) + ')' : ''));
    html += infoItem('Gender', patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : '-');
    html += infoItem('Phone', (patient.phoneCode || Utils.getPhoneCode()) + ' ' + (patient.phone || '-'));
    html += infoItem('Email', patient.email);
    html += infoItem('Address', patient.address);
    html += infoItem('Insurance', patient.insurance);
    html += infoItem('Status', patient.status ? patient.status.charAt(0).toUpperCase() + patient.status.slice(1) : 'Active');
    var emergencyVal = (patient.emergencyContact || '-') + (patient.emergencyPhone ? ' (' + (patient.emergencyPhoneCode || Utils.getPhoneCode()) + ' ' + patient.emergencyPhone + ')' : '');
    html += infoItem('Emergency Contact', emergencyVal);
    html += '</div></div></div>';

    // Diagnosis & treatment
    html += '<div class="card mb-2"><div class="card-header"><h3>Diagnosis & Treatment Plan</h3></div><div class="card-body">';
    html += '<div class="info-grid" style="grid-template-columns:1fr;">';
    html += infoItem('Diagnosis', patient.diagnosis);
    html += infoItem('Treatment Plan', patient.treatmentPlan);
    html += infoItem('Notes', patient.notes);
    html += '</div></div></div>';

    // Affected Body Areas
    if (Store.isFeatureEnabled('bodyDiagram')) {
      html += '<div class="card mb-2"><div class="card-header"><h3>Affected Body Areas</h3></div><div class="card-body body-diagram-card">';
      if (patient.bodyRegions && patient.bodyRegions.length > 0) {
        html += '<div class="body-diagram-screen">';
        html += BodyDiagram.renderHtml(patient.bodyRegions, { readOnly: true });
        html += '<div class="body-region-badges">' + BodyDiagram.renderBadges(patient.bodyRegions) + '</div>';
        html += '</div>';
        html += '<div class="body-diagram-print-only">';
        html += BodyDiagram.renderPrintHtml(patient.bodyRegions);
        html += '</div>';
      } else {
        html += '<p style="color:var(--gray-400);font-size:0.85rem;">No areas marked</p>';
      }
      html += '</div></div>';
    }

    // Progress snapshot
    var sessions = Store.getSessionsByPatient(patient.id);
    if (sessions.length > 0) {
      sessions.sort(function(a, b) { return a.date < b.date ? -1 : 1; });
      html += '<div class="card mb-2"><div class="card-header"><h3>Progress Snapshot</h3></div><div class="card-body">';
      html += '<div class="progress-chart">';
      for (var i = 0; i < sessions.length; i++) {
        var s = sessions[i];
        var painPct = ((s.painScore || 0) / 10 * 100);
        var funcPct = ((s.functionScore || 0) / 10 * 100);
        html += '<div style="margin-bottom:0.75rem;">';
        html += '<div style="font-size:0.78rem;font-weight:600;color:var(--gray-600);margin-bottom:0.35rem;">' + Utils.formatDateShort(s.date) + '</div>';
        html += '<div class="progress-bar-row">';
        html += '<span class="progress-bar-label">Pain</span>';
        html += '<div class="progress-bar-track"><div class="progress-bar-fill pain" style="width:' + painPct + '%;">' + s.painScore + '/10</div></div>';
        html += '</div>';
        html += '<div class="progress-bar-row" style="margin-top:0.25rem;">';
        html += '<span class="progress-bar-label">Function</span>';
        html += '<div class="progress-bar-track"><div class="progress-bar-fill function" style="width:' + funcPct + '%;">' + s.functionScore + '/10</div></div>';
        html += '</div>';
        html += '</div>';
      }
      html += '</div></div></div>';
    }

    // Print options (inline collapsible)
    if (sub.printExpanded) {
      html += renderPrintOptions(patient);
    }

    return html;
  }

  function infoItem(label, value) {
    return '<div class="info-item"><label>' + label + '</label><span>' + Utils.escapeHtml(value || '-') + '</span></div>';
  }

  // ==================== BOOK NEXT VISIT (inline) ====================
  function renderBookNextVisitForm(patient) {
    var appts = Store.getAppointmentsByPatient(patient.id);
    appts.sort(function(a, b) { return a.date > b.date ? -1 : 1; });
    var lastAppt = appts.length > 0 ? appts[0] : null;

    var defaultDate = Utils.toDateString(Utils.addDays(new Date(), 7));
    var defaultTime = lastAppt ? lastAppt.time : '09:00';
    var defaultType = lastAppt ? lastAppt.type : 'Follow-up';
    var defaultDuration = lastAppt ? lastAppt.duration : '30';

    var html = '<div class="inline-form-card mb-2">';
    html += '<div class="inline-form-header">';
    html += '<button class="back-btn" id="booking-form-back">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>';
    html += '</button>';
    html += '<h3>Book Next Visit - ' + Utils.escapeHtml(patient.name) + '</h3>';
    html += '</div>';
    html += '<div class="inline-form-body">';
    html += '<form id="next-visit-form">';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>Date</label>';
    html += '<input type="date" name="date" value="' + defaultDate + '" required></div>';
    html += '<div class="form-group"><label>Time</label>';
    html += '<input type="time" name="time" value="' + defaultTime + '" required></div>';
    html += '</div>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>Type</label>';
    html += '<select name="type">';
    html += '<option value="Initial Evaluation"' + (defaultType === 'Initial Evaluation' ? ' selected' : '') + '>Initial Evaluation</option>';
    html += '<option value="Treatment"' + (defaultType === 'Treatment' ? ' selected' : '') + '>Treatment</option>';
    html += '<option value="Follow-up"' + (defaultType === 'Follow-up' ? ' selected' : '') + '>Follow-up</option>';
    html += '</select></div>';
    html += '<div class="form-group"><label>Duration (min)</label>';
    html += '<select name="duration">';
    var durations = ['15','30','45','60','90'];
    for (var d = 0; d < durations.length; d++) {
      html += '<option value="' + durations[d] + '"' + (durations[d] === String(defaultDuration) ? ' selected' : '') + '>' + durations[d] + ' min</option>';
    }
    html += '</select></div>';
    html += '</div>';
    html += '<div class="form-group"><label>Notes</label>';
    html += '<textarea name="notes" rows="2"></textarea></div>';
    html += '<div id="conflict-warning-booking" style="display:none;" class="login-error"></div>';
    html += '</form>';
    html += '</div>';
    html += '<div class="inline-form-actions">';
    html += '<button class="btn btn-secondary" id="booking-form-cancel">Cancel</button>';
    html += '<button class="btn btn-primary" id="booking-form-save">Book Appointment</button>';
    html += '</div></div>';
    return html;
  }

  // ==================== EDIT PATIENT INFO (inline) ====================
  function editSectionLabel(text) {
    return '<div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--gray-400);margin:1.25rem 0 0.5rem;padding-bottom:0.35rem;border-bottom:1px solid var(--border);">' + text + '</div>';
  }

  function renderEditPatientForm(patient) {
    var html = '<div class="inline-form-card mb-2">';
    html += '<div class="inline-form-header">';
    html += '<button class="back-btn" id="edit-patient-back">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>';
    html += '</button>';
    html += '<h3>Edit Patient Info</h3>';
    html += '</div>';
    html += '<div class="inline-form-body">';
    html += '<form id="edit-patient-form">';

    // -- Personal --
    html += editSectionLabel('Personal');
    html += '<div class="form-group"><label>Full Name</label>';
    html += '<input type="text" name="name" value="' + Utils.escapeHtml(patient.name || '') + '" required></div>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>Date of Birth</label>';
    html += Utils.dobPickerHtml(patient.dob || '');
    html += '</div>';
    html += '<div class="form-group"><label>Gender</label>';
    html += '<select name="gender">';
    html += '<option value="">Select...</option>';
    html += '<option value="male"' + (patient.gender === 'male' ? ' selected' : '') + '>Male</option>';
    html += '<option value="female"' + (patient.gender === 'female' ? ' selected' : '') + '>Female</option>';
    html += '<option value="other"' + (patient.gender === 'other' ? ' selected' : '') + '>Other</option>';
    html += '</select></div>';
    html += '</div>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>Phone</label>';
    html += '<div class="phone-input-wrap">';
    html += '<input type="text" name="phoneCode" class="phone-code-input" value="' + Utils.escapeHtml(patient.phoneCode || Utils.getPhoneCode()) + '" maxlength="5">';
    html += '<input type="tel" name="phone" class="phone-number-input" value="' + Utils.escapeHtml(patient.phone || '') + '" maxlength="' + Utils.getPhoneDigits() + '">';
    html += '</div></div>';
    html += '<div class="form-group"><label>Email</label>';
    html += '<input type="email" name="email" value="' + Utils.escapeHtml(patient.email || '') + '"></div>';
    html += '</div>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>Address</label>';
    html += '<input type="text" name="address" value="' + Utils.escapeHtml(patient.address || '') + '"></div>';
    html += '<div class="form-group"><label>Insurance</label>';
    html += '<input type="text" name="insurance" value="' + Utils.escapeHtml(patient.insurance || '') + '"></div>';
    html += '</div>';
    html += '<div class="form-group"><label>Status</label>';
    html += '<select name="status" style="max-width:200px;">';
    html += '<option value="active"' + (patient.status === 'active' ? ' selected' : '') + '>Active</option>';
    html += '<option value="completed"' + (patient.status === 'completed' ? ' selected' : '') + '>Completed</option>';
    html += '</select></div>';

    // -- Clinical --
    html += editSectionLabel('Clinical');
    html += '<div class="form-group"><label>Diagnosis ' + Utils.micHtml('ep-diagnosis') + '</label>';
    html += '<textarea id="ep-diagnosis" name="diagnosis" rows="2" data-ac="diagnosis">' + Utils.escapeHtml(patient.diagnosis || '') + '</textarea></div>';
    html += '<div class="form-group"><label>Treatment Plan ' + Utils.micHtml('ep-treatplan') + '</label>';
    html += '<textarea id="ep-treatplan" name="treatmentPlan" rows="3" data-ac="treatmentPlan">' + Utils.escapeHtml(patient.treatmentPlan || '') + '</textarea></div>';
    html += '<div class="form-group"><label>Notes ' + Utils.micHtml('ep-notes') + '</label>';
    html += '<textarea id="ep-notes" name="notes" rows="2">' + Utils.escapeHtml(patient.notes || '') + '</textarea></div>';

    // Body diagram
    if (Store.isFeatureEnabled('bodyDiagram')) {
      html += '<div class="form-group"><label>Affected Body Areas</label>';
      html += '<div class="body-diagram-wrap"><div id="ep-body-diagram"></div></div></div>';
    }

    // Tags
    if (Store.isFeatureEnabled('tags')) {
      var formTags = Store.getTags();
      var patientTags = patient.tags || [];
      html += '<div class="form-group"><label>Tags</label><div class="tag-pill-group">';
      for (var ti = 0; ti < formTags.length; ti++) {
        var isChecked = patientTags.indexOf(formTags[ti].id) !== -1;
        var tagColor = formTags[ti].color || '#6b7280';
        html += '<button type="button" class="tag-pill' + (isChecked ? ' active' : '') + '" data-tag-id="' + formTags[ti].id + '" data-color="' + tagColor + '"' + (isChecked ? ' style="background:' + tagColor + ';color:#fff;border-color:' + tagColor + ';"' : '') + '>';
        html += '<span class="tag-pill-dot" style="background:' + tagColor + ';"></span>';
        html += Utils.escapeHtml(formTags[ti].name);
        html += '</button>';
      }
      html += '</div></div>';
    }

    // -- Emergency --
    html += editSectionLabel('Emergency Contact');
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>Contact Name</label>';
    html += '<input type="text" name="emergencyContact" value="' + Utils.escapeHtml(patient.emergencyContact || '') + '"></div>';
    html += '<div class="form-group"><label>Contact Phone</label>';
    html += '<div class="phone-input-wrap">';
    html += '<input type="text" name="emergencyPhoneCode" class="phone-code-input" value="' + Utils.escapeHtml(patient.emergencyPhoneCode || Utils.getPhoneCode()) + '" maxlength="5">';
    html += '<input type="tel" name="emergencyPhone" class="phone-number-input" value="' + Utils.escapeHtml(patient.emergencyPhone || '') + '" maxlength="' + Utils.getPhoneDigits() + '">';
    html += '</div></div>';
    html += '</div>';

    html += '</form>';
    html += '</div>';
    html += '<div class="inline-form-actions">';
    html += '<button class="btn btn-secondary" id="edit-patient-cancel">Cancel</button>';
    html += '<button class="btn btn-primary" id="edit-patient-save">Save Changes</button>';
    html += '</div></div>';
    return html;
  }

  // ==================== PRINT OPTIONS (inline collapsible) ====================
  function renderPrintOptions(patient) {
    var bills = Store.getBillingByPatient(patient.id);
    bills.sort(function(a, b) { return a.date > b.date ? -1 : 1; });

    var html = '<div class="inline-form-card mb-2" id="print-options-panel">';
    html += '<div class="inline-form-header">';
    html += '<button class="back-btn" id="print-options-close">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>';
    html += '</button>';
    html += '<h3>Print Report</h3>';
    html += '</div>';
    html += '<div class="inline-form-body">';

    html += '<div style="margin-bottom:1rem;">';
    html += '<h4 style="margin-bottom:0.75rem;">Report Type</h4>';
    html += '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;">';
    html += '<button class="btn btn-primary print-type-btn active" data-type="patient">Patient Report</button>';
    html += '<button class="btn btn-secondary print-type-btn" data-type="billing">Billing Report</button>';
    html += '<button class="btn btn-secondary print-type-btn" data-type="combined">Combined Report</button>';
    html += '</div></div>';

    html += '<div id="print-patient-opts">';
    html += '<h4 style="margin-bottom:0.5rem;">Select Sections</h4>';
    html += '<div class="tag-checkboxes">';
    html += '<label class="tag-checkbox-item checked"><input type="checkbox" class="print-section" value="info" checked> Patient Info</label>';
    html += '<label class="tag-checkbox-item checked"><input type="checkbox" class="print-section" value="diagnosis" checked> Diagnosis & Plan</label>';
    html += '<label class="tag-checkbox-item checked"><input type="checkbox" class="print-section" value="body" checked> Body Diagram</label>';
    html += '<label class="tag-checkbox-item checked"><input type="checkbox" class="print-section" value="sessions" checked> Sessions</label>';
    html += '<label class="tag-checkbox-item checked"><input type="checkbox" class="print-section" value="exercises" checked> Exercises</label>';
    html += '<label class="tag-checkbox-item checked"><input type="checkbox" class="print-section" value="prescriptions" checked> Prescriptions</label>';
    html += '</div>';
    html += '<h4 style="margin:0.75rem 0 0.5rem;">Signatures</h4>';
    html += '<div class="tag-checkboxes">';
    html += '<label class="tag-checkbox-item checked"><input type="checkbox" class="print-sig" value="doctor" checked> Doctor Signature</label>';
    html += '<label class="tag-checkbox-item"><input type="checkbox" class="print-sig" value="patient"> Patient Signature</label>';
    html += '</div></div>';

    html += '<div id="print-billing-opts" style="display:none;">';
    html += '<h4 style="margin-bottom:0.5rem;">Billing Type</h4>';
    html += '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.75rem;">';
    html += '<label class="tag-checkbox-item checked"><input type="radio" name="bill-type" value="statement" checked> Full Statement</label>';
    html += '<label class="tag-checkbox-item"><input type="radio" name="bill-type" value="single"> Single Invoice</label>';
    html += '</div>';
    html += '<div id="print-invoice-picker" style="display:none;margin-top:0.75rem;">';
    html += '<label style="font-size:0.82rem;font-weight:600;margin-bottom:0.4rem;display:block;">Select Invoice</label>';
    html += '<select id="print-invoice-select" style="width:100%;padding:0.55rem 0.75rem;border:1px solid #d1d5db;border-radius:8px;background:#fff;font-size:0.85rem;">';
    for (var i = 0; i < bills.length; i++) {
      html += '<option value="' + bills[i].id + '">' + Utils.formatDate(bills[i].date) + ' - ' + Utils.escapeHtml(bills[i].description) + ' - ' + Utils.formatCurrency(bills[i].amount) + '</option>';
    }
    html += '</select></div>';
    html += '</div>';

    html += '</div>';
    html += '<div class="inline-form-actions">';
    html += '<button class="btn btn-secondary" id="print-cancel-btn">Cancel</button>';
    html += '<button class="btn btn-primary" id="print-go-btn">';
    html += '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>';
    html += ' Print</button>';
    html += '</div></div>';
    return html;
  }

  // ==================== HISTORY TAB ====================
  function renderHistory(patient) {
    var events = [];

    // Appointments
    var appts = Store.getAppointmentsByPatient(patient.id);
    for (var a = 0; a < appts.length; a++) {
      var ap = appts[a];
      var apSummary = ap.type + ' - ' + Utils.formatTime(ap.time) + ' (' + ap.duration + ' min)';
      if (ap.notes) apSummary += ' - ' + ap.notes.substring(0, 80);
      events.push({
        date: ap.date,
        time: ap.time || '00:00',
        type: 'appointment',
        badge: 'badge-appointment',
        label: 'Appt',
        summary: '<strong>' + ap.status.charAt(0).toUpperCase() + ap.status.slice(1) + '</strong>: ' + Utils.escapeHtml(apSummary)
      });
    }

    // Sessions/Treatment Notes
    var sessions = Store.getSessionsByPatient(patient.id);
    for (var s = 0; s < sessions.length; s++) {
      var sn = sessions[s];
      var snText = '';
      if (sn.subjective) snText += 'S: ' + sn.subjective.substring(0, 60) + '... ';
      if (sn.assessment) snText += 'A: ' + sn.assessment.substring(0, 60);
      events.push({
        date: sn.date,
        time: '10:00',
        type: 'session',
        badge: 'badge-session',
        label: 'Note',
        summary: '<strong>Pain ' + (sn.painScore || 0) + '/10, Func ' + (sn.functionScore || 0) + '/10</strong> - ' + Utils.escapeHtml(snText || 'Treatment note recorded')
      });
    }

    // Prescriptions
    if (Store.isFeatureEnabled('prescriptions')) {
      var rxs = Store.getPrescriptionsByPatient(patient.id);
      for (var r = 0; r < rxs.length; r++) {
        var rx = rxs[r];
        events.push({
          date: rx.date,
          time: '12:00',
          type: 'rx',
          badge: 'badge-rx',
          label: 'Rx',
          summary: '<strong>' + Utils.escapeHtml(rx.medication) + '</strong> ' + Utils.escapeHtml(rx.dosage || '') + ' - ' + Utils.escapeHtml(rx.status)
        });
      }
    }

    // Billing
    if (Store.isFeatureEnabled('billing')) {
      var bills = Store.getBillingByPatient(patient.id);
      for (var b = 0; b < bills.length; b++) {
        var bill = bills[b];
        events.push({
          date: bill.date,
          time: '14:00',
          type: 'billing',
          badge: 'badge-billing',
          label: 'Bill',
          summary: '<strong>' + Utils.formatCurrency(bill.amount) + '</strong> - ' + Utils.escapeHtml(bill.description) + ' (' + bill.status + ')'
        });
      }
    }

    // Exercises
    if (Store.isFeatureEnabled('exercises')) {
      var exs = Store.getExercisesByPatient(patient.id);
      for (var e = 0; e < exs.length; e++) {
        var ex = exs[e];
        var exDate = ex.createdAt ? ex.createdAt.substring(0, 10) : Utils.today();
        events.push({
          date: exDate,
          time: '11:00',
          type: 'exercise',
          badge: 'badge-exercise',
          label: 'HEP',
          summary: '<strong>' + Utils.escapeHtml(ex.name) + '</strong> - ' + ex.sets + ' x ' + ex.reps + ' (' + Utils.escapeHtml(ex.status) + ')'
        });
      }
    }

    // Sort by date desc, then time desc
    events.sort(function(a, b) {
      if (a.date !== b.date) return a.date > b.date ? -1 : 1;
      return a.time > b.time ? -1 : 1;
    });

    var html = '<div class="flex-between mb-2">';
    html += '<h3 style="font-size:1rem;">Patient History (' + events.length + ' events)</h3>';
    html += '</div>';

    if (events.length === 0) {
      html += '<div class="empty-state"><p>No history yet</p></div>';
      return html;
    }

    // Group by date
    var currentDate = '';
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      if (ev.date !== currentDate) {
        if (currentDate) html += '</div>'; // close previous group
        currentDate = ev.date;
        html += '<div class="timeline-group">';
        html += '<div class="timeline-date">' + Utils.formatDate(ev.date) + '</div>';
      }
      html += '<div class="timeline-item">';
      html += '<span class="timeline-badge ' + ev.badge + '">' + ev.label + '</span>';
      html += '<div class="timeline-summary">' + ev.summary + '</div>';
      html += '</div>';
    }
    if (currentDate) html += '</div>'; // close last group

    return html;
  }

  // ==================== SESSIONS TAB ====================
  function renderSessions(patient) {
    if (sub.sessionsView === 'form') {
      return renderSessionForm(patient);
    }

    var sessions = Store.getSessionsByPatient(patient.id);
    sessions.sort(function(a, b) { return a.date > b.date ? -1 : 1; });

    var html = '<div class="flex-between mb-2">';
    html += '<h3 style="font-size:1rem;">Treatment Notes (' + sessions.length + ')</h3>';
    html += '<button class="btn btn-primary btn-sm" id="add-session-btn">Add Treatment Note</button>';
    html += '</div>';

    if (sessions.length === 0) {
      html += '<div class="empty-state"><p>No treatment notes yet</p><p class="empty-sub">Click "Add Treatment Note" to record the first session.</p></div>';
    } else {
      for (var i = 0; i < sessions.length; i++) {
        var s = sessions[i];
        html += '<div class="soap-card">';
        html += '<div class="soap-card-header">';
        html += '<span class="date">' + Utils.formatDate(s.date) + '</span>';
        html += '<div class="scores">';
        html += '<span class="score-item">Pain: <strong>' + (s.painScore || 0) + '/10</strong></span>';
        html += '<span class="score-item">Function: <strong>' + (s.functionScore || 0) + '/10</strong></span>';
        html += '<button class="btn btn-sm btn-ghost edit-session-btn" data-id="' + s.id + '">Edit</button>';
        html += '<button class="btn btn-sm btn-ghost delete-session-btn" data-id="' + s.id + '" style="color:var(--danger);">Delete</button>';
        html += '</div></div>';
        html += '<div class="soap-card-body">';
        html += soapSection('Subjective', 's', s.subjective);
        html += soapSection('Objective', 'o', s.objective);
        html += soapSection('Assessment', 'a', s.assessment);
        html += soapSection('Plan', 'p', s.plan);
        html += '</div></div>';
      }
    }
    return html;
  }

  function renderSessionForm(patient) {
    var session = sub.sessionsEditId ? Store.getSession(sub.sessionsEditId) : null;
    var title = session ? 'Edit Treatment Note' : 'New Treatment Note';

    var html = '<div class="inline-form-card">';
    html += '<div class="inline-form-header">';
    html += '<button class="back-btn" id="session-form-back">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>';
    html += '</button>';
    html += '<h3>' + title + '</h3>';
    html += '</div>';
    html += '<div class="inline-form-body">';
    html += '<form id="session-form">';
    var defaultSessionDate = session ? session.date : (_sessionDateParam || Utils.today());
    _sessionDateParam = null; // consume param

    html += '<div class="form-row-3">';
    html += '<div class="form-group"><label>Date</label>';
    html += '<input type="date" name="date" value="' + defaultSessionDate + '" required></div>';
    html += '<div class="form-group"><label>Pain Score (0-10)</label>';
    html += '<input type="number" name="painScore" min="0" max="10" value="' + (session ? session.painScore : '5') + '" required></div>';
    html += '<div class="form-group"><label>Function Score (0-10)</label>';
    html += '<input type="number" name="functionScore" min="0" max="10" value="' + (session ? session.functionScore : '5') + '" required></div>';
    html += '</div>';
    html += '<div class="form-group"><label>Subjective ' + Utils.micHtml('sf-subjective') + '</label>';
    html += '<textarea id="sf-subjective" name="subjective" rows="3" data-ac="subjective" placeholder="Patient report, symptoms, functional status...">' + Utils.escapeHtml(session ? session.subjective || '' : '') + '</textarea></div>';
    html += '<div class="form-group"><label>Objective ' + Utils.micHtml('sf-objective') + '</label>';
    html += '<textarea id="sf-objective" name="objective" rows="3" data-ac="objective" placeholder="Measurements, ROM, strength, observations...">' + Utils.escapeHtml(session ? session.objective || '' : '') + '</textarea></div>';
    html += '<div class="form-group"><label>Assessment ' + Utils.micHtml('sf-assessment') + '</label>';
    html += '<textarea id="sf-assessment" name="assessment" rows="3" data-ac="assessment" placeholder="Clinical reasoning, progress, prognosis...">' + Utils.escapeHtml(session ? session.assessment || '' : '') + '</textarea></div>';
    html += '<div class="form-group"><label>Plan ' + Utils.micHtml('sf-plan') + '</label>';
    html += '<textarea id="sf-plan" name="plan" rows="3" data-ac="plan" placeholder="Treatment plan, goals, next steps...">' + Utils.escapeHtml(session ? session.plan || '' : '') + '</textarea></div>';
    html += '</form>';
    html += '</div>';
    html += '<div class="inline-form-actions">';
    html += '<button class="btn btn-secondary" id="session-form-cancel">Cancel</button>';
    html += '<button class="btn btn-primary" id="session-form-save">Save Treatment Note</button>';
    html += '</div></div>';
    return html;
  }

  function soapSection(label, prefix, text) {
    return '<div class="soap-section"><div class="soap-label ' + prefix + '-label">' + label + '</div>' +
      '<div class="soap-text">' + Utils.escapeHtml(text || '-') + '</div></div>';
  }

  // ==================== EXERCISES TAB ====================
  function renderExercises(patient) {
    if (sub.exercisesView === 'form') {
      return renderExerciseForm(patient);
    }

    var exercises = Store.getExercisesByPatient(patient.id);
    var active = [];
    var inactive = [];
    for (var i = 0; i < exercises.length; i++) {
      if (exercises[i].status === 'active') active.push(exercises[i]);
      else inactive.push(exercises[i]);
    }

    var html = '<div class="flex-between mb-2">';
    html += '<h3 style="font-size:1rem;">Home Exercise Program (' + exercises.length + ')</h3>';
    html += '<div class="btn-group">';
    html += '<button class="btn btn-secondary btn-sm" id="print-exercises-btn">';
    html += '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>';
    html += ' Print</button>';
    html += '<button class="btn btn-primary btn-sm" id="add-exercise-btn">Add Exercise</button>';
    html += '</div></div>';

    if (exercises.length === 0) {
      html += '<div class="empty-state"><p>No exercises prescribed</p></div>';
    } else {
      if (active.length > 0) {
        html += '<h4 style="font-size:0.85rem;color:var(--gray-500);margin-bottom:0.5rem;">Active Exercises</h4>';
        for (var j = 0; j < active.length; j++) {
          html += exerciseCard(active[j]);
        }
      }
      if (inactive.length > 0) {
        html += '<h4 style="font-size:0.85rem;color:var(--gray-500);margin:1rem 0 0.5rem;">Discontinued</h4>';
        for (var k = 0; k < inactive.length; k++) {
          html += exerciseCard(inactive[k]);
        }
      }
    }

    // Print-only section
    html += '<div class="print-only" style="margin-top:2rem;">';
    html += '<h2 style="text-align:center;margin-bottom:1rem;">Home Exercise Program</h2>';
    html += '<p><strong>Patient:</strong> ' + Utils.escapeHtml(patient.name) + '</p>';
    html += '<p><strong>Date:</strong> ' + Utils.formatDate(Utils.today()) + '</p>';
    html += '<hr style="margin:1rem 0;">';
    for (var l = 0; l < active.length; l++) {
      var ex = active[l];
      html += '<div style="margin-bottom:1rem;page-break-inside:avoid;">';
      html += '<h4>' + (l + 1) + '. ' + Utils.escapeHtml(ex.name) + '</h4>';
      html += '<p>' + ex.sets + ' sets x ' + ex.reps + ' reps | Hold: ' + (ex.hold || '-') + ' | Frequency: ' + (ex.frequency || '-') + '</p>';
      html += '<p>' + Utils.escapeHtml(ex.instructions || '') + '</p>';
      html += '</div>';
    }
    html += '</div>';

    return html;
  }

  function renderExerciseForm(patient) {
    var exercise = sub.exercisesEditId ? Store.getExercises().filter(function(e) { return e.id === sub.exercisesEditId; })[0] : null;
    var title = exercise ? 'Edit Exercise' : 'New Exercise';

    var html = '<div class="inline-form-card">';
    html += '<div class="inline-form-header">';
    html += '<button class="back-btn" id="exercise-form-back">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>';
    html += '</button>';
    html += '<h3>' + title + '</h3>';
    html += '</div>';
    html += '<div class="inline-form-body">';
    html += '<form id="exercise-form">';
    html += '<div class="form-group"><label>Exercise Name</label>';
    html += '<input type="text" name="name" value="' + Utils.escapeHtml(exercise ? exercise.name : '') + '" required placeholder="e.g., Quad Sets"></div>';
    html += '<div class="form-row-4">';
    html += '<div class="form-group"><label>Sets</label>';
    html += '<input type="text" name="sets" value="' + Utils.escapeHtml(exercise ? exercise.sets : '3') + '" placeholder="3"></div>';
    html += '<div class="form-group"><label>Reps</label>';
    html += '<input type="text" name="reps" value="' + Utils.escapeHtml(exercise ? exercise.reps : '10') + '" placeholder="10"></div>';
    html += '<div class="form-group"><label>Hold</label>';
    html += '<input type="text" name="hold" value="' + Utils.escapeHtml(exercise ? exercise.hold : '') + '" placeholder="5 sec"></div>';
    html += '<div class="form-group"><label>Frequency</label>';
    html += '<input type="text" name="frequency" value="' + Utils.escapeHtml(exercise ? exercise.frequency : '') + '" placeholder="2x daily"></div>';
    html += '</div>';
    html += '<div class="form-group"><label>Instructions ' + Utils.micHtml('ef-instructions') + '</label>';
    html += '<textarea id="ef-instructions" name="instructions" rows="4" placeholder="Step-by-step instructions for the patient...">' + Utils.escapeHtml(exercise ? exercise.instructions || '' : '') + '</textarea></div>';
    html += '<div class="form-group"><label>Status</label>';
    html += '<select name="status">';
    html += '<option value="active"' + (exercise && exercise.status === 'active' ? ' selected' : '') + '>Active</option>';
    html += '<option value="discontinued"' + (exercise && exercise.status === 'discontinued' ? ' selected' : '') + '>Discontinued</option>';
    html += '</select></div>';
    html += '</form>';
    html += '</div>';
    html += '<div class="inline-form-actions">';
    html += '<button class="btn btn-secondary" id="exercise-form-cancel">Cancel</button>';
    html += '<button class="btn btn-primary" id="exercise-form-save">Save Exercise</button>';
    html += '</div></div>';
    return html;
  }

  function exerciseCard(ex) {
    var html = '<div class="exercise-card">';
    html += '<div class="exercise-info">';
    html += '<div class="exercise-name">' + Utils.escapeHtml(ex.name) + '</div>';
    html += '<div class="exercise-details">' + ex.sets + ' sets x ' + ex.reps + ' reps';
    if (ex.hold && ex.hold !== '-') html += ' | Hold: ' + ex.hold;
    if (ex.frequency) html += ' | ' + ex.frequency;
    html += '</div>';
    if (ex.instructions) {
      html += '<div class="exercise-instructions">' + Utils.escapeHtml(ex.instructions) + '</div>';
    }
    html += '</div>';
    html += '<div class="exercise-actions">';
    html += '<button class="btn btn-sm btn-ghost edit-exercise-btn" data-id="' + ex.id + '">Edit</button>';
    html += '<button class="btn btn-sm btn-ghost delete-exercise-btn" data-id="' + ex.id + '" style="color:var(--danger);">Delete</button>';
    html += '</div></div>';
    return html;
  }

  // ==================== PRESCRIPTIONS TAB ====================
  function renderPrescriptions(patient) {
    if (sub.rxView === 'form') {
      return renderPrescriptionForm(patient);
    }

    var prescriptions = Store.getPrescriptionsByPatient(patient.id);
    var active = [];
    var discontinued = [];
    for (var i = 0; i < prescriptions.length; i++) {
      if (prescriptions[i].status === 'active') active.push(prescriptions[i]);
      else discontinued.push(prescriptions[i]);
    }
    active.sort(function(a, b) { return a.date > b.date ? -1 : 1; });
    discontinued.sort(function(a, b) { return a.date > b.date ? -1 : 1; });

    var html = '<div class="flex-between mb-2">';
    html += '<h3 style="font-size:1rem;">Prescriptions (' + prescriptions.length + ')</h3>';
    html += '<div class="btn-group">';
    html += '<button class="btn btn-secondary btn-sm" id="print-rx-btn">';
    html += '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>';
    html += ' Print</button>';
    html += '<button class="btn btn-primary btn-sm" id="add-rx-btn">Add Prescription</button>';
    html += '</div></div>';

    // Rx print options (inline collapsible)
    if (sub.rxPrintExpanded) {
      html += renderRxPrintOptions(patient);
    }

    if (prescriptions.length === 0) {
      html += '<div class="empty-state"><p>No prescriptions yet</p><p class="empty-sub">Click "Add Prescription" to add medication details.</p></div>';
    } else {
      if (active.length > 0) {
        html += '<h4 style="font-size:0.85rem;color:var(--success);margin-bottom:0.5rem;">Active Medications (' + active.length + ')</h4>';
        for (var j = 0; j < active.length; j++) {
          html += rxCard(active[j]);
        }
      }
      if (discontinued.length > 0) {
        html += '<h4 style="font-size:0.85rem;color:var(--gray-500);margin:1rem 0 0.5rem;">Discontinued (' + discontinued.length + ')</h4>';
        for (var k = 0; k < discontinued.length; k++) {
          html += rxCard(discontinued[k]);
        }
      }
    }

    return html;
  }

  function renderPrescriptionForm(patient) {
    var rx = sub.rxEditId ? Store.getPrescription(sub.rxEditId) : null;
    var title = rx ? 'Edit Prescription' : 'New Prescription';
    var user = App.getCurrentUser();
    var doctorName = user ? user.name : 'Dr. Admin';

    var html = '<div class="inline-form-card">';
    html += '<div class="inline-form-header">';
    html += '<button class="back-btn" id="rx-form-back">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>';
    html += '</button>';
    html += '<h3>' + title + '</h3>';
    html += '</div>';
    html += '<div class="inline-form-body">';
    html += '<form id="rx-form">';
    html += '<div class="form-group"><label>Medication Name ' + Utils.micHtml('rx-medication') + '</label>';
    html += '<input type="text" id="rx-medication" name="medication" value="' + Utils.escapeHtml(rx ? rx.medication : '') + '" required placeholder="e.g., Aceclofenac"></div>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>Dosage</label>';
    html += '<input type="text" name="dosage" value="' + Utils.escapeHtml(rx ? rx.dosage : '') + '" required placeholder="e.g., 100mg"></div>';
    html += '<div class="form-group"><label>Route</label>';
    html += '<select name="route">';
    var routes = ['Oral', 'Topical', 'Intramuscular', 'Intravenous', 'Subcutaneous', 'Inhalation', 'Sublingual', 'Rectal', 'Transdermal'];
    for (var r = 0; r < routes.length; r++) {
      html += '<option value="' + routes[r] + '"' + (rx && rx.route === routes[r] ? ' selected' : '') + '>' + routes[r] + '</option>';
    }
    html += '</select></div>';
    html += '</div>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>Frequency</label>';
    html += '<input type="text" name="frequency" value="' + Utils.escapeHtml(rx ? rx.frequency : '') + '" required placeholder="e.g., Twice daily (after meals)"></div>';
    html += '<div class="form-group"><label>Duration</label>';
    html += '<input type="text" name="duration" value="' + Utils.escapeHtml(rx ? rx.duration : '') + '" required placeholder="e.g., 7 days"></div>';
    html += '</div>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>Date</label>';
    html += '<input type="date" name="date" value="' + (rx ? rx.date : Utils.today()) + '" required></div>';
    html += '<div class="form-group"><label>Prescribed By</label>';
    html += '<input type="text" name="prescribedBy" value="' + Utils.escapeHtml(rx ? rx.prescribedBy : doctorName) + '"></div>';
    html += '</div>';
    html += '<div class="form-group"><label>Special Instructions ' + Utils.micHtml('rx-instructions') + '</label>';
    html += '<textarea id="rx-instructions" name="instructions" rows="3" placeholder="e.g., Take after food. Avoid on empty stomach...">' + Utils.escapeHtml(rx ? rx.instructions || '' : '') + '</textarea></div>';
    html += '<div class="form-group"><label>Status</label>';
    html += '<select name="status">';
    html += '<option value="active"' + (rx && rx.status === 'active' ? ' selected' : '') + '>Active</option>';
    html += '<option value="discontinued"' + (rx && rx.status === 'discontinued' ? ' selected' : '') + '>Discontinued</option>';
    html += '</select></div>';
    html += '</form>';
    html += '</div>';
    html += '<div class="inline-form-actions">';
    html += '<button class="btn btn-secondary" id="rx-form-cancel">Cancel</button>';
    html += '<button class="btn btn-primary" id="rx-form-save">' + (rx ? 'Update' : 'Add') + ' Prescription</button>';
    html += '</div></div>';
    return html;
  }

  function renderRxPrintOptions(patient) {
    var html = '<div class="inline-form-card mb-2" id="rx-print-panel">';
    html += '<div class="inline-form-header">';
    html += '<button class="back-btn" id="rx-print-close">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>';
    html += '</button>';
    html += '<h3>Print Prescription</h3>';
    html += '</div>';
    html += '<div class="inline-form-body">';
    html += '<h4 style="margin-bottom:0.5rem;">Signatures</h4>';
    html += '<div class="tag-checkboxes">';
    html += '<label class="tag-checkbox-item checked"><input type="checkbox" class="rx-sig" value="doctor" checked> Doctor Signature</label>';
    html += '<label class="tag-checkbox-item"><input type="checkbox" class="rx-sig" value="patient"> Patient Signature</label>';
    html += '</div>';
    html += '</div>';
    html += '<div class="inline-form-actions">';
    html += '<button class="btn btn-secondary" id="rx-print-cancel">Cancel</button>';
    html += '<button class="btn btn-primary" id="rx-print-go">';
    html += '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>';
    html += ' Print Prescription</button>';
    html += '</div></div>';
    return html;
  }

  function rxCard(rx) {
    var isActive = rx.status === 'active';
    var html = '<div class="rx-card' + (isActive ? '' : ' discontinued') + '">';
    html += '<div class="rx-card-header">';
    html += '<div class="rx-card-title">';
    html += '<span class="rx-icon">Rx</span>';
    html += '<div>';
    html += '<div class="rx-med-name">' + Utils.escapeHtml(rx.medication) + '</div>';
    html += '<div class="rx-dosage">' + Utils.escapeHtml(rx.dosage) + ' &middot; ' + Utils.escapeHtml(rx.route) + '</div>';
    html += '</div></div>';
    html += '<div class="rx-card-actions">';
    html += '<span class="badge ' + (isActive ? 'badge-success' : 'badge-gray') + '">' + rx.status + '</span>';
    html += '<button class="btn btn-sm btn-ghost edit-rx-btn" data-id="' + rx.id + '">Edit</button>';
    html += '<button class="btn btn-sm btn-ghost delete-rx-btn" data-id="' + rx.id + '" style="color:var(--danger);">Delete</button>';
    html += '</div></div>';
    html += '<div class="rx-card-body">';
    html += '<div class="rx-detail-grid">';
    html += '<div class="rx-detail"><span class="rx-detail-label">Frequency</span><span>' + Utils.escapeHtml(rx.frequency) + '</span></div>';
    html += '<div class="rx-detail"><span class="rx-detail-label">Duration</span><span>' + Utils.escapeHtml(rx.duration) + '</span></div>';
    html += '<div class="rx-detail"><span class="rx-detail-label">Prescribed</span><span>' + Utils.formatDate(rx.date) + '</span></div>';
    html += '<div class="rx-detail"><span class="rx-detail-label">By</span><span>' + Utils.escapeHtml(rx.prescribedBy || '-') + '</span></div>';
    html += '</div>';
    if (rx.instructions) {
      html += '<div class="rx-instructions"><strong>Instructions:</strong> ' + Utils.escapeHtml(rx.instructions) + '</div>';
    }
    html += '</div></div>';
    return html;
  }

  // ==================== BILLING TAB ====================
  function renderBilling(patient) {
    if (sub.billingView === 'form') {
      return renderBillingForm(patient);
    }

    var bills = Store.getBillingByPatient(patient.id);
    bills.sort(function(a, b) { return a.date > b.date ? -1 : 1; });

    var total = 0, paid = 0, pending = 0;
    for (var i = 0; i < bills.length; i++) {
      var amt = parseFloat(bills[i].amount) || 0;
      total += amt;
      if (bills[i].status === 'paid') paid += amt;
      else pending += amt;
    }

    var html = '<div class="flex-between mb-2">';
    html += '<h3 style="font-size:1rem;">Billing History</h3>';
    html += '<button class="btn btn-primary btn-sm" id="add-billing-btn">Add Invoice</button>';
    html += '</div>';

    html += '<div class="billing-summary">';
    html += '<div class="billing-stat total"><h4>Total Billed</h4><div class="amount">' + Utils.formatCurrency(total) + '</div></div>';
    html += '<div class="billing-stat paid"><h4>Paid</h4><div class="amount">' + Utils.formatCurrency(paid) + '</div></div>';
    html += '<div class="billing-stat pending"><h4>Pending</h4><div class="amount">' + Utils.formatCurrency(pending) + '</div></div>';
    html += '</div>';

    html += '<div class="card"><div class="table-wrapper">';
    html += '<table class="data-table"><thead><tr>';
    html += '<th>Date</th><th>Description</th><th>Amount</th><th>Status</th><th>Actions</th>';
    html += '</tr></thead><tbody>';

    if (bills.length === 0) {
      html += '<tr class="no-hover"><td colspan="5"><div class="empty-state"><p>No billing records</p></div></td></tr>';
    } else {
      for (var j = 0; j < bills.length; j++) {
        var b = bills[j];
        var statusCls = b.status === 'paid' ? 'badge-success' : 'badge-warning';
        html += '<tr class="no-hover">';
        html += '<td>' + Utils.formatDate(b.date) + '</td>';
        html += '<td>' + Utils.escapeHtml(b.description) + '</td>';
        html += '<td style="font-weight:600;white-space:nowrap;">' + Utils.formatCurrency(b.amount) + '</td>';
        html += '<td><span class="badge ' + statusCls + '">' + b.status + '</span></td>';
        html += '<td><div class="btn-group">';
        if (b.status === 'pending') {
          html += '<button class="btn btn-sm btn-success mark-paid-btn" data-id="' + b.id + '">Mark Paid</button>';
        }
        html += '<button class="btn btn-sm btn-ghost delete-billing-btn" data-id="' + b.id + '" style="color:var(--danger);">Delete</button>';
        html += '</div></td>';
        html += '</tr>';
      }
    }
    html += '</tbody></table></div></div>';
    return html;
  }

  function renderBillingForm(patient) {
    var html = '<div class="inline-form-card">';
    html += '<div class="inline-form-header">';
    html += '<button class="back-btn" id="billing-form-back">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>';
    html += '</button>';
    html += '<h3>New Invoice</h3>';
    html += '</div>';
    html += '<div class="inline-form-body">';
    html += '<form id="billing-form">';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>Date</label>';
    html += '<input type="date" name="date" value="' + Utils.today() + '" required></div>';
    html += '<div class="form-group"><label>Amount (' + Utils.getCurrencySymbol() + ')</label>';
    html += '<input type="number" name="amount" step="0.01" min="0" value="" required placeholder="0.00"></div>';
    html += '</div>';
    html += '<div class="form-group"><label>Description</label>';
    html += '<input type="text" name="description" required placeholder="e.g., Therapeutic Exercise + Manual Therapy"></div>';
    html += '<div class="form-group"><label>Status</label>';
    html += '<select name="status">';
    html += '<option value="pending">Pending</option>';
    html += '<option value="paid">Paid</option>';
    html += '</select></div>';
    html += '</form>';
    html += '</div>';
    html += '<div class="inline-form-actions">';
    html += '<button class="btn btn-secondary" id="billing-form-cancel">Cancel</button>';
    html += '<button class="btn btn-primary" id="billing-form-save">Create Invoice</button>';
    html += '</div></div>';
    return html;
  }

  // ==================== PRINT FUNCTIONS ====================
  function buildSignatureBlock(signatures) {
    if (!signatures || signatures.length === 0) return '';
    var html = '<div class="print-signature-area">';
    if (signatures.indexOf('patient') !== -1) {
      html += '<div class="print-signature-box">';
      html += '<div class="print-signature-line"></div>';
      html += '<div class="print-signature-label">Patient\'s Signature</div>';
      html += '</div>';
    }
    if (signatures.indexOf('doctor') !== -1) {
      html += '<div class="print-signature-box">';
      html += '<div class="print-signature-line"></div>';
      html += '<div class="print-signature-label">Doctor\'s Signature &amp; Stamp</div>';
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  function executePrint(patient, type, sections, billType, invoiceId, signatures) {
    var html = '';

    html += '<div class="print-report-header">';
    html += '<h1>PhysioClinic</h1>';
    html += '<p>Clinic Management System</p>';
    html += '</div>';

    html += '<div class="print-patient-bar">';
    html += '<strong>' + Utils.escapeHtml(patient.name) + '</strong>';
    html += ' &nbsp;|&nbsp; Phone: ' + Utils.escapeHtml((patient.phoneCode || Utils.getPhoneCode()) + ' ' + (patient.phone || '-'));
    html += ' &nbsp;|&nbsp; DOB: ' + Utils.formatDate(patient.dob) + ' (Age ' + Utils.calculateAge(patient.dob) + ')';
    html += ' &nbsp;|&nbsp; Gender: ' + Utils.escapeHtml(patient.gender || '-');
    html += '</div>';

    if (type === 'patient' || type === 'combined') {
      html += buildPatientReport(patient, sections);
    }

    if (type === 'billing' || type === 'combined') {
      html += buildBillingReport(patient, billType, invoiceId);
    }

    html += buildSignatureBlock(signatures);

    html += '<div class="print-report-footer">';
    html += '<p>Generated on ' + Utils.formatDate(Utils.today()) + ' &nbsp;|&nbsp; PhysioClinic</p>';
    html += '</div>';

    var printDiv = document.getElementById('print-report-area');
    if (!printDiv) {
      printDiv = document.createElement('div');
      printDiv.id = 'print-report-area';
      printDiv.className = 'print-report-area';
      document.body.appendChild(printDiv);
    }
    printDiv.innerHTML = html;
    printDiv.style.cssText = 'display:block !important;position:fixed;left:-9999px;top:0;width:210mm;';
    document.body.classList.add('printing-report');
    setTimeout(function() {
      printDiv.style.cssText = '';
      setTimeout(function() {
        window.print();
        setTimeout(function() {
          printDiv.innerHTML = '';
          document.body.classList.remove('printing-report');
        }, 500);
      }, 100);
    }, 200);
  }

  function printPrescriptionPad(patient, signatures) {
    var prescriptions = Store.getPrescriptionsByPatient(patient.id);
    var active = prescriptions.filter(function(rx) { return rx.status === 'active'; });
    active.sort(function(a, b) { return a.date > b.date ? -1 : 1; });

    var html = '<div class="print-report-header">';
    html += '<h1>PhysioClinic</h1>';
    html += '<p>Physiotherapy & Rehabilitation Centre</p>';
    html += '</div>';

    html += '<div class="print-patient-bar">';
    html += '<strong>' + Utils.escapeHtml(patient.name) + '</strong>';
    html += ' &nbsp;|&nbsp; Phone: ' + Utils.escapeHtml((patient.phoneCode || Utils.getPhoneCode()) + ' ' + (patient.phone || '-'));
    html += ' &nbsp;|&nbsp; Age/Gender: ' + Utils.calculateAge(patient.dob) + ' yrs / ' + (patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : '-');
    html += ' &nbsp;|&nbsp; Date: ' + Utils.formatDate(Utils.today());
    html += '</div>';

    if (patient.diagnosis) {
      html += '<div style="margin:0.5rem 0;font-size:0.9rem;"><strong>Diagnosis:</strong> ' + Utils.escapeHtml(patient.diagnosis) + '</div>';
    }

    html += '<div style="border-top:1px solid #999;padding-top:0.75rem;margin-top:0.5rem;">';
    html += '<h2 style="font-size:1.2rem;margin-bottom:0.75rem;">Rx</h2>';

    if (active.length === 0) {
      html += '<p style="color:#666;">No active prescriptions.</p>';
    } else {
      for (var i = 0; i < active.length; i++) {
        var rx = active[i];
        html += '<div style="margin-bottom:0.75rem;page-break-inside:avoid;">';
        html += '<div style="font-weight:700;">' + (i + 1) + '. ' + Utils.escapeHtml(rx.medication) + '</div>';
        html += '<div style="padding-left:1.2rem;font-size:0.9rem;">';
        html += Utils.escapeHtml(rx.dosage) + ' &middot; ' + Utils.escapeHtml(rx.route) + ' &middot; ' + Utils.escapeHtml(rx.frequency);
        html += ' &middot; Duration: ' + Utils.escapeHtml(rx.duration);
        if (rx.instructions) html += '<br><em style="color:#555;">' + Utils.escapeHtml(rx.instructions) + '</em>';
        html += '</div></div>';
      }
    }
    html += '</div>';

    html += buildSignatureBlock(signatures);

    html += '<div class="print-report-footer">';
    html += '<p>Generated on ' + Utils.formatDate(Utils.today()) + ' &nbsp;|&nbsp; PhysioClinic</p>';
    html += '</div>';

    var printDiv = document.getElementById('print-report-area');
    if (!printDiv) {
      printDiv = document.createElement('div');
      printDiv.id = 'print-report-area';
      printDiv.className = 'print-report-area';
      document.body.appendChild(printDiv);
    }
    printDiv.innerHTML = html;
    printDiv.style.cssText = 'display:block !important;position:fixed;left:-9999px;top:0;width:210mm;';
    document.body.classList.add('printing-report');
    setTimeout(function() {
      printDiv.style.cssText = '';
      setTimeout(function() {
        window.print();
        setTimeout(function() {
          printDiv.innerHTML = '';
          document.body.classList.remove('printing-report');
        }, 500);
      }, 100);
    }, 200);
  }

  function buildPatientReport(patient, sections) {
    var html = '<h2 class="print-section-title">Patient Report</h2>';

    if (sections.indexOf('info') !== -1) {
      html += '<div class="print-section-block">';
      html += '<h3>Patient Information</h3>';
      html += '<table class="print-info-table">';
      html += '<tr><td class="lbl">Full Name</td><td>' + Utils.escapeHtml(patient.name) + '</td>';
      html += '<tr><td class="lbl">Phone</td><td>' + Utils.escapeHtml((patient.phoneCode || Utils.getPhoneCode()) + ' ' + (patient.phone || '-')) + '</td>';
      html += '<td class="lbl">Email</td><td>' + Utils.escapeHtml(patient.email || '-') + '</td></tr>';
      html += '<tr><td class="lbl">Address</td><td colspan="3">' + Utils.escapeHtml(patient.address || '-') + '</td></tr>';
      html += '<tr><td class="lbl">Insurance</td><td>' + Utils.escapeHtml(patient.insurance || '-') + '</td>';
      html += '<td class="lbl">Status</td><td>' + Utils.escapeHtml(patient.status || 'active') + '</td></tr>';
      html += '<tr><td class="lbl">Emergency</td><td>' + Utils.escapeHtml(patient.emergencyContact || '-') + '</td>';
      html += '<td class="lbl">Emergency Ph.</td><td>' + Utils.escapeHtml(patient.emergencyPhone || '-') + '</td></tr>';
      html += '</table></div>';
    }

    if (sections.indexOf('diagnosis') !== -1) {
      html += '<div class="print-section-block">';
      html += '<h3>Diagnosis & Treatment Plan</h3>';
      html += '<p><strong>Diagnosis:</strong> ' + Utils.escapeHtml(patient.diagnosis || '-') + '</p>';
      html += '<p><strong>Treatment Plan:</strong> ' + Utils.escapeHtml(patient.treatmentPlan || '-') + '</p>';
      if (patient.notes) html += '<p><strong>Notes:</strong> ' + Utils.escapeHtml(patient.notes) + '</p>';
      html += '</div>';
    }

    if (sections.indexOf('body') !== -1 && patient.bodyRegions && patient.bodyRegions.length > 0) {
      html += '<div class="print-section-block">';
      html += '<h3>Affected Body Areas</h3>';
      html += BodyDiagram.renderPrintHtml(patient.bodyRegions);
      html += '</div>';
    }

    if (sections.indexOf('sessions') !== -1) {
      var sessions = Store.getSessionsByPatient(patient.id);
      sessions.sort(function(a, b) { return a.date > b.date ? -1 : 1; });
      if (sessions.length > 0) {
        html += '<div class="print-section-block">';
        html += '<h3>Treatment Notes (' + sessions.length + ')</h3>';
        html += '<table class="print-data-table"><thead><tr><th>Date</th><th>Subjective</th><th>Objective</th><th>Assessment</th><th>Plan</th><th>Pain</th></tr></thead><tbody>';
        for (var s = 0; s < sessions.length; s++) {
          var sn = sessions[s];
          html += '<tr>';
          html += '<td style="white-space:nowrap;">' + Utils.formatDate(sn.date) + '</td>';
          html += '<td>' + Utils.escapeHtml(sn.subjective || '-') + '</td>';
          html += '<td>' + Utils.escapeHtml(sn.objective || '-') + '</td>';
          html += '<td>' + Utils.escapeHtml(sn.assessment || '-') + '</td>';
          html += '<td>' + Utils.escapeHtml(sn.plan || '-') + '</td>';
          html += '<td>' + (sn.painLevel != null ? sn.painLevel + '/10' : '-') + '</td>';
          html += '</tr>';
        }
        html += '</tbody></table></div>';
      }
    }

    if (sections.indexOf('exercises') !== -1) {
      var exercises = Store.getExercisesByPatient(patient.id);
      if (exercises.length > 0) {
        html += '<div class="print-section-block">';
        html += '<h3>Home Exercise Program (' + exercises.length + ')</h3>';
        html += '<table class="print-data-table"><thead><tr><th>Exercise</th><th>Sets x Reps</th><th>Frequency</th><th>Instructions</th></tr></thead><tbody>';
        for (var e = 0; e < exercises.length; e++) {
          var ex = exercises[e];
          html += '<tr>';
          html += '<td style="font-weight:600;">' + Utils.escapeHtml(ex.name) + '</td>';
          html += '<td>' + (ex.sets || '-') + ' x ' + (ex.reps || '-') + '</td>';
          html += '<td>' + Utils.escapeHtml(ex.frequency || '-') + '</td>';
          html += '<td>' + Utils.escapeHtml(ex.instructions || '-') + '</td>';
          html += '</tr>';
        }
        html += '</tbody></table></div>';
      }
    }

    if (sections.indexOf('prescriptions') !== -1) {
      var rxs = Store.getPrescriptionsByPatient(patient.id);
      var activeRx = rxs.filter(function(r) { return r.status === 'active'; });
      if (activeRx.length > 0) {
        html += '<div class="print-section-block">';
        html += '<h3>Active Prescriptions (' + activeRx.length + ')</h3>';
        html += '<table class="print-data-table"><thead><tr><th>Medication</th><th>Dosage</th><th>Route</th><th>Frequency</th><th>Duration</th><th>Instructions</th></tr></thead><tbody>';
        for (var p = 0; p < activeRx.length; p++) {
          var rxp = activeRx[p];
          html += '<tr>';
          html += '<td style="font-weight:600;">' + Utils.escapeHtml(rxp.medication) + '</td>';
          html += '<td>' + Utils.escapeHtml(rxp.dosage || '-') + '</td>';
          html += '<td>' + Utils.escapeHtml(rxp.route || '-') + '</td>';
          html += '<td>' + Utils.escapeHtml(rxp.frequency || '-') + '</td>';
          html += '<td>' + Utils.escapeHtml(rxp.duration || '-') + '</td>';
          html += '<td>' + Utils.escapeHtml(rxp.instructions || '-') + '</td>';
          html += '</tr>';
        }
        html += '</tbody></table></div>';
      }
    }

    return html;
  }

  function buildBillingReport(patient, billType, invoiceId) {
    var bills = Store.getBillingByPatient(patient.id);
    bills.sort(function(a, b) { return a.date > b.date ? -1 : 1; });
    var html = '<h2 class="print-section-title">Billing Report</h2>';

    if (billType === 'single' && invoiceId) {
      var bill = null;
      for (var i = 0; i < bills.length; i++) {
        if (bills[i].id === invoiceId) { bill = bills[i]; break; }
      }
      if (bill) {
        html += '<div class="print-invoice">';
        html += '<h3>Invoice</h3>';
        html += '<table class="print-info-table">';
        html += '<tr><td class="lbl">Invoice Date</td><td>' + Utils.formatDate(bill.date) + '</td>';
        html += '<td class="lbl">Status</td><td style="font-weight:600;">' + (bill.status === 'paid' ? 'PAID' : 'PENDING') + '</td></tr>';
        html += '<tr><td class="lbl">Description</td><td colspan="3">' + Utils.escapeHtml(bill.description) + '</td></tr>';
        html += '<tr><td class="lbl">Amount</td><td colspan="3" style="font-size:1.2em;font-weight:700;">' + Utils.formatCurrency(bill.amount) + '</td></tr>';
        if (bill.paidDate) {
          html += '<tr><td class="lbl">Paid Date</td><td colspan="3">' + Utils.formatDate(bill.paidDate) + '</td></tr>';
        }
        html += '</table></div>';
      }
    } else {
      var total = 0, paidAmt = 0, pendingAmt = 0;
      for (var j = 0; j < bills.length; j++) {
        var amt = parseFloat(bills[j].amount) || 0;
        total += amt;
        if (bills[j].status === 'paid') paidAmt += amt;
        else pendingAmt += amt;
      }

      html += '<div class="print-section-block">';
      html += '<table class="print-info-table">';
      html += '<tr><td class="lbl">Total Billed</td><td style="font-weight:700;">' + Utils.formatCurrency(total) + '</td>';
      html += '<td class="lbl">Paid</td><td style="font-weight:700;color:#16a34a;">' + Utils.formatCurrency(paidAmt) + '</td></tr>';
      html += '<tr><td class="lbl">Pending</td><td style="font-weight:700;color:#dc2626;">' + Utils.formatCurrency(pendingAmt) + '</td>';
      html += '<td class="lbl">Total Invoices</td><td>' + bills.length + '</td></tr>';
      html += '</table></div>';

      if (bills.length > 0) {
        html += '<table class="print-data-table"><thead><tr><th>Date</th><th>Description</th><th style="text-align:right;">Amount</th><th>Status</th></tr></thead><tbody>';
        for (var k = 0; k < bills.length; k++) {
          var b = bills[k];
          html += '<tr>';
          html += '<td style="white-space:nowrap;">' + Utils.formatDate(b.date) + '</td>';
          html += '<td>' + Utils.escapeHtml(b.description) + '</td>';
          html += '<td style="text-align:right;font-weight:600;font-variant-numeric:tabular-nums;">' + Utils.formatCurrency(b.amount) + '</td>';
          html += '<td>' + (b.status === 'paid' ? 'Paid' : 'Pending') + '</td>';
          html += '</tr>';
        }
        html += '<tr style="font-weight:700;border-top:2px solid #000;"><td colspan="2" style="text-align:right;">TOTAL</td>';
        html += '<td style="text-align:right;font-variant-numeric:tabular-nums;">' + Utils.formatCurrency(total) + '</td><td></td></tr>';
        html += '</tbody></table>';
      }
    }

    return html;
  }

  // ==================== EVENT BINDING ====================
  function bindEvents(container, patient) {
    if (_clickHandler) {
      container.removeEventListener('click', _clickHandler);
    }
    _clickHandler = function(e) {
      // Tab switching
      var tabBtnEl = e.target.closest('.tab-btn');
      if (tabBtnEl) {
        activeTab = tabBtnEl.getAttribute('data-tab');
        resetSub();
        renderDetail(container, patient);
        return;
      }

      // Print button → toggle inline print options
      if (e.target.closest('#print-patient-btn') || e.target.closest('#print-exercises-btn')) {
        sub.printExpanded = !sub.printExpanded;
        activeTab = 'overview';
        renderDetail(container, patient);
        return;
      }

      // === Sessions ===
      if (e.target.closest('#add-session-btn')) {
        sub.sessionsView = 'form';
        sub.sessionsEditId = null;
        renderDetail(container, patient);
        return;
      }
      var editSessionBtn = e.target.closest('.edit-session-btn');
      if (editSessionBtn) {
        sub.sessionsView = 'form';
        sub.sessionsEditId = editSessionBtn.getAttribute('data-id');
        renderDetail(container, patient);
        return;
      }
      var deleteSessionBtn = e.target.closest('.delete-session-btn');
      if (deleteSessionBtn) {
        var sessDelId = deleteSessionBtn.getAttribute('data-id');
        Utils.inlineConfirm(container, 'Delete this treatment note?', function() {
          Store.deleteSession(sessDelId);
          Utils.toast('Treatment note deleted', 'success');
          renderDetail(container, Store.getPatient(patient.id));
        }, { danger: true });
        return;
      }

      // === Exercises ===
      if (e.target.closest('#add-exercise-btn')) {
        sub.exercisesView = 'form';
        sub.exercisesEditId = null;
        renderDetail(container, patient);
        return;
      }
      var editExBtn = e.target.closest('.edit-exercise-btn');
      if (editExBtn) {
        sub.exercisesView = 'form';
        sub.exercisesEditId = editExBtn.getAttribute('data-id');
        renderDetail(container, patient);
        return;
      }
      var deleteExBtn = e.target.closest('.delete-exercise-btn');
      if (deleteExBtn) {
        var exDelId = deleteExBtn.getAttribute('data-id');
        Utils.inlineConfirm(container, 'Delete this exercise?', function() {
          Store.deleteExercise(exDelId);
          Utils.toast('Exercise deleted', 'success');
          renderDetail(container, Store.getPatient(patient.id));
        }, { danger: true });
        return;
      }

      // === Prescriptions ===
      if (e.target.closest('#add-rx-btn')) {
        sub.rxView = 'form';
        sub.rxEditId = null;
        renderDetail(container, patient);
        return;
      }
      if (e.target.closest('#print-rx-btn')) {
        sub.rxPrintExpanded = !sub.rxPrintExpanded;
        renderDetail(container, patient);
        return;
      }
      var editRxBtn = e.target.closest('.edit-rx-btn');
      if (editRxBtn) {
        sub.rxView = 'form';
        sub.rxEditId = editRxBtn.getAttribute('data-id');
        renderDetail(container, patient);
        return;
      }
      var deleteRxBtn = e.target.closest('.delete-rx-btn');
      if (deleteRxBtn) {
        var rxDelId = deleteRxBtn.getAttribute('data-id');
        Utils.inlineConfirm(container, 'Delete this prescription?', function() {
          Store.deletePrescription(rxDelId);
          Utils.toast('Prescription deleted', 'success');
          renderDetail(container, Store.getPatient(patient.id));
        }, { danger: true });
        return;
      }

      // === Edit Patient Info ===
      if (e.target.closest('#edit-patient-info-btn')) {
        sub.editingPatient = true;
        renderDetail(container, patient);
        return;
      }

      // === Book Next Visit ===
      if (e.target.closest('#book-next-visit-btn')) {
        sub.bookingView = 'form';
        renderDetail(container, patient);
        return;
      }

      // === Billing ===
      if (e.target.closest('#add-billing-btn')) {
        sub.billingView = 'form';
        renderDetail(container, patient);
        return;
      }
      var markPaidBtn = e.target.closest('.mark-paid-btn');
      if (markPaidBtn) {
        Store.updateBilling(markPaidBtn.getAttribute('data-id'), { status: 'paid', paidDate: Utils.today() });
        Utils.toast('Marked as paid', 'success');
        Store.logActivity('Payment received from ' + patient.name);
        renderDetail(container, Store.getPatient(patient.id));
        return;
      }
      var deleteBillingBtn = e.target.closest('.delete-billing-btn');
      if (deleteBillingBtn) {
        var billDelId = deleteBillingBtn.getAttribute('data-id');
        Utils.inlineConfirm(container, 'Delete this billing record?', function() {
          Store.deleteBilling(billDelId);
          Utils.toast('Billing record deleted', 'success');
          renderDetail(container, Store.getPatient(patient.id));
        }, { danger: true });
        return;
      }
    };
    container.addEventListener('click', _clickHandler);
  }

  // ==================== INLINE FORM BINDINGS ====================
  function bindInlineForms(container, patient) {
    // Session form
    var sessionBack = document.getElementById('session-form-back');
    var sessionCancel = document.getElementById('session-form-cancel');
    var sessionSave = document.getElementById('session-form-save');
    if (sessionBack) sessionBack.onclick = function() { sub.sessionsView = 'list'; sub.sessionsEditId = null; renderDetail(container, patient); };
    if (sessionCancel) sessionCancel.onclick = function() { sub.sessionsView = 'list'; sub.sessionsEditId = null; renderDetail(container, patient); };
    if (sessionSave) {
      sessionSave.onclick = function() {
        var form = document.getElementById('session-form');
        var data = Utils.getFormData(form);
        data.painScore = parseInt(data.painScore, 10) || 0;
        data.functionScore = parseInt(data.functionScore, 10) || 0;
        data.patientId = patient.id;
        var session = sub.sessionsEditId ? Store.getSession(sub.sessionsEditId) : null;
        if (session) {
          Store.updateSession(session.id, data);
          Utils.toast('Treatment note updated', 'success');
        } else {
          Store.createSession(data);
          Utils.toast('Treatment note added', 'success');
        }
        sub.sessionsView = 'list';
        sub.sessionsEditId = null;
        renderDetail(container, Store.getPatient(patient.id));
      };
      // Bind mic + autocomplete
      Utils.bindMicButtons(container);
      Utils.bindAllAutocomplete(container);
    }

    // Exercise form
    var exBack = document.getElementById('exercise-form-back');
    var exCancel = document.getElementById('exercise-form-cancel');
    var exSave = document.getElementById('exercise-form-save');
    if (exBack) exBack.onclick = function() { sub.exercisesView = 'list'; sub.exercisesEditId = null; renderDetail(container, patient); };
    if (exCancel) exCancel.onclick = function() { sub.exercisesView = 'list'; sub.exercisesEditId = null; renderDetail(container, patient); };
    if (exSave) {
      exSave.onclick = function() {
        var form = document.getElementById('exercise-form');
        var nameInput = form.querySelector('[name="name"]');
        if (!nameInput.value.trim()) {
          Utils.toast('Exercise name is required', 'error');
          return;
        }
        var data = Utils.getFormData(form);
        data.patientId = patient.id;
        var exercise = sub.exercisesEditId ? Store.getExercises().filter(function(e) { return e.id === sub.exercisesEditId; })[0] : null;
        if (exercise) {
          Store.updateExercise(exercise.id, data);
          Utils.toast('Exercise updated', 'success');
        } else {
          Store.createExercise(data);
          Utils.toast('Exercise added', 'success');
        }
        sub.exercisesView = 'list';
        sub.exercisesEditId = null;
        renderDetail(container, Store.getPatient(patient.id));
      };
      Utils.bindMicButtons(container);
    }

    // Prescription form
    var rxBack = document.getElementById('rx-form-back');
    var rxCancel = document.getElementById('rx-form-cancel');
    var rxSave = document.getElementById('rx-form-save');
    if (rxBack) rxBack.onclick = function() { sub.rxView = 'list'; sub.rxEditId = null; renderDetail(container, patient); };
    if (rxCancel) rxCancel.onclick = function() { sub.rxView = 'list'; sub.rxEditId = null; renderDetail(container, patient); };
    if (rxSave) {
      rxSave.onclick = function() {
        var form = document.getElementById('rx-form');
        var medInput = form.querySelector('[name="medication"]');
        if (!medInput.value.trim()) {
          Utils.toast('Medication name is required', 'error');
          return;
        }
        var data = Utils.getFormData(form);
        data.patientId = patient.id;
        var rx = sub.rxEditId ? Store.getPrescription(sub.rxEditId) : null;
        if (rx) {
          Store.updatePrescription(rx.id, data);
          Utils.toast('Prescription updated', 'success');
        } else {
          Store.createPrescription(data);
          Utils.toast('Prescription added', 'success');
        }
        sub.rxView = 'list';
        sub.rxEditId = null;
        renderDetail(container, Store.getPatient(patient.id));
      };
      Utils.bindMicButtons(container);
    }

    // Billing form
    var billBack = document.getElementById('billing-form-back');
    var billCancel = document.getElementById('billing-form-cancel');
    var billSave = document.getElementById('billing-form-save');
    if (billBack) billBack.onclick = function() { sub.billingView = 'list'; renderDetail(container, patient); };
    if (billCancel) billCancel.onclick = function() { sub.billingView = 'list'; renderDetail(container, patient); };
    if (billSave) {
      billSave.onclick = function() {
        var form = document.getElementById('billing-form');
        var data = Utils.getFormData(form);
        if (!data.description || !data.amount) {
          Utils.toast('Description and amount are required', 'error');
          return;
        }
        data.patientId = patient.id;
        if (data.status === 'paid') data.paidDate = Utils.today();
        Store.createBilling(data);
        Utils.toast('Invoice created', 'success');
        sub.billingView = 'list';
        renderDetail(container, Store.getPatient(patient.id));
      };
    }

    // Book Next Visit form
    var bookBack = document.getElementById('booking-form-back');
    var bookCancel = document.getElementById('booking-form-cancel');
    var bookSave = document.getElementById('booking-form-save');
    if (bookBack) bookBack.onclick = function() { sub.bookingView = 'list'; renderDetail(container, patient); };
    if (bookCancel) bookCancel.onclick = function() { sub.bookingView = 'list'; renderDetail(container, patient); };
    if (bookSave) {
      var _bookDupConfirmed = false;
      bookSave.onclick = function() {
        var form = document.getElementById('next-visit-form');
        var data = Utils.getFormData(form);
        if (!data.date || !data.time) {
          Utils.toast('Date and time are required', 'error');
          return;
        }
        var conflict = Store.hasConflict(data.date, data.time, data.duration);
        if (conflict) {
          var warningEl = document.getElementById('conflict-warning-booking');
          warningEl.textContent = 'Conflict: ' + conflict.patientName + ' already has an appointment at ' + Utils.formatTime(conflict.time) + ' (' + conflict.duration + ' min)';
          warningEl.style.display = 'block';
          return;
        }
        // Duplicate check
        if (!_bookDupConfirmed) {
          var existing = Store.hasDuplicateFutureAppointment(patient.id, null);
          if (existing) {
            var warningEl2 = document.getElementById('conflict-warning-booking');
            warningEl2.innerHTML = 'Patient already has appointment on <strong>' + Utils.formatDate(existing.date) + '</strong> at <strong>' + Utils.formatTime(existing.time) + '</strong>. ' +
              '<br><button class="btn btn-sm btn-warning" id="book-dup-cancel" style="margin-top:0.4rem;">Cancel old & book new</button> ' +
              '<button class="btn btn-sm btn-ghost" id="book-dup-keep" style="margin-top:0.4rem;">Keep both</button>';
            warningEl2.style.display = 'block';
            document.getElementById('book-dup-cancel').onclick = function() {
              Store.updateAppointment(existing.id, { status: 'cancelled' });
              _bookDupConfirmed = true;
              bookSave.click();
            };
            document.getElementById('book-dup-keep').onclick = function() {
              _bookDupConfirmed = true;
              bookSave.click();
            };
            return;
          }
        }
        data.patientId = patient.id;
        data.patientName = patient.name;
        data.status = 'scheduled';
        Store.createAppointment(data);
        Utils.toast('Next visit booked', 'success');
        _bookDupConfirmed = false;
        sub.bookingView = 'list';
        renderDetail(container, Store.getPatient(patient.id));
      };
    }

    // Edit Patient form
    var editPatientBack = document.getElementById('edit-patient-back');
    var editPatientCancel = document.getElementById('edit-patient-cancel');
    var editPatientSave = document.getElementById('edit-patient-save');
    if (editPatientBack) editPatientBack.onclick = function() { sub.editingPatient = false; renderDetail(container, patient); };
    if (editPatientCancel) editPatientCancel.onclick = function() { sub.editingPatient = false; renderDetail(container, patient); };
    if (editPatientSave) {
      editPatientSave.onclick = function() {
        var form = document.getElementById('edit-patient-form');
        var nameInput = form.querySelector('[name="name"]');
        if (!nameInput.value.trim()) {
          Utils.toast('Name is required', 'error');
          return;
        }
        var data = Utils.getFormData(form);
        // Collect tags
        var activePills = form.querySelectorAll('.tag-pill.active');
        data.tags = [];
        for (var tc = 0; tc < activePills.length; tc++) {
          data.tags.push(activePills[tc].getAttribute('data-tag-id'));
        }
        // Collect body regions
        if (Store.isFeatureEnabled('bodyDiagram')) {
          data.bodyRegions = BodyDiagram.getSelected('ep-body-diagram');
        }
        Store.updatePatient(patient.id, data);
        Utils.toast('Patient updated', 'success');
        sub.editingPatient = false;
        renderDetail(container, Store.getPatient(patient.id));
      };
      // Bind mic + autocomplete + DOB picker
      Utils.bindMicButtons(container);
      Utils.bindAllAutocomplete(container);
      Utils.bindDobPicker(container);
      // Body diagram
      if (Store.isFeatureEnabled('bodyDiagram')) {
        var _bodyRegions = (patient.bodyRegions || []).slice();
        BodyDiagram.render('ep-body-diagram', _bodyRegions);
      }
      // Tag pill toggles
      var tagPills = container.querySelectorAll('#edit-patient-form .tag-pill');
      for (var tp = 0; tp < tagPills.length; tp++) {
        tagPills[tp].addEventListener('click', function() {
          var color = this.getAttribute('data-color');
          this.classList.toggle('active');
          if (this.classList.contains('active')) {
            this.style.background = color;
            this.style.color = '#fff';
            this.style.borderColor = color;
          } else {
            this.style.background = '';
            this.style.color = '';
            this.style.borderColor = '';
          }
        });
      }
    }

    // Print options panel
    var printClose = document.getElementById('print-options-close');
    var printCancelBtn = document.getElementById('print-cancel-btn');
    if (printClose) printClose.onclick = function() { sub.printExpanded = false; renderDetail(container, patient); };
    if (printCancelBtn) printCancelBtn.onclick = function() { sub.printExpanded = false; renderDetail(container, patient); };

    // Print type toggle
    var typeBtns = container.querySelectorAll('.print-type-btn');
    var currentPrintType = 'patient';
    for (var t = 0; t < typeBtns.length; t++) {
      typeBtns[t].addEventListener('click', function() {
        for (var x = 0; x < typeBtns.length; x++) { typeBtns[x].className = 'btn btn-secondary print-type-btn'; }
        this.className = 'btn btn-primary print-type-btn active';
        currentPrintType = this.getAttribute('data-type');
        var patOpts = document.getElementById('print-patient-opts');
        var billOpts = document.getElementById('print-billing-opts');
        if (patOpts) patOpts.style.display = currentPrintType === 'patient' || currentPrintType === 'combined' ? '' : 'none';
        if (billOpts) billOpts.style.display = currentPrintType === 'billing' || currentPrintType === 'combined' ? '' : 'none';
      });
    }

    // Billing type radio toggle
    var radios = container.querySelectorAll('[name="bill-type"]');
    for (var r = 0; r < radios.length; r++) {
      radios[r].addEventListener('change', function() {
        for (var rr = 0; rr < radios.length; rr++) {
          radios[rr].parentElement.classList.toggle('checked', radios[rr].checked);
        }
        var picker = document.getElementById('print-invoice-picker');
        if (picker) picker.style.display = this.value === 'single' ? 'block' : 'none';
      });
    }

    // Checkbox visual toggle (print sections + sigs)
    var checks = container.querySelectorAll('.print-section, .print-sig, .rx-sig');
    for (var c = 0; c < checks.length; c++) {
      checks[c].addEventListener('change', function() {
        this.parentElement.classList.toggle('checked', this.checked);
      });
    }

    // Print go button
    var printGoBtn = document.getElementById('print-go-btn');
    if (printGoBtn) {
      printGoBtn.onclick = function() {
        var sections = [];
        var secChks = container.querySelectorAll('.print-section');
        for (var i = 0; i < secChks.length; i++) { if (secChks[i].checked) sections.push(secChks[i].value); }
        var billTypeRadio = container.querySelector('[name="bill-type"]:checked');
        var billType = billTypeRadio ? billTypeRadio.value : 'statement';
        var invoiceSel = document.getElementById('print-invoice-select');
        var invoiceId = invoiceSel ? invoiceSel.value : '';
        var signatures = [];
        var sigChks = container.querySelectorAll('.print-sig');
        for (var si = 0; si < sigChks.length; si++) { if (sigChks[si].checked) signatures.push(sigChks[si].value); }
        // Determine print type from active button
        var activeTypeBtn = container.querySelector('.print-type-btn.active');
        var type = activeTypeBtn ? activeTypeBtn.getAttribute('data-type') : 'patient';
        sub.printExpanded = false;
        renderDetail(container, patient);
        executePrint(patient, type, sections, billType, invoiceId, signatures);
      };
    }

    // Rx print panel
    var rxPrintClose = document.getElementById('rx-print-close');
    var rxPrintCancel = document.getElementById('rx-print-cancel');
    if (rxPrintClose) rxPrintClose.onclick = function() { sub.rxPrintExpanded = false; renderDetail(container, patient); };
    if (rxPrintCancel) rxPrintCancel.onclick = function() { sub.rxPrintExpanded = false; renderDetail(container, patient); };

    var rxPrintGo = document.getElementById('rx-print-go');
    if (rxPrintGo) {
      rxPrintGo.onclick = function() {
        var sigs = [];
        var rxSigChks = container.querySelectorAll('.rx-sig');
        for (var i = 0; i < rxSigChks.length; i++) { if (rxSigChks[i].checked) sigs.push(rxSigChks[i].value); }
        sub.rxPrintExpanded = false;
        renderDetail(container, patient);
        printPrescriptionPad(patient, sigs);
      };
    }
  }

  return { render: render };
})();
