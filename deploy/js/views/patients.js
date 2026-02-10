/* ============================================
   Patients List View
   ============================================ */
window.PatientsView = (function() {

  var _clickHandler = null;

  var state = {
    search: '',
    statusFilter: '',
    genderFilter: '',
    tagFilter: '',
    page: 1,
    perPage: 10
  };

  function render(container) {
    state.search = '';
    state.statusFilter = '';
    state.genderFilter = '';
    state.tagFilter = '';
    state.page = 1;
    renderList(container);
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
            (p.email || '').toLowerCase().indexOf(q) === -1 &&
            (p.diagnosis || '').toLowerCase().indexOf(q) === -1) continue;
      }
      if (state.statusFilter && p.status !== state.statusFilter) continue;
      if (state.genderFilter && p.gender !== state.genderFilter) continue;
      if (state.tagFilter && (!p.tags || p.tags.indexOf(state.tagFilter) === -1)) continue;
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
    html += '<select class="filter-select" id="patient-status-filter">';
    html += '<option value="">All Status</option>';
    html += '<option value="active"' + (state.statusFilter === 'active' ? ' selected' : '') + '>Active</option>';
    html += '<option value="completed"' + (state.statusFilter === 'completed' ? ' selected' : '') + '>Completed</option>';
    html += '</select>';
    html += '<select class="filter-select" id="patient-gender-filter">';
    html += '<option value="">All Gender</option>';
    html += '<option value="male"' + (state.genderFilter === 'male' ? ' selected' : '') + '>Male</option>';
    html += '<option value="female"' + (state.genderFilter === 'female' ? ' selected' : '') + '>Female</option>';
    html += '</select>';
    var allTags = Store.getTags();
    html += '<select class="filter-select" id="patient-tag-filter">';
    html += '<option value="">All Tags</option>';
    for (var t = 0; t < allTags.length; t++) {
      html += '<option value="' + allTags[t].id + '"' + (state.tagFilter === allTags[t].id ? ' selected' : '') + '>' + Utils.escapeHtml(allTags[t].name) + '</option>';
    }
    html += '</select>';
    html += '<button class="btn btn-primary" id="add-patient-btn">';
    html += '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
    html += 'Add Patient</button>';
    html += '</div>';

    // Table
    html += '<div class="card"><div class="table-wrapper">';
    html += '<table class="data-table"><thead><tr>';
    html += '<th>Patient</th><th>Contact</th><th>Diagnosis</th><th>Tags</th><th>Status</th><th>Actions</th>';
    html += '</tr></thead><tbody>';

    if (pageItems.length === 0) {
      html += '<tr class="no-hover"><td colspan="6"><div class="empty-state"><p>No patients found</p></div></td></tr>';
    } else {
      for (var j = 0; j < pageItems.length; j++) {
        var pt = pageItems[j];
        var statusCls = pt.status === 'active' ? 'badge-success' : 'badge-gray';
        html += '<tr data-patient-id="' + pt.id + '">';
        html += '<td><div style="display:flex;align-items:center;gap:0.6rem;">';
        html += '<div class="patient-avatar" style="width:32px;height:32px;font-size:0.75rem;">' + Utils.getInitials(pt.name) + '</div>';
        html += '<div><div style="font-weight:600;color:var(--gray-800);">' + Utils.escapeHtml(pt.name) + '</div>';
        html += '<div style="font-size:0.75rem;color:var(--gray-500);">' + Utils.escapeHtml(pt.gender || '') + ' &middot; ' + Utils.calculateAge(pt.dob) + ' yrs</div>';
        html += '</div></div></td>';
        html += '<td><div style="font-size:0.82rem;">' + Utils.escapeHtml((pt.phoneCode || Utils.getPhoneCode()) + ' ' + (pt.phone || '-')) + '</div>';
        html += '<div style="font-size:0.75rem;color:var(--gray-500);">' + Utils.escapeHtml(pt.email || '') + '</div></td>';
        html += '<td style="max-width:200px;"><div style="font-size:0.82rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + Utils.escapeHtml(pt.diagnosis || '-') + '</div></td>';
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
        html += '<td><span class="badge ' + statusCls + '">' + (pt.status || 'active') + '</span></td>';
        html += '<td><div class="btn-group">';
        html += '<button class="btn btn-sm btn-ghost edit-patient-btn" data-id="' + pt.id + '" title="Edit">Edit</button>';
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
    bindEvents(container);
  }

  function bindEvents(container) {
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
    var statusFilter = document.getElementById('patient-status-filter');
    if (statusFilter) {
      statusFilter.addEventListener('change', function() {
        state.statusFilter = this.value;
        state.page = 1;
        renderList(container);
      });
    }
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
        showPatientForm(null, container);
        return;
      }

      // Edit patient
      var editBtn = e.target.closest('.edit-patient-btn');
      if (editBtn) {
        e.stopPropagation();
        var pid = editBtn.getAttribute('data-id');
        showPatientForm(pid, container);
        return;
      }

      // Delete patient
      var deleteBtn = e.target.closest('.delete-patient-btn');
      if (deleteBtn) {
        e.stopPropagation();
        var delId = deleteBtn.getAttribute('data-id');
        var patient = Store.getPatient(delId);
        Utils.confirm('Are you sure you want to delete ' + patient.name + '? This will also remove all their appointments, sessions, exercises, and billing records.', function() {
          Store.deletePatient(delId);
          Utils.toast('Patient deleted', 'success');
          renderList(container);
        });
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

  function showPatientForm(patientId, container) {
    var patient = patientId ? Store.getPatient(patientId) : null;
    var title = patient ? 'Edit Patient' : 'New Patient';

    var body = '<form id="patient-form">';
    body += '<div class="form-row">';
    body += formField('Full Name', 'name', 'text', patient ? patient.name : '', true);
    body += formField('Date of Birth', 'dob', 'date', patient ? patient.dob : '', true);
    body += '</div>';
    body += '<div class="form-row">';
    body += '<div class="form-group"><label>Gender</label>';
    body += '<select name="gender" required>';
    body += '<option value="">Select...</option>';
    body += '<option value="male"' + (patient && patient.gender === 'male' ? ' selected' : '') + '>Male</option>';
    body += '<option value="female"' + (patient && patient.gender === 'female' ? ' selected' : '') + '>Female</option>';
    body += '<option value="other"' + (patient && patient.gender === 'other' ? ' selected' : '') + '>Other</option>';
    body += '</select></div>';
    body += '<div class="form-group"><label>Status</label>';
    body += '<select name="status">';
    body += '<option value="active"' + (patient && patient.status === 'active' ? ' selected' : '') + '>Active</option>';
    body += '<option value="completed"' + (patient && patient.status === 'completed' ? ' selected' : '') + '>Completed</option>';
    body += '</select></div>';
    body += '</div>';
    body += '<div class="form-row">';
    body += phoneField('Phone', 'phone', 'phoneCode', patient ? patient.phone : '', patient ? patient.phoneCode : '');
    body += formField('Email', 'email', 'email', patient ? patient.email : '');
    body += '</div>';
    body += formField('Address', 'address', 'text', patient ? patient.address : '');
    body += formField('Insurance', 'insurance', 'text', patient ? patient.insurance : '');
    body += '<div class="form-group"><label>Diagnosis ' + Utils.micHtml('pf-diagnosis') + '</label>';
    body += '<textarea id="pf-diagnosis" name="diagnosis" rows="2">' + Utils.escapeHtml(patient ? patient.diagnosis || '' : '') + '</textarea></div>';
    body += '<div class="form-group"><label>Treatment Plan ' + Utils.micHtml('pf-treatplan') + '</label>';
    body += '<textarea id="pf-treatplan" name="treatmentPlan" rows="3">' + Utils.escapeHtml(patient ? patient.treatmentPlan || '' : '') + '</textarea></div>';
    body += '<div class="form-row">';
    body += formField('Emergency Contact', 'emergencyContact', 'text', patient ? patient.emergencyContact : '');
    body += phoneField('Emergency Phone', 'emergencyPhone', 'emergencyPhoneCode', patient ? patient.emergencyPhone : '', patient ? patient.emergencyPhoneCode : '');
    body += '</div>';
    body += '<div class="form-group"><label>Notes ' + Utils.micHtml('pf-notes') + '</label>';
    body += '<textarea id="pf-notes" name="notes" rows="2">' + Utils.escapeHtml(patient ? patient.notes || '' : '') + '</textarea></div>';
    // Body diagram
    body += '<div class="form-group"><label>Affected Body Areas</label>';
    body += '<div class="body-diagram-wrap"><div id="pf-body-diagram"></div></div></div>';
    // Tag pill buttons
    var formTags = Store.getTags();
    var patientTags = (patient && patient.tags) ? patient.tags : [];
    body += '<div class="form-group"><label>Tags</label>';
    body += '<div class="tag-pill-group">';
    for (var ti = 0; ti < formTags.length; ti++) {
      var isChecked = patientTags.indexOf(formTags[ti].id) !== -1;
      var tagColor = formTags[ti].color || '#6b7280';
      body += '<button type="button" class="tag-pill' + (isChecked ? ' active' : '') + '" data-tag-id="' + formTags[ti].id + '" data-color="' + tagColor + '"' + (isChecked ? ' style="background:' + tagColor + ';color:#fff;border-color:' + tagColor + ';"' : '') + '>';
      body += '<span class="tag-pill-dot" style="background:' + tagColor + ';"></span>';
      body += Utils.escapeHtml(formTags[ti].name);
      body += '</button>';
    }
    body += '</div></div>';
    body += '</form>';

    var footer = '<button class="btn btn-secondary" id="modal-cancel">Cancel</button>';
    footer += '<button class="btn btn-primary" id="modal-save">Save Patient</button>';

    Utils.showModal(title, body, footer, { large: true });

    // Bind mic buttons
    Utils.bindMicButtons(document.getElementById('modal-body'));

    // Tag pill toggle
    var tagPills = document.querySelectorAll('.tag-pill');
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

    // Render body diagram
    var _bodyRegions = (patient && patient.bodyRegions) ? patient.bodyRegions.slice() : [];
    BodyDiagram.render('pf-body-diagram', _bodyRegions);

    // Enforce digits-only on phone inputs, limit adjusts per country code
    var phoneWraps = document.querySelectorAll('.phone-input-wrap');
    for (var pi = 0; pi < phoneWraps.length; pi++) {
      (function(wrap) {
        var codeInput = wrap.querySelector('.phone-code-input');
        var numInput = wrap.querySelector('.phone-number-input');
        if (!codeInput || !numInput) return;

        function getMax() {
          return Utils.getDigitsByPhoneCode(codeInput.value);
        }

        // When country code changes, update maxlength and trim if needed
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

    document.getElementById('modal-cancel').onclick = Utils.closeModal;
    document.getElementById('modal-save').onclick = function() {
      var form = document.getElementById('patient-form');
      var nameInput = form.querySelector('[name="name"]');
      if (!nameInput.value.trim()) {
        Utils.toast('Name is required', 'error');
        return;
      }
      var data = Utils.getFormData(form);
      // Collect tags from pill buttons
      var tagPills = form.querySelectorAll('.tag-pill.active');
      data.tags = [];
      for (var tc = 0; tc < tagPills.length; tc++) {
        data.tags.push(tagPills[tc].getAttribute('data-tag-id'));
      }
      // Collect body diagram selections
      data.bodyRegions = BodyDiagram.getSelected('pf-body-diagram');
      if (patient) {
        Store.updatePatient(patient.id, data);
        Utils.toast('Patient updated', 'success');
      } else {
        Store.createPatient(data);
        Utils.toast('Patient created', 'success');
      }
      Utils.closeModal();
      renderList(container);
    };
  }

  function phoneField(label, phoneName, codeName, phoneVal, codeVal) {
    var defaultCode = Utils.getPhoneCode();
    var maxDigits = Utils.getPhoneDigits();
    codeVal = codeVal || defaultCode;
    var html = '<div class="form-group"><label>' + label + '</label>';
    html += '<div class="phone-input-wrap">';
    html += '<input type="text" name="' + codeName + '" class="phone-code-input" value="' + Utils.escapeHtml(codeVal) + '" maxlength="5" placeholder="' + Utils.escapeHtml(defaultCode) + '">';
    html += '<input type="tel" name="' + phoneName + '" class="phone-number-input" value="' + Utils.escapeHtml(phoneVal || '') + '" maxlength="' + maxDigits + '" placeholder="Phone number (' + maxDigits + ' digits)">';
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
