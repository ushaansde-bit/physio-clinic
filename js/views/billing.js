/* ============================================
   Billing View - Centralized Billing Management
   ============================================ */
window.BillingView = (function() {

  var _clickHandler = null;

  var state = {
    search: '',
    statusFilter: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
    perPage: 10,
    subView: 'list'
  };

  function hasBillingPerm(permKey) {
    var user = App.getCurrentUser();
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (!user.billingPermissions) return true;
    return user.billingPermissions.indexOf(permKey) !== -1;
  }

  function render(container) {
    state.search = '';
    state.statusFilter = '';
    state.dateFrom = '';
    state.dateTo = '';
    state.page = 1;
    state.subView = 'list';
    renderView(container);
  }

  function renderView(container) {
    if (state.subView === 'form') {
      renderForm(container);
      return;
    }
    if (state.subView === 'analytics') {
      renderAnalytics(container);
      return;
    }
    renderList(container);
  }

  function renderList(container) {
    var billing = Store.getBilling();
    var patients = Store.getPatients();

    var patientMap = {};
    for (var i = 0; i < patients.length; i++) {
      patientMap[patients[i].id] = patients[i].name;
    }

    var filtered = [];
    for (var j = 0; j < billing.length; j++) {
      var b = billing[j];
      var patientName = patientMap[b.patientId] || 'Unknown';
      if (state.search) {
        var q = state.search.toLowerCase();
        if (patientName.toLowerCase().indexOf(q) === -1 &&
            (b.description || '').toLowerCase().indexOf(q) === -1) continue;
      }
      if (state.statusFilter && b.status !== state.statusFilter) continue;
      if (state.dateFrom && b.date < state.dateFrom) continue;
      if (state.dateTo && b.date > state.dateTo) continue;
      filtered.push(b);
    }

    filtered.sort(function(a, b) { return a.date > b.date ? -1 : 1; });

    // Summary stats
    var allBilling = Store.getBilling();
    var totalOutstanding = 0;
    var paidThisMonth = 0;
    var revenueThisMonth = 0;
    var now = new Date();
    var monthStr = now.getFullYear() + '-' + ((now.getMonth() + 1) < 10 ? '0' : '') + (now.getMonth() + 1);

    for (var k = 0; k < allBilling.length; k++) {
      var bill = allBilling[k];
      var amt = parseFloat(bill.amount) || 0;
      if (bill.status === 'pending') totalOutstanding += amt;
      if (bill.status !== 'pending' && bill.paidDate && bill.paidDate.substring(0, 7) === monthStr) {
        paidThisMonth += amt;
      }
      if (bill.date && bill.date.substring(0, 7) === monthStr) {
        revenueThisMonth += amt;
      }
    }

    // Pagination
    var total = filtered.length;
    var totalPages = Math.max(1, Math.ceil(total / state.perPage));
    if (state.page > totalPages) state.page = totalPages;
    var start = (state.page - 1) * state.perPage;
    var pageItems = filtered.slice(start, start + state.perPage);

    var html = '';

    // Summary cards
    if (hasBillingPerm('billing_viewFinancials')) {
      html += '<div class="billing-summary">';
      html += '<div class="billing-stat pending"><h4>Total Outstanding</h4><div class="amount">' + Utils.formatCurrency(totalOutstanding) + '</div></div>';
      html += '<div class="billing-stat paid"><h4>Paid This Month</h4><div class="amount">' + Utils.formatCurrency(paidThisMonth) + '</div></div>';
      html += '<div class="billing-stat total"><h4>Revenue This Month</h4><div class="amount">' + Utils.formatCurrency(revenueThisMonth) + '</div></div>';
      html += '</div>';
      html += '<div style="margin-bottom:0.75rem;text-align:right;">';
      html += '<button class="btn btn-sm btn-secondary" id="toggle-analytics-btn"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px;"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>Analytics</button>';
      html += '</div>';
    }

    // Toolbar
    html += '<div class="toolbar">';
    html += '<div class="search-input">';
    html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
    html += '<input type="text" id="billing-search" placeholder="Search by patient or description..." value="' + Utils.escapeHtml(state.search) + '">';
    html += '</div>';
    html += '<select class="filter-select" id="billing-status-filter">';
    html += '<option value="">All Status</option>';
    html += '<option value="pending"' + (state.statusFilter === 'pending' ? ' selected' : '') + '>Pending</option>';
    html += '<option value="gpay"' + (state.statusFilter === 'gpay' ? ' selected' : '') + '>GPay</option>';
    html += '<option value="cash"' + (state.statusFilter === 'cash' ? ' selected' : '') + '>Cash</option>';
    html += '<option value="card"' + (state.statusFilter === 'card' ? ' selected' : '') + '>Card</option>';
    html += '</select>';
    html += '<input type="date" class="filter-select" id="billing-date-from" value="' + state.dateFrom + '">';
    html += '<input type="date" class="filter-select" id="billing-date-to" value="' + state.dateTo + '">';
    html += '<button class="btn btn-sm btn-secondary" id="export-billing-btn"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px;"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Export</button>';
    if (hasBillingPerm('billing_create')) {
      html += '<button class="btn btn-primary" id="create-invoice-btn">';
      html += '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
      html += 'Create Invoice</button>';
    }
    html += '</div>';

    // Table
    html += '<div class="card"><div class="table-wrapper">';
    html += '<table class="data-table billing-table"><thead><tr>';
    html += '<th>Date</th><th>Patient</th><th>Description</th><th>Amount</th><th>Status</th><th>Actions</th>';
    html += '</tr></thead><tbody>';

    if (pageItems.length === 0) {
      html += '<tr class="no-hover"><td colspan="6"><div class="empty-state"><p>No billing records found</p></div></td></tr>';
    } else {
      for (var m = 0; m < pageItems.length; m++) {
        var item = pageItems[m];
        var pName = patientMap[item.patientId] || 'Unknown';
        var itemIsPaid = item.status !== 'pending';
        var statusCls = itemIsPaid ? 'badge-success' : 'badge-warning';
        var sLabel = item.status === 'gpay' ? 'GPay' : item.status === 'cash' ? 'Cash' : item.status === 'card' ? 'Card' : item.status === 'paid' ? 'Paid' : 'Pending';
        html += '<tr class="no-hover">';
        html += '<td>' + Utils.formatDate(item.date) + '</td>';
        html += '<td><a href="#/patients/' + item.patientId + '" style="font-weight:500;">' + Utils.escapeHtml(pName) + '</a></td>';
        html += '<td>' + Utils.escapeHtml(item.description) + '</td>';
        html += '<td style="font-weight:600;white-space:nowrap;">' + Utils.formatCurrency(item.amount) + '</td>';
        html += '<td><span class="badge ' + statusCls + '">' + sLabel + '</span></td>';
        html += '<td><div class="btn-group">';
        if (!itemIsPaid && hasBillingPerm('billing_recordPayment')) {
          html += '<button class="btn btn-sm btn-success mark-paid-btn" data-id="' + item.id + '">Mark Paid</button>';
        }
        if (hasBillingPerm('billing_delete')) {
          html += '<button class="btn btn-sm btn-ghost delete-billing-btn" data-id="' + item.id + '" style="color:var(--danger);">Delete</button>';
        }
        html += '</div></td>';
        html += '</tr>';
      }
    }
    html += '</tbody></table></div>';

    // Pagination
    if (total > state.perPage) {
      html += '<div class="card-footer"><div class="pagination">';
      html += '<span>Showing ' + (start + 1) + '-' + Math.min(start + state.perPage, total) + ' of ' + total + '</span>';
      html += '<div class="pagination-buttons">';
      html += '<button class="page-btn" data-page="' + (state.page - 1) + '"' + (state.page <= 1 ? ' disabled' : '') + '>&laquo;</button>';
      for (var pg = 1; pg <= totalPages; pg++) {
        html += '<button class="page-btn' + (pg === state.page ? ' active' : '') + '" data-page="' + pg + '">' + pg + '</button>';
      }
      html += '<button class="page-btn" data-page="' + (state.page + 1) + '"' + (state.page >= totalPages ? ' disabled' : '') + '>&raquo;</button>';
      html += '</div></div></div>';
    }

    html += '</div>';
    container.innerHTML = html;
    bindListEvents(container);
  }

  function renderForm(container) {
    var patients = Store.getPatients();
    patients.sort(function(a, b) { return a.name.localeCompare(b.name); });

    var html = '<div class="inline-form-card">';
    html += '<div class="inline-form-header">';
    html += '<button class="back-btn" id="form-back">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>';
    html += '</button>';
    html += '<h3>New Invoice</h3>';
    html += '</div>';
    html += '<div class="inline-form-body">';

    html += '<form id="invoice-form">';
    html += '<div class="form-group"><label>Patient</label>';
    html += '<select name="patientId" required>';
    html += '<option value="">Select patient...</option>';
    for (var i = 0; i < patients.length; i++) {
      html += '<option value="' + patients[i].id + '">' + Utils.escapeHtml(patients[i].name) + '</option>';
    }
    html += '</select></div>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>Date</label>';
    html += '<input type="date" name="date" value="' + Utils.today() + '" required></div>';
    html += '<div class="form-group"><label>Amount (' + Utils.getCurrencySymbol() + ')</label>';
    html += '<input type="number" name="amount" step="0.01" min="0" required placeholder="0.00"></div>';
    html += '</div>';
    html += '<div class="form-group"><label>Description ' + Utils.micHtml('inv-description') + '</label>';
    html += '<input type="text" id="inv-description" name="description" required placeholder="e.g., Therapeutic Exercise + Manual Therapy"></div>';
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
    html += '<button class="btn btn-secondary" id="form-cancel">Cancel</button>';
    html += '<button class="btn btn-primary" id="form-save">Create Invoice</button>';
    html += '</div>';
    html += '</div>';

    container.innerHTML = html;
    Utils.bindMicButtons(container);

    var goBack = function() { state.subView = 'list'; renderView(container); };
    document.getElementById('form-back').onclick = goBack;
    document.getElementById('form-cancel').onclick = goBack;
    document.getElementById('form-save').onclick = function() {
      var form = document.getElementById('invoice-form');
      var data = Utils.getFormData(form);
      if (!data.patientId || !data.description || !data.amount) {
        Utils.toast('Please fill in all required fields', 'error');
        return;
      }
      if (data.status !== 'pending') data.paidDate = Utils.today();
      Store.createBilling(data);
      Utils.toast('Invoice created', 'success');
      state.subView = 'list';
      renderView(container);
    };
  }

  function exportBilling() {
    var bills = Store.getBilling();
    var headers = ['Date', 'Patient', 'Description', 'Amount', 'Status', 'Payment Date'];
    var data = [];
    for (var i = 0; i < bills.length; i++) {
      var b = bills[i];
      var patient = Store.getPatient(b.patientId);
      var patientName = patient ? patient.name : 'Unknown';
      var statusLabel = b.status === 'gpay' ? 'GPay' : b.status === 'cash' ? 'Cash' : b.status === 'card' ? 'Card' : b.status === 'paid' ? 'Paid' : 'Pending';
      data.push([
        b.date || '',
        patientName,
        b.description || '',
        parseFloat(b.amount) || 0,
        statusLabel,
        b.paidDate || ''
      ]);
    }
    var ws = XLSX.utils.aoa_to_sheet([headers].concat(data));
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, 'billing.xlsx');
  }

  function bindListEvents(container) {
    var searchInput = document.getElementById('billing-search');
    var searchTimeout;
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(function() {
          state.search = searchInput.value;
          state.page = 1;
          renderView(container);
        }, 300);
      });
    }

    var statusFilter = document.getElementById('billing-status-filter');
    if (statusFilter) {
      statusFilter.addEventListener('change', function() {
        state.statusFilter = this.value;
        state.page = 1;
        renderView(container);
      });
    }
    var dateFrom = document.getElementById('billing-date-from');
    if (dateFrom) {
      dateFrom.addEventListener('change', function() {
        state.dateFrom = this.value;
        state.page = 1;
        renderView(container);
      });
    }
    var dateTo = document.getElementById('billing-date-to');
    if (dateTo) {
      dateTo.addEventListener('change', function() {
        state.dateTo = this.value;
        state.page = 1;
        renderView(container);
      });
    }

    if (_clickHandler) container.removeEventListener('click', _clickHandler);

    _clickHandler = function(e) {
      var pageBtn = e.target.closest('.page-btn');
      if (pageBtn && !pageBtn.disabled) {
        state.page = parseInt(pageBtn.getAttribute('data-page'), 10);
        renderView(container);
        return;
      }

      var markPaidBtn = e.target.closest('.mark-paid-btn');
      if (markPaidBtn) {
        if (!hasBillingPerm('billing_recordPayment')) return;
        var billId = markPaidBtn.getAttribute('data-id');
        Store.updateBilling(billId, { status: 'paid', paidDate: Utils.today() });
        Store.logActivity('Payment received');
        Utils.toast('Marked as paid', 'success');
        renderView(container);
        return;
      }

      var deleteBtn = e.target.closest('.delete-billing-btn');
      if (deleteBtn) {
        if (!hasBillingPerm('billing_delete')) return;
        Utils.inlineConfirm(container, 'Delete this billing record?', function() {
          Store.deleteBilling(deleteBtn.getAttribute('data-id'));
          Utils.toast('Billing record deleted', 'success');
          renderView(container);
        }, { danger: true });
        return;
      }

      if (e.target.closest('#create-invoice-btn')) {
        if (!hasBillingPerm('billing_create')) return;
        state.subView = 'form';
        renderView(container);
        return;
      }

      // Export billing
      if (e.target.closest('#export-billing-btn')) {
        exportBilling();
        return;
      }

      // Analytics toggle
      if (e.target.closest('#toggle-analytics-btn')) {
        state.subView = 'analytics';
        renderView(container);
        return;
      }
    };
    container.addEventListener('click', _clickHandler);
  }

  // ==================== ANALYTICS ====================
  function renderAnalytics(container) {
    var allBilling = Store.getBilling();
    var now = new Date();

    // Build monthly data for last 6 months
    var months = [];
    for (var m = 5; m >= 0; m--) {
      var d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      var key = d.getFullYear() + '-' + ('0' + (d.getMonth()+1)).slice(-2);
      var labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      months.push({ key: key, label: labels[d.getMonth()] + ' ' + d.getFullYear(), revenue: 0, collected: 0, outstanding: 0, count: 0 });
    }

    // Payment method breakdown
    var methods = { pending: 0, gpay: 0, cash: 0, card: 0, paid: 0 };

    for (var b = 0; b < allBilling.length; b++) {
      var bill = allBilling[b];
      var amt = parseFloat(bill.amount) || 0;
      var bMonth = (bill.date || '').substring(0, 7);

      // Count by payment method
      var st = bill.status || 'pending';
      if (methods.hasOwnProperty(st)) methods[st] += amt;
      else methods.pending += amt;

      for (var mi = 0; mi < months.length; mi++) {
        if (months[mi].key === bMonth) {
          months[mi].revenue += amt;
          months[mi].count++;
          if (st !== 'pending') months[mi].collected += amt;
          else months[mi].outstanding += amt;
        }
      }
    }

    // Find max revenue for bar scaling
    var maxRev = 1;
    for (var mx = 0; mx < months.length; mx++) {
      if (months[mx].revenue > maxRev) maxRev = months[mx].revenue;
    }

    var html = '';
    html += '<div style="margin-bottom:0.75rem;"><button class="btn btn-sm btn-secondary" id="back-to-list-btn">&larr; Back to List</button></div>';

    // Monthly Revenue Chart
    html += '<div class="card mb-2"><div class="card-header"><h3>Monthly Revenue (Last 6 Months)</h3></div><div class="card-body">';
    html += '<div style="display:flex;align-items:flex-end;gap:8px;height:200px;padding-top:10px;">';
    for (var ci = 0; ci < months.length; ci++) {
      var pct = Math.max(4, Math.round((months[ci].revenue / maxRev) * 100));
      var barColor = ci === months.length - 1 ? 'var(--primary)' : 'var(--primary-light, #5eead4)';
      html += '<div style="flex:1;display:flex;flex-direction:column;align-items:center;height:100%;justify-content:flex-end;">';
      html += '<div style="font-size:0.72em;font-weight:700;margin-bottom:4px;">' + Utils.formatCurrency(months[ci].revenue) + '</div>';
      html += '<div style="width:100%;max-width:48px;height:' + pct + '%;background:' + barColor + ';border-radius:6px 6px 0 0;min-height:4px;transition:height 0.3s;"></div>';
      html += '<div style="font-size:0.7em;color:var(--text-secondary);margin-top:4px;text-align:center;">' + months[ci].label.split(' ')[0] + '</div>';
      html += '</div>';
    }
    html += '</div>';
    html += '</div></div>';

    // Collected vs Outstanding
    html += '<div class="card mb-2"><div class="card-header"><h3>Collected vs Outstanding</h3></div><div class="card-body">';
    html += '<div style="display:flex;flex-direction:column;gap:6px;">';
    for (var si = 0; si < months.length; si++) {
      var total = months[si].revenue || 1;
      var collPct = Math.round((months[si].collected / total) * 100);
      var outPct = 100 - collPct;
      html += '<div style="display:flex;align-items:center;gap:8px;font-size:0.82em;">';
      html += '<div style="width:40px;flex-shrink:0;font-weight:600;color:var(--text-secondary);">' + months[si].label.split(' ')[0] + '</div>';
      html += '<div style="flex:1;height:20px;background:var(--bg-secondary);border-radius:4px;overflow:hidden;display:flex;">';
      if (months[si].collected > 0) html += '<div style="width:' + collPct + '%;background:var(--success);height:100%;"></div>';
      if (months[si].outstanding > 0) html += '<div style="width:' + outPct + '%;background:var(--warning);height:100%;"></div>';
      html += '</div>';
      html += '<div style="width:60px;flex-shrink:0;text-align:right;font-size:0.78em;">' + Utils.formatCurrency(months[si].revenue) + '</div>';
      html += '</div>';
    }
    html += '</div>';
    html += '<div style="display:flex;gap:16px;margin-top:10px;font-size:0.78em;">';
    html += '<span><span style="display:inline-block;width:12px;height:12px;background:var(--success);border-radius:2px;vertical-align:-1px;margin-right:4px;"></span>Collected</span>';
    html += '<span><span style="display:inline-block;width:12px;height:12px;background:var(--warning);border-radius:2px;vertical-align:-1px;margin-right:4px;"></span>Outstanding</span>';
    html += '</div>';
    html += '</div></div>';

    // Payment Method Breakdown
    var totalPaid = methods.gpay + methods.cash + methods.card + methods.paid;
    html += '<div class="card mb-2"><div class="card-header"><h3>Payment Method Breakdown</h3></div><div class="card-body">';
    if (totalPaid > 0) {
      var methodList = [
        { label: 'GPay', amount: methods.gpay, color: '#4285F4' },
        { label: 'Cash', amount: methods.cash, color: '#22c55e' },
        { label: 'Card', amount: methods.card, color: '#8b5cf6' },
        { label: 'Other (Paid)', amount: methods.paid, color: '#6b7280' }
      ];
      // Horizontal stacked bar
      html += '<div style="height:28px;background:var(--bg-secondary);border-radius:6px;overflow:hidden;display:flex;margin-bottom:12px;">';
      for (var pi = 0; pi < methodList.length; pi++) {
        if (methodList[pi].amount > 0) {
          var mPct = Math.max(2, Math.round((methodList[pi].amount / totalPaid) * 100));
          html += '<div style="width:' + mPct + '%;background:' + methodList[pi].color + ';height:100%;" title="' + methodList[pi].label + ': ' + Utils.formatCurrency(methodList[pi].amount) + '"></div>';
        }
      }
      html += '</div>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:12px;">';
      for (var li = 0; li < methodList.length; li++) {
        if (methodList[li].amount > 0) {
          html += '<div style="font-size:0.82em;display:flex;align-items:center;gap:4px;">';
          html += '<span style="display:inline-block;width:12px;height:12px;background:' + methodList[li].color + ';border-radius:2px;"></span>';
          html += methodList[li].label + ': <strong>' + Utils.formatCurrency(methodList[li].amount) + '</strong>';
          html += '</div>';
        }
      }
      html += '</div>';
    } else {
      html += '<div style="text-align:center;color:var(--text-secondary);padding:16px;">No paid records yet</div>';
    }
    html += '</div></div>';

    // Outstanding amount
    if (methods.pending > 0) {
      html += '<div class="card mb-2" style="border-left:4px solid var(--warning);"><div class="card-body">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
      html += '<div><div style="font-weight:700;">Total Outstanding</div><div style="font-size:0.82em;color:var(--text-secondary);">Unpaid invoices</div></div>';
      html += '<div style="font-size:1.5em;font-weight:800;color:var(--warning);">' + Utils.formatCurrency(methods.pending) + '</div>';
      html += '</div></div></div>';
    }

    container.innerHTML = html;

    // Back button
    var backBtn = container.querySelector('#back-to-list-btn');
    if (backBtn) {
      backBtn.addEventListener('click', function() {
        state.subView = 'list';
        renderView(container);
      });
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
