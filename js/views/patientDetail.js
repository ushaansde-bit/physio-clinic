/* ============================================
   Patient Detail View - 5 Tabs
   ============================================ */
window.PatientDetailView = (function() {

  var activeTab = 'overview';
  var _clickHandler = null;

  function render(container, patientId) {
    var patient = Store.getPatient(patientId);
    if (!patient) {
      container.innerHTML = '<div class="empty-state"><p>Patient not found</p><a href="#/patients" class="btn btn-primary mt-2">Back to Patients</a></div>';
      return;
    }

    App.setPageTitle(patient.name);
    activeTab = activeTab || 'overview';
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
    html += '<h2>' + Utils.escapeHtml(patient.name) + ' <span style="font-size:0.75rem;font-family:monospace;color:var(--primary);font-weight:500;vertical-align:middle;">' + Utils.escapeHtml(patient.displayId || '') + '</span></h2>';
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
    html += tabBtn('sessions', 'Sessions');
    html += tabBtn('exercises', 'Exercises');
    html += tabBtn('prescriptions', 'Prescriptions');
    html += tabBtn('billing', 'Billing');
    html += '</div>';

    // Tab content
    html += '<div id="tab-overview" class="tab-content' + (activeTab === 'overview' ? ' active' : '') + '">';
    html += renderOverview(patient);
    html += '</div>';

    html += '<div id="tab-sessions" class="tab-content' + (activeTab === 'sessions' ? ' active' : '') + '">';
    html += renderSessions(patient);
    html += '</div>';

    html += '<div id="tab-exercises" class="tab-content' + (activeTab === 'exercises' ? ' active' : '') + '">';
    html += renderExercises(patient);
    html += '</div>';

    html += '<div id="tab-prescriptions" class="tab-content' + (activeTab === 'prescriptions' ? ' active' : '') + '">';
    html += renderPrescriptions(patient);
    html += '</div>';

    html += '<div id="tab-billing" class="tab-content' + (activeTab === 'billing' ? ' active' : '') + '">';
    html += renderBilling(patient);
    html += '</div>';

    container.innerHTML = html;
    bindEvents(container, patient);
  }

  function tabBtn(id, label) {
    return '<button class="tab-btn' + (activeTab === id ? ' active' : '') + '" data-tab="' + id + '">' + label + '</button>';
  }

  // ==================== OVERVIEW TAB ====================
  function renderOverview(patient) {
    var html = '';

    // Patient info
    html += '<div class="card mb-2"><div class="card-header"><h3>Patient Information</h3></div><div class="card-body">';
    html += '<div class="info-grid">';
    html += '<div class="info-item"><label>Patient ID</label><span style="font-family:monospace;font-weight:600;color:var(--primary);">' + Utils.escapeHtml(patient.displayId || '-') + '</span></div>';
    html += infoItem('Full Name', patient.name);
    html += infoItem('Date of Birth', Utils.formatDate(patient.dob) + ' (Age ' + Utils.calculateAge(patient.dob) + ')');
    html += infoItem('Gender', patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : '-');
    html += infoItem('Phone', patient.phone);
    html += infoItem('Email', patient.email);
    html += infoItem('Address', patient.address);
    html += infoItem('Insurance', patient.insurance);
    html += infoItem('Status', patient.status ? patient.status.charAt(0).toUpperCase() + patient.status.slice(1) : 'Active');
    html += '</div></div></div>';

    // Diagnosis & treatment
    html += '<div class="card mb-2"><div class="card-header"><h3>Diagnosis & Treatment Plan</h3></div><div class="card-body">';
    html += '<div class="info-grid" style="grid-template-columns:1fr;">';
    html += infoItem('Diagnosis', patient.diagnosis);
    html += infoItem('Treatment Plan', patient.treatmentPlan);
    html += infoItem('Notes', patient.notes);
    html += '</div></div></div>';

    // Affected Body Areas (body diagram)
    html += '<div class="card mb-2"><div class="card-header"><h3>Affected Body Areas</h3></div><div class="card-body body-diagram-card">';
    if (patient.bodyRegions && patient.bodyRegions.length > 0) {
      html += BodyDiagram.renderHtml(patient.bodyRegions, { readOnly: true });
      html += '<div class="body-region-badges">' + BodyDiagram.renderBadges(patient.bodyRegions) + '</div>';
    } else {
      html += '<p style="color:var(--gray-400);font-size:0.85rem;">No areas marked</p>';
    }
    html += '</div></div>';

    // Progress snapshot
    var sessions = Store.getSessionsByPatient(patient.id);
    if (sessions.length > 0) {
      sessions.sort(function(a, b) { return a.date < b.date ? -1 : 1; });
      html += '<div class="card mb-2"><div class="card-header"><h3>Progress Snapshot</h3></div><div class="card-body">';
      html += '<div class="progress-chart">';

      // Build data points
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

    // Next Appointment card
    var allAppts = Store.getAppointmentsByPatient(patient.id);
    var todayStr = Utils.today();
    var nextAppt = null;
    for (var ai = 0; ai < allAppts.length; ai++) {
      var ap = allAppts[ai];
      if (ap.status === 'scheduled' && ap.date >= todayStr) {
        if (!nextAppt || ap.date < nextAppt.date || (ap.date === nextAppt.date && ap.time < nextAppt.time)) {
          nextAppt = ap;
        }
      }
    }
    html += '<div class="card mb-2"><div class="card-header"><h3>Next Appointment</h3>';
    html += '<button class="btn btn-sm btn-primary" id="book-next-visit-btn">Book Next Visit</button>';
    html += '</div><div class="card-body">';
    if (nextAppt) {
      html += '<div class="info-grid" style="grid-template-columns:1fr 1fr 1fr;">';
      html += infoItem('Date', Utils.formatDate(nextAppt.date));
      html += infoItem('Time', Utils.formatTime(nextAppt.time));
      html += infoItem('Type', nextAppt.type);
      html += '</div>';
    } else {
      html += '<p style="color:var(--gray-500);font-size:0.85rem;">No upcoming appointments scheduled.</p>';
    }
    html += '</div></div>';

    // Emergency contact
    html += '<div class="card"><div class="card-header"><h3>Emergency Contact</h3></div><div class="card-body">';
    html += '<div class="info-grid">';
    html += infoItem('Contact Name', patient.emergencyContact);
    html += infoItem('Contact Phone', patient.emergencyPhone);
    html += '</div></div></div>';

    return html;
  }

  function infoItem(label, value) {
    return '<div class="info-item"><label>' + label + '</label><span>' + Utils.escapeHtml(value || '-') + '</span></div>';
  }

  // ==================== SESSIONS TAB ====================
  function renderSessions(patient) {
    var sessions = Store.getSessionsByPatient(patient.id);
    sessions.sort(function(a, b) { return a.date > b.date ? -1 : 1; });

    var html = '<div class="flex-between mb-2">';
    html += '<h3 style="font-size:1rem;">Session Notes (' + sessions.length + ')</h3>';
    html += '<button class="btn btn-primary btn-sm" id="add-session-btn">Add Session Note</button>';
    html += '</div>';

    if (sessions.length === 0) {
      html += '<div class="empty-state"><p>No session notes yet</p><p class="empty-sub">Click "Add Session Note" to record the first session.</p></div>';
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

  function soapSection(label, prefix, text) {
    return '<div class="soap-section"><div class="soap-label ' + prefix + '-label">' + label + '</div>' +
      '<div class="soap-text">' + Utils.escapeHtml(text || '-') + '</div></div>';
  }

  // ==================== EXERCISES TAB ====================
  function renderExercises(patient) {
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

    // Print-only prescription pad
    html += '<div class="print-only rx-print-pad" style="margin-top:2rem;">';
    html += '<div style="text-align:center;border-bottom:2px solid #333;padding-bottom:0.5rem;margin-bottom:1rem;">';
    html += '<h2 style="margin:0;">PhysioClinic</h2>';
    html += '<p style="font-size:0.85rem;color:#666;margin:0.2rem 0;">Physiotherapy & Rehabilitation Centre</p>';
    html += '</div>';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:1rem;">';
    html += '<div><strong>Patient:</strong> ' + Utils.escapeHtml(patient.name) + '</div>';
    html += '<div><strong>Date:</strong> ' + Utils.formatDate(Utils.today()) + '</div>';
    html += '</div>';
    html += '<div style="display:flex;gap:2rem;margin-bottom:1rem;">';
    html += '<div><strong>Age/Gender:</strong> ' + Utils.calculateAge(patient.dob) + ' yrs / ' + (patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : '-') + '</div>';
    html += '<div><strong>Diagnosis:</strong> ' + Utils.escapeHtml(patient.diagnosis || '-') + '</div>';
    html += '</div>';
    html += '<div style="border-top:1px solid #ccc;padding-top:0.75rem;">';
    html += '<h3 style="margin-bottom:0.75rem;">Rx</h3>';
    for (var l = 0; l < active.length; l++) {
      var rx = active[l];
      html += '<div style="margin-bottom:0.75rem;page-break-inside:avoid;">';
      html += '<div><strong>' + (l + 1) + '. ' + Utils.escapeHtml(rx.medication) + '</strong></div>';
      html += '<div style="padding-left:1.2rem;font-size:0.9rem;">';
      html += Utils.escapeHtml(rx.dosage) + ' | ' + Utils.escapeHtml(rx.route) + ' | ' + Utils.escapeHtml(rx.frequency);
      html += ' | Duration: ' + Utils.escapeHtml(rx.duration);
      if (rx.instructions) html += '<br><em>' + Utils.escapeHtml(rx.instructions) + '</em>';
      html += '</div></div>';
    }
    html += '</div>';
    html += '<div style="margin-top:3rem;text-align:right;">';
    html += '<div style="border-top:1px solid #333;display:inline-block;padding-top:0.3rem;">Signature of Doctor</div>';
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
    var bills = Store.getBillingByPatient(patient.id);
    bills.sort(function(a, b) { return a.date > b.date ? -1 : 1; });

    // Totals
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

    // Summary cards
    html += '<div class="billing-summary">';
    html += '<div class="billing-stat total"><h4>Total Billed</h4><div class="amount">' + Utils.formatCurrency(total) + '</div></div>';
    html += '<div class="billing-stat paid"><h4>Paid</h4><div class="amount">' + Utils.formatCurrency(paid) + '</div></div>';
    html += '<div class="billing-stat pending"><h4>Pending</h4><div class="amount">' + Utils.formatCurrency(pending) + '</div></div>';
    html += '</div>';

    // Table
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
        html += '<td style="font-weight:600;">' + Utils.formatCurrency(b.amount) + '</td>';
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

  // ==================== PRINT OPTIONS ====================
  function showPrintOptions(patient) {
    var bills = Store.getBillingByPatient(patient.id);
    bills.sort(function(a, b) { return a.date > b.date ? -1 : 1; });

    var body = '<div style="margin-bottom:1rem;">';
    body += '<h4 style="margin-bottom:0.75rem;">Report Type</h4>';
    body += '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;">';
    body += '<button class="btn btn-primary print-type-btn active" data-type="patient" id="pt-type-patient">Patient Report</button>';
    body += '<button class="btn btn-secondary print-type-btn" data-type="billing" id="pt-type-billing">Billing Report</button>';
    body += '<button class="btn btn-secondary print-type-btn" data-type="combined" id="pt-type-combined">Combined Report</button>';
    body += '</div></div>';

    // Patient report sections
    body += '<div id="print-patient-opts">';
    body += '<h4 style="margin-bottom:0.5rem;">Select Sections</h4>';
    body += '<div class="tag-checkboxes">';
    body += '<label class="tag-checkbox-item checked"><input type="checkbox" class="print-section" value="info" checked> Patient Info</label>';
    body += '<label class="tag-checkbox-item checked"><input type="checkbox" class="print-section" value="diagnosis" checked> Diagnosis & Plan</label>';
    body += '<label class="tag-checkbox-item checked"><input type="checkbox" class="print-section" value="body" checked> Body Diagram</label>';
    body += '<label class="tag-checkbox-item checked"><input type="checkbox" class="print-section" value="sessions" checked> Sessions</label>';
    body += '<label class="tag-checkbox-item checked"><input type="checkbox" class="print-section" value="exercises" checked> Exercises</label>';
    body += '<label class="tag-checkbox-item checked"><input type="checkbox" class="print-section" value="prescriptions" checked> Prescriptions</label>';
    body += '</div></div>';

    // Billing report options
    body += '<div id="print-billing-opts" style="display:none;">';
    body += '<h4 style="margin-bottom:0.5rem;">Billing Type</h4>';
    body += '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.75rem;">';
    body += '<label class="tag-checkbox-item checked"><input type="radio" name="bill-type" value="statement" checked> Full Statement</label>';
    body += '<label class="tag-checkbox-item"><input type="radio" name="bill-type" value="single"> Single Invoice</label>';
    body += '</div>';
    // Invoice picker (hidden by default)
    body += '<div id="print-invoice-picker" style="display:none;">';
    body += '<label style="font-size:0.82rem;font-weight:600;margin-bottom:0.3rem;display:block;">Select Invoice</label>';
    body += '<select id="print-invoice-select" class="filter-select" style="width:100%;">';
    for (var i = 0; i < bills.length; i++) {
      body += '<option value="' + bills[i].id + '">' + Utils.formatDate(bills[i].date) + ' - ' + Utils.escapeHtml(bills[i].description) + ' - ' + Utils.formatCurrency(bills[i].amount) + '</option>';
    }
    body += '</select></div>';
    body += '</div>';

    var footer = '<button class="btn btn-secondary" id="print-cancel">Cancel</button>';
    footer += '<button class="btn btn-primary" id="print-go">';
    footer += '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>';
    footer += ' Print</button>';

    Utils.showModal('Print Report', body, footer);

    var currentType = 'patient';

    // Type toggle
    var typeBtns = document.querySelectorAll('.print-type-btn');
    for (var t = 0; t < typeBtns.length; t++) {
      typeBtns[t].addEventListener('click', function() {
        for (var x = 0; x < typeBtns.length; x++) { typeBtns[x].className = 'btn btn-secondary print-type-btn'; }
        this.className = 'btn btn-primary print-type-btn active';
        currentType = this.getAttribute('data-type');
        document.getElementById('print-patient-opts').style.display = currentType === 'patient' || currentType === 'combined' ? '' : 'none';
        document.getElementById('print-billing-opts').style.display = currentType === 'billing' || currentType === 'combined' ? '' : 'none';
      });
    }

    // Billing type radio toggle
    var radios = document.querySelectorAll('[name="bill-type"]');
    for (var r = 0; r < radios.length; r++) {
      radios[r].addEventListener('change', function() {
        document.getElementById('print-invoice-picker').style.display = this.value === 'single' ? '' : 'none';
      });
    }

    // Checkbox visual toggle
    var checks = document.querySelectorAll('.print-section');
    for (var c = 0; c < checks.length; c++) {
      checks[c].addEventListener('change', function() {
        this.parentElement.classList.toggle('checked', this.checked);
      });
    }

    document.getElementById('print-cancel').onclick = Utils.closeModal;
    document.getElementById('print-go').onclick = function() {
      Utils.closeModal();
      executePrint(patient, currentType);
    };

    // Store state for print execution
    window._printOpts = {
      getType: function() { return currentType; },
      getSections: function() {
        var secs = [];
        var chks = document.querySelectorAll('.print-section');
        for (var i = 0; i < chks.length; i++) {
          if (chks[i].checked) secs.push(chks[i].value);
        }
        return secs;
      },
      getBillType: function() {
        var sel = document.querySelector('[name="bill-type"]:checked');
        return sel ? sel.value : 'statement';
      },
      getInvoiceId: function() {
        var sel = document.getElementById('print-invoice-select');
        return sel ? sel.value : '';
      }
    };

    // Override print-go to capture state before modal closes
    document.getElementById('print-go').onclick = function() {
      var type = currentType;
      var sections = window._printOpts.getSections();
      var billType = window._printOpts.getBillType();
      var invoiceId = window._printOpts.getInvoiceId();
      Utils.closeModal();
      executePrint(patient, type, sections, billType, invoiceId);
    };
  }

  function executePrint(patient, type, sections, billType, invoiceId) {
    var html = '';

    // Clinic header
    html += '<div class="print-report-header">';
    html += '<h1>PhysioClinic</h1>';
    html += '<p>Clinic Management System</p>';
    html += '</div>';

    // Patient header (always shown)
    html += '<div class="print-patient-bar">';
    html += '<strong>' + Utils.escapeHtml(patient.name) + '</strong>';
    html += ' <span style="font-family:monospace;color:#555;">' + Utils.escapeHtml(patient.displayId || '') + '</span>';
    html += ' &nbsp;|&nbsp; Phone: ' + Utils.escapeHtml(patient.phone || '-');
    html += ' &nbsp;|&nbsp; DOB: ' + Utils.formatDate(patient.dob) + ' (Age ' + Utils.calculateAge(patient.dob) + ')';
    html += ' &nbsp;|&nbsp; Gender: ' + Utils.escapeHtml(patient.gender || '-');
    html += '</div>';

    if (type === 'patient' || type === 'combined') {
      html += buildPatientReport(patient, sections);
    }

    if (type === 'billing' || type === 'combined') {
      html += buildBillingReport(patient, billType, invoiceId);
    }

    // Footer
    html += '<div class="print-report-footer">';
    html += '<p>Generated on ' + Utils.formatDate(Utils.today()) + ' &nbsp;|&nbsp; PhysioClinic</p>';
    html += '</div>';

    // Inject into print container
    var printDiv = document.getElementById('print-report-area');
    if (!printDiv) {
      printDiv = document.createElement('div');
      printDiv.id = 'print-report-area';
      printDiv.className = 'print-report-area';
      document.body.appendChild(printDiv);
    }
    printDiv.innerHTML = html;
    document.body.classList.add('printing-report');
    setTimeout(function() {
      window.print();
      // Clean up after print so regular prints work normally
      setTimeout(function() {
        printDiv.innerHTML = '';
        document.body.classList.remove('printing-report');
      }, 500);
    }, 150);
  }

  function buildPatientReport(patient, sections) {
    var html = '<h2 class="print-section-title">Patient Report</h2>';

    if (sections.indexOf('info') !== -1) {
      html += '<div class="print-section-block">';
      html += '<h3>Patient Information</h3>';
      html += '<table class="print-info-table">';
      html += '<tr><td class="lbl">Patient ID</td><td>' + Utils.escapeHtml(patient.displayId || '-') + '</td>';
      html += '<td class="lbl">Full Name</td><td>' + Utils.escapeHtml(patient.name) + '</td></tr>';
      html += '<tr><td class="lbl">Phone</td><td>' + Utils.escapeHtml(patient.phone || '-') + '</td>';
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
      html += '<p>' + BodyDiagram.renderBadges(patient.bodyRegions) + '</p>';
      html += '</div>';
    }

    if (sections.indexOf('sessions') !== -1) {
      var sessions = Store.getSessionsByPatient(patient.id);
      sessions.sort(function(a, b) { return a.date > b.date ? -1 : 1; });
      if (sessions.length > 0) {
        html += '<div class="print-section-block">';
        html += '<h3>Session Notes (' + sessions.length + ')</h3>';
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
        html += '<h3>Exercise Program (' + exercises.length + ')</h3>';
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
          var rx = activeRx[p];
          html += '<tr>';
          html += '<td style="font-weight:600;">' + Utils.escapeHtml(rx.medication) + '</td>';
          html += '<td>' + Utils.escapeHtml(rx.dosage || '-') + '</td>';
          html += '<td>' + Utils.escapeHtml(rx.route || '-') + '</td>';
          html += '<td>' + Utils.escapeHtml(rx.frequency || '-') + '</td>';
          html += '<td>' + Utils.escapeHtml(rx.duration || '-') + '</td>';
          html += '<td>' + Utils.escapeHtml(rx.instructions || '-') + '</td>';
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
      // Single invoice
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
      // Full statement
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
      var tabBtn = e.target.closest('.tab-btn');
      if (tabBtn) {
        activeTab = tabBtn.getAttribute('data-tab');
        renderDetail(container, patient);
        return;
      }

      // Print
      if (e.target.closest('#print-patient-btn') || e.target.closest('#print-exercises-btn')) {
        showPrintOptions(patient);
        return;
      }

      // === Sessions ===
      if (e.target.closest('#add-session-btn')) {
        showSessionForm(null, patient, container);
        return;
      }
      var editSessionBtn = e.target.closest('.edit-session-btn');
      if (editSessionBtn) {
        showSessionForm(editSessionBtn.getAttribute('data-id'), patient, container);
        return;
      }
      var deleteSessionBtn = e.target.closest('.delete-session-btn');
      if (deleteSessionBtn) {
        Utils.confirm('Delete this session note?', function() {
          Store.deleteSession(deleteSessionBtn.getAttribute('data-id'));
          Utils.toast('Session note deleted', 'success');
          renderDetail(container, Store.getPatient(patient.id));
        });
        return;
      }

      // === Exercises ===
      if (e.target.closest('#add-exercise-btn')) {
        showExerciseForm(null, patient, container);
        return;
      }
      var editExBtn = e.target.closest('.edit-exercise-btn');
      if (editExBtn) {
        showExerciseForm(editExBtn.getAttribute('data-id'), patient, container);
        return;
      }
      var deleteExBtn = e.target.closest('.delete-exercise-btn');
      if (deleteExBtn) {
        Utils.confirm('Delete this exercise?', function() {
          Store.deleteExercise(deleteExBtn.getAttribute('data-id'));
          Utils.toast('Exercise deleted', 'success');
          renderDetail(container, Store.getPatient(patient.id));
        });
        return;
      }

      // === Prescriptions ===
      if (e.target.closest('#add-rx-btn')) {
        showPrescriptionForm(null, patient, container);
        return;
      }
      if (e.target.closest('#print-rx-btn')) {
        activeTab = 'prescriptions';
        renderDetail(container, patient);
        setTimeout(function() { window.print(); }, 100);
        return;
      }
      var editRxBtn = e.target.closest('.edit-rx-btn');
      if (editRxBtn) {
        showPrescriptionForm(editRxBtn.getAttribute('data-id'), patient, container);
        return;
      }
      var deleteRxBtn = e.target.closest('.delete-rx-btn');
      if (deleteRxBtn) {
        Utils.confirm('Delete this prescription?', function() {
          Store.deletePrescription(deleteRxBtn.getAttribute('data-id'));
          Utils.toast('Prescription deleted', 'success');
          renderDetail(container, Store.getPatient(patient.id));
        });
        return;
      }

      // === Book Next Visit ===
      if (e.target.closest('#book-next-visit-btn')) {
        showBookNextVisit(patient, container);
        return;
      }

      // === Billing ===
      if (e.target.closest('#add-billing-btn')) {
        showBillingForm(patient, container);
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
        Utils.confirm('Delete this billing record?', function() {
          Store.deleteBilling(deleteBillingBtn.getAttribute('data-id'));
          Utils.toast('Billing record deleted', 'success');
          renderDetail(container, Store.getPatient(patient.id));
        });
        return;
      }
    };
    container.addEventListener('click', _clickHandler);
  }

  // ==================== FORMS ====================

  // Session form
  function showSessionForm(sessionId, patient, container) {
    var session = sessionId ? Store.getSession(sessionId) : null;
    var title = session ? 'Edit Session Note' : 'New Session Note';

    var body = '<form id="session-form">';
    body += '<div class="form-row-3">';
    body += '<div class="form-group"><label>Date</label>';
    body += '<input type="date" name="date" value="' + (session ? session.date : Utils.today()) + '" required></div>';
    body += '<div class="form-group"><label>Pain Score (0-10)</label>';
    body += '<input type="number" name="painScore" min="0" max="10" value="' + (session ? session.painScore : '5') + '" required></div>';
    body += '<div class="form-group"><label>Function Score (0-10)</label>';
    body += '<input type="number" name="functionScore" min="0" max="10" value="' + (session ? session.functionScore : '5') + '" required></div>';
    body += '</div>';
    body += '<div class="form-group"><label>Subjective ' + Utils.micHtml('sf-subjective') + '</label>';
    body += '<textarea id="sf-subjective" name="subjective" rows="3" placeholder="Patient report, symptoms, functional status...">' + Utils.escapeHtml(session ? session.subjective || '' : '') + '</textarea></div>';
    body += '<div class="form-group"><label>Objective ' + Utils.micHtml('sf-objective') + '</label>';
    body += '<textarea id="sf-objective" name="objective" rows="3" placeholder="Measurements, ROM, strength, observations...">' + Utils.escapeHtml(session ? session.objective || '' : '') + '</textarea></div>';
    body += '<div class="form-group"><label>Assessment ' + Utils.micHtml('sf-assessment') + '</label>';
    body += '<textarea id="sf-assessment" name="assessment" rows="3" placeholder="Clinical reasoning, progress, prognosis...">' + Utils.escapeHtml(session ? session.assessment || '' : '') + '</textarea></div>';
    body += '<div class="form-group"><label>Plan ' + Utils.micHtml('sf-plan') + '</label>';
    body += '<textarea id="sf-plan" name="plan" rows="3" placeholder="Treatment plan, goals, next steps...">' + Utils.escapeHtml(session ? session.plan || '' : '') + '</textarea></div>';
    body += '</form>';

    var footer = '<button class="btn btn-secondary" id="modal-cancel">Cancel</button>';
    footer += '<button class="btn btn-primary" id="modal-save">Save Session</button>';

    Utils.showModal(title, body, footer, { large: true });
    Utils.bindMicButtons(document.getElementById('modal-body'));

    document.getElementById('modal-cancel').onclick = Utils.closeModal;
    document.getElementById('modal-save').onclick = function() {
      var form = document.getElementById('session-form');
      var data = Utils.getFormData(form);
      data.painScore = parseInt(data.painScore, 10) || 0;
      data.functionScore = parseInt(data.functionScore, 10) || 0;
      data.patientId = patient.id;

      if (session) {
        Store.updateSession(session.id, data);
        Utils.toast('Session updated', 'success');
      } else {
        Store.createSession(data);
        Utils.toast('Session note added', 'success');
      }
      Utils.closeModal();
      renderDetail(container, Store.getPatient(patient.id));
    };
  }

  // Exercise form
  function showExerciseForm(exerciseId, patient, container) {
    var exercise = exerciseId ? Store.getExercises().filter(function(e) { return e.id === exerciseId; })[0] : null;
    var title = exercise ? 'Edit Exercise' : 'New Exercise';

    var body = '<form id="exercise-form">';
    body += '<div class="form-group"><label>Exercise Name</label>';
    body += '<input type="text" name="name" value="' + Utils.escapeHtml(exercise ? exercise.name : '') + '" required placeholder="e.g., Quad Sets"></div>';
    body += '<div class="form-row-4">';
    body += '<div class="form-group"><label>Sets</label>';
    body += '<input type="text" name="sets" value="' + Utils.escapeHtml(exercise ? exercise.sets : '3') + '" placeholder="3"></div>';
    body += '<div class="form-group"><label>Reps</label>';
    body += '<input type="text" name="reps" value="' + Utils.escapeHtml(exercise ? exercise.reps : '10') + '" placeholder="10"></div>';
    body += '<div class="form-group"><label>Hold</label>';
    body += '<input type="text" name="hold" value="' + Utils.escapeHtml(exercise ? exercise.hold : '') + '" placeholder="5 sec"></div>';
    body += '<div class="form-group"><label>Frequency</label>';
    body += '<input type="text" name="frequency" value="' + Utils.escapeHtml(exercise ? exercise.frequency : '') + '" placeholder="2x daily"></div>';
    body += '</div>';
    body += '<div class="form-group"><label>Instructions ' + Utils.micHtml('ef-instructions') + '</label>';
    body += '<textarea id="ef-instructions" name="instructions" rows="4" placeholder="Step-by-step instructions for the patient...">' + Utils.escapeHtml(exercise ? exercise.instructions || '' : '') + '</textarea></div>';
    body += '<div class="form-group"><label>Status</label>';
    body += '<select name="status">';
    body += '<option value="active"' + (exercise && exercise.status === 'active' ? ' selected' : '') + '>Active</option>';
    body += '<option value="discontinued"' + (exercise && exercise.status === 'discontinued' ? ' selected' : '') + '>Discontinued</option>';
    body += '</select></div>';
    body += '</form>';

    var footer = '<button class="btn btn-secondary" id="modal-cancel">Cancel</button>';
    footer += '<button class="btn btn-primary" id="modal-save">Save Exercise</button>';

    Utils.showModal(title, body, footer);
    Utils.bindMicButtons(document.getElementById('modal-body'));

    document.getElementById('modal-cancel').onclick = Utils.closeModal;
    document.getElementById('modal-save').onclick = function() {
      var form = document.getElementById('exercise-form');
      var nameInput = form.querySelector('[name="name"]');
      if (!nameInput.value.trim()) {
        Utils.toast('Exercise name is required', 'error');
        return;
      }
      var data = Utils.getFormData(form);
      data.patientId = patient.id;

      if (exercise) {
        Store.updateExercise(exercise.id, data);
        Utils.toast('Exercise updated', 'success');
      } else {
        Store.createExercise(data);
        Utils.toast('Exercise added', 'success');
      }
      Utils.closeModal();
      renderDetail(container, Store.getPatient(patient.id));
    };
  }

  // Billing form
  function showBillingForm(patient, container) {
    var body = '<form id="billing-form">';
    body += '<div class="form-row">';
    body += '<div class="form-group"><label>Date</label>';
    body += '<input type="date" name="date" value="' + Utils.today() + '" required></div>';
    body += '<div class="form-group"><label>Amount (\u20B9)</label>';
    body += '<input type="number" name="amount" step="0.01" min="0" value="" required placeholder="0.00"></div>';
    body += '</div>';
    body += '<div class="form-group"><label>Description</label>';
    body += '<input type="text" name="description" required placeholder="e.g., Therapeutic Exercise + Manual Therapy"></div>';
    body += '<div class="form-group"><label>Status</label>';
    body += '<select name="status">';
    body += '<option value="pending">Pending</option>';
    body += '<option value="paid">Paid</option>';
    body += '</select></div>';
    body += '</form>';

    var footer = '<button class="btn btn-secondary" id="modal-cancel">Cancel</button>';
    footer += '<button class="btn btn-primary" id="modal-save">Create Invoice</button>';

    Utils.showModal('New Invoice', body, footer);

    document.getElementById('modal-cancel').onclick = Utils.closeModal;
    document.getElementById('modal-save').onclick = function() {
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
      Utils.closeModal();
      renderDetail(container, Store.getPatient(patient.id));
    };
  }

  // Prescription form
  function showPrescriptionForm(rxId, patient, container) {
    var rx = rxId ? Store.getPrescription(rxId) : null;
    var title = rx ? 'Edit Prescription' : 'New Prescription';
    var user = App.getCurrentUser();
    var doctorName = user ? user.name : 'Dr. Admin';

    var body = '<form id="rx-form">';
    body += '<div class="form-group"><label>Medication Name ' + Utils.micHtml('rx-medication') + '</label>';
    body += '<input type="text" id="rx-medication" name="medication" value="' + Utils.escapeHtml(rx ? rx.medication : '') + '" required placeholder="e.g., Aceclofenac"></div>';
    body += '<div class="form-row">';
    body += '<div class="form-group"><label>Dosage</label>';
    body += '<input type="text" name="dosage" value="' + Utils.escapeHtml(rx ? rx.dosage : '') + '" required placeholder="e.g., 100mg"></div>';
    body += '<div class="form-group"><label>Route</label>';
    body += '<select name="route">';
    var routes = ['Oral', 'Topical', 'Intramuscular', 'Intravenous', 'Subcutaneous', 'Inhalation', 'Sublingual', 'Rectal', 'Transdermal'];
    for (var r = 0; r < routes.length; r++) {
      body += '<option value="' + routes[r] + '"' + (rx && rx.route === routes[r] ? ' selected' : '') + '>' + routes[r] + '</option>';
    }
    body += '</select></div>';
    body += '</div>';
    body += '<div class="form-row">';
    body += '<div class="form-group"><label>Frequency</label>';
    body += '<input type="text" name="frequency" value="' + Utils.escapeHtml(rx ? rx.frequency : '') + '" required placeholder="e.g., Twice daily (after meals)"></div>';
    body += '<div class="form-group"><label>Duration</label>';
    body += '<input type="text" name="duration" value="' + Utils.escapeHtml(rx ? rx.duration : '') + '" required placeholder="e.g., 7 days"></div>';
    body += '</div>';
    body += '<div class="form-row">';
    body += '<div class="form-group"><label>Date</label>';
    body += '<input type="date" name="date" value="' + (rx ? rx.date : Utils.today()) + '" required></div>';
    body += '<div class="form-group"><label>Prescribed By</label>';
    body += '<input type="text" name="prescribedBy" value="' + Utils.escapeHtml(rx ? rx.prescribedBy : doctorName) + '"></div>';
    body += '</div>';
    body += '<div class="form-group"><label>Special Instructions ' + Utils.micHtml('rx-instructions') + '</label>';
    body += '<textarea id="rx-instructions" name="instructions" rows="3" placeholder="e.g., Take after food. Avoid on empty stomach...">' + Utils.escapeHtml(rx ? rx.instructions || '' : '') + '</textarea></div>';
    body += '<div class="form-group"><label>Status</label>';
    body += '<select name="status">';
    body += '<option value="active"' + (rx && rx.status === 'active' ? ' selected' : '') + '>Active</option>';
    body += '<option value="discontinued"' + (rx && rx.status === 'discontinued' ? ' selected' : '') + '>Discontinued</option>';
    body += '</select></div>';
    body += '</form>';

    var footer = '<button class="btn btn-secondary" id="modal-cancel">Cancel</button>';
    footer += '<button class="btn btn-primary" id="modal-save">' + (rx ? 'Update' : 'Add') + ' Prescription</button>';

    Utils.showModal(title, body, footer);
    Utils.bindMicButtons(document.getElementById('modal-body'));

    document.getElementById('modal-cancel').onclick = Utils.closeModal;
    document.getElementById('modal-save').onclick = function() {
      var form = document.getElementById('rx-form');
      var medInput = form.querySelector('[name="medication"]');
      if (!medInput.value.trim()) {
        Utils.toast('Medication name is required', 'error');
        return;
      }
      var data = Utils.getFormData(form);
      data.patientId = patient.id;

      if (rx) {
        Store.updatePrescription(rx.id, data);
        Utils.toast('Prescription updated', 'success');
      } else {
        Store.createPrescription(data);
        Utils.toast('Prescription added', 'success');
      }
      Utils.closeModal();
      renderDetail(container, Store.getPatient(patient.id));
    };
  }

  // Book Next Visit modal
  function showBookNextVisit(patient, container) {
    // Get last appointment for defaults
    var appts = Store.getAppointmentsByPatient(patient.id);
    appts.sort(function(a, b) { return a.date > b.date ? -1 : 1; });
    var lastAppt = appts.length > 0 ? appts[0] : null;

    var defaultDate = Utils.toDateString(Utils.addDays(new Date(), 7));
    var defaultTime = lastAppt ? lastAppt.time : '09:00';
    var defaultType = lastAppt ? lastAppt.type : 'Follow-up';
    var defaultDuration = lastAppt ? lastAppt.duration : '30';

    var body = '<form id="next-visit-form">';
    body += '<div class="form-row">';
    body += '<div class="form-group"><label>Date</label>';
    body += '<input type="date" name="date" value="' + defaultDate + '" required></div>';
    body += '<div class="form-group"><label>Time</label>';
    body += '<input type="time" name="time" value="' + defaultTime + '" required></div>';
    body += '</div>';
    body += '<div class="form-row">';
    body += '<div class="form-group"><label>Type</label>';
    body += '<select name="type">';
    body += '<option value="Initial Evaluation"' + (defaultType === 'Initial Evaluation' ? ' selected' : '') + '>Initial Evaluation</option>';
    body += '<option value="Treatment"' + (defaultType === 'Treatment' ? ' selected' : '') + '>Treatment</option>';
    body += '<option value="Follow-up"' + (defaultType === 'Follow-up' ? ' selected' : '') + '>Follow-up</option>';
    body += '</select></div>';
    body += '<div class="form-group"><label>Duration (min)</label>';
    body += '<select name="duration">';
    var durations = ['15','30','45','60','90'];
    for (var d = 0; d < durations.length; d++) {
      body += '<option value="' + durations[d] + '"' + (durations[d] === defaultDuration ? ' selected' : '') + '>' + durations[d] + ' min</option>';
    }
    body += '</select></div>';
    body += '</div>';
    body += '<div class="form-group"><label>Notes</label>';
    body += '<textarea name="notes" rows="2"></textarea></div>';
    body += '<div id="conflict-warning" style="display:none;" class="login-error"></div>';
    body += '</form>';

    var footer = '<button class="btn btn-secondary" id="modal-cancel">Cancel</button>';
    footer += '<button class="btn btn-primary" id="modal-save">Book Appointment</button>';

    Utils.showModal('Book Next Visit - ' + patient.name, body, footer);

    document.getElementById('modal-cancel').onclick = Utils.closeModal;
    document.getElementById('modal-save').onclick = function() {
      var form = document.getElementById('next-visit-form');
      var data = Utils.getFormData(form);
      if (!data.date || !data.time) {
        Utils.toast('Date and time are required', 'error');
        return;
      }
      // Conflict check
      var conflict = Store.hasConflict(data.date, data.time, data.duration);
      if (conflict) {
        var warningEl = document.getElementById('conflict-warning');
        warningEl.textContent = 'Conflict: ' + conflict.patientName + ' already has an appointment at ' + Utils.formatTime(conflict.time) + ' (' + conflict.duration + ' min)';
        warningEl.style.display = 'block';
        return;
      }
      data.patientId = patient.id;
      data.patientName = patient.name;
      data.status = 'scheduled';
      Store.createAppointment(data);
      Utils.toast('Next visit booked', 'success');
      Utils.closeModal();
      renderDetail(container, Store.getPatient(patient.id));
    };
  }

  return { render: render };
})();
