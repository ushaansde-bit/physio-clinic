/* ============================================
   Patient Detail View - 5 Tabs (Inline Forms)
   ============================================ */
window.PatientDetailView = (function() {

  var activeTab = 'overview';
  var _clickHandler = null;
  var _sessionDateParam = null; // set via query param from "Start Session Note"

  // Date helpers for recurring appointments
  function addDaysStr(dateStr, days) {
    var d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return d.getFullYear() + '-' + ('0' + (d.getMonth()+1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function getDayOfWeek(dateStr) {
    return new Date(dateStr + 'T00:00:00').getDay(); // 0=Sun, 1=Mon, ...
  }

  // Sub-view state for inline forms
  var sub = {
    sessionsView: 'list',    // list | form
    sessionsEditId: null,
    exercisesView: 'list',   // list | add | form
    exercisesEditId: null,
    exerciseLibraryFilter: 'all',
    rxView: 'list',          // list | form
    rxEditId: null,
    billingView: 'list',     // list | form | detail
    billingViewId: null,
    bookingView: 'list',     // list | form
    appointmentsView: 'list', // list | form
    appointmentsEditId: null,
    nextVisitAppt: null,
    printExpanded: false,
    rxPrintExpanded: false,
    editingPatient: false
  };

  // Cached exercise log data from Firestore
  var _exerciseLogData = null;
  var _exerciseLogPatientId = null;

  function resetSub() {
    sub.sessionsView = 'list';
    sub.sessionsEditId = null;
    sub.exercisesView = 'list';
    sub.exercisesEditId = null;
    sub.exerciseLibraryFilter = 'all';
    sub.rxView = 'list';
    sub.rxEditId = null;
    sub.billingView = 'list';
    sub.billingViewId = null;
    sub.bookingView = 'list';
    sub.appointmentsView = 'list';
    sub.appointmentsEditId = null;
    sub.nextVisitAppt = null;
    sub.printExpanded = false;
    sub.rxPrintExpanded = false;
    sub.editingPatient = false;
    _exerciseLogData = null;
    _exerciseLogPatientId = null;
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
    html += '<button class="btn btn-secondary" id="print-patient-btn">';
    html += '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>';
    html += 'Print</button>';
    html += '</div></div>';

    // Tabs
    html += '<div class="tabs">';
    html += tabBtn('overview', 'Overview');
    html += tabBtn('appointments', 'Appointments');
    html += tabBtn('sessions', 'Diagnosis & Treatment');
    if (Store.isFeatureEnabled('exercises')) html += tabBtn('exercises', 'HEP');
    if (Store.isFeatureEnabled('prescriptions')) html += tabBtn('prescriptions', 'Prescriptions');
    if (Store.isFeatureEnabled('billing')) html += tabBtn('billing', 'Billing');
    html += '</div>';

    // Tab content
    html += '<div id="tab-overview" class="tab-content' + (activeTab === 'overview' ? ' active' : '') + '">';
    html += renderOverview(patient);
    html += '</div>';

    html += '<div id="tab-appointments" class="tab-content' + (activeTab === 'appointments' ? ' active' : '') + '">';
    html += renderAppointments(patient);
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

    // Start exercise animations if on HEP tab
    if (typeof ExerciseLibrary !== 'undefined' && (activeTab === 'exercises' || sub.exercisesView === 'add')) {
      ExerciseLibrary.setGender(patient.gender || 'neutral');
      setTimeout(function() { ExerciseLibrary.startAnimations(); }, 50);
    }
  }

  function tabBtn(id, label) {
    return '<button class="tab-btn' + (activeTab === id ? ' active' : '') + '" data-tab="' + id + '">' + label + '</button>';
  }

  // ==================== OVERVIEW TAB ====================
  function renderOverview(patient) {
    var html = '';

    // Edit Patient section (inline, replaces card)
    if (sub.editingPatient) {
      html += renderEditPatientSection(patient, sub.editingPatient);
      return html;
    }

    // Patient info card only
    html += '<div class="card mb-2"><div class="card-header"><h3>Patient Information</h3><button class="btn btn-sm btn-ghost edit-section-btn" data-section="personal" style="font-size:0.78rem;padding:0.2rem 0.5rem;">Edit</button></div><div class="card-body">';
    html += '<div class="info-grid">';
    html += infoItem('Full Name', patient.name);
    html += infoItem('Date of Birth', Utils.formatDate(patient.dob) + (patient.dob ? ' (Age ' + Utils.calculateAge(patient.dob) + ')' : ''));
    html += infoItem('Gender', patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : '-');
    html += infoItem('Phone', (patient.phoneCode || Utils.getPhoneCode()) + ' ' + (patient.phone || '-'));
    html += infoItem('Email', patient.email);
    html += infoItem('Address', patient.address);
    html += infoItem('Insurance', patient.insurance);
    var emergencyVal = (patient.emergencyContact || '-') + (patient.emergencyPhone ? ' (' + (patient.emergencyPhoneCode || Utils.getPhoneCode()) + ' ' + patient.emergencyPhone + ')' : '');
    html += infoItem('Emergency Contact', emergencyVal);
    html += '</div></div></div>';

    // Print options (inline collapsible)
    if (sub.printExpanded) {
      html += renderPrintOptions(patient);
    }

    return html;
  }

  function infoItem(label, value) {
    return '<div class="info-item"><label>' + label + '</label><span>' + Utils.escapeHtml(value || '-') + '</span></div>';
  }

  // ==================== APPOINTMENTS TAB ====================
  function renderAppointments(patient) {
    if (sub.appointmentsView === 'form') {
      return renderAppointmentForm(patient);
    }

    var appts = Store.getAppointmentsByPatient(patient.id);
    // Sort: upcoming (scheduled) first by date asc, then past by date desc
    var upcoming = [];
    var past = [];
    for (var i = 0; i < appts.length; i++) {
      if (appts[i].status === 'scheduled') upcoming.push(appts[i]);
      else past.push(appts[i]);
    }
    upcoming.sort(function(a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.time < b.time ? -1 : 1); });
    past.sort(function(a, b) { return a.date > b.date ? -1 : a.date < b.date ? 1 : (a.time > b.time ? -1 : 1); });

    var html = '';

    // Next visit prompt
    if (sub.nextVisitAppt) {
      var nva = sub.nextVisitAppt;
      html += '<div class="inline-form-card mb-2" id="next-visit-prompt">';
      html += '<div class="inline-form-header"><h3>Appointment Completed</h3></div>';
      html += '<div class="inline-form-body">';
      html += '<p style="font-size:0.9rem;color:var(--gray-700);margin-bottom:0.75rem;">Schedule the next visit for ' + Utils.escapeHtml(patient.name) + '?</p>';
      html += '<div class="quick-date-btns">';
      html += '<button class="btn btn-sm btn-secondary nv-quick-btn" data-days="1">Tomorrow</button>';
      html += '<button class="btn btn-sm btn-secondary nv-quick-btn" data-days="3">+3 Days</button>';
      html += '<button class="btn btn-sm btn-secondary nv-quick-btn" data-days="7">+1 Week</button>';
      html += '<button class="btn btn-sm btn-secondary nv-quick-btn" data-days="14">+2 Weeks</button>';
      html += '<button class="btn btn-sm btn-secondary nv-quick-btn" data-days="30">+1 Month</button>';
      html += '</div>';
      html += '</div>';
      html += '<div class="inline-form-actions">';
      html += '<button class="btn btn-secondary" id="nv-dismiss">No, Thanks</button>';
      html += '<button class="btn btn-primary" id="nv-custom">Custom Date</button>';
      html += '</div></div>';
    }

    html += '<div class="card mb-2"><div class="card-header"><h3>Appointments</h3>';
    html += '<button class="btn btn-sm btn-primary" id="add-appt-btn">';
    html += '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:0.25rem;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
    html += 'Book Appointment</button>';
    html += '</div><div class="card-body">';

    if (appts.length === 0) {
      html += '<div class="empty-state" style="padding:2rem 1rem;"><p>No appointments yet</p></div>';
    } else {
      // Upcoming
      if (upcoming.length > 0) {
        html += '<div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--gray-400);margin-bottom:0.5rem;">Upcoming</div>';
        for (var u = 0; u < upcoming.length; u++) {
          html += renderApptRow(upcoming[u]);
        }
      }
      // Past
      if (past.length > 0) {
        html += '<div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--gray-400);margin:1rem 0 0.5rem;">Past</div>';
        for (var p = 0; p < past.length; p++) {
          html += renderApptRow(past[p]);
        }
      }
    }
    html += '</div></div>';
    return html;
  }

  function apptStatusBadge(status) {
    var cls = 'badge-gray';
    if (status === 'scheduled') cls = 'badge-info';
    else if (status === 'completed') cls = 'badge-success';
    else if (status === 'cancelled') cls = 'badge-danger';
    else if (status === 'no-show') cls = 'badge-warning';
    return '<span class="badge ' + cls + '">' + status + '</span>';
  }

  function renderApptRow(appt) {
    var html = '<div class="list-item" style="display:flex;align-items:center;justify-content:space-between;padding:0.6rem 0;border-bottom:1px solid var(--border);">';
    html += '<div style="flex:1;">';
    html += '<div style="font-weight:600;font-size:0.9rem;">' + Utils.formatDate(appt.date) + ' at ' + Utils.formatTime(appt.time) + '</div>';
    html += '<div style="font-size:0.8rem;color:var(--gray-500);">' + Utils.escapeHtml(appt.type) + ' &middot; ' + appt.duration + ' min' + (appt.notes ? ' &middot; ' + Utils.escapeHtml(appt.notes) : '') + '</div>';
    html += '</div>';
    html += '<div style="display:flex;align-items:center;gap:0.5rem;">';
    html += apptStatusBadge(appt.status);
    if (appt.status === 'scheduled') {
      html += '<button class="btn btn-sm btn-success complete-appt-btn" data-id="' + appt.id + '">Complete</button>';
      html += '<button class="btn btn-sm btn-warning cancel-appt-btn" data-id="' + appt.id + '">Cancel</button>';
    }
    if (appt.status === 'completed') {
      html += '<button class="btn btn-sm btn-primary start-session-btn" data-id="' + appt.id + '" data-date="' + appt.date + '">Session Note</button>';
    }
    html += '<button class="btn btn-sm btn-ghost delete-appt-btn" data-id="' + appt.id + '" style="color:var(--danger);">Delete</button>';
    html += '</div>';
    html += '</div>';
    return html;
  }

  function renderAppointmentForm(patient) {
    var appt = sub.appointmentsEditId ? Store.getAppointment(sub.appointmentsEditId) : null;
    var title = appt ? 'Edit Appointment' : 'Book Appointment';
    var defaultDate = appt ? appt.date : Utils.today();
    var defaultTime = appt ? appt.time : '09:00';
    var defaultType = appt ? appt.type : 'Treatment';
    var defaultDuration = appt ? appt.duration : '30';
    var defaultNotes = appt ? appt.notes : '';

    var html = '<div class="inline-form-card">';
    html += '<div class="inline-form-header">';
    html += '<button class="back-btn" id="appt-form-back">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>';
    html += '</button>';
    html += '<h3>' + title + '</h3>';
    html += '</div>';

    html += '<div class="inline-form-body">';
    html += '<form id="appt-form">';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>Date</label>';
    html += '<input type="date" name="date" value="' + defaultDate + '" required></div>';
    html += '<div class="form-group"><label>Time</label>';
    html += '<input type="time" name="time" value="' + defaultTime + '" required></div>';
    html += '</div>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>Type</label>';
    html += '<select name="type" required>';
    html += '<option value="Initial Evaluation"' + (defaultType === 'Initial Evaluation' ? ' selected' : '') + '>Initial Evaluation</option>';
    html += '<option value="Treatment"' + (defaultType === 'Treatment' ? ' selected' : '') + '>Treatment</option>';
    html += '<option value="Follow-up"' + (defaultType === 'Follow-up' ? ' selected' : '') + '>Follow-up</option>';
    html += '</select></div>';
    html += '<div class="form-group"><label>Duration (min)</label>';
    html += '<select name="duration" required>';
    var durations = ['15','30','45','60','90'];
    for (var d = 0; d < durations.length; d++) {
      html += '<option value="' + durations[d] + '"' + (durations[d] === String(defaultDuration) ? ' selected' : '') + '>' + durations[d] + ' min</option>';
    }
    html += '</select></div>';
    html += '</div>';
    if (!appt) {
      html += '<div class="form-row">';
      html += '<div class="form-group"><label>Repeat</label>';
      html += '<select id="appt-repeat" style="width:100%;">';
      html += '<option value="none">No repeat</option>';
      html += '<option value="weekly">Weekly</option>';
      html += '<option value="2x">2x per week (Mon, Thu)</option>';
      html += '<option value="3x">3x per week (Mon, Wed, Fri)</option>';
      html += '</select></div>';
      html += '<div class="form-group" id="repeat-weeks-group" style="display:none;">';
      html += '<label>For how many weeks?</label>';
      html += '<select id="appt-repeat-weeks" style="width:100%;">';
      for (var rw = 2; rw <= 12; rw++) {
        html += '<option value="' + rw + '">' + rw + ' weeks</option>';
      }
      html += '</select></div>';
      html += '</div>';
    }
    html += '<div class="form-group"><label>Notes</label>';
    html += '<textarea name="notes" rows="2">' + Utils.escapeHtml(defaultNotes || '') + '</textarea></div>';
    html += '<div id="appt-warning" style="display:none;" class="login-error"></div>';
    html += '</form>';
    html += '</div>';

    html += '<div class="inline-form-actions">';
    html += '<button class="btn btn-secondary" id="appt-form-cancel">Cancel</button>';
    html += '<button class="btn btn-primary" id="appt-form-save">' + (appt ? 'Update' : 'Book Appointment') + '</button>';
    html += '</div></div>';
    return html;
  }

  // ==================== EDIT PATIENT SECTION (inline per-card) ====================
  function renderEditPatientSection(patient) {
    var html = '<div class="inline-form-card mb-2">';
    html += '<div class="inline-form-header">';
    html += '<button class="back-btn" id="edit-patient-back">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>';
    html += '</button>';
    html += '<h3>Edit Patient Information</h3>';
    html += '</div>';
    html += '<div class="inline-form-body">';
    html += '<form id="edit-patient-form">';

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
    html += '<input type="tel" name="phone" class="phone-number-input" value="' + Utils.escapeHtml(patient.phone || '') + '" maxlength="' + Utils.getPhoneDigits() + '" required>';
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
    // Emergency contact
    html += '<div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--gray-400);margin:1.25rem 0 0.5rem;padding-bottom:0.35rem;border-bottom:1px solid var(--border);">Emergency Contact</div>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>Contact Name</label>';
    html += '<input type="text" name="emergencyContact" value="' + Utils.escapeHtml(patient.emergencyContact || '') + '"></div>';
    html += '<div class="form-group"><label>Contact Phone</label>';
    html += '<div class="phone-input-wrap">';
    html += '<input type="text" name="emergencyPhoneCode" class="phone-code-input" value="' + Utils.escapeHtml(patient.emergencyPhoneCode || Utils.getPhoneCode()) + '" maxlength="5">';
    html += '<input type="tel" name="emergencyPhone" class="phone-number-input" value="' + Utils.escapeHtml(patient.emergencyPhone || '') + '" maxlength="' + Utils.getPhoneDigits() + '">';
    html += '</div></div>';
    html += '</div>';
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
    html += '<label class="tag-checkbox-item checked"><input type="checkbox" class="print-section" value="sessions" checked> Diagnosis & Treatment</label>';
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

  // ==================== DIAGNOSIS & TREATMENT TAB ====================
  function renderSessions(patient) {
    if (sub.sessionsView === 'form') {
      return renderSessionForm(patient);
    }

    var html = '';

    var sessions = Store.getSessionsByPatient(patient.id);
    sessions.sort(function(a, b) { return a.date > b.date ? -1 : 1; });

    html += '<div class="flex-between mb-2">';
    html += '<h3 style="font-size:1rem;">Diagnosis & Treatment (' + sessions.length + ')</h3>';
    html += '<button class="btn btn-primary btn-sm" id="add-session-btn">Add Diagnosis & Treatment</button>';
    html += '</div>';

    // Progress chart (show if 2+ sessions with scores)
    var chartSessions = sessions.slice().reverse(); // chronological order
    var hasScores = false;
    for (var cs = 0; cs < chartSessions.length; cs++) {
      if (chartSessions[cs].painScore !== undefined || chartSessions[cs].functionScore !== undefined) { hasScores = true; break; }
    }
    if (hasScores && chartSessions.length >= 2) {
      html += '<div class="card mb-2"><div class="card-body">';
      html += '<div style="font-weight:700;font-size:0.88em;margin-bottom:8px;">Progress Chart</div>';
      html += '<div style="display:flex;gap:16px;margin-bottom:6px;font-size:0.72em;">';
      html += '<span><span style="display:inline-block;width:10px;height:10px;background:var(--danger);border-radius:50%;vertical-align:-1px;margin-right:3px;"></span>Pain</span>';
      html += '<span><span style="display:inline-block;width:10px;height:10px;background:var(--success);border-radius:50%;vertical-align:-1px;margin-right:3px;"></span>Function</span>';
      html += '</div>';
      // SVG line chart
      var cw = 100; // viewbox percentage width
      var ch = 80;
      var maxPts = Math.min(chartSessions.length, 20);
      var pts = chartSessions.slice(-maxPts);
      var stepX = pts.length > 1 ? cw / (pts.length - 1) : cw;
      var painPts = '';
      var funcPts = '';
      for (var cp = 0; cp < pts.length; cp++) {
        var px = Math.round(cp * stepX);
        var painY = Math.round(ch - ((pts[cp].painScore || 0) / 10) * ch);
        var funcY = Math.round(ch - ((pts[cp].functionScore || 0) / 10) * ch);
        painPts += px + ',' + painY + ' ';
        funcPts += px + ',' + funcY + ' ';
      }
      html += '<svg viewBox="-2 -5 104 90" style="width:100%;height:120px;" preserveAspectRatio="none">';
      // Grid lines
      for (var gl = 0; gl <= 10; gl += 5) {
        var gy = Math.round(ch - (gl / 10) * ch);
        html += '<line x1="0" y1="' + gy + '" x2="100" y2="' + gy + '" stroke="#e5e7eb" stroke-width="0.5" stroke-dasharray="2,2"/>';
        html += '<text x="-1" y="' + (gy + 2) + '" font-size="4" fill="#9ca3af" text-anchor="end">' + gl + '</text>';
      }
      html += '<polyline points="' + painPts.trim() + '" fill="none" stroke="#ef4444" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
      html += '<polyline points="' + funcPts.trim() + '" fill="none" stroke="#22c55e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
      // Dots
      for (var dp = 0; dp < pts.length; dp++) {
        var dx = Math.round(dp * stepX);
        html += '<circle cx="' + dx + '" cy="' + Math.round(ch - ((pts[dp].painScore || 0) / 10) * ch) + '" r="2" fill="#ef4444"/>';
        html += '<circle cx="' + dx + '" cy="' + Math.round(ch - ((pts[dp].functionScore || 0) / 10) * ch) + '" r="2" fill="#22c55e"/>';
      }
      html += '</svg>';
      // Date labels
      html += '<div style="display:flex;justify-content:space-between;font-size:0.65em;color:var(--text-secondary);">';
      html += '<span>' + Utils.formatDate(pts[0].date) + '</span>';
      html += '<span>' + Utils.formatDate(pts[pts.length - 1].date) + '</span>';
      html += '</div>';
      html += '</div></div>';
    }

    if (sessions.length === 0) {
      html += '<div class="empty-state"><p>No records yet</p><p class="empty-sub">Click "Add Diagnosis & Treatment" to create the first record.</p></div>';
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
        if (s.bodyRegions && s.bodyRegions.length > 0) {
          html += '<div class="soap-section"><div class="soap-label" style="background:var(--gray-100);color:var(--gray-600);">Pain Regions</div>';
          html += '<div class="soap-text">' + BodyDiagram.renderBadges(s.bodyRegions) + '</div></div>';
        }
        if (Store.isFeatureEnabled('soapNotes')) {
          html += soapSection('Subjective', 's', s.subjective);
          html += soapSection('Objective', 'o', s.objective);
          html += soapSection('Assessment', 'a', s.assessment);
          html += soapSection('Plan', 'p', s.plan);
        }
        html += '</div></div>';
      }
    }
    return html;
  }

  function renderSessionForm(patient) {
    var session = sub.sessionsEditId ? Store.getSession(sub.sessionsEditId) : null;
    var title = session ? 'Edit Diagnosis & Treatment' : 'New Diagnosis & Treatment';

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
    if (Store.isFeatureEnabled('soapNotes')) {
      html += '<div class="form-group"><label>Subjective ' + Utils.micHtml('sf-subjective') + '</label>';
      html += '<textarea id="sf-subjective" name="subjective" rows="3" data-ac="subjective" required placeholder="Patient report, symptoms, functional status...">' + Utils.escapeHtml(session ? session.subjective || '' : '') + '</textarea></div>';
      html += '<div class="form-group"><label>Objective ' + Utils.micHtml('sf-objective') + '</label>';
      html += '<textarea id="sf-objective" name="objective" rows="3" data-ac="objective" placeholder="Measurements, ROM, strength, observations...">' + Utils.escapeHtml(session ? session.objective || '' : '') + '</textarea></div>';
      html += '<div class="form-group"><label>Assessment ' + Utils.micHtml('sf-assessment') + '</label>';
      html += '<textarea id="sf-assessment" name="assessment" rows="3" data-ac="assessment" placeholder="Clinical reasoning, progress, prognosis...">' + Utils.escapeHtml(session ? session.assessment || '' : '') + '</textarea></div>';
      html += '<div class="form-group"><label>Plan ' + Utils.micHtml('sf-plan') + '</label>';
      html += '<textarea id="sf-plan" name="plan" rows="3" data-ac="plan" placeholder="Treatment plan, goals, next steps...">' + Utils.escapeHtml(session ? session.plan || '' : '') + '</textarea></div>';
    }
    // Body diagram for pain regions
    if (Store.isFeatureEnabled('bodyDiagram')) {
      html += '<div class="form-group">';
      html += '<label>Pain Regions <span style="font-weight:400;color:var(--gray-400);font-size:0.8rem;">(tap to mark affected areas)</span></label>';
      html += '<div id="session-body-diagram"></div>';
      html += '</div>';
    }
    html += '</form>';
    html += '</div>';
    html += '<div class="inline-form-actions">';
    html += '<button class="btn btn-secondary" id="session-form-cancel">Cancel</button>';
    html += '<button class="btn btn-primary" id="session-form-save">Save</button>';
    html += '</div></div>';
    return html;
  }

  function soapSection(label, prefix, text) {
    return '<div class="soap-section"><div class="soap-label ' + prefix + '-label">' + label + '</div>' +
      '<div class="soap-text">' + Utils.escapeHtml(text || '-') + '</div></div>';
  }

  // ==================== EXERCISES TAB ====================
  // Load exercise log from Firestore for adherence view
  function loadExerciseLog(patientId) {
    if (_exerciseLogPatientId === patientId && _exerciseLogData !== null) return;
    _exerciseLogPatientId = patientId;
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.getDb && FirebaseSync.getClinicId) {
      var db = FirebaseSync.getDb();
      var clinicId = FirebaseSync.getClinicId();
      if (db && clinicId) {
        db.collection('clinics').doc(clinicId).collection('exercise_log').doc(patientId).get().then(function(doc) {
          if (doc.exists) {
            _exerciseLogData = doc.data();
          } else {
            _exerciseLogData = {};
          }
          // Re-render to show adherence data
          var container = document.getElementById('content');
          if (container && activeTab === 'exercises') {
            var tabEl = document.getElementById('tab-exercises');
            if (tabEl) {
              var patient = Store.getById('patients', patientId);
              if (patient) tabEl.innerHTML = renderExercises(patient);
            }
          }
        }).catch(function() { _exerciseLogData = {}; });
      }
    }
  }

  // Get done indices from log entry (backwards compat)
  function getLogDoneIndices(entry) {
    if (!entry) return [];
    if (Array.isArray(entry)) return entry;
    return Object.keys(entry).map(Number);
  }

  function renderAdherence(patient) {
    if (!_exerciseLogData || Object.keys(_exerciseLogData).length === 0) {
      return '<div style="background:#f8fafc;border-radius:8px;padding:12px 14px;margin-bottom:12px;text-align:center;color:#9ca3af;font-size:0.85rem;">No exercise log data yet. Patient needs to use MobiPhysio app.</div>';
    }

    var today = new Date();
    var todayStr = today.getFullYear() + '-' + ('0' + (today.getMonth()+1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);
    var exercises = Store.getExercisesByPatient(patient.id);
    var totalEx = exercises.length || 1;

    // Calculate stats for last 7 and 30 days
    var daysWithData7 = 0, totalDone7 = 0, totalPossible7 = 0;
    var daysWithData30 = 0, totalDone30 = 0, totalPossible30 = 0;
    var streak = 0;
    var calendarDays = [];
    var painByDay = {};

    for (var dayOffset = 0; dayOffset < 30; dayOffset++) {
      var d = new Date(today);
      d.setDate(d.getDate() - dayOffset);
      var ds = d.getFullYear() + '-' + ('0' + (d.getMonth()+1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
      var entry = _exerciseLogData[ds];
      var done = getLogDoneIndices(entry);
      var doneCount = Math.min(done.length, totalEx);

      // Pain data
      if (entry && !Array.isArray(entry)) {
        var painSum = 0, painCount = 0;
        var keys = Object.keys(entry);
        for (var pk = 0; pk < keys.length; pk++) {
          if (entry[keys[pk]] && entry[keys[pk]].pain !== undefined && entry[keys[pk]].pain !== null) {
            painSum += entry[keys[pk]].pain;
            painCount++;
          }
        }
        if (painCount > 0) painByDay[ds] = Math.round(painSum / painCount * 10) / 10;
      }

      var pct = doneCount / totalEx;
      calendarDays.push({ date: ds, done: doneCount, total: totalEx, pct: pct, isToday: dayOffset === 0 });

      totalDone30 += doneCount;
      totalPossible30 += totalEx;
      if (doneCount > 0) daysWithData30++;

      if (dayOffset < 7) {
        totalDone7 += doneCount;
        totalPossible7 += totalEx;
        if (doneCount > 0) daysWithData7++;
      }
    }

    // Streak calc
    for (var s = 0; s < 30; s++) {
      var d2 = new Date(today);
      d2.setDate(d2.getDate() - s);
      var ds2 = d2.getFullYear() + '-' + ('0' + (d2.getMonth()+1)).slice(-2) + '-' + ('0' + d2.getDate()).slice(-2);
      var done2 = getLogDoneIndices(_exerciseLogData[ds2]);
      if (done2.length > 0) { streak++; } else { break; }
    }

    var weekPct = totalPossible7 > 0 ? Math.round((totalDone7 / totalPossible7) * 100) : 0;
    var monthPct = totalPossible30 > 0 ? Math.round((totalDone30 / totalPossible30) * 100) : 0;

    var html = '<div style="background:#f8fafc;border-radius:10px;padding:14px;margin-bottom:14px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">';

    // Stats row
    html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">';
    html += '<div style="text-align:center;">';
    html += '<div style="font-size:1.3rem;font-weight:800;color:' + (weekPct >= 80 ? '#16a34a' : weekPct >= 50 ? '#d97706' : '#dc2626') + ';">' + weekPct + '%</div>';
    html += '<div style="font-size:0.7rem;font-weight:600;color:#9ca3af;text-transform:uppercase;">This Week</div>';
    html += '</div>';
    html += '<div style="text-align:center;">';
    html += '<div style="font-size:1.3rem;font-weight:800;color:' + (monthPct >= 80 ? '#16a34a' : monthPct >= 50 ? '#d97706' : '#dc2626') + ';">' + monthPct + '%</div>';
    html += '<div style="font-size:0.7rem;font-weight:600;color:#9ca3af;text-transform:uppercase;">This Month</div>';
    html += '</div>';
    html += '<div style="text-align:center;">';
    html += '<div style="font-size:1.3rem;font-weight:800;color:#075E54;">' + streak + '</div>';
    html += '<div style="font-size:0.7rem;font-weight:600;color:#9ca3af;text-transform:uppercase;">Day Streak</div>';
    html += '</div>';
    html += '</div>';

    // Calendar heatmap (last 30 days, right-to-left with newest on right)
    html += '<div style="font-size:0.72rem;font-weight:600;color:#9ca3af;text-transform:uppercase;margin-bottom:6px;">Last 30 Days</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:3px;">';
    // Reverse so newest is last (right)
    for (var ci = calendarDays.length - 1; ci >= 0; ci--) {
      var cd = calendarDays[ci];
      var cellColor = '#e5e7eb'; // gray = none
      if (cd.pct >= 1) cellColor = '#22c55e'; // green = all done
      else if (cd.pct > 0) cellColor = '#fbbf24'; // yellow = partial
      var border = cd.isToday ? 'border:2px solid #075E54;' : '';
      var dayNum = parseInt(cd.date.split('-')[2], 10);
      html += '<div title="' + cd.date + ': ' + cd.done + '/' + cd.total + '" style="width:18px;height:18px;border-radius:3px;background:' + cellColor + ';' + border + 'font-size:0.5rem;line-height:18px;text-align:center;color:rgba(0,0,0,0.3);">' + dayNum + '</div>';
    }
    html += '</div>';

    // Pain trend (if data exists)
    var painDates = Object.keys(painByDay).sort();
    if (painDates.length >= 2) {
      html += '<div style="margin-top:10px;font-size:0.72rem;font-weight:600;color:#9ca3af;text-transform:uppercase;margin-bottom:4px;">Pain Trend</div>';
      // Simple sparkline using SVG
      var sparkW = 200, sparkH = 30;
      var maxPain = 2;
      html += '<svg viewBox="0 0 ' + sparkW + ' ' + sparkH + '" style="width:100%;height:30px;">';
      var points = [];
      for (var pi = 0; pi < painDates.length; pi++) {
        var px = (pi / (painDates.length - 1)) * (sparkW - 4) + 2;
        var py = sparkH - 4 - ((painByDay[painDates[pi]] / maxPain) * (sparkH - 8));
        points.push(px.toFixed(1) + ',' + py.toFixed(1));
      }
      html += '<polyline points="' + points.join(' ') + '" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
      // Dots at each point
      for (var di = 0; di < points.length; di++) {
        var coords = points[di].split(',');
        html += '<circle cx="' + coords[0] + '" cy="' + coords[1] + '" r="2" fill="#f59e0b"/>';
      }
      html += '</svg>';
      // Labels
      html += '<div style="display:flex;justify-content:space-between;font-size:0.6rem;color:#d1d5db;">';
      html += '<span>' + painDates[0] + '</span>';
      html += '<span>' + painDates[painDates.length - 1] + '</span>';
      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  function renderExercises(patient) {
    if (sub.exercisesView === 'form') {
      return renderExerciseForm(patient);
    }
    if (sub.exercisesView === 'add') {
      return renderAddExercise(patient);
    }

    // Trigger exercise log load from Firestore
    loadExerciseLog(patient.id);

    var exercises = Store.getExercisesByPatient(patient.id);

    // Adherence section
    var html = '';
    if (_exerciseLogData && _exerciseLogPatientId === patient.id) {
      html += renderAdherence(patient);
    }

    html += '<div class="flex-between mb-2">';
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
      for (var j = 0; j < exercises.length; j++) {
        html += exerciseCard(exercises[j]);
      }
    }

    // Print-only section
    html += '<div class="print-only" style="margin-top:2rem;">';
    html += '<h2 style="text-align:center;margin-bottom:1rem;">Home Exercise Program</h2>';
    html += '<p><strong>Patient:</strong> ' + Utils.escapeHtml(patient.name) + '</p>';
    html += '<p><strong>Date:</strong> ' + Utils.formatDate(Utils.today()) + '</p>';
    html += '<hr style="margin:1rem 0;">';
    for (var l = 0; l < exercises.length; l++) {
      var ex = exercises[l];
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
    html += '<input type="text" name="name" value="' + Utils.escapeHtml(exercise ? exercise.name : '') + '" required placeholder="e.g., Quad Sets" autocomplete="nope"></div>';
    html += '<div class="form-row-4">';
    html += '<div class="form-group"><label>Sets</label>';
    html += '<input type="text" name="sets" value="' + Utils.escapeHtml(exercise ? exercise.sets : '3') + '" placeholder="3" required></div>';
    html += '<div class="form-group"><label>Reps</label>';
    html += '<input type="text" name="reps" value="' + Utils.escapeHtml(exercise ? exercise.reps : '10') + '" placeholder="10" required></div>';
    html += '<div class="form-group"><label>Hold</label>';
    html += '<input type="text" name="hold" value="' + Utils.escapeHtml(exercise ? exercise.hold : '') + '" placeholder="5 sec"></div>';
    html += '<div class="form-group"><label>Frequency</label>';
    html += '<input type="text" name="frequency" value="' + Utils.escapeHtml(exercise ? exercise.frequency : '') + '" placeholder="2x daily"></div>';
    html += '</div>';
    html += '<div class="form-group"><label>Instructions ' + Utils.micHtml('ef-instructions') + '</label>';
    html += '<textarea id="ef-instructions" name="instructions" rows="4" placeholder="Step-by-step instructions for the patient...">' + Utils.escapeHtml(exercise ? exercise.instructions || '' : '') + '</textarea></div>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>Photo URL (optional)</label>';
    html += '<input type="text" name="imageUrl" value="' + Utils.escapeHtml(exercise ? exercise.imageUrl || '' : '') + '" placeholder="https://example.com/photo.jpg"></div>';
    html += '<div class="form-group"><label>Video URL (optional)</label>';
    html += '<input type="text" name="videoUrl" value="' + Utils.escapeHtml(exercise ? exercise.videoUrl || '' : '') + '" placeholder="https://youtube.com/watch?v=..."></div>';
    html += '</div>';
    html += '</form>';
    html += '</div>';
    html += '<div class="inline-form-actions">';
    html += '<button class="btn btn-secondary" id="exercise-form-cancel">Cancel</button>';
    html += '<button class="btn btn-primary" id="exercise-form-save">Save Exercise</button>';
    html += '</div></div>';
    return html;
  }

  function renderAddExercise(patient) {
    var bodyParts = typeof ExerciseLibrary !== 'undefined' ? ExerciseLibrary.getBodyParts() : [];
    var filter = sub.exerciseLibraryFilter || 'all';
    var libExercises = [];
    var hasLibrary = typeof ExerciseLibrary !== 'undefined';
    if (hasLibrary) {
      libExercises = filter === 'all' ? ExerciseLibrary.getAll() : ExerciseLibrary.getByBodyPart(filter);
    }

    // Check which library exercises are already assigned
    var existingExercises = Store.getExercisesByPatient(patient.id);
    var assignedLibIds = {};
    for (var a = 0; a < existingExercises.length; a++) {
      if (existingExercises[a].libraryId) {
        assignedLibIds[existingExercises[a].libraryId] = true;
      }
    }

    var html = '<div class="inline-form-card">';
    html += '<div class="inline-form-header">';
    html += '<button class="back-btn" id="add-exercise-back">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>';
    html += '</button>';
    html += '<h3>Add Exercise</h3>';
    html += '</div>';
    html += '<div class="inline-form-body">';

    // === Library Browser Section ===
    if (hasLibrary) {
      html += '<div style="margin-bottom:0.5rem;font-weight:600;font-size:0.9rem;">From Library</div>';

      // Filter pills
      html += '<div style="margin-bottom:0.75rem;display:flex;flex-wrap:wrap;gap:0.35rem;">';
      html += '<button class="btn btn-sm library-filter-btn' + (filter === 'all' ? ' btn-primary' : ' btn-secondary') + '" data-filter="all">All</button>';
      for (var bp = 0; bp < bodyParts.length; bp++) {
        var active = filter === bodyParts[bp].id;
        html += '<button class="btn btn-sm library-filter-btn' + (active ? ' btn-primary' : ' btn-secondary') + '" data-filter="' + bodyParts[bp].id + '">' + bodyParts[bp].name + '</button>';
      }
      html += '</div>';

      // Scrollable checkbox list
      if (libExercises.length === 0) {
        html += '<div class="empty-state"><p>No exercises found</p></div>';
      } else {
        html += '<div style="max-height:350px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;">';
        for (var le = 0; le < libExercises.length; le++) {
          var lex = libExercises[le];
          var alreadyAssigned = assignedLibIds[lex.id] || false;
          var details = lex.defaultSets + 'x' + lex.defaultReps;
          if (lex.holdSeconds) details += ', ' + lex.holdSeconds + 's hold';
          html += '<label style="display:flex;align-items:center;padding:0.5rem 0.75rem;border-bottom:1px solid var(--border);cursor:pointer;gap:0.5rem;' + (alreadyAssigned ? 'opacity:0.5;' : '') + '">';
          html += '<input type="checkbox" class="library-exercise-cb" data-ex-id="' + lex.id + '"' + (alreadyAssigned ? ' disabled checked' : '') + ' style="width:18px;height:18px;flex-shrink:0;">';
          html += '<div style="flex-shrink:0;width:50px;height:50px;background:var(--gray-50);border-radius:6px;display:flex;align-items:center;justify-content:center;overflow:hidden;">';
          html += ExerciseLibrary.renderExerciseSVG(lex.id, 45);
          html += '</div>';
          html += '<div style="flex:1;min-width:0;">';
          html += '<div style="font-size:0.9rem;font-weight:500;">' + Utils.escapeHtml(lex.name);
          if (alreadyAssigned) html += ' <span style="font-size:0.75rem;color:var(--text-muted);">(assigned)</span>';
          html += '</div>';
          html += '<div style="font-size:0.8rem;color:var(--text-muted);">' + details + '</div>';
          html += '</div>';
          html += '</label>';
        }
        html += '</div>';
      }

      // Add Selected button
      html += '<div style="margin-top:0.75rem;text-align:right;">';
      html += '<button class="btn btn-primary btn-sm" id="library-picker-assign">Add Selected</button>';
      html += '</div>';

      // Divider
      html += '<div style="display:flex;align-items:center;gap:0.75rem;margin:1.25rem 0;">';
      html += '<div style="flex:1;height:1px;background:var(--border);"></div>';
      html += '<span style="font-size:0.8rem;color:var(--text-muted);font-weight:500;">or</span>';
      html += '<div style="flex:1;height:1px;background:var(--border);"></div>';
      html += '</div>';
    }

    // === Custom Exercise Section (collapsible) ===
    html += '<div>';
    html += '<button id="toggle-custom-form" style="display:flex;align-items:center;gap:0.5rem;background:none;border:none;cursor:pointer;font-weight:600;font-size:0.9rem;color:var(--text);padding:0;margin-bottom:0.75rem;">';
    html += '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" id="custom-form-chevron" style="transition:transform 0.2s;"><polyline points="6 9 12 15 18 9"/></svg>';
    html += 'Create Custom Exercise</button>';
    html += '<div id="custom-exercise-section" style="display:none;">';
    html += '<form id="exercise-form">';
    html += '<div class="form-group"><label>Exercise Name</label>';
    html += '<input type="text" name="name" value="" required placeholder="e.g., Quad Sets" autocomplete="nope"></div>';
    html += '<div class="form-row-4">';
    html += '<div class="form-group"><label>Sets</label>';
    html += '<input type="text" name="sets" value="3" placeholder="3" required></div>';
    html += '<div class="form-group"><label>Reps</label>';
    html += '<input type="text" name="reps" value="10" placeholder="10" required></div>';
    html += '<div class="form-group"><label>Hold</label>';
    html += '<input type="text" name="hold" value="" placeholder="5 sec"></div>';
    html += '<div class="form-group"><label>Frequency</label>';
    html += '<input type="text" name="frequency" value="" placeholder="2x daily"></div>';
    html += '</div>';
    html += '<div class="form-group"><label>Instructions ' + Utils.micHtml('ef-instructions') + '</label>';
    html += '<textarea id="ef-instructions" name="instructions" rows="3" placeholder="Step-by-step instructions for the patient..."></textarea></div>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>Photo URL (optional)</label>';
    html += '<input type="text" name="imageUrl" value="" placeholder="https://example.com/photo.jpg"></div>';
    html += '<div class="form-group"><label>Video URL (optional)</label>';
    html += '<input type="text" name="videoUrl" value="" placeholder="https://youtube.com/watch?v=..."></div>';
    html += '</div>';
    html += '<div style="text-align:right;margin-top:0.5rem;">';
    html += '<button type="button" class="btn btn-primary btn-sm" id="custom-exercise-save">Save Custom Exercise</button>';
    html += '</div>';
    html += '</form>';
    html += '</div></div>';

    html += '</div>';
    html += '<div class="inline-form-actions">';
    html += '<button class="btn btn-secondary" id="add-exercise-cancel">Back to List</button>';
    html += '</div></div>';
    return html;
  }

  // ===== Timer Preview (for doctor to calibrate sets/reps/hold) =====
  function showTimerPreview(exercise) {
    var totalSets = parseInt(exercise.sets, 10) || 1;
    var reps = parseInt(exercise.reps, 10) || 10;
    var holdRaw = (exercise.hold || '').replace(/[^0-9]/g, '');
    var holdSec = parseInt(holdRaw, 10) || 0;
    var restSec = 30;
    var hasHold = holdSec > 0;

    var ts = { currentSet: 1, phase: hasHold ? 'hold' : 'reps', timeLeft: hasHold ? holdSec : 0, interval: null, done: false };

    function renderTimer() {
      var radius = 54, stroke = 8, circ = 2 * Math.PI * radius;
      var maxTime = ts.phase === 'hold' ? holdSec : restSec;
      var frac = maxTime > 0 ? ts.timeLeft / maxTime : 0;
      var offset = circ * (1 - frac);
      var ringColor = ts.phase === 'hold' ? '#3b82f6' : '#f59e0b';
      var phaseLabel = ts.done ? 'All Sets Complete!' : ts.phase === 'hold' ? 'Hold' : ts.phase === 'rest' ? 'Rest' : 'Perform Reps';

      var h = '';
      h += '<div style="text-align:center;">';
      // Set counter
      h += '<div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.75rem;">Set ' + ts.currentSet + ' of ' + totalSets + '</div>';
      // SVG ring
      h += '<div style="position:relative;width:140px;height:140px;margin:0 auto 1rem;">';
      h += '<svg viewBox="0 0 128 128" width="140" height="140">';
      h += '<circle cx="64" cy="64" r="' + radius + '" fill="none" stroke="#e5e7eb" stroke-width="' + stroke + '"/>';
      if (!ts.done) {
        h += '<circle cx="64" cy="64" r="' + radius + '" fill="none" stroke="' + ringColor + '" stroke-width="' + stroke + '" stroke-linecap="round" stroke-dasharray="' + circ + '" stroke-dashoffset="' + offset + '" transform="rotate(-90 64 64)" style="transition:stroke-dashoffset 0.3s;"/>';
      }
      h += '</svg>';
      h += '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;">';
      if (ts.done) {
        h += '<div style="font-size:1.8rem;">&#10003;</div>';
      } else if (ts.phase === 'reps') {
        h += '<div style="font-size:1.8rem;font-weight:700;">' + reps + '</div>';
        h += '<div style="font-size:0.75rem;color:var(--text-muted);">reps</div>';
      } else {
        h += '<div style="font-size:1.8rem;font-weight:700;">' + ts.timeLeft + '</div>';
        h += '<div style="font-size:0.75rem;color:var(--text-muted);">sec</div>';
      }
      h += '</div></div>';
      // Phase label
      h += '<div style="font-size:1rem;font-weight:600;margin-bottom:0.5rem;color:' + (ts.done ? '#22c55e' : 'var(--text)') + ';">' + phaseLabel + '</div>';
      // Exercise name
      h += '<div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:1rem;">' + Utils.escapeHtml(exercise.name) + ' &mdash; ' + exercise.sets + 'x' + exercise.reps + (hasHold ? ', ' + holdSec + 's hold' : '') + '</div>';
      h += '</div>';
      return h;
    }

    function renderFooter() {
      if (ts.done) return '<button class="btn btn-primary" id="timer-close">Close</button>';
      if (ts.phase === 'reps') {
        return '<button class="btn btn-primary" id="timer-done-set">Done with Set</button>';
      }
      if (ts.phase === 'hold') {
        return '<button class="btn btn-secondary" id="timer-skip">Skip</button>';
      }
      // rest
      return '<button class="btn btn-secondary" id="timer-skip-rest">Skip Rest</button>';
    }

    function update() {
      document.getElementById('modal-body').innerHTML = renderTimer();
      document.getElementById('modal-footer').innerHTML = renderFooter();
      bindTimerButtons();
    }

    function startCountdown(phase, duration, onDone) {
      ts.phase = phase;
      ts.timeLeft = duration;
      clearInterval(ts.interval);
      update();
      ts.interval = setInterval(function() {
        ts.timeLeft--;
        if (ts.timeLeft <= 0) {
          clearInterval(ts.interval);
          ts.interval = null;
          onDone();
        } else {
          update();
        }
      }, 1000);
    }

    function finishSet() {
      if (ts.currentSet >= totalSets) {
        ts.done = true;
        clearInterval(ts.interval);
        ts.interval = null;
        update();
      } else {
        startCountdown('rest', restSec, function() {
          ts.currentSet++;
          if (hasHold) {
            startCountdown('hold', holdSec, finishSet);
          } else {
            ts.phase = 'reps';
            ts.timeLeft = 0;
            update();
          }
        });
      }
    }

    function bindTimerButtons() {
      var doneBtn = document.getElementById('timer-done-set');
      var skipBtn = document.getElementById('timer-skip');
      var skipRestBtn = document.getElementById('timer-skip-rest');
      var closeBtn = document.getElementById('timer-close');
      if (doneBtn) doneBtn.onclick = finishSet;
      if (skipBtn) {
        skipBtn.onclick = function() {
          clearInterval(ts.interval);
          ts.interval = null;
          finishSet();
        };
      }
      if (skipRestBtn) {
        skipRestBtn.onclick = function() {
          clearInterval(ts.interval);
          ts.interval = null;
          ts.currentSet++;
          if (hasHold) {
            startCountdown('hold', holdSec, finishSet);
          } else {
            ts.phase = 'reps';
            ts.timeLeft = 0;
            update();
          }
        };
      }
      if (closeBtn) closeBtn.onclick = function() {
        clearInterval(ts.interval);
        Utils.closeModal();
      };
    }

    // Override modal close to clean up interval
    var origClose = Utils.closeModal;
    Utils.showModal('Timer Preview', renderTimer(), renderFooter(), { large: false });
    bindTimerButtons();
    var modalOverlay = document.getElementById('modal');
    var closeHandler = function(evt) {
      if (evt.target === modalOverlay) {
        clearInterval(ts.interval);
        origClose();
        modalOverlay.removeEventListener('click', closeHandler);
      }
    };
    modalOverlay.addEventListener('click', closeHandler);
    var modalCloseBtn = document.querySelector('.modal-close');
    if (modalCloseBtn) {
      var origOnClick = modalCloseBtn.onclick;
      modalCloseBtn.onclick = function() {
        clearInterval(ts.interval);
        if (origOnClick) origOnClick();
        else Utils.closeModal();
      };
    }

    // Start the first phase
    if (hasHold) {
      startCountdown('hold', holdSec, finishSet);
    }
    // If no hold, stays in 'reps' phase waiting for "Done with Set"
  }

  function exerciseCard(ex) {
    var html = '<div class="exercise-card" style="display:flex;align-items:center;gap:0.75rem;">';
    // Find matching library exercise: by libraryId first, then by name
    var matchedLibId = null;
    if (typeof ExerciseLibrary !== 'undefined') {
      if (ex.libraryId && ExerciseLibrary.getById(ex.libraryId)) {
        matchedLibId = ex.libraryId;
      } else {
        // Try matching by name
        var allLib = ExerciseLibrary.getAll();
        var exNameLower = (ex.name || '').toLowerCase().trim();
        for (var li = 0; li < allLib.length; li++) {
          if (allLib[li].name.toLowerCase() === exNameLower) {
            matchedLibId = allLib[li].id;
            break;
          }
        }
      }
    }
    // Custom image takes priority over SVG preview
    if (ex.imageUrl) {
      html += '<div style="flex-shrink:0;width:64px;height:64px;background:var(--gray-50);border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;">';
      html += '<img src="' + Utils.escapeHtml(ex.imageUrl) + '" alt="' + Utils.escapeHtml(ex.name) + '" style="max-width:64px;max-height:64px;object-fit:cover;border-radius:8px;" onerror="this.style.display=\'none\'">';
      html += '</div>';
    } else if (matchedLibId) {
      html += '<div style="flex-shrink:0;width:64px;height:64px;background:var(--gray-50);border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;">';
      html += ExerciseLibrary.renderExerciseSVG(matchedLibId, 56);
      html += '</div>';
    }
    html += '<div class="exercise-info" style="flex:1;min-width:0;">';
    html += '<div class="exercise-name">' + Utils.escapeHtml(ex.name);
    if (ex.videoUrl) {
      html += ' <a href="' + Utils.escapeHtml(ex.videoUrl) + '" target="_blank" rel="noopener noreferrer" title="Watch video" style="display:inline-flex;align-items:center;vertical-align:middle;margin-left:0.35rem;color:var(--primary);text-decoration:none;">';
      html += '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
      html += '</a>';
    }
    html += '</div>';
    html += '<div class="exercise-details">' + ex.sets + ' sets x ' + ex.reps + ' reps';
    if (ex.hold && ex.hold !== '-') html += ' | Hold: ' + ex.hold;
    if (ex.frequency) html += ' | ' + ex.frequency;
    html += '</div>';
    if (ex.instructions) {
      html += '<div class="exercise-instructions">' + Utils.escapeHtml(ex.instructions) + '</div>';
    }
    html += '</div>';
    html += '<div class="exercise-actions" style="flex-shrink:0;">';
    // Timer preview icon (only when exercise has >1 set or hold)
    var setsNum = parseInt(ex.sets, 10) || 1;
    var hasHold = ex.hold && ex.hold !== '-';
    if (setsNum > 1 || hasHold) {
      html += '<button class="btn btn-sm btn-ghost preview-timer-btn" data-id="' + ex.id + '" title="Preview Timer" style="color:var(--primary);padding:4px;">';
      html += '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
      html += '</button>';
    }
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
    prescriptions.sort(function(a, b) { return a.date > b.date ? -1 : 1; });

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
      for (var j = 0; j < prescriptions.length; j++) {
        html += rxCard(prescriptions[j]);
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
    html += '<select name="route" required>';
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
    var html = '<div class="rx-card">';
    html += '<div class="rx-card-header">';
    html += '<div class="rx-card-title">';
    html += '<span class="rx-icon">Rx</span>';
    html += '<div>';
    html += '<div class="rx-med-name">' + Utils.escapeHtml(rx.medication) + '</div>';
    html += '<div class="rx-dosage">' + Utils.escapeHtml(rx.dosage) + ' &middot; ' + Utils.escapeHtml(rx.route) + '</div>';
    html += '</div></div>';
    html += '<div class="rx-card-actions">';
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
    if (sub.billingView === 'detail' && sub.billingViewId) {
      return renderBillingDetail(patient);
    }

    var bills = Store.getBillingByPatient(patient.id);
    bills.sort(function(a, b) { return a.date > b.date ? -1 : 1; });

    var total = 0, paid = 0, pending = 0;
    for (var i = 0; i < bills.length; i++) {
      var amt = parseFloat(bills[i].amount) || 0;
      total += amt;
      if (bills[i].status !== 'pending') paid += amt;
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
        var isPaid = b.status !== 'pending';
        var statusCls = isPaid ? 'badge-success' : 'badge-warning';
        var statusLabel = b.status === 'gpay' ? 'GPay' : b.status === 'cash' ? 'Cash' : b.status === 'card' ? 'Card' : b.status === 'paid' ? 'Paid' : 'Pending';
        html += '<tr class="no-hover">';
        html += '<td>' + Utils.formatDate(b.date) + '</td>';
        html += '<td>' + Utils.escapeHtml(b.description) + '</td>';
        html += '<td style="font-weight:600;white-space:nowrap;">' + Utils.formatCurrency(b.amount) + '</td>';
        html += '<td><span class="badge ' + statusCls + '">' + statusLabel + '</span></td>';
        html += '<td><div class="btn-group">';
        html += '<button class="btn btn-sm btn-ghost view-billing-btn" data-id="' + b.id + '">View</button>';
        if (!isPaid) {
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
    html += '<option value="gpay">GPay</option>';
    html += '<option value="cash">Cash</option>';
    html += '<option value="card">Card</option>';
    html += '</select></div>';
    html += '</form>';
    html += '</div>';
    html += '<div class="inline-form-actions">';
    html += '<button class="btn btn-secondary" id="billing-form-cancel">Cancel</button>';
    html += '<button class="btn btn-primary" id="billing-form-save">Create Invoice</button>';
    html += '</div></div>';
    return html;
  }

  function renderBillingDetail(patient) {
    var bill = null;
    var bills = Store.getBillingByPatient(patient.id);
    for (var i = 0; i < bills.length; i++) {
      if (bills[i].id === sub.billingViewId) { bill = bills[i]; break; }
    }
    if (!bill) { sub.billingView = 'list'; sub.billingViewId = null; return renderBilling(patient); }

    var billIsPaid = bill.status !== 'pending';
    var statusCls = billIsPaid ? 'badge-success' : 'badge-warning';
    var billStatusLabel = bill.status === 'gpay' ? 'GPay' : bill.status === 'cash' ? 'Cash' : bill.status === 'card' ? 'Card' : bill.status === 'paid' ? 'Paid' : 'Pending';

    var html = '<div class="inline-form-card">';
    html += '<div class="inline-form-header">';
    html += '<button class="back-btn" id="billing-detail-back">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>';
    html += '</button>';
    html += '<h3>Invoice</h3>';
    html += '</div>';
    html += '<div class="inline-form-body">';

    // Invoice header
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">';
    html += '<span class="badge ' + statusCls + '" style="font-size:0.85rem;padding:0.3rem 0.75rem;">' + billStatusLabel + '</span>';
    html += '<span style="font-size:0.82rem;color:var(--gray-400);">' + Utils.formatDate(bill.date) + '</span>';
    html += '</div>';

    // Amount
    html += '<div style="text-align:center;padding:1.5rem 0;border:1px solid var(--border);border-radius:10px;margin-bottom:1rem;background:var(--gray-50);">';
    html += '<div style="font-size:0.78rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--gray-400);margin-bottom:0.25rem;">Amount</div>';
    html += '<div style="font-size:1.8rem;font-weight:700;color:var(--gray-800);">' + Utils.formatCurrency(bill.amount) + '</div>';
    html += '</div>';

    // Details
    html += '<div class="info-grid">';
    html += infoItem('Description', bill.description);
    html += infoItem('Date', Utils.formatDate(bill.date));
    html += infoItem('Patient', patient.name);
    html += infoItem('Status', billStatusLabel);
    if (bill.paidDate) {
      html += infoItem('Paid Date', Utils.formatDate(bill.paidDate));
    }
    html += '</div>';

    html += '</div>';
    html += '<div class="inline-form-actions">';
    html += '<button class="btn btn-secondary" id="billing-detail-back2">Back</button>';
    if (!billIsPaid) {
      html += '<button class="btn btn-success" id="billing-detail-mark-paid" data-id="' + bill.id + '">Mark Paid</button>';
    }
    html += '<button class="btn btn-primary" id="billing-detail-print" data-id="' + bill.id + '">';
    html += '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>';
    html += ' Print</button>';
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
    prescriptions.sort(function(a, b) { return a.date > b.date ? -1 : 1; });

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

    html += '<div style="border-top:1px solid #999;padding-top:0.75rem;margin-top:0.5rem;">';
    html += '<h2 style="font-size:1.2rem;margin-bottom:0.75rem;">Rx</h2>';

    if (prescriptions.length === 0) {
      html += '<p style="color:#666;">No prescriptions.</p>';
    } else {
      for (var i = 0; i < prescriptions.length; i++) {
        var rx = prescriptions[i];
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
      html += '<td class="lbl">DOB</td><td>' + Utils.formatDate(patient.dob) + (patient.dob ? ' (Age ' + Utils.calculateAge(patient.dob) + ')' : '') + '</td></tr>';
      html += '<tr><td class="lbl">Gender</td><td>' + Utils.escapeHtml(patient.gender || '-') + '</td>';
      html += '<td class="lbl">Phone</td><td>' + Utils.escapeHtml((patient.phoneCode || Utils.getPhoneCode()) + ' ' + (patient.phone || '-')) + '</td></tr>';
      html += '<tr><td class="lbl">Email</td><td colspan="3">' + Utils.escapeHtml(patient.email || '-') + '</td></tr>';
      html += '<tr><td class="lbl">Address</td><td colspan="3">' + Utils.escapeHtml(patient.address || '-') + '</td></tr>';
      html += '<tr><td class="lbl">Insurance</td><td colspan="3">' + Utils.escapeHtml(patient.insurance || '-') + '</td></tr>';
      if (patient.emergencyContact || patient.emergencyPhone) {
        html += '<tr><td class="lbl">Emergency</td><td>' + Utils.escapeHtml(patient.emergencyContact || '-') + '</td>';
        html += '<td class="lbl">Emergency Ph.</td><td>' + Utils.escapeHtml(patient.emergencyPhone || '-') + '</td></tr>';
      }
      html += '</table></div>';
    }

    if (sections.indexOf('sessions') !== -1) {
      var sessions = Store.getSessionsByPatient(patient.id);
      sessions.sort(function(a, b) { return a.date > b.date ? -1 : 1; });
      if (sessions.length > 0) {
        html += '<div class="print-section-block">';
        html += '<h3>Diagnosis & Treatment (' + sessions.length + ')</h3>';
        for (var s = 0; s < sessions.length; s++) {
          var sn = sessions[s];
          html += '<div style="margin-bottom:1rem;padding:0.75rem;border:1px solid #ddd;page-break-inside:avoid;">';
          html += '<div style="display:flex;justify-content:space-between;margin-bottom:0.5rem;border-bottom:1px solid #eee;padding-bottom:0.4rem;">';
          html += '<strong style="font-size:0.95rem;">' + Utils.formatDate(sn.date) + '</strong>';
          html += '<span style="font-size:0.85rem;">Pain: ' + (sn.painScore != null ? sn.painScore : '-') + '/10 &nbsp; Function: ' + (sn.functionScore != null ? sn.functionScore : '-') + '/10</span>';
          html += '</div>';
          if (sn.bodyRegions && sn.bodyRegions.length > 0) {
            html += '<div style="margin-bottom:0.5rem;">';
            html += '<strong style="font-size:0.85rem;">Pain Regions:</strong>';
            html += BodyDiagram.renderPrintHtml(sn.bodyRegions);
            html += '</div>';
          }
          if (Store.isFeatureEnabled('soapNotes')) {
            if (sn.subjective) html += '<p style="margin:0.25rem 0;font-size:0.85rem;"><strong>S:</strong> ' + Utils.escapeHtml(sn.subjective) + '</p>';
            if (sn.objective) html += '<p style="margin:0.25rem 0;font-size:0.85rem;"><strong>O:</strong> ' + Utils.escapeHtml(sn.objective) + '</p>';
            if (sn.assessment) html += '<p style="margin:0.25rem 0;font-size:0.85rem;"><strong>A:</strong> ' + Utils.escapeHtml(sn.assessment) + '</p>';
            if (sn.plan) html += '<p style="margin:0.25rem 0;font-size:0.85rem;"><strong>P:</strong> ' + Utils.escapeHtml(sn.plan) + '</p>';
          }
          html += '</div>';
        }
        html += '</div>';
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
      rxs.sort(function(a, b) { return a.date > b.date ? -1 : 1; });
      if (rxs.length > 0) {
        html += '<div class="print-section-block">';
        html += '<h3>Prescriptions (' + rxs.length + ')</h3>';
        html += '<table class="print-data-table"><thead><tr><th>Medication</th><th>Dosage</th><th>Route</th><th>Frequency</th><th>Duration</th><th>Instructions</th></tr></thead><tbody>';
        for (var p = 0; p < rxs.length; p++) {
          var rxp = rxs[p];
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
        var printStatus = bill.status === 'gpay' ? 'GPAY' : bill.status === 'cash' ? 'CASH' : bill.status === 'card' ? 'CARD' : bill.status === 'paid' ? 'PAID' : 'PENDING';
        html += '<td class="lbl">Status</td><td style="font-weight:600;">' + printStatus + '</td></tr>';
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
        if (bills[j].status !== 'pending') paidAmt += amt;
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
          var pLabel = b.status === 'gpay' ? 'GPay' : b.status === 'cash' ? 'Cash' : b.status === 'card' ? 'Card' : b.status === 'paid' ? 'Paid' : 'Pending';
          html += '<td>' + pLabel + '</td>';
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

      // === Appointments ===
      if (e.target.closest('#add-appt-btn')) {
        sub.appointmentsView = 'form';
        sub.appointmentsEditId = null;
        renderDetail(container, patient);
        return;
      }
      var completeApptBtn = e.target.closest('.complete-appt-btn');
      if (completeApptBtn) {
        var caid = completeApptBtn.getAttribute('data-id');
        var completedAppt = Store.getAppointment(caid);
        var doComplete = function() {
          Store.updateAppointment(caid, { status: 'completed' });
          Store.logActivity('Appointment completed: ' + patient.name);
          Utils.toast('Appointment completed', 'success');
          sub.nextVisitAppt = completedAppt;
          renderDetail(container, Store.getPatient(patient.id));
        };
        if (completedAppt && completedAppt.date > Utils.today()) {
          Utils.inlineConfirm(container, 'This appointment is on ' + Utils.formatDate(completedAppt.date) + ' (future date). Mark as completed?', doComplete);
        } else {
          doComplete();
        }
        return;
      }
      // Next visit quick date buttons
      var nvQuickBtn = e.target.closest('.nv-quick-btn');
      if (nvQuickBtn && sub.nextVisitAppt) {
        var days = parseInt(nvQuickBtn.getAttribute('data-days'), 10);
        var nva = sub.nextVisitAppt;
        var nextDate = Utils.toDateString(Utils.addDays(new Date(), days));
        Store.createAppointment({
          patientId: patient.id,
          patientName: patient.name,
          date: nextDate,
          time: nva.time || '09:00',
          type: nva.type || 'Follow-up',
          duration: nva.duration || '30',
          status: 'scheduled',
          notes: ''
        });
        Utils.toast('Next visit booked for ' + Utils.formatDate(nextDate), 'success');
        sub.nextVisitAppt = null;
        renderDetail(container, Store.getPatient(patient.id));
        return;
      }
      // Dismiss next visit prompt
      if (e.target.closest('#nv-dismiss')) {
        sub.nextVisitAppt = null;
        renderDetail(container, patient);
        return;
      }
      // Custom date → open appointment form
      if (e.target.closest('#nv-custom')) {
        sub.nextVisitAppt = null;
        sub.appointmentsView = 'form';
        sub.appointmentsEditId = null;
        renderDetail(container, patient);
        return;
      }

      var cancelApptBtn = e.target.closest('.cancel-appt-btn');
      if (cancelApptBtn) {
        var canid = cancelApptBtn.getAttribute('data-id');
        Utils.inlineConfirm(container, 'Cancel this appointment?', function() {
          Store.updateAppointment(canid, { status: 'cancelled' });
          Store.logActivity('Appointment cancelled: ' + patient.name);
          Utils.toast('Appointment cancelled', 'warning');
          renderDetail(container, Store.getPatient(patient.id));
        });
        return;
      }
      var deleteApptBtn = e.target.closest('.delete-appt-btn');
      if (deleteApptBtn) {
        var daid = deleteApptBtn.getAttribute('data-id');
        Utils.inlineConfirm(container, 'Delete this appointment? It will be moved to trash.', function() {
          Store.deleteAppointment(daid);
          Store.logActivity('Appointment deleted: ' + patient.name);
          Utils.toast('Appointment deleted', 'success');
          renderDetail(container, Store.getPatient(patient.id));
        }, { danger: true });
        return;
      }
      var startSessionBtn = e.target.closest('.start-session-btn');
      if (startSessionBtn) {
        var sessDate = startSessionBtn.getAttribute('data-date');
        activeTab = 'sessions';
        resetSub();
        sub.sessionsView = 'form';
        sub.sessionsEditId = null;
        _sessionDateParam = sessDate || null;
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
        sub.exercisesView = 'add';
        sub.exercisesEditId = null;
        sub.exerciseLibraryFilter = 'all';
        renderDetail(container, patient);
        return;
      }
      var libFilterBtn = e.target.closest('.library-filter-btn');
      if (libFilterBtn) {
        sub.exerciseLibraryFilter = libFilterBtn.getAttribute('data-filter');
        renderDetail(container, patient);
        return;
      }
      var timerBtn = e.target.closest('.preview-timer-btn');
      if (timerBtn) {
        var timerId = timerBtn.getAttribute('data-id');
        var timerEx = Store.getExercises().filter(function(e) { return e.id === timerId; })[0];
        if (timerEx) showTimerPreview(timerEx);
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
      var editSectionBtn = e.target.closest('.edit-section-btn');
      if (editSectionBtn) {
        sub.editingPatient = editSectionBtn.getAttribute('data-section');
        renderDetail(container, patient);
        return;
      }

      // === Billing ===
      if (e.target.closest('#add-billing-btn')) {
        sub.billingView = 'form';
        renderDetail(container, patient);
        return;
      }
      var viewBillingBtn = e.target.closest('.view-billing-btn');
      if (viewBillingBtn) {
        sub.billingView = 'detail';
        sub.billingViewId = viewBillingBtn.getAttribute('data-id');
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
        // Capture body regions from diagram
        data.bodyRegions = BodyDiagram.getSelected('session-body-diagram');
        var session = sub.sessionsEditId ? Store.getSession(sub.sessionsEditId) : null;
        if (session) {
          Store.updateSession(session.id, data);
          Utils.toast('Record updated', 'success');
        } else {
          Store.createSession(data);
          Utils.toast('Record added', 'success');
        }
        sub.sessionsView = 'list';
        sub.sessionsEditId = null;
        renderDetail(container, Store.getPatient(patient.id));
      };
      // Bind mic + autocomplete
      Utils.bindMicButtons(container);
      Utils.bindAllAutocomplete(container);
      // Initialize interactive body diagram
      if (Store.isFeatureEnabled('bodyDiagram')) {
        var editSession = sub.sessionsEditId ? Store.getSession(sub.sessionsEditId) : null;
        var _sessionRegions = (editSession && editSession.bodyRegions ? editSession.bodyRegions : []).slice();
        BodyDiagram.render('session-body-diagram', _sessionRegions);
      }
    }

    // Exercise edit form (edit existing only)
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
        data.status = 'active';
        var exercise = sub.exercisesEditId ? Store.getExercises().filter(function(e) { return e.id === sub.exercisesEditId; })[0] : null;
        if (exercise) {
          Store.updateExercise(exercise.id, data);
          Utils.toast('Exercise updated', 'success');
        }
        sub.exercisesView = 'list';
        sub.exercisesEditId = null;
        renderDetail(container, Store.getPatient(patient.id));
      };
      Utils.bindMicButtons(container);
    }

    // Unified Add Exercise view bindings
    var addExBack = document.getElementById('add-exercise-back');
    var addExCancel = document.getElementById('add-exercise-cancel');
    if (addExBack) addExBack.onclick = function() { sub.exercisesView = 'list'; sub.exerciseLibraryFilter = 'all'; renderDetail(container, patient); };
    if (addExCancel) addExCancel.onclick = function() { sub.exercisesView = 'list'; sub.exerciseLibraryFilter = 'all'; renderDetail(container, patient); };

    // Toggle custom exercise section
    var toggleCustom = document.getElementById('toggle-custom-form');
    if (toggleCustom) {
      toggleCustom.onclick = function() {
        var section = document.getElementById('custom-exercise-section');
        var chevron = document.getElementById('custom-form-chevron');
        if (section.style.display === 'none') {
          section.style.display = 'block';
          chevron.style.transform = 'rotate(180deg)';
        } else {
          section.style.display = 'none';
          chevron.style.transform = '';
        }
      };
    }

    // Custom exercise save
    var customSave = document.getElementById('custom-exercise-save');
    if (customSave) {
      customSave.onclick = function() {
        var form = document.getElementById('exercise-form');
        var nameInput = form.querySelector('[name="name"]');
        if (!nameInput.value.trim()) {
          Utils.toast('Exercise name is required', 'error');
          return;
        }
        var data = Utils.getFormData(form);
        data.patientId = patient.id;
        data.status = 'active';
        Store.createExercise(data);
        Utils.toast('Exercise added', 'success');
        sub.exercisesView = 'list';
        sub.exerciseLibraryFilter = 'all';
        renderDetail(container, Store.getPatient(patient.id));
      };
      Utils.bindMicButtons(container);
    }

    // Library assign from unified view
    var libAssign = document.getElementById('library-picker-assign');
    if (libAssign) {
      libAssign.onclick = function() {
        var checkboxes = container.querySelectorAll('.library-exercise-cb:checked:not(:disabled)');
        if (checkboxes.length === 0) {
          Utils.toast('Select at least one exercise', 'error');
          return;
        }
        var count = 0;
        for (var ci = 0; ci < checkboxes.length; ci++) {
          var exId = checkboxes[ci].getAttribute('data-ex-id');
          var libEx = ExerciseLibrary.getById(exId);
          if (libEx) {
            Store.createExercise({
              patientId: patient.id,
              name: libEx.name,
              sets: libEx.defaultSets + '',
              reps: libEx.defaultReps + '',
              hold: libEx.holdSeconds ? libEx.holdSeconds + ' sec' : '',
              frequency: '1x daily',
              instructions: '',
              libraryId: libEx.id,
              status: 'active'
            });
            count++;
          }
        }
        Utils.toast(count + ' exercise' + (count !== 1 ? 's' : '') + ' assigned', 'success');
        sub.exercisesView = 'list';
        sub.exerciseLibraryFilter = 'all';
        renderDetail(container, Store.getPatient(patient.id));
      };
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
        if (data.status !== 'pending') data.paidDate = Utils.today();
        Store.createBilling(data);
        Utils.toast('Invoice created', 'success');
        sub.billingView = 'list';
        renderDetail(container, Store.getPatient(patient.id));
      };
    }

    // Billing detail view
    var billDetailBack = document.getElementById('billing-detail-back');
    var billDetailBack2 = document.getElementById('billing-detail-back2');
    var billDetailMarkPaid = document.getElementById('billing-detail-mark-paid');
    var billDetailPrint = document.getElementById('billing-detail-print');
    function goBackBilling() { sub.billingView = 'list'; sub.billingViewId = null; renderDetail(container, patient); }
    if (billDetailBack) billDetailBack.onclick = goBackBilling;
    if (billDetailBack2) billDetailBack2.onclick = goBackBilling;
    if (billDetailMarkPaid) {
      billDetailMarkPaid.onclick = function() {
        Store.updateBilling(this.getAttribute('data-id'), { status: 'paid', paidDate: Utils.today() });
        Utils.toast('Marked as paid', 'success');
        Store.logActivity('Payment received from ' + patient.name);
        patient = Store.getPatient(patient.id);
        renderDetail(container, patient);
      };
    }
    if (billDetailPrint) {
      billDetailPrint.onclick = function() {
        var invoiceId = this.getAttribute('data-id');
        executePrint(patient, 'billing', [], 'single', invoiceId, ['doctor']);
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
        if (!nameInput || !nameInput.value.trim()) {
          Utils.toast('Name is required', 'error');
          return;
        }
        var formData = Utils.getFormData(form);
        var data = {
          name: formData.name,
          dob: formData.dob,
          gender: formData.gender,
          phoneCode: formData.phoneCode,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          insurance: formData.insurance,
          emergencyContact: formData.emergencyContact,
          emergencyPhoneCode: formData.emergencyPhoneCode,
          emergencyPhone: formData.emergencyPhone
        };
        // Collect tags
        var activePills = form.querySelectorAll('.tag-pill.active');
        data.tags = [];
        for (var tc = 0; tc < activePills.length; tc++) {
          data.tags.push(activePills[tc].getAttribute('data-tag-id'));
        }

        // Phone uniqueness check (skip if same patient)
        if (data.phone && data.phone.trim()) {
          var existingByPhone = Store.getPatientByPhone(data.phone);
          if (existingByPhone && existingByPhone.id !== patient.id) {
            Utils.toast('Phone number already exists for ' + existingByPhone.name, 'error');
            return;
          }
        }

        Store.updatePatient(patient.id, data);
        Utils.toast('Patient updated', 'success');
        sub.editingPatient = false;
        renderDetail(container, Store.getPatient(patient.id));
      };
      Utils.bindDobPicker(container);
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

    // Appointment form
    var apptBack = document.getElementById('appt-form-back');
    var apptCancel = document.getElementById('appt-form-cancel');
    var apptSave = document.getElementById('appt-form-save');
    if (apptBack) apptBack.onclick = function() { sub.appointmentsView = 'list'; sub.appointmentsEditId = null; renderDetail(container, patient); };
    if (apptCancel) apptCancel.onclick = function() { sub.appointmentsView = 'list'; sub.appointmentsEditId = null; renderDetail(container, patient); };
    // Show/hide repeat weeks dropdown
    var repeatSelect = document.getElementById('appt-repeat');
    if (repeatSelect) {
      repeatSelect.addEventListener('change', function() {
        var weeksGroup = document.getElementById('repeat-weeks-group');
        if (weeksGroup) {
          weeksGroup.style.display = this.value !== 'none' ? '' : 'none';
        }
      });
    }

    if (apptSave) {
      var _pastDateOk = false;
      var _conflictOk = false;
      apptSave.onclick = function() {
        var form = document.getElementById('appt-form');
        var data = Utils.getFormData(form);
        if (!data.date || !data.time) {
          Utils.toast('Date and time are required', 'error');
          return;
        }
        // Past date warning
        if (!_pastDateOk && data.date < Utils.today()) {
          var wEl = document.getElementById('appt-warning');
          wEl.innerHTML = 'This date is in the past (' + Utils.formatDate(data.date) + '). Are you sure?' +
            '<br><button type="button" class="btn btn-sm btn-primary" id="past-ok" style="margin-top:0.4rem;">Yes, continue</button> ' +
            '<button type="button" class="btn btn-sm btn-ghost" id="past-no" style="margin-top:0.4rem;">Change date</button>';
          wEl.style.display = 'block';
          document.getElementById('past-ok').onclick = function(e) {
            e.preventDefault();
            _pastDateOk = true;
            document.getElementById('appt-form-save').click();
          };
          document.getElementById('past-no').onclick = function(e) {
            e.preventDefault();
            wEl.style.display = 'none';
          };
          return;
        }
        // Conflict check (warning, not hard block)
        var editId = sub.appointmentsEditId || null;
        if (!_conflictOk) {
          var conflict = Store.hasConflict(data.date, data.time, data.duration, editId);
          if (conflict) {
            var cEl = document.getElementById('appt-warning');
            cEl.innerHTML = 'Time conflict: <strong>' + Utils.escapeHtml(conflict.patientName) + '</strong> already booked at ' + Utils.formatTime(conflict.time) + ' (' + conflict.duration + ' min). Book anyway?' +
              '<br><button type="button" class="btn btn-sm btn-warning" id="conflict-ok" style="margin-top:0.4rem;">Yes, double-book</button> ' +
              '<button type="button" class="btn btn-sm btn-ghost" id="conflict-no" style="margin-top:0.4rem;">Change time</button>';
            cEl.style.display = 'block';
            document.getElementById('conflict-ok').onclick = function(e) {
              e.preventDefault();
              _conflictOk = true;
              document.getElementById('appt-form-save').click();
            };
            document.getElementById('conflict-no').onclick = function(e) {
              e.preventDefault();
              cEl.style.display = 'none';
            };
            return;
          }
        }
        data.patientId = patient.id;
        data.patientName = patient.name;
        var existing = sub.appointmentsEditId ? Store.getAppointment(sub.appointmentsEditId) : null;
        data.status = existing ? existing.status : 'scheduled';
        if (existing) {
          Store.updateAppointment(existing.id, data);
          Utils.toast('Appointment updated', 'success');
        } else {
          // Check for recurring appointments
          var repeatSel = document.getElementById('appt-repeat');
          var repeatVal = repeatSel ? repeatSel.value : 'none';
          var repeatWeeksSel = document.getElementById('appt-repeat-weeks');
          var repeatWeeks = repeatWeeksSel ? parseInt(repeatWeeksSel.value, 10) : 2;

          if (repeatVal !== 'none') {
            var dates = [];
            var baseDate = data.date;
            if (repeatVal === 'weekly') {
              for (var rw = 0; rw < repeatWeeks; rw++) {
                dates.push(addDaysStr(baseDate, rw * 7));
              }
            } else if (repeatVal === '2x') {
              var baseDow2 = getDayOfWeek(baseDate);
              var daysToMon = (1 - baseDow2 + 7) % 7;
              if (daysToMon === 0 && baseDow2 !== 1) daysToMon = 7;
              var firstMon = baseDow2 === 1 ? baseDate : addDaysStr(baseDate, daysToMon);
              for (var rw2 = 0; rw2 < repeatWeeks; rw2++) {
                var mon = addDaysStr(firstMon, rw2 * 7);
                var thu = addDaysStr(mon, 3);
                dates.push(mon);
                dates.push(thu);
              }
            } else if (repeatVal === '3x') {
              var baseDow3 = getDayOfWeek(baseDate);
              var daysToMon3 = (1 - baseDow3 + 7) % 7;
              if (daysToMon3 === 0 && baseDow3 !== 1) daysToMon3 = 7;
              var firstMon3 = baseDow3 === 1 ? baseDate : addDaysStr(baseDate, daysToMon3);
              for (var rw3 = 0; rw3 < repeatWeeks; rw3++) {
                var mon3 = addDaysStr(firstMon3, rw3 * 7);
                var wed3 = addDaysStr(mon3, 2);
                var fri3 = addDaysStr(mon3, 4);
                dates.push(mon3);
                dates.push(wed3);
                dates.push(fri3);
              }
            }
            dates.sort();
            for (var ri = 0; ri < dates.length; ri++) {
              var recurData = {
                patientId: data.patientId,
                patientName: data.patientName,
                date: dates[ri],
                time: data.time,
                type: data.type,
                duration: data.duration,
                status: 'scheduled',
                notes: data.notes || ''
              };
              Store.createAppointment(recurData);
            }
            Utils.toast('Created ' + dates.length + ' appointments', 'success');
          } else {
            Store.createAppointment(data);
            Utils.toast('Appointment booked', 'success');
          }
        }
        sub.appointmentsView = 'list';
        sub.appointmentsEditId = null;
        renderDetail(container, Store.getPatient(patient.id));
      };
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

  // Register cleanup so router can remove stale handlers
  if (!window._viewCleanups) window._viewCleanups = [];
  window._viewCleanups.push(function(container) {
    if (_clickHandler) {
      container.removeEventListener('click', _clickHandler);
      _clickHandler = null;
    }
  });

  return { render: render };
})();
