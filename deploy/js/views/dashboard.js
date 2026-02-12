/* ============================================
   Dashboard View
   ============================================ */
window.DashboardView = (function() {

  var _clickHandler = null;

  function render(container) {
    var todayStr = Utils.today();
    var patients = Store.getPatients();
    var appointments = Store.getAppointments();
    var billing = Store.getBilling();
    var activity = Store.getActivity();

    // Stats
    var activePatients = 0;
    for (var i = 0; i < patients.length; i++) {
      if (patients[i].status === 'active') activePatients++;
    }

    var todayAppts = [];
    for (var j = 0; j < appointments.length; j++) {
      if (appointments[j].date === todayStr) todayAppts.push(appointments[j]);
    }
    todayAppts.sort(function(a, b) { return a.time < b.time ? -1 : 1; });

    var pendingBills = 0;
    for (var k = 0; k < billing.length; k++) {
      if (billing[k].status === 'pending') pendingBills++;
    }

    // Completed this week
    var now = new Date();
    var weekStart = Utils.getWeekStart(now);
    var completedThisWeek = 0;
    for (var l = 0; l < appointments.length; l++) {
      var apptDate = new Date(appointments[l].date);
      if (appointments[l].status === 'completed' && apptDate >= weekStart && apptDate <= now) {
        completedThisWeek++;
      }
    }

    // Weekly overview: count appts per day this week
    var weekDays = [];
    for (var d = 0; d < 7; d++) {
      var day = Utils.addDays(weekStart, d);
      var dayStr = Utils.toDateString(day);
      var count = 0;
      for (var m = 0; m < appointments.length; m++) {
        if (appointments[m].date === dayStr && appointments[m].status !== 'cancelled') count++;
      }
      weekDays.push({ label: Utils.DAYS_SHORT[d], date: dayStr, count: count, isToday: dayStr === todayStr });
    }
    var maxCount = 1;
    for (var n = 0; n < weekDays.length; n++) {
      if (weekDays[n].count > maxCount) maxCount = weekDays[n].count;
    }

    var html = '';

    // Stat cards
    html += '<div class="stat-grid">';
    html += statCard('Active Patients', activePatients, 'teal',
      '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>', 'stat-active-patients');
    html += statCard("Today's Appts", todayAppts.length, 'blue',
      '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>', 'stat-today-appts');
    if (Store.isFeatureEnabled('billing')) {
      html += statCard('Pending Bills', pendingBills, 'amber',
        '<text x="12" y="17" text-anchor="middle" fill="currentColor" stroke="none" font-size="16" font-weight="700">' + Utils.getCurrencySymbol() + '</text>', 'stat-pending-bills');
    }
    html += statCard('Completed This Week', completedThisWeek, 'green',
      '<polyline points="20 6 9 17 4 12"/>', 'stat-completed-week');
    html += '</div>';

    // Main grid
    html += '<div class="dashboard-grid">';

    // Today's schedule
    html += '<div class="card">';
    html += '<div class="card-header"><h3>Today\'s Schedule</h3>';
    html += '<a href="#/appointments" class="btn btn-sm btn-ghost">View All</a></div>';
    html += '<div class="card-body">';
    if (todayAppts.length === 0) {
      html += '<div class="empty-state"><p>No appointments today</p></div>';
    } else {
      for (var p = 0; p < todayAppts.length; p++) {
        var appt = todayAppts[p];
        var statusBadge = getStatusBadge(appt.status);
        html += '<div class="schedule-item">';
        html += '<span class="schedule-time">' + Utils.formatTime(appt.time) + '</span>';
        html += '<div class="schedule-info">';
        html += '<div class="name">' + Utils.escapeHtml(appt.patientName) + '</div>';
        html += '<div class="type">' + Utils.escapeHtml(appt.type) + ' &middot; ' + appt.duration + ' min</div>';
        html += '</div>';
        html += statusBadge;
        html += '</div>';
      }
    }
    html += '</div></div>';

    // Right column
    html += '<div>';

    // Weekly overview
    html += '<div class="card mb-2">';
    html += '<div class="card-header"><h3>Weekly Overview</h3></div>';
    html += '<div class="card-body">';
    html += '<div style="display:flex;align-items:flex-end;gap:0.5rem;height:100px;">';
    for (var q = 0; q < weekDays.length; q++) {
      var wd = weekDays[q];
      var barHeight = maxCount > 0 ? Math.max(4, (wd.count / maxCount) * 80) : 4;
      var barColor = wd.isToday ? 'var(--primary)' : 'var(--gray-200)';
      html += '<div style="flex:1;text-align:center;">';
      html += '<div style="height:80px;display:flex;align-items:flex-end;justify-content:center;">';
      html += '<div style="width:100%;max-width:32px;height:' + barHeight + 'px;background:' + barColor + ';border-radius:4px 4px 0 0;"></div>';
      html += '</div>';
      html += '<div style="font-size:0.7rem;color:' + (wd.isToday ? 'var(--primary)' : 'var(--gray-500)') + ';margin-top:0.3rem;font-weight:' + (wd.isToday ? '700' : '400') + ';">' + wd.label + '</div>';
      html += '<div style="font-size:0.7rem;color:var(--gray-400);">' + wd.count + '</div>';
      html += '</div>';
    }
    html += '</div></div></div>';

    // Recent activity
    html += '<div class="card">';
    html += '<div class="card-header"><h3>Recent Activity</h3></div>';
    html += '<div class="card-body">';
    var displayActivity = activity.slice(0, 8);
    if (displayActivity.length === 0) {
      html += '<div class="empty-state"><p>No recent activity</p></div>';
    } else {
      for (var r = 0; r < displayActivity.length; r++) {
        html += '<div class="activity-item">';
        html += '<div class="activity-dot"></div>';
        html += '<div>';
        html += '<div class="activity-text">' + Utils.escapeHtml(displayActivity[r].text) + '</div>';
        html += '<div class="activity-time">' + Utils.timeAgo(displayActivity[r].time) + '</div>';
        html += '</div></div>';
      }
    }
    html += '</div></div>';

    html += '</div>'; // end right column
    html += '</div>'; // end dashboard-grid

    container.innerHTML = html;

    // Fix: remove old handler before adding new one
    if (_clickHandler) container.removeEventListener('click', _clickHandler);
    _clickHandler = function(e) {
      var card = e.target.closest('.stat-card.clickable');
      if (!card) return;
      var id = card.id;
      if (id === 'stat-pending-bills') App.navigate('/billing');
      else if (id === 'stat-active-patients') App.navigate('/patients');
      else if (id === 'stat-today-appts') App.navigate('/appointments');
      else if (id === 'stat-completed-week') App.navigate('/appointments');
    };
    container.addEventListener('click', _clickHandler);
  }

  function statCard(label, value, color, iconPath, cardId) {
    return '<div class="stat-card clickable" id="' + cardId + '">' +
      '<div class="stat-icon ' + color + '">' +
      '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">' + iconPath + '</svg>' +
      '</div><div class="stat-info"><h4>' + label + '</h4><div class="stat-value">' + value + '</div></div></div>';
  }

  function getStatusBadge(status) {
    var cls = 'badge-gray';
    if (status === 'scheduled') cls = 'badge-info';
    else if (status === 'completed') cls = 'badge-success';
    else if (status === 'cancelled') cls = 'badge-danger';
    else if (status === 'no-show') cls = 'badge-warning';
    return '<span class="badge ' + cls + '">' + status + '</span>';
  }

  return { render: render };
})();
