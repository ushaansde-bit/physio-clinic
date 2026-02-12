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
      if (bill.status === 'paid' && bill.paidDate && bill.paidDate.substring(0, 7) === monthStr) {
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
    html += '<option value="paid"' + (state.statusFilter === 'paid' ? ' selected' : '') + '>Paid</option>';
    html += '</select>';
    html += '<input type="date" class="filter-select" id="billing-date-from" value="' + state.dateFrom + '">';
    html += '<input type="date" class="filter-select" id="billing-date-to" value="' + state.dateTo + '">';
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
        var statusCls = item.status === 'paid' ? 'badge-success' : 'badge-warning';
        html += '<tr class="no-hover">';
        html += '<td>' + Utils.formatDate(item.date) + '</td>';
        html += '<td><a href="#/patients/' + item.patientId + '" style="font-weight:500;">' + Utils.escapeHtml(pName) + '</a></td>';
        html += '<td>' + Utils.escapeHtml(item.description) + '</td>';
        html += '<td style="font-weight:600;white-space:nowrap;">' + Utils.formatCurrency(item.amount) + '</td>';
        html += '<td><span class="badge ' + statusCls + '">' + item.status + '</span></td>';
        html += '<td><div class="btn-group">';
        if (item.status === 'pending' && hasBillingPerm('billing_recordPayment')) {
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
    html += '<div class="form-group"><label>Amount (\u20B9)</label>';
    html += '<input type="number" name="amount" step="0.01" min="0" required placeholder="0.00"></div>';
    html += '</div>';
    html += '<div class="form-group"><label>Description ' + Utils.micHtml('inv-description') + '</label>';
    html += '<input type="text" id="inv-description" name="description" required placeholder="e.g., Therapeutic Exercise + Manual Therapy"></div>';
    html += '<div class="form-group"><label>Status</label>';
    html += '<select name="status">';
    html += '<option value="pending">Pending</option>';
    html += '<option value="paid">Paid</option>';
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
      if (data.status === 'paid') data.paidDate = Utils.today();
      Store.createBilling(data);
      Utils.toast('Invoice created', 'success');
      state.subView = 'list';
      renderView(container);
    };
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
    };
    container.addEventListener('click', _clickHandler);
  }

  return { render: render };
})();
