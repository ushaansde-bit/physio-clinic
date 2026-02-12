/* ============================================
   Patients List View
   ============================================ */
window.PatientsView = (function() {

  var _clickHandler = null;

  var state = {
    search: '',
    genderFilter: '',
    tagFilter: '',
    page: 1,
    perPage: 10,
    subView: 'list',  // 'list' | 'form'
    editId: null
  };

  function render(container) {
    state.search = '';
    state.genderFilter = '';
    state.tagFilter = '';
    state.page = 1;
    state.subView = 'list';
    state.editId = null;
    renderView(container);
  }

  function renderView(container) {
    if (state.subView === 'form') {
      renderForm(container);
    } else {
      renderList(container);
    }
  }

  function renderList(container) {
    var patients = Store.getPatients();

    // Filter
    var filtered = [];
    for (var i = 0; i < patients.length; i++) {
      var p = patients[i];
      if (state.search) {
        var q = state.search.toLowerCase();
        if (p.name.toLowerCase().indexOf(q) === -1 &&
            (p.phone || '').indexOf(q) === -1 &&
            (p.email || '').toLowerCase().indexOf(q) === -1) continue;
      }
      if (state.genderFilter && p.gender !== state.genderFilter) continue;
      if (Store.isFeatureEnabled('tags') && state.tagFilter && (!p.tags || p.tags.indexOf(state.tagFilter) === -1)) continue;
      filtered.push(p);
    }

    // Sort by name
    filtered.sort(function(a, b) { return a.name.localeCompare(b.name); });

    // Pagination
    var total = filtered.length;
    var totalPages = Math.max(1, Math.ceil(total / state.perPage));
    if (state.page > totalPages) state.page = totalPages;
    var start = (state.page - 1) * state.perPage;
    var pageItems = filtered.slice(start, start + state.perPage);

    var html = '';

    // Toolbar
    html += '<div class="toolbar">';
    html += '<div class="search-input">';
    html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
    html += '<input type="text" id="patient-search" placeholder="Search by name, phone, or email..." value="' + Utils.escapeHtml(state.search) + '">';
    html += '</div>';
    html += '<select class="filter-select" id="patient-gender-filter">';
    html += '<option value="">All Gender</option>';
    html += '<option value="male"' + (state.genderFilter === 'male' ? ' selected' : '') + '>Male</option>';
    html += '<option value="female"' + (state.genderFilter === 'female' ? ' selected' : '') + '>Female</option>';
    html += '</select>';
    if (Store.isFeatureEnabled('tags')) {
      var allTags = Store.getTags();
      html += '<select class="filter-select" id="patient-tag-filter">';
      html += '<option value="">All Tags</option>';
      for (var t = 0; t < allTags.length; t++) {
        html += '<option value="' + allTags[t].id + '"' + (state.tagFilter === allTags[t].id ? ' selected' : '') + '>' + Utils.escapeHtml(allTags[t].name) + '</option>';
      }
      html += '</select>';
    }
    html += '<button class="btn btn-primary" id="add-patient-btn">';
    html += '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
    html += 'Add Patient</button>';
    html += '</div>';

    // Table
    html += '<div class="card"><div class="table-wrapper">';
    html += '<table class="data-table patients-table"><thead><tr>';
    var tagsEnabled = Store.isFeatureEnabled('tags');
    html += '<th>Patient</th><th>Contact</th>' + (tagsEnabled ? '<th>Tags</th>' : '') + '<th>Actions</th>';
    html += '</tr></thead><tbody>';

    if (pageItems.length === 0) {
      html += '<tr class="no-hover"><td colspan="' + (tagsEnabled ? '4' : '3') + '"><div class="empty-state"><p>No patients found</p></div></td></tr>';
    } else {
      for (var j = 0; j < pageItems.length; j++) {
        var pt = pageItems[j];
        html += '<tr data-patient-id="' + pt.id + '">';
        html += '<td><div style="display:flex;align-items:center;gap:0.6rem;">';
        html += '<div class="patient-avatar" style="width:32px;height:32px;font-size:0.75rem;">' + Utils.getInitials(pt.name) + '</div>';
        html += '<div><div style="font-weight:600;color:var(--gray-800);">' + Utils.escapeHtml(pt.name) + '</div>';
        html += '<div style="font-size:0.75rem;color:var(--gray-500);">' + Utils.escapeHtml(pt.gender || '') + ' &middot; ' + Utils.calculateAge(pt.dob) + ' yrs</div>';
        html += '</div></div></td>';
        html += '<td><div style="font-size:0.82rem;">' + Utils.escapeHtml((pt.phoneCode || Utils.getPhoneCode()) + ' ' + (pt.phone || '-')) + '</div>';
        html += '<div style="font-size:0.75rem;color:var(--gray-500);">' + Utils.escapeHtml(pt.email || '') + '</div></td>';
        if (tagsEnabled) {
          html += '<td>';
          if (pt.tags && pt.tags.length > 0) {
            for (var tIdx = 0; tIdx < pt.tags.length; tIdx++) {
              var tagObj = Store.getTag(pt.tags[tIdx]);
              if (tagObj) {
                html += '<span class="tag-badge" style="background:' + tagObj.color + ';">' + Utils.escapeHtml(tagObj.name) + '</span>';
              }
            }
          } else {
            html += '<span style="color:var(--gray-400);font-size:0.78rem;">-</span>';
          }
          html += '</td>';
        }
        html += '<td><div class="btn-group">';
        html += '<button class="btn btn-sm btn-ghost view-patient-btn" data-id="' + pt.id + '" title="View">View</button>';
        html += '<button class="btn btn-sm btn-ghost delete-patient-btn" data-id="' + pt.id + '" title="Delete" style="color:var(--danger);">Delete</button>';
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

    // Event listeners
    bindListEvents(container);
  }

  function renderForm(container) {
    // Quick Add: 4 fields only (Name, DOB, Gender, Phone)
    // Full editing is done in the Patient Detail Overview tab.
    var html = '<div class="inline-form-card">';
    html += '<div class="inline-form-header">';
    html += '<button class="back-btn" id="form-back-btn"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button>';
    html += '<h3>Quick Add Patient</h3>';
    html += '</div>';
    html += '<div class="inline-form-body">';
    html += '<form id="patient-form">';
    html += formField('Full Name', 'name', 'text', '', true);
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>Date of Birth</label>';
    html += Utils.dobPickerHtml('');
    html += '</div>';
    html += '<div class="form-group"><label>Gender</label>';
    html += '<select name="gender">';
    html += '<option value="">Select...</option>';
    html += '<option value="male">Male</option>';
    html += '<option value="female">Female</option>';
    html += '<option value="other">Other</option>';
    html += '</select></div>';
    html += '</div>';
    html += phoneField('Phone', 'phone', 'phoneCode', '', '');
    html += '</form>';
    html += '<p style="font-size:0.78rem;color:var(--gray-400);margin-top:0.5rem;">You can add diagnosis, tags, and other details after saving.</p>';
    html += '</div>';
    html += '<div class="inline-form-actions">';
    html += '<button class="btn btn-secondary" id="form-cancel-btn">Cancel</button>';
    html += '<button class="btn btn-primary" id="form-save-btn">Save & Open Profile</button>';
    html += '</div>';
    html += '</div>';

    container.innerHTML = html;

    // Bind DOB picker
    Utils.bindDobPicker(container);

    // Phone digit enforcement
    var phoneWraps = container.querySelectorAll('.phone-input-wrap');
    for (var pi = 0; pi < phoneWraps.length; pi++) {
      (function(wrap) {
        var codeInput = wrap.querySelector('.phone-code-input');
        var numInput = wrap.querySelector('.phone-number-input');
        if (!codeInput || !numInput) return;

        function getMax() {
          return Utils.getDigitsByPhoneCode(codeInput.value);
        }

        codeInput.addEventListener('input', function() {
          var max = getMax();
          numInput.maxLength = max;
          numInput.placeholder = 'Phone number (' + max + ' digits)';
          var digits = numInput.value.replace(/[^\d]/g, '');
          if (digits.length > max) {
            numInput.value = digits.substring(0, max);
          }
        });

        numInput.addEventListener('input', function() {
          var max = getMax();
          var digits = this.value.replace(/[^\d]/g, '');
          if (digits.length > max) digits = digits.substring(0, max);
          this.value = digits;
        });
        numInput.addEventListener('keypress', function(e) {
          if (e.key && e.key.length === 1 && !/\d/.test(e.key)) {
            e.preventDefault();
          }
          var max = getMax();
          var digits = this.value.replace(/[^\d]/g, '');
          if (digits.length >= max && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
          }
        });
      })(phoneWraps[pi]);
    }

    // Back/Cancel
    document.getElementById('form-back-btn').onclick = function() {
      state.subView = 'list'; state.editId = null; renderView(container);
    };
    document.getElementById('form-cancel-btn').onclick = function() {
      state.subView = 'list'; state.editId = null; renderView(container);
    };

    // Save → create patient → navigate to detail page
    document.getElementById('form-save-btn').onclick = function() {
      var form = document.getElementById('patient-form');
      var nameInput = form.querySelector('[name="name"]');
      if (!nameInput.value.trim()) {
        Utils.toast('Name is required', 'error');
        return;
      }
      var data = Utils.getFormData(form);
      data.status = 'active';
      data.tags = [];
      data.bodyRegions = [];
      var created = Store.createPatient(data);
      Utils.toast('Patient created', 'success');
      // Navigate to the patient detail page for full profile editing
      App.navigate('/patients/' + created.id);
    };
  }

  function bindListEvents(container) {
    // Search
    var searchInput = document.getElementById('patient-search');
    var searchTimeout;
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(function() {
          state.search = searchInput.value;
          state.page = 1;
          renderList(container);
        }, 300);
      });
    }

    // Filters
    var genderFilter = document.getElementById('patient-gender-filter');
    if (genderFilter) {
      genderFilter.addEventListener('change', function() {
        state.genderFilter = this.value;
        state.page = 1;
        renderList(container);
      });
    }
    var tagFilter = document.getElementById('patient-tag-filter');
    if (tagFilter) {
      tagFilter.addEventListener('change', function() {
        state.tagFilter = this.value;
        state.page = 1;
        renderList(container);
      });
    }

    // Remove old click handler to prevent duplicates
    if (_clickHandler) container.removeEventListener('click', _clickHandler);

    // Pagination & button click handler
    _clickHandler = function(e) {
      var pageBtn = e.target.closest('.page-btn');
      if (pageBtn && !pageBtn.disabled) {
        state.page = parseInt(pageBtn.getAttribute('data-page'), 10);
        renderList(container);
        return;
      }

      // Add patient
      if (e.target.closest('#add-patient-btn')) {
        state.subView = 'form'; state.editId = null;
        renderView(container);
        return;
      }

      // View patient detail
      var viewBtn = e.target.closest('.view-patient-btn');
      if (viewBtn) {
        e.stopPropagation();
        App.navigate('/patients/' + viewBtn.getAttribute('data-id'));
        return;
      }

      // Delete patient
      var deleteBtn = e.target.closest('.delete-patient-btn');
      if (deleteBtn) {
        e.stopPropagation();
        var delId = deleteBtn.getAttribute('data-id');
        var patient = Store.getPatient(delId);
        Utils.inlineConfirm(container, 'Delete ' + patient.name + '? All their records will be removed.', function() {
          Store.deletePatient(delId);
          Utils.toast('Patient deleted', 'success');
          renderList(container);
        }, { danger: true });
        return;
      }

      // Row click -> detail
      var row = e.target.closest('tr[data-patient-id]');
      if (row) {
        App.navigate('/patients/' + row.getAttribute('data-patient-id'));
      }
    };
    container.addEventListener('click', _clickHandler);
  }

  function phoneField(label, phoneName, codeName, phoneVal, codeVal) {
    var defaultCode = Utils.getPhoneCode();
    var maxDigits = Utils.getPhoneDigits();
    codeVal = codeVal || defaultCode;
    var html = '<div class="form-group"><label>' + label + '</label>';
    html += '<div class="phone-input-wrap">';
    html += '<input type="text" name="' + codeName + '" class="phone-code-input" value="' + Utils.escapeHtml(codeVal) + '" maxlength="5" placeholder="' + Utils.escapeHtml(defaultCode) + '">';
    html += '<input type="tel" name="' + phoneName + '" class="phone-number-input" value="' + Utils.escapeHtml(phoneVal || '') + '" maxlength="' + maxDigits + '" placeholder="Phone number (' + maxDigits + ' digits)" required>';
    html += '</div></div>';
    return html;
  }

  function formField(label, name, type, value, required) {
    return '<div class="form-group"><label>' + label + '</label>' +
      '<input type="' + type + '" name="' + name + '" value="' + Utils.escapeHtml(value || '') + '"' +
      (required ? ' required' : '') + '></div>';
  }

  return { render: render };
})();
