/* ============================================
   Appointments View - List + Calendar
   ============================================ */
window.AppointmentsView = (function() {

  var _clickHandler = null;

  var state = {
    view: 'list',       // list | month | week
    dateFrom: '',
    dateTo: '',
    statusFilter: '',
    typeFilter: '',
    calMonth: new Date().getMonth(),
    calYear: new Date().getFullYear(),
    weekStart: Utils.getWeekStart(new Date())
  };

  function render(container) {
    state.dateFrom = '';
    state.dateTo = '';
    state.statusFilter = '';
    state.typeFilter = '';
    renderView(container);
  }

  function renderView(container) {
    var html = '';

    // View toggle + New button
    html += '<div class="toolbar">';
    html += '<div class="view-toggle">';
    html += '<button class="view-btn' + (state.view === 'list' ? ' active' : '') + '" data-view="list">List</button>';
    html += '<button class="view-btn' + (state.view === 'month' ? ' active' : '') + '" data-view="month">Month</button>';
    html += '<button class="view-btn' + (state.view === 'week' ? ' active' : '') + '" data-view="week">Week</button>';
    html += '</div>';
    html += '<div style="flex:1;"></div>';
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
    bindEvents(container);
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
      filtered.push(a);
    }

    // Sort by date/time
    filtered.sort(function(a, b) {
      if (a.date !== b.date) return a.date > b.date ? -1 : 1;
      return a.time < b.time ? -1 : 1;
    });

    var html = '';

    // Filters
    html += '<div class="toolbar">';
    html += '<div class="form-group" style="margin-bottom:0;">';
    html += '<input type="date" class="filter-select" id="appt-date-from" value="' + state.dateFrom + '" placeholder="From">';
    html += '</div>';
    html += '<div class="form-group" style="margin-bottom:0;">';
    html += '<input type="date" class="filter-select" id="appt-date-to" value="' + state.dateTo + '" placeholder="To">';
    html += '</div>';
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
    html += '</div>';

    // Table
    html += '<div class="card"><div class="table-wrapper">';
    html += '<table class="data-table"><thead><tr>';
    html += '<th>Date & Time</th><th>Patient</th><th>Type</th><th>Duration</th><th>Status</th><th>Actions</th>';
    html += '</tr></thead><tbody>';

    if (filtered.length === 0) {
      html += '<tr class="no-hover"><td colspan="6"><div class="empty-state"><p>No appointments found</p></div></td></tr>';
    } else {
      var todayStr = Utils.today();
      for (var j = 0; j < filtered.length; j++) {
        var appt = filtered[j];
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
    return html;
  }

  // ==================== MONTH CALENDAR ====================
  function renderMonthCalendar() {
    var year = state.calYear;
    var month = state.calMonth;
    var todayStr = Utils.today();
    var appointments = Store.getAppointments();

    // Build appt lookup by date
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

    // Day headers
    for (var d = 0; d < 7; d++) {
      html += '<div class="calendar-day-header">' + Utils.DAYS_SHORT[d] + '</div>';
    }

    // Calculate days
    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var prevMonthDays = new Date(year, month, 0).getDate();

    // Previous month days
    for (var p = firstDay - 1; p >= 0; p--) {
      var prevDay = prevMonthDays - p;
      var prevDate = Utils.toDateString(new Date(year, month - 1, prevDay));
      html += '<div class="calendar-day other-month" data-date="' + prevDate + '">';
      html += '<div class="day-num">' + prevDay + '</div>';
      html += renderCalEvents(apptsByDate[prevDate]);
      html += '</div>';
    }

    // Current month days
    for (var c = 1; c <= daysInMonth; c++) {
      var curDate = Utils.toDateString(new Date(year, month, c));
      var isToday = curDate === todayStr;
      html += '<div class="calendar-day' + (isToday ? ' today' : '') + '" data-date="' + curDate + '">';
      html += '<div class="day-num">' + c + '</div>';
      html += renderCalEvents(apptsByDate[curDate]);
      html += '</div>';
    }

    // Next month days
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
    // Sort by time
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

    // Build lookup
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

    // Time slots: 8 AM to 6 PM
    var startHour = 8;
    var endHour = 18;

    html += '<div class="week-grid">';

    // Header row
    html += '<div class="week-header-cell"></div>'; // time column header
    for (var d = 0; d < 7; d++) {
      var dayDate = Utils.addDays(ws, d);
      var dayStr = Utils.toDateString(dayDate);
      var isToday = dayStr === todayStr;
      html += '<div class="week-header-cell' + (isToday ? ' today-col' : '') + '">';
      html += Utils.DAYS_SHORT[d] + '<br>' + dayDate.getDate();
      html += '</div>';
    }

    // Time rows
    for (var h = startHour; h < endHour; h++) {
      var timeLabel = ((h % 12) || 12) + ':00 ' + (h >= 12 ? 'PM' : 'AM');
      html += '<div class="week-time-label">' + timeLabel + '</div>';

      for (var dd = 0; dd < 7; dd++) {
        var cellDate = Utils.toDateString(Utils.addDays(ws, dd));
        var isTodayCol = cellDate === todayStr;
        html += '<div class="week-cell' + (isTodayCol ? ' today-col' : '') + '" data-date="' + cellDate + '" data-hour="' + h + '">';

        // Find appointments in this hour
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

  // ==================== EVENT BINDING ====================
  function bindEvents(container) {
    if (_clickHandler) container.removeEventListener('click', _clickHandler);

    _clickHandler = function(e) {
      // View toggle
      var viewBtn = e.target.closest('.view-btn');
      if (viewBtn) {
        state.view = viewBtn.getAttribute('data-view');
        renderView(container);
        return;
      }

      // New appointment
      if (e.target.closest('#add-appt-btn')) {
        showAppointmentForm(null, container);
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

      // Click on calendar event
      var calEvent = e.target.closest('[data-appt-id]');
      if (calEvent) {
        var apptId = calEvent.getAttribute('data-appt-id');
        showAppointmentDetail(apptId, container);
        return;
      }

      // Click on calendar day to create
      var calDay = e.target.closest('.calendar-day');
      if (calDay && !e.target.closest('.cal-event')) {
        var date = calDay.getAttribute('data-date');
        showAppointmentForm(null, container, date);
        return;
      }

      // Click on week cell to create
      var weekCell = e.target.closest('.week-cell');
      if (weekCell && !e.target.closest('.week-event')) {
        var cellDate = weekCell.getAttribute('data-date');
        var cellHour = weekCell.getAttribute('data-hour');
        var timeStr = (cellHour.length < 2 ? '0' : '') + cellHour + ':00';
        showAppointmentForm(null, container, cellDate, timeStr);
        return;
      }

      // Quick actions
      var completeBtn = e.target.closest('.complete-appt-btn');
      if (completeBtn) {
        var completedAppt = Store.getAppointment(completeBtn.getAttribute('data-id'));
        Store.updateAppointment(completeBtn.getAttribute('data-id'), { status: 'completed' });
        Store.logActivity('Appointment completed');
        Utils.toast('Appointment completed', 'success');
        renderView(container);
        if (completedAppt) promptNextVisit(completedAppt, container);
        return;
      }
      var cancelBtn = e.target.closest('.cancel-appt-btn');
      if (cancelBtn) {
        Utils.confirm('Cancel this appointment?', function() {
          Store.updateAppointment(cancelBtn.getAttribute('data-id'), { status: 'cancelled' });
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
        var appt = Store.getAppointment(rescheduleBtn.getAttribute('data-id'));
        if (appt) {
          Store.updateAppointment(appt.id, { status: 'cancelled' });
          showAppointmentForm(null, container, '', '', appt);
        }
        return;
      }
      var deleteBtn = e.target.closest('.delete-appt-btn');
      if (deleteBtn) {
        Utils.confirm('Delete this appointment?', function() {
          Store.deleteAppointment(deleteBtn.getAttribute('data-id'));
          Utils.toast('Appointment deleted', 'success');
          renderView(container);
        });
        return;
      }
    };

    container.addEventListener('click', _clickHandler);

    // List filters
    var dateFrom = document.getElementById('appt-date-from');
    if (dateFrom) {
      dateFrom.addEventListener('change', function() {
        state.dateFrom = this.value;
        renderView(container);
      });
    }
    var dateTo = document.getElementById('appt-date-to');
    if (dateTo) {
      dateTo.addEventListener('change', function() {
        state.dateTo = this.value;
        renderView(container);
      });
    }
    var statusFilter = document.getElementById('appt-status-filter');
    if (statusFilter) {
      statusFilter.addEventListener('change', function() {
        state.statusFilter = this.value;
        renderView(container);
      });
    }
    var typeFilter = document.getElementById('appt-type-filter');
    if (typeFilter) {
      typeFilter.addEventListener('change', function() {
        state.typeFilter = this.value;
        renderView(container);
      });
    }
  }

  // ==================== APPOINTMENT FORM ====================
  function showAppointmentForm(apptId, container, prefillDate, prefillTime, rescheduleFrom) {
    var appt = apptId ? Store.getAppointment(apptId) : null;
    var title = appt ? 'Edit Appointment' : (rescheduleFrom ? 'Reschedule Appointment' : 'New Appointment');
    var patients = Store.getPatients().filter(function(p) { return p.status === 'active'; });
    patients.sort(function(a, b) { return a.name.localeCompare(b.name); });

    var defaultDate = prefillDate || (appt ? appt.date : (rescheduleFrom ? '' : Utils.today()));
    var defaultTime = prefillTime || (appt ? appt.time : (rescheduleFrom ? rescheduleFrom.time : '09:00'));
    var defaultPatient = appt ? appt.patientId : (rescheduleFrom ? rescheduleFrom.patientId : '');
    var defaultType = appt ? appt.type : (rescheduleFrom ? rescheduleFrom.type : 'Treatment');
    var defaultDuration = appt ? appt.duration : (rescheduleFrom ? rescheduleFrom.duration : '30');
    var defaultNotes = appt ? appt.notes : (rescheduleFrom ? rescheduleFrom.notes : '');

    var body = '<form id="appt-form">';
    body += '<div class="form-group"><label>Patient</label>';
    body += '<select name="patientId" required>';
    body += '<option value="">Select patient...</option>';
    for (var i = 0; i < patients.length; i++) {
      body += '<option value="' + patients[i].id + '"' + (patients[i].id === defaultPatient ? ' selected' : '') + '>' + Utils.escapeHtml(patients[i].name) + '</option>';
    }
    body += '</select></div>';
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
    body += '<div class="form-group"><label>Notes ' + Utils.micHtml('af-notes') + '</label>';
    body += '<textarea name="notes" id="af-notes" rows="3">' + Utils.escapeHtml(defaultNotes || '') + '</textarea></div>';
    body += '<div id="conflict-warning" style="display:none;" class="login-error"></div>';
    body += '</form>';

    var footer = '<button class="btn btn-secondary" id="modal-cancel">Cancel</button>';
    footer += '<button class="btn btn-primary" id="modal-save">' + (appt ? 'Update' : 'Book Appointment') + '</button>';

    Utils.showModal(title, body, footer);
    Utils.bindMicButtons(document.getElementById('modal-body'));

    document.getElementById('modal-cancel').onclick = Utils.closeModal;
    document.getElementById('modal-save').onclick = function() {
      var form = document.getElementById('appt-form');
      var data = Utils.getFormData(form);

      if (!data.patientId || !data.date || !data.time) {
        Utils.toast('Please fill in all required fields', 'error');
        return;
      }

      // Conflict check
      var conflict = Store.hasConflict(data.date, data.time, data.duration, appt ? appt.id : null);
      if (conflict) {
        var warningEl = document.getElementById('conflict-warning');
        warningEl.textContent = 'Conflict: ' + conflict.patientName + ' already has an appointment at ' + Utils.formatTime(conflict.time) + ' (' + conflict.duration + ' min)';
        warningEl.style.display = 'block';
        return;
      }

      // Get patient name
      var patient = Store.getPatient(data.patientId);
      data.patientName = patient ? patient.name : 'Unknown';
      data.status = appt ? appt.status : 'scheduled';

      if (appt) {
        Store.updateAppointment(appt.id, data);
        Utils.toast('Appointment updated', 'success');
      } else {
        Store.createAppointment(data);
        Utils.toast('Appointment booked', 'success');
      }
      Utils.closeModal();
      renderView(container);
    };
  }

  // ==================== APPOINTMENT DETAIL (from calendar click) ====================
  function showAppointmentDetail(apptId, container) {
    var appt = Store.getAppointment(apptId);
    if (!appt) return;

    var statusBadge = '<span class="badge ' + getStatusBadgeClass(appt.status) + '">' + appt.status + '</span>';

    var body = '<div class="info-grid" style="grid-template-columns:1fr 1fr;">';
    body += '<div class="info-item"><label>Patient</label><span><a href="#/patients/' + appt.patientId + '">' + Utils.escapeHtml(appt.patientName) + '</a></span></div>';
    body += '<div class="info-item"><label>Status</label><span>' + statusBadge + '</span></div>';
    body += '<div class="info-item"><label>Date</label><span>' + Utils.formatDate(appt.date) + '</span></div>';
    body += '<div class="info-item"><label>Time</label><span>' + Utils.formatTime(appt.time) + '</span></div>';
    body += '<div class="info-item"><label>Type</label><span>' + Utils.escapeHtml(appt.type) + '</span></div>';
    body += '<div class="info-item"><label>Duration</label><span>' + appt.duration + ' min</span></div>';
    body += '</div>';
    if (appt.notes) {
      body += '<div class="mt-2"><label style="font-size:0.72rem;font-weight:600;color:var(--gray-500);text-transform:uppercase;">Notes</label>';
      body += '<p style="font-size:0.85rem;color:var(--gray-600);margin-top:0.2rem;">' + Utils.escapeHtml(appt.notes) + '</p></div>';
    }

    var footer = '';
    if (appt.status === 'scheduled') {
      footer += '<button class="btn btn-success" id="detail-complete">Complete</button>';
      footer += '<button class="btn btn-warning" id="detail-cancel">Cancel</button>';
      footer += '<button class="btn btn-ghost" id="detail-noshow">No-Show</button>';
    }
    footer += '<button class="btn btn-secondary" id="detail-close">Close</button>';

    Utils.showModal('Appointment Details', body, footer);

    var closeBtn = document.getElementById('detail-close');
    if (closeBtn) closeBtn.onclick = Utils.closeModal;

    var compBtn = document.getElementById('detail-complete');
    if (compBtn) compBtn.onclick = function() {
      Store.updateAppointment(apptId, { status: 'completed' });
      Store.logActivity('Appointment completed: ' + appt.patientName);
      Utils.toast('Appointment completed', 'success');
      Utils.closeModal();
      renderView(container);
      promptNextVisit(appt, container);
    };

    var canBtn = document.getElementById('detail-cancel');
    if (canBtn) canBtn.onclick = function() {
      Store.updateAppointment(apptId, { status: 'cancelled' });
      Store.logActivity('Appointment cancelled: ' + appt.patientName);
      Utils.toast('Appointment cancelled', 'warning');
      Utils.closeModal();
      renderView(container);
    };

    var nsBtn = document.getElementById('detail-noshow');
    if (nsBtn) nsBtn.onclick = function() {
      Store.updateAppointment(apptId, { status: 'no-show' });
      Store.logActivity('Patient no-show: ' + appt.patientName);
      Utils.toast('Marked as no-show', 'warning');
      Utils.closeModal();
      renderView(container);
    };
  }

  // Revisit prompt after completing an appointment
  function promptNextVisit(appt, container) {
    var body = '<p class="confirm-text">Appointment for <strong>' + Utils.escapeHtml(appt.patientName) + '</strong> has been completed. Would you like to schedule their next visit?</p>';
    var footer = '<button class="btn btn-secondary" id="revisit-no">No, Thanks</button>';
    footer += '<button class="btn btn-primary" id="revisit-yes">Schedule Next Visit</button>';

    Utils.showModal('Schedule Next Visit?', body, footer);

    document.getElementById('revisit-no').onclick = Utils.closeModal;
    document.getElementById('revisit-yes').onclick = function() {
      Utils.closeModal();
      // Open appointment form pre-filled with same patient, +7 days, same type/duration
      var nextDate = Utils.toDateString(Utils.addDays(new Date(), 7));
      showAppointmentForm(null, container, nextDate, appt.time, {
        patientId: appt.patientId,
        patientName: appt.patientName,
        type: appt.type,
        duration: appt.duration,
        time: appt.time,
        notes: ''
      });
    };
  }

  function getStatusBadgeClass(status) {
    if (status === 'scheduled') return 'badge-info';
    if (status === 'completed') return 'badge-success';
    if (status === 'cancelled') return 'badge-danger';
    if (status === 'no-show') return 'badge-warning';
    return 'badge-gray';
  }

  return { render: render };
})();
