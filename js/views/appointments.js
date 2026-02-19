/* ============================================
   Appointments View - List + Calendar (Inline Forms)
   ============================================ */
window.AppointmentsView = (function() {

  var _clickHandler = null;

  // Date helpers for recurring appointments
  function addDaysStr(dateStr, days) {
    var d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return d.getFullYear() + '-' + ('0' + (d.getMonth()+1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function getDayOfWeek(dateStr) {
    return new Date(dateStr + 'T00:00:00').getDay(); // 0=Sun, 1=Mon, ...
  }

  // Generate recurring dates for selected days over N weeks
  function generateRecurringDates(baseDate, selectedDays, weeks, dayTimes, defaultTime) {
    var results = [];
    var baseDow = getDayOfWeek(baseDate);
    for (var di = 0; di < selectedDays.length; di++) {
      var dayIdx = selectedDays[di];
      var daysUntil = (dayIdx - baseDow + 7) % 7;
      var firstOccurrence = daysUntil === 0 ? baseDate : addDaysStr(baseDate, daysUntil);
      var time = (dayTimes && dayTimes[dayIdx] !== undefined) ? dayTimes[dayIdx] : defaultTime;
      for (var w = 0; w < weeks; w++) {
        results.push({ date: addDaysStr(firstOccurrence, w * 7), time: time, dayIndex: dayIdx });
      }
    }
    results.sort(function(a, b) { return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); });
    return results;
  }

  // Show preview modal for recurring appointments
  function showRecurringPreview(dates, data, container) {
    var dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    var body = '<div style="max-height:400px;overflow-y:auto;">';
    body += '<table class="data-table" style="font-size:0.85rem;"><thead><tr>';
    body += '<th>#</th><th>Date</th><th>Day</th><th>Time</th>';
    body += '</tr></thead><tbody>';
    for (var i = 0; i < dates.length; i++) {
      var d = dates[i];
      body += '<tr><td>' + (i + 1) + '</td>';
      body += '<td>' + Utils.formatDate(d.date) + '</td>';
      body += '<td>' + dayNames[d.dayIndex] + '</td>';
      body += '<td>' + Utils.formatTime(d.time) + '</td></tr>';
    }
    body += '</tbody></table></div>';
    var footer = '<button class="btn btn-secondary" id="recurring-back">Back</button>';
    footer += '<button class="btn btn-primary" id="recurring-confirm">Confirm &amp; Book ' + dates.length + ' Appointments</button>';
    Utils.showModal('Recurring Appointments Preview', body, footer);
    document.getElementById('recurring-back').onclick = function() { Utils.closeModal(); };
    document.getElementById('recurring-confirm').onclick = function() {
      for (var i = 0; i < dates.length; i++) {
        Store.createAppointment({
          patientId: data.patientId, patientName: data.patientName,
          date: dates[i].date, time: dates[i].time,
          type: data.type, duration: data.duration,
          status: 'scheduled', notes: data.notes || ''
        });
      }
      Utils.closeModal();
      Utils.toast('Created ' + dates.length + ' appointments', 'success');
      goBackToList(container);
    };
  }

  var state = {
    view: 'list',       // list | month | week
    subView: 'list',    // list | form | detail
    dateFrom: '',
    dateTo: '',
    statusFilter: '',
    typeFilter: '',
    patientSearch: '',
    page: 1,
    perPage: 10,
    calMonth: new Date().getMonth(),
    calYear: new Date().getFullYear(),
    weekStart: Utils.getWeekStart(new Date()),
    editId: null,
    detailId: null,
    prefillDate: '',
    prefillTime: '',
    prefillPatient: '',
    rescheduleFrom: null,
    nextVisitAppt: null   // set after completing, for inline next-visit prompt
  };

  function render(container) {
    var pendingPatient = state.prefillPatient || '';
    var pendingSubView = pendingPatient ? 'form' : 'list';
    state.view = 'list';
    state.dateFrom = Utils.today();
    state.dateTo = '';
    state.statusFilter = '';
    state.typeFilter = '';
    state.patientSearch = '';
    state.page = 1;
    state.subView = pendingSubView;
    state.editId = null;
    state.detailId = null;
    state.prefillDate = '';
    state.prefillTime = '';
    state.prefillPatient = pendingPatient;
    state.rescheduleFrom = null;
    state.nextVisitAppt = null;
    renderView(container);
  }

  function renderView(container) {
    if (state.subView === 'form') {
      renderForm(container);
    } else if (state.subView === 'detail') {
      renderDetail(container);
    } else {
      renderMain(container);
    }
  }

  // ==================== MAIN VIEW (list/month/week) ====================
  function renderMain(container) {
    var html = '';

    // Next visit prompt (shown after completing an appointment)
    if (state.nextVisitAppt) {
      html += renderNextVisitPrompt();
    }

    // Toolbar
    html += '<div class="toolbar">';
    html += '<div class="view-toggle">';
    html += '<button class="view-btn' + (state.view === 'list' ? ' active' : '') + '" data-view="list">List</button>';
    html += '<button class="view-btn' + (state.view === 'month' ? ' active' : '') + '" data-view="month">Month</button>';
    html += '<button class="view-btn' + (state.view === 'week' ? ' active' : '') + '" data-view="week">Week</button>';
    html += '</div>';
    if (state.view === 'list') {
      html += '<div class="search-input">';
      html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
      html += '<input type="text" id="appt-patient-search" placeholder="Search by name or phone..." value="' + Utils.escapeHtml(state.patientSearch) + '">';
      html += '</div>';
      html += '<input type="date" class="filter-select" id="appt-date-from" value="' + state.dateFrom + '">';
      html += '<input type="date" class="filter-select" id="appt-date-to" value="' + state.dateTo + '">';
      html += '<select class="filter-select" id="appt-status-filter">';
      html += '<option value="">All Status</option>';
      html += '<option value="scheduled"' + (state.statusFilter === 'scheduled' ? ' selected' : '') + '>Scheduled</option>';
      html += '<option value="completed"' + (state.statusFilter === 'completed' ? ' selected' : '') + '>Completed</option>';
      html += '<option value="cancelled"' + (state.statusFilter === 'cancelled' ? ' selected' : '') + '>Cancelled</option>';
      html += '<option value="no-show"' + (state.statusFilter === 'no-show' ? ' selected' : '') + '>No-Show</option>';
      html += '</select>';
      html += '<select class="filter-select" id="appt-type-filter">';
      html += '<option value="">All Types</option>';
      html += '<option value="Initial Evaluation"' + (state.typeFilter === 'Initial Evaluation' ? ' selected' : '') + '>Initial Evaluation</option>';
      html += '<option value="Treatment"' + (state.typeFilter === 'Treatment' ? ' selected' : '') + '>Treatment</option>';
      html += '<option value="Follow-up"' + (state.typeFilter === 'Follow-up' ? ' selected' : '') + '>Follow-up</option>';
      html += '</select>';
    }
    html += '<button class="btn btn-sm btn-secondary" id="export-appts-btn"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px;"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Export</button>';
    html += '<button class="btn btn-primary" id="add-appt-btn">';
    html += '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
    html += 'New Appointment</button>';
    html += '</div>';

    if (state.view === 'list') {
      html += renderList();
    } else if (state.view === 'month') {
      html += renderMonthCalendar();
    } else if (state.view === 'week') {
      html += renderWeekView();
    }

    container.innerHTML = html;
    bindMainEvents(container);
  }

  // ==================== NEXT VISIT PROMPT (inline) ====================
  function renderNextVisitPrompt() {
    var appt = state.nextVisitAppt;
    var html = '<div class="inline-form-card mb-2" id="next-visit-prompt">';
    html += '<div class="inline-form-header">';
    html += '<h3>Appointment Completed - ' + Utils.escapeHtml(appt.patientName) + '</h3>';
    html += '</div>';
    html += '<div class="inline-form-body">';
    html += '<p style="font-size:0.9rem;color:var(--gray-700);margin-bottom:0.75rem;">Schedule the next visit?</p>';
    html += '<div class="quick-date-btns">';
    html += '<button class="quick-date-btn" data-nv-quick="1">Tomorrow</button>';
    html += '<button class="quick-date-btn" data-nv-quick="3">+3 Days</button>';
    html += '<button class="quick-date-btn" data-nv-quick="7">+1 Week</button>';
    html += '<button class="quick-date-btn" data-nv-quick="14">+2 Weeks</button>';
    html += '<button class="quick-date-btn" data-nv-quick="30">+1 Month</button>';
    html += '</div>';
    html += '</div>';
    html += '<div class="inline-form-actions">';
    html += '<button class="btn btn-secondary" data-nv-no>No, Thanks</button>';
    html += '<button class="btn btn-primary" data-nv-yes>Custom Date</button>';
    html += '</div>';
    html += '</div>';
    return html;
  }

  // ==================== LIST VIEW ====================
  function renderList() {
    var appointments = Store.getAppointments();

    // Filter
    var filtered = [];
    for (var i = 0; i < appointments.length; i++) {
      var a = appointments[i];
      if (state.dateFrom && a.date < state.dateFrom) continue;
      if (state.dateTo && a.date > state.dateTo) continue;
      if (state.statusFilter && a.status !== state.statusFilter) continue;
      if (state.typeFilter && a.type !== state.typeFilter) continue;
      if (state.patientSearch) {
        var q = state.patientSearch.toLowerCase();
        var patient = Store.getPatient(a.patientId);
        var patientPhone = patient ? (patient.phone || '') : '';
        if ((a.patientName || '').toLowerCase().indexOf(q) === -1 &&
            patientPhone.indexOf(q) === -1) continue;
      }
      filtered.push(a);
    }

    // Sort by date/time (ascending - nearest first)
    filtered.sort(function(a, b) {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return a.time < b.time ? -1 : 1;
    });

    var html = '';

    // Table
    html += '<div class="card"><div class="table-wrapper">';
    html += '<table class="data-table appointments-table"><thead><tr>';
    html += '<th>Date & Time</th><th>Patient</th><th>Type</th><th>Duration</th><th>Status</th><th>Actions</th>';
    html += '</tr></thead><tbody>';

    // Pagination
    var totalItems = filtered.length;
    var totalPages = Math.ceil(totalItems / state.perPage) || 1;
    if (state.page > totalPages) state.page = totalPages;
    var startIdx = (state.page - 1) * state.perPage;
    var pageItems = filtered.slice(startIdx, startIdx + state.perPage);

    if (totalItems === 0) {
      html += '<tr class="no-hover"><td colspan="6"><div class="empty-state"><p>No appointments found</p></div></td></tr>';
    } else {
      var todayStr = Utils.today();
      for (var j = 0; j < pageItems.length; j++) {
        var appt = pageItems[j];
        var statusCls = getStatusBadgeClass(appt.status);
        var isToday = appt.date === todayStr;
        html += '<tr class="no-hover">';
        html += '<td>';
        html += '<div style="font-weight:600;">' + Utils.formatDate(appt.date) + (isToday ? ' <span class="badge badge-teal">Today</span>' : '') + '</div>';
        html += '<div style="font-size:0.78rem;color:var(--gray-500);">' + Utils.formatTime(appt.time) + '</div>';
        html += '</td>';
        html += '<td><a href="#/patients/' + appt.patientId + '" style="font-weight:500;">' + Utils.escapeHtml(appt.patientName) + '</a></td>';
        html += '<td>' + Utils.escapeHtml(appt.type) + '</td>';
        html += '<td>' + appt.duration + ' min</td>';
        html += '<td><span class="badge ' + statusCls + '">' + appt.status + '</span></td>';
        html += '<td><div class="btn-group">';
        if (appt.status === 'scheduled') {
          html += '<button class="btn btn-sm btn-success complete-appt-btn" data-id="' + appt.id + '">Complete</button>';
          html += '<button class="btn btn-sm btn-warning cancel-appt-btn" data-id="' + appt.id + '">Cancel</button>';
          html += '<button class="btn btn-sm btn-ghost noshow-appt-btn" data-id="' + appt.id + '">No-Show</button>';
          html += '<button class="btn btn-sm btn-ghost reschedule-appt-btn" data-id="' + appt.id + '">Reschedule</button>';
        }
        html += '<button class="btn btn-sm btn-ghost delete-appt-btn" data-id="' + appt.id + '" style="color:var(--danger);">Delete</button>';
        html += '</div></td>';
        html += '</tr>';
      }
    }
    html += '</tbody></table></div></div>';

    // Pagination controls
    if (totalPages > 1) {
      html += '<div class="pagination">';
      html += '<span class="pagination-info">Showing ' + (startIdx + 1) + '-' + Math.min(startIdx + state.perPage, totalItems) + ' of ' + totalItems + '</span>';
      html += '<div class="pagination-buttons">';
      html += '<button class="btn btn-sm btn-secondary appt-page-btn" data-page="' + (state.page - 1) + '"' + (state.page <= 1 ? ' disabled' : '') + '>&laquo; Prev</button>';
      for (var p = 1; p <= totalPages; p++) {
        html += '<button class="btn btn-sm' + (p === state.page ? ' btn-primary' : ' btn-secondary') + ' appt-page-btn" data-page="' + p + '">' + p + '</button>';
      }
      html += '<button class="btn btn-sm btn-secondary appt-page-btn" data-page="' + (state.page + 1) + '"' + (state.page >= totalPages ? ' disabled' : '') + '>Next &raquo;</button>';
      html += '</div></div>';
    }

    return html;
  }

  // ==================== MONTH CALENDAR ====================
  function renderMonthCalendar() {
    var year = state.calYear;
    var month = state.calMonth;
    var todayStr = Utils.today();
    var appointments = Store.getAppointments();

    var apptsByDate = {};
    for (var i = 0; i < appointments.length; i++) {
      var a = appointments[i];
      if (!apptsByDate[a.date]) apptsByDate[a.date] = [];
      apptsByDate[a.date].push(a);
    }

    var html = '';
    html += '<div class="calendar-header">';
    html += '<div class="calendar-nav">';
    html += '<button class="btn btn-secondary btn-sm" id="cal-prev">&laquo; Prev</button>';
    html += '<h3>' + Utils.MONTHS[month] + ' ' + year + '</h3>';
    html += '<button class="btn btn-secondary btn-sm" id="cal-next">Next &raquo;</button>';
    html += '</div>';
    html += '<button class="btn btn-ghost btn-sm" id="cal-today">Today</button>';
    html += '</div>';

    html += '<div class="calendar-grid">';

    for (var d = 0; d < 7; d++) {
      html += '<div class="calendar-day-header">' + Utils.DAYS_SHORT[d] + '</div>';
    }

    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var prevMonthDays = new Date(year, month, 0).getDate();

    for (var p = firstDay - 1; p >= 0; p--) {
      var prevDay = prevMonthDays - p;
      var prevDate = Utils.toDateString(new Date(year, month - 1, prevDay));
      html += '<div class="calendar-day other-month" data-date="' + prevDate + '">';
      html += '<div class="day-num">' + prevDay + '</div>';
      html += renderCalEvents(apptsByDate[prevDate]);
      html += '</div>';
    }

    for (var c = 1; c <= daysInMonth; c++) {
      var curDate = Utils.toDateString(new Date(year, month, c));
      var isToday = curDate === todayStr;
      html += '<div class="calendar-day' + (isToday ? ' today' : '') + '" data-date="' + curDate + '">';
      html += '<div class="day-num">' + c + '</div>';
      html += renderCalEvents(apptsByDate[curDate]);
      html += '</div>';
    }

    var totalCells = firstDay + daysInMonth;
    var remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (var n = 1; n <= remaining; n++) {
      var nextDate = Utils.toDateString(new Date(year, month + 1, n));
      html += '<div class="calendar-day other-month" data-date="' + nextDate + '">';
      html += '<div class="day-num">' + n + '</div>';
      html += renderCalEvents(apptsByDate[nextDate]);
      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  function renderCalEvents(appts) {
    if (!appts || appts.length === 0) return '';
    var html = '';
    appts.sort(function(a, b) { return a.time < b.time ? -1 : 1; });
    var max = Math.min(appts.length, 3);
    for (var i = 0; i < max; i++) {
      var a = appts[i];
      html += '<div class="cal-event ' + a.status + '" data-appt-id="' + a.id + '">';
      html += Utils.formatTime(a.time) + ' ' + Utils.escapeHtml(a.patientName);
      html += '</div>';
    }
    if (appts.length > 3) {
      html += '<div style="font-size:0.65rem;color:var(--gray-500);padding-left:0.3rem;">+' + (appts.length - 3) + ' more</div>';
    }
    return html;
  }

  // ==================== WEEK VIEW ====================
  function renderWeekView() {
    var ws = state.weekStart;
    var todayStr = Utils.today();
    var appointments = Store.getAppointments();

    var apptsByDate = {};
    for (var i = 0; i < appointments.length; i++) {
      var a = appointments[i];
      if (!apptsByDate[a.date]) apptsByDate[a.date] = [];
      apptsByDate[a.date].push(a);
    }

    var html = '';
    html += '<div class="calendar-header">';
    html += '<div class="calendar-nav">';
    html += '<button class="btn btn-secondary btn-sm" id="week-prev">&laquo; Prev</button>';
    var wsEnd = Utils.addDays(ws, 6);
    html += '<h3>' + Utils.formatDateShort(Utils.toDateString(ws)) + ' - ' + Utils.formatDateShort(Utils.toDateString(wsEnd)) + ', ' + ws.getFullYear() + '</h3>';
    html += '<button class="btn btn-secondary btn-sm" id="week-next">Next &raquo;</button>';
    html += '</div>';
    html += '<button class="btn btn-ghost btn-sm" id="week-today">Today</button>';
    html += '</div>';

    var startHour = 8;
    var endHour = 18;

    html += '<div class="week-grid">';

    html += '<div class="week-header-cell"></div>';
    for (var d = 0; d < 7; d++) {
      var dayDate = Utils.addDays(ws, d);
      var dayStr = Utils.toDateString(dayDate);
      var isToday = dayStr === todayStr;
      html += '<div class="week-header-cell' + (isToday ? ' today-col' : '') + '">';
      html += Utils.DAYS_SHORT[d] + '<br>' + dayDate.getDate();
      html += '</div>';
    }

    for (var h = startHour; h < endHour; h++) {
      var timeLabel = ((h % 12) || 12) + ':00 ' + (h >= 12 ? 'PM' : 'AM');
      html += '<div class="week-time-label">' + timeLabel + '</div>';

      for (var dd = 0; dd < 7; dd++) {
        var cellDate = Utils.toDateString(Utils.addDays(ws, dd));
        var isTodayCol = cellDate === todayStr;
        html += '<div class="week-cell' + (isTodayCol ? ' today-col' : '') + '" data-date="' + cellDate + '" data-hour="' + h + '">';

        var dayAppts = apptsByDate[cellDate] || [];
        for (var k = 0; k < dayAppts.length; k++) {
          var ap = dayAppts[k];
          var apHour = parseInt(ap.time.split(':')[0], 10);
          if (apHour === h && ap.status !== 'cancelled') {
            html += '<div class="week-event ' + ap.status + '" data-appt-id="' + ap.id + '">';
            html += Utils.formatTime(ap.time) + ' ' + Utils.escapeHtml(ap.patientName);
            html += '</div>';
          }
        }
        html += '</div>';
      }
    }

    html += '</div>';
    return html;
  }

  // ==================== INLINE FORM ====================
  function renderForm(container) {
    var appt = state.editId ? Store.getAppointment(state.editId) : null;
    var rescheduleFrom = state.rescheduleFrom;
    var title = appt ? 'Edit Appointment' : (rescheduleFrom ? 'Reschedule Appointment' : 'New Appointment');
    var patients = Store.getPatients().filter(function(p) { return p.status === 'active'; });
    patients.sort(function(a, b) { return a.name.localeCompare(b.name); });

    var defaultDate = state.prefillDate || (appt ? appt.date : (rescheduleFrom ? '' : Utils.today()));
    var defaultTime = state.prefillTime || (appt ? appt.time : (rescheduleFrom ? rescheduleFrom.time : '09:00'));
    var defaultPatient = appt ? appt.patientId : (rescheduleFrom ? rescheduleFrom.patientId : (state.prefillPatient || ''));
    var defaultType = appt ? appt.type : (rescheduleFrom ? rescheduleFrom.type : 'Treatment');
    var defaultDuration = appt ? appt.duration : (rescheduleFrom ? rescheduleFrom.duration : '30');
    var defaultNotes = appt ? appt.notes : (rescheduleFrom ? rescheduleFrom.notes : '');

    var html = '<div class="inline-form-card">';
    html += '<div class="inline-form-header">';
    html += '<button class="back-btn" id="appt-form-back">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>';
    html += '</button>';
    html += '<h3>' + title + '</h3>';
    html += '</div>';

    html += '<div class="inline-form-body">';
    html += '<form id="appt-form">';
    html += '<div class="form-group"><label>Patient</label>';
    html += '<select name="patientId" required>';
    html += '<option value="">Select patient...</option>';
    for (var i = 0; i < patients.length; i++) {
      html += '<option value="' + patients[i].id + '"' + (patients[i].id === defaultPatient ? ' selected' : '') + '>' + Utils.escapeHtml(patients[i].name) + '</option>';
    }
    html += '</select></div>';
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
      var dayLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      html += '<div class="form-group"><label>Repeat Days</label>';
      html += '<div id="day-pills" style="display:flex;gap:0.35rem;flex-wrap:wrap;">';
      for (var dp = 0; dp < 7; dp++) {
        html += '<button type="button" class="day-pill" data-day="' + dp + '" data-active="0" style="padding:0.3rem 0.65rem;border-radius:1rem;border:1px solid var(--gray-300);background:#fff;cursor:pointer;font-size:0.8rem;font-weight:500;color:var(--gray-600);transition:all 0.15s;">' + dayLabels[dp] + '</button>';
      }
      html += '</div></div>';
      html += '<div id="day-times-container" style="display:none;"></div>';
      html += '<div class="form-group" id="repeat-weeks-group" style="display:none;">';
      html += '<label>For how many weeks?</label>';
      html += '<select id="appt-repeat-weeks" style="width:100%;">';
      for (var w = 2; w <= 12; w++) {
        html += '<option value="' + w + '">' + w + ' weeks</option>';
      }
      html += '</select></div>';
    }
    html += '<div class="form-group"><label>Notes ' + Utils.micHtml('af-notes') + '</label>';
    html += '<textarea name="notes" id="af-notes" rows="3">' + Utils.escapeHtml(defaultNotes || '') + '</textarea></div>';
    html += '<div id="conflict-warning" style="display:none;" class="login-error"></div>';
    html += '</form>';
    html += '</div>';

    html += '<div class="inline-form-actions">';
    html += '<button class="btn btn-secondary" id="appt-form-cancel">Cancel</button>';
    html += '<button class="btn btn-primary" id="appt-form-save">' + (appt ? 'Update' : 'Book Appointment') + '</button>';
    html += '</div>';
    html += '</div>';

    container.innerHTML = html;
    Utils.bindMicButtons(container);

    // Back / Cancel
    document.getElementById('appt-form-back').onclick = function() {
      goBackToList(container);
    };
    document.getElementById('appt-form-cancel').onclick = function() {
      goBackToList(container);
    };

    // Save
    var _duplicateConfirmed = false;
    var _pastDateConfirmed = false;
    var _conflictConfirmed = false;

    // Reset warnings when key fields change
    var form = document.getElementById('appt-form');
    var _resetWarnings = function() {
      _pastDateConfirmed = false;
      _conflictConfirmed = false;
      _duplicateConfirmed = false;
      var w = document.getElementById('conflict-warning');
      if (w) { w.style.display = 'none'; w.innerHTML = ''; }
    };
    var dateInput = form.querySelector('[name="date"]');
    var timeInput = form.querySelector('[name="time"]');
    var patientInput = form.querySelector('[name="patientId"]');
    var durationInput = form.querySelector('[name="duration"]');
    if (dateInput) dateInput.addEventListener('change', _resetWarnings);
    if (timeInput) timeInput.addEventListener('change', _resetWarnings);
    if (patientInput) patientInput.addEventListener('change', _resetWarnings);
    if (durationInput) durationInput.addEventListener('change', _resetWarnings);

    // Recurring day-pill helpers
    function getSelectedDays() {
      var pills = document.querySelectorAll('.day-pill[data-active="1"]');
      var days = [];
      for (var i = 0; i < pills.length; i++) {
        days.push(parseInt(pills[i].getAttribute('data-day'), 10));
      }
      return days;
    }
    function updateDayTimesUI() {
      var days = getSelectedDays();
      var weeksGroup = document.getElementById('repeat-weeks-group');
      var timesContainer = document.getElementById('day-times-container');
      if (!weeksGroup || !timesContainer) return;
      weeksGroup.style.display = days.length > 0 ? '' : 'none';
      if (days.length < 2) { timesContainer.style.display = 'none'; return; }
      timesContainer.style.display = '';
      var dayLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      var mainTime = form.querySelector('[name="time"]').value || '09:00';
      var existing = {};
      var existingInputs = timesContainer.querySelectorAll('.day-time-input');
      for (var ei = 0; ei < existingInputs.length; ei++) {
        existing[existingInputs[ei].getAttribute('data-day')] = existingInputs[ei].value;
      }
      var dtHtml = '<div class="form-group"><label>Time per day</label>';
      for (var i = 0; i < days.length; i++) {
        var dv = days[i];
        var val = existing[dv] || mainTime;
        dtHtml += '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.35rem;">';
        dtHtml += '<span style="width:2.5rem;font-size:0.8rem;font-weight:500;">' + dayLabels[dv] + '</span>';
        dtHtml += '<input type="time" class="day-time-input" data-day="' + dv + '" value="' + val + '" style="flex:1;">';
        dtHtml += '</div>';
      }
      dtHtml += '</div>';
      timesContainer.innerHTML = dtHtml;
    }
    var pillContainer = document.getElementById('day-pills');
    if (pillContainer) {
      pillContainer.addEventListener('click', function(e) {
        var pill = e.target.closest('.day-pill');
        if (!pill) return;
        var active = pill.getAttribute('data-active') === '1';
        pill.setAttribute('data-active', active ? '0' : '1');
        pill.style.background = active ? '#fff' : 'var(--teal)';
        pill.style.color = active ? 'var(--gray-600)' : '#fff';
        pill.style.borderColor = active ? 'var(--gray-300)' : 'var(--teal)';
        updateDayTimesUI();
      });
    }

    document.getElementById('appt-form-save').onclick = function() {
      var form = document.getElementById('appt-form');
      var data = Utils.getFormData(form);

      if (!data.patientId || !data.date || !data.time) {
        Utils.toast('Please fill in all required fields', 'error');
        return;
      }

      // Past date warning
      if (!_pastDateConfirmed && data.date < Utils.today()) {
        var warningEl0 = document.getElementById('conflict-warning');
        warningEl0.innerHTML = 'This date is in the past (' + Utils.formatDate(data.date) + '). Are you sure?' +
          '<br><button type="button" class="btn btn-sm btn-primary" id="past-date-confirm" style="margin-top:0.4rem;">Yes, continue</button> ' +
          '<button type="button" class="btn btn-sm btn-ghost" id="past-date-cancel" style="margin-top:0.4rem;">Change date</button>';
        warningEl0.style.display = 'block';
        document.getElementById('past-date-confirm').onclick = function(e) {
          e.preventDefault();
          _pastDateConfirmed = true;
          document.getElementById('appt-form-save').click();
        };
        document.getElementById('past-date-cancel').onclick = function(e) {
          e.preventDefault();
          warningEl0.style.display = 'none';
        };
        return;
      }

      // Conflict check (warning, not hard block)
      if (!_conflictConfirmed) {
        var conflict = Store.hasConflict(data.date, data.time, data.duration, appt ? appt.id : null);
        if (conflict) {
          var warningEl = document.getElementById('conflict-warning');
          warningEl.innerHTML = 'Time conflict: <strong>' + Utils.escapeHtml(conflict.patientName) + '</strong> already booked at ' + Utils.formatTime(conflict.time) + ' (' + conflict.duration + ' min). Book anyway?' +
            '<br><button type="button" class="btn btn-sm btn-warning" id="conflict-proceed" style="margin-top:0.4rem;">Yes, double-book</button> ' +
            '<button type="button" class="btn btn-sm btn-ghost" id="conflict-cancel" style="margin-top:0.4rem;">Change time</button>';
          warningEl.style.display = 'block';
          document.getElementById('conflict-proceed').onclick = function(e) {
            e.preventDefault();
            _conflictConfirmed = true;
            document.getElementById('appt-form-save').click();
          };
          document.getElementById('conflict-cancel').onclick = function(e) {
            e.preventDefault();
            warningEl.style.display = 'none';
          };
          return;
        }
      }

      // Duplicate future appointment check
      if (!appt && !_duplicateConfirmed) {
        var existing = Store.hasDuplicateFutureAppointment(data.patientId, null);
        if (existing) {
          var warningEl2 = document.getElementById('conflict-warning');
          warningEl2.innerHTML = 'Patient already has a scheduled appointment on <strong>' + Utils.formatDate(existing.date) + '</strong> at <strong>' + Utils.formatTime(existing.time) + '</strong>. ' +
            '<br><button type="button" class="btn btn-sm btn-warning" id="dup-cancel-old" style="margin-top:0.4rem;">Cancel old & create new</button> ' +
            '<button type="button" class="btn btn-sm btn-ghost" id="dup-keep-both" style="margin-top:0.4rem;">Keep both</button>';
          warningEl2.style.display = 'block';
          document.getElementById('dup-cancel-old').onclick = function(e) {
            e.preventDefault();
            Store.updateAppointment(existing.id, { status: 'cancelled' });
            _duplicateConfirmed = true;
            document.getElementById('appt-form-save').click();
          };
          document.getElementById('dup-keep-both').onclick = function(e) {
            e.preventDefault();
            _duplicateConfirmed = true;
            document.getElementById('appt-form-save').click();
          };
          return;
        }
      }

      var patient = Store.getPatient(data.patientId);
      data.patientName = patient ? patient.name : 'Unknown';
      data.status = appt ? appt.status : 'scheduled';

      if (appt) {
        Store.updateAppointment(appt.id, data);
        Utils.toast('Appointment updated', 'success');
      } else {
        // Check for recurring appointments
        var selectedDays = getSelectedDays();
        if (selectedDays.length > 0) {
          var weeksEl = document.getElementById('appt-repeat-weeks');
          var weeks = weeksEl ? parseInt(weeksEl.value, 10) : 2;
          var dayTimes = {};
          var dayTimeInputs = document.querySelectorAll('.day-time-input');
          for (var dti = 0; dti < dayTimeInputs.length; dti++) {
            dayTimes[parseInt(dayTimeInputs[dti].getAttribute('data-day'), 10)] = dayTimeInputs[dti].value;
          }
          var dates = generateRecurringDates(data.date, selectedDays, weeks, dayTimes, data.time);
          showRecurringPreview(dates, data, container);
          return; // modal handles creation + navigation
        }
        Store.createAppointment(data);
        Utils.toast('Appointment booked', 'success');
      }
      _duplicateConfirmed = false;
      goBackToList(container);
    };
  }

  // ==================== INLINE DETAIL ====================
  function renderDetail(container) {
    var appt = Store.getAppointment(state.detailId);
    if (!appt) {
      goBackToList(container);
      return;
    }

    var statusBadge = '<span class="badge ' + getStatusBadgeClass(appt.status) + '">' + appt.status + '</span>';

    var html = '<div class="inline-detail-card">';
    html += '<div class="inline-detail-header">';
    html += '<button class="back-btn" id="detail-back">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>';
    html += '</button>';
    html += '<div>';
    html += '<div class="patient-name-lg"><a href="#/patients/' + appt.patientId + '">' + Utils.escapeHtml(appt.patientName) + '</a></div>';
    html += '<div style="font-size:0.85rem;color:var(--gray-500);">Appointment Details</div>';
    html += '</div>';
    html += '<div style="margin-left:auto;">' + statusBadge + '</div>';
    html += '</div>';

    html += '<div class="inline-detail-body">';
    html += '<div class="info-grid" style="grid-template-columns:1fr 1fr;">';
    html += '<div class="info-item"><label>Date</label><span>' + Utils.formatDate(appt.date) + '</span></div>';
    html += '<div class="info-item"><label>Time</label><span>' + Utils.formatTime(appt.time) + '</span></div>';
    html += '<div class="info-item"><label>Type</label><span>' + Utils.escapeHtml(appt.type) + '</span></div>';
    html += '<div class="info-item"><label>Duration</label><span>' + appt.duration + ' min</span></div>';
    html += '</div>';
    if (appt.notes) {
      html += '<div class="mt-2"><label style="font-size:0.72rem;font-weight:600;color:var(--gray-500);text-transform:uppercase;">Notes</label>';
      html += '<p style="font-size:0.85rem;color:var(--gray-600);margin-top:0.2rem;">' + Utils.escapeHtml(appt.notes) + '</p></div>';
    }
    html += '</div>';

    // Actions
    html += '<div class="inline-form-actions">';
    if (appt.status === 'scheduled') {
      html += '<button class="btn btn-success" id="detail-complete">Complete</button>';
      html += '<button class="btn btn-warning" id="detail-cancel-appt">Cancel Appt</button>';
      html += '<button class="btn btn-ghost" id="detail-noshow">No-Show</button>';
    }
    if (appt.status === 'completed') {
      html += '<button class="btn btn-primary" id="detail-start-session">';
      html += '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>';
      html += ' Start Session Note</button>';
    }
    html += '<button class="btn btn-secondary" id="detail-back-btn">Back</button>';
    html += '</div>';
    html += '</div>';

    container.innerHTML = html;

    // Back
    document.getElementById('detail-back').onclick = function() { goBackToList(container); };
    document.getElementById('detail-back-btn').onclick = function() { goBackToList(container); };

    // Actions
    var compBtn = document.getElementById('detail-complete');
    if (compBtn) compBtn.onclick = function() {
      Store.updateAppointment(appt.id, { status: 'completed' });
      Store.logActivity('Appointment completed: ' + appt.patientName);
      Utils.toast('Appointment completed', 'success');
      state.nextVisitAppt = appt;
      goBackToList(container);
    };

    var canBtn = document.getElementById('detail-cancel-appt');
    if (canBtn) canBtn.onclick = function() {
      Utils.inlineConfirm(container, 'Cancel this appointment?', function() {
        Store.updateAppointment(appt.id, { status: 'cancelled' });
        Store.logActivity('Appointment cancelled: ' + appt.patientName);
        Utils.toast('Appointment cancelled', 'warning');
        goBackToList(container);
      });
    };

    var nsBtn = document.getElementById('detail-noshow');
    if (nsBtn) nsBtn.onclick = function() {
      Store.updateAppointment(appt.id, { status: 'no-show' });
      Store.logActivity('Patient no-show: ' + appt.patientName);
      Utils.toast('Marked as no-show', 'warning');
      goBackToList(container);
    };

    // Start Session → navigate to patient detail Treatment Notes tab
    var startSessionBtn = document.getElementById('detail-start-session');
    if (startSessionBtn) startSessionBtn.onclick = function() {
      App.navigate('/patients/' + appt.patientId + '?tab=sessions&newSession=1&sessionDate=' + appt.date);
    };
  }

  // ==================== EXPORT ====================
  function exportAppointments() {
    var appts = Store.getAppointments();
    var headers = ['Date', 'Time', 'Patient', 'Type', 'Duration', 'Status'];
    var data = [];
    for (var i = 0; i < appts.length; i++) {
      var a = appts[i];
      data.push([
        a.date || '',
        a.time || '',
        a.patientName || '',
        a.type || '',
        (a.duration || '') + ' min',
        a.status || ''
      ]);
    }
    var ws = XLSX.utils.aoa_to_sheet([headers].concat(data));
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, 'appointments.xlsx');
  }

  // ==================== HELPERS ====================
  function goBackToList(container) {
    state.subView = 'list';
    state.editId = null;
    state.detailId = null;
    state.prefillDate = '';
    state.prefillTime = '';
    state.prefillPatient = '';
    state.rescheduleFrom = null;
    renderView(container);
  }

  // ==================== MAIN EVENT BINDING ====================
  function bindMainEvents(container) {
    if (_clickHandler) container.removeEventListener('click', _clickHandler);

    _clickHandler = function(e) {
      // Next visit prompt
      if (e.target.closest('[data-nv-no]')) {
        state.nextVisitAppt = null;
        var bar = document.getElementById('next-visit-prompt');
        if (bar) bar.remove();
        return;
      }
      // Quick date buttons for next visit
      var quickBtn = e.target.closest('[data-nv-quick]');
      if (quickBtn) {
        var days = parseInt(quickBtn.getAttribute('data-nv-quick'), 10);
        var nvApptQ = state.nextVisitAppt;
        state.nextVisitAppt = null;
        var quickDate = Utils.toDateString(Utils.addDays(new Date(), days));
        var apptData = {
          patientId: nvApptQ.patientId,
          patientName: nvApptQ.patientName,
          date: quickDate,
          time: nvApptQ.time,
          type: nvApptQ.type || 'Follow-up',
          duration: nvApptQ.duration || '30',
          status: 'scheduled',
          notes: ''
        };
        Store.createAppointment(apptData);
        Utils.toast('Next visit booked for ' + Utils.formatDate(quickDate), 'success');
        renderView(container);
        return;
      }
      if (e.target.closest('[data-nv-yes]')) {
        var nvAppt = state.nextVisitAppt;
        state.nextVisitAppt = null;
        var nextDate = Utils.toDateString(Utils.addDays(new Date(), 7));
        state.subView = 'form';
        state.editId = null;
        state.prefillDate = nextDate;
        state.prefillTime = nvAppt.time;
        state.rescheduleFrom = {
          patientId: nvAppt.patientId,
          patientName: nvAppt.patientName,
          type: nvAppt.type,
          duration: nvAppt.duration,
          time: nvAppt.time,
          notes: ''
        };
        renderView(container);
        return;
      }

      // View toggle
      var viewBtn = e.target.closest('.view-btn');
      if (viewBtn) {
        state.view = viewBtn.getAttribute('data-view');
        renderView(container);
        return;
      }

      // New appointment
      if (e.target.closest('#add-appt-btn')) {
        state.subView = 'form';
        state.editId = null;
        state.prefillDate = '';
        state.prefillTime = '';
        state.rescheduleFrom = null;
        renderView(container);
        return;
      }

      // Export appointments
      if (e.target.closest('#export-appts-btn')) {
        exportAppointments();
        return;
      }

      // Calendar navigation
      if (e.target.closest('#cal-prev')) {
        state.calMonth--;
        if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; }
        renderView(container);
        return;
      }
      if (e.target.closest('#cal-next')) {
        state.calMonth++;
        if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; }
        renderView(container);
        return;
      }
      if (e.target.closest('#cal-today')) {
        var now = new Date();
        state.calMonth = now.getMonth();
        state.calYear = now.getFullYear();
        renderView(container);
        return;
      }

      // Week navigation
      if (e.target.closest('#week-prev')) {
        state.weekStart = Utils.addDays(state.weekStart, -7);
        renderView(container);
        return;
      }
      if (e.target.closest('#week-next')) {
        state.weekStart = Utils.addDays(state.weekStart, 7);
        renderView(container);
        return;
      }
      if (e.target.closest('#week-today')) {
        state.weekStart = Utils.getWeekStart(new Date());
        renderView(container);
        return;
      }

      // Click on calendar event → inline detail
      var calEvent = e.target.closest('[data-appt-id]');
      if (calEvent) {
        var apptId = calEvent.getAttribute('data-appt-id');
        state.subView = 'detail';
        state.detailId = apptId;
        renderView(container);
        return;
      }

      // Click on calendar day to create
      var calDay = e.target.closest('.calendar-day');
      if (calDay && !e.target.closest('.cal-event')) {
        var date = calDay.getAttribute('data-date');
        state.subView = 'form';
        state.editId = null;
        state.prefillDate = date;
        state.prefillTime = '';
        state.rescheduleFrom = null;
        renderView(container);
        return;
      }

      // Click on week cell to create
      var weekCell = e.target.closest('.week-cell');
      if (weekCell && !e.target.closest('.week-event')) {
        var cellDate = weekCell.getAttribute('data-date');
        var cellHour = weekCell.getAttribute('data-hour');
        var timeStr = (cellHour.length < 2 ? '0' : '') + cellHour + ':00';
        state.subView = 'form';
        state.editId = null;
        state.prefillDate = cellDate;
        state.prefillTime = timeStr;
        state.rescheduleFrom = null;
        renderView(container);
        return;
      }

      // Quick actions on list
      var completeBtn = e.target.closest('.complete-appt-btn');
      if (completeBtn) {
        var compId = completeBtn.getAttribute('data-id');
        var compAppt = Store.getAppointment(compId);
        var doComplete = function() {
          Store.updateAppointment(compId, { status: 'completed' });
          Store.logActivity('Appointment completed');
          Utils.toast('Appointment completed', 'success');
          if (compAppt) state.nextVisitAppt = compAppt;
          renderView(container);
        };
        if (compAppt && compAppt.date > Utils.today()) {
          Utils.inlineConfirm(container, 'This appointment is on ' + Utils.formatDate(compAppt.date) + ' (future date). Mark as completed?', doComplete);
        } else {
          doComplete();
        }
        return;
      }
      var cancelBtn = e.target.closest('.cancel-appt-btn');
      if (cancelBtn) {
        var cancelId = cancelBtn.getAttribute('data-id');
        Utils.inlineConfirm(container, 'Cancel this appointment?', function() {
          Store.updateAppointment(cancelId, { status: 'cancelled' });
          Store.logActivity('Appointment cancelled');
          Utils.toast('Appointment cancelled', 'warning');
          renderView(container);
        });
        return;
      }
      var noshowBtn = e.target.closest('.noshow-appt-btn');
      if (noshowBtn) {
        Store.updateAppointment(noshowBtn.getAttribute('data-id'), { status: 'no-show' });
        Store.logActivity('Patient no-show recorded');
        Utils.toast('Marked as no-show', 'warning');
        renderView(container);
        return;
      }
      var rescheduleBtn = e.target.closest('.reschedule-appt-btn');
      if (rescheduleBtn) {
        var rAppt = Store.getAppointment(rescheduleBtn.getAttribute('data-id'));
        if (rAppt) {
          Store.updateAppointment(rAppt.id, { status: 'cancelled' });
          state.subView = 'form';
          state.editId = null;
          state.prefillDate = '';
          state.prefillTime = '';
          state.rescheduleFrom = rAppt;
          renderView(container);
        }
        return;
      }
      var deleteBtn = e.target.closest('.delete-appt-btn');
      if (deleteBtn) {
        var delId = deleteBtn.getAttribute('data-id');
        Utils.inlineConfirm(container, 'Delete this appointment?', function() {
          Store.deleteAppointment(delId);
          Utils.toast('Appointment deleted', 'success');
          renderView(container);
        }, { danger: true });
        return;
      }

      // Pagination
      var pageBtn = e.target.closest('.appt-page-btn');
      if (pageBtn && !pageBtn.disabled) {
        state.page = parseInt(pageBtn.getAttribute('data-page'), 10);
        renderView(container);
        return;
      }
    };

    container.addEventListener('click', _clickHandler);

    // List filters
    var patientSearch = document.getElementById('appt-patient-search');
    var _searchTimeout;
    if (patientSearch) {
      patientSearch.addEventListener('input', function() {
        var self = this;
        clearTimeout(_searchTimeout);
        _searchTimeout = setTimeout(function() {
          state.patientSearch = self.value;
          state.page = 1;
          renderView(container);
        }, 300);
      });
    }
    var dateFrom = document.getElementById('appt-date-from');
    if (dateFrom) {
      dateFrom.addEventListener('change', function() {
        state.dateFrom = this.value;
        state.page = 1;
        renderView(container);
      });
    }
    var dateTo = document.getElementById('appt-date-to');
    if (dateTo) {
      dateTo.addEventListener('change', function() {
        state.dateTo = this.value;
        state.page = 1;
        renderView(container);
      });
    }
    var statusFilter = document.getElementById('appt-status-filter');
    if (statusFilter) {
      statusFilter.addEventListener('change', function() {
        state.statusFilter = this.value;
        state.page = 1;
        renderView(container);
      });
    }
    var typeFilter = document.getElementById('appt-type-filter');
    if (typeFilter) {
      typeFilter.addEventListener('change', function() {
        state.typeFilter = this.value;
        state.page = 1;
        renderView(container);
      });
    }
  }

  function getStatusBadgeClass(status) {
    if (status === 'scheduled') return 'badge-info';
    if (status === 'completed') return 'badge-success';
    if (status === 'cancelled') return 'badge-danger';
    if (status === 'no-show') return 'badge-warning';
    return 'badge-gray';
  }

  // Register cleanup so router can remove stale handlers
  if (!window._viewCleanups) window._viewCleanups = [];
  window._viewCleanups.push(function(container) {
    if (_clickHandler) {
      container.removeEventListener('click', _clickHandler);
      _clickHandler = null;
    }
  });

  return {
    render: render,
    bookForPatient: function(patientId) {
      state.prefillPatient = patientId;
      state.prefillDate = '';
      state.prefillTime = '';
      state.subView = 'form';
      state.editId = null;
      state.rescheduleFrom = null;
    }
  };
})();
