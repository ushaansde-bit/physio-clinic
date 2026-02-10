/* ============================================
   Settings View - Clinic Administration
   ============================================ */
window.SettingsView = (function() {

  var _clickHandler = null;

  var state = {
    tab: 'staff'
  };

  // All navigable pages in the app
  var ALL_PAGES = [
    { key: 'dashboard', label: 'Dashboard', alwaysOn: true },
    { key: 'patients', label: 'Patients' },
    { key: 'appointments', label: 'Appointments' },
    { key: 'billing', label: 'Billing', feature: 'billing' },
    { key: 'messaging', label: 'Messaging', feature: 'messaging' },
    { key: 'settings', label: 'Settings', adminOnly: true }
  ];

  // Built-in role definitions
  var BUILTIN_ROLES = [
    { value: 'admin', label: 'Admin', badge: 'badge-info', description: 'Full access - manage staff, settings, all features', defaultPages: ['dashboard','patients','appointments','billing','messaging','settings'], builtin: true },
    { value: 'physiotherapist', label: 'Physiotherapist', badge: 'badge-primary', description: 'Patients, sessions, exercises, prescriptions', defaultPages: ['dashboard','patients','appointments'], builtin: true },
    { value: 'receptionist', label: 'Receptionist', badge: 'badge-success', description: 'Appointments, billing, patient registration', defaultPages: ['dashboard','patients','appointments','billing'], builtin: true }
  ];

  // Keep ROLES reference for backward compat within this file
  var ROLES = BUILTIN_ROLES;

  function getCustomRoles() {
    var settings = Store.getClinicSettings();
    return settings.customRoles || [];
  }

  function saveCustomRoles(roles) {
    var settings = Store.getClinicSettings();
    settings.customRoles = roles;
    Store.saveClinicSettings(settings);
  }

  function getAllRoles() {
    return BUILTIN_ROLES.concat(getCustomRoles());
  }

  function getDefaultPagesForRole(roleValue) {
    var all = getAllRoles();
    for (var i = 0; i < all.length; i++) {
      if (all[i].value === roleValue) return (all[i].defaultPages || []).slice();
    }
    return ['dashboard'];
  }

  function buildPageCheckboxes(selectedPages, role) {
    if (role === 'admin') {
      return '<p style="font-size:0.85em;color:var(--text-muted);margin:0;">Admins have access to all pages.</p>';
    }
    var html = '<div class="page-checkboxes" style="display:flex;flex-wrap:wrap;gap:6px 16px;">';
    for (var i = 0; i < ALL_PAGES.length; i++) {
      var p = ALL_PAGES[i];
      // Hide admin-only pages for non-admin roles
      if (p.adminOnly) continue;
      // Hide feature-gated pages if feature is off
      if (p.feature && !Store.isFeatureEnabled(p.feature)) continue;
      var checked = selectedPages.indexOf(p.key) !== -1 || p.alwaysOn;
      var disabled = p.alwaysOn;
      html += '<label style="display:flex;align-items:center;gap:4px;font-size:0.9em;cursor:' + (disabled ? 'default' : 'pointer') + ';">';
      html += '<input type="checkbox" class="page-access-cb" data-page="' + p.key + '"' + (checked ? ' checked' : '') + (disabled ? ' disabled' : '') + '>';
      html += Utils.escapeHtml(p.label);
      html += '</label>';
    }
    html += '</div>';
    return html;
  }

  function getCheckedPages() {
    var pages = [];
    var cbs = document.querySelectorAll('.page-access-cb');
    for (var i = 0; i < cbs.length; i++) {
      if (cbs[i].checked) pages.push(cbs[i].getAttribute('data-page'));
    }
    // Always include dashboard
    if (pages.indexOf('dashboard') === -1) pages.unshift('dashboard');
    return pages;
  }

  function getRoleLabel(roleValue) {
    var all = getAllRoles();
    for (var i = 0; i < all.length; i++) {
      if (all[i].value === roleValue) return all[i].label;
    }
    if (roleValue === 'staff') return 'Staff';
    return roleValue || 'Staff';
  }

  function getRoleBadge(roleValue) {
    var all = getAllRoles();
    for (var i = 0; i < all.length; i++) {
      if (all[i].value === roleValue) return all[i].badge;
    }
    return 'badge-success';
  }

  function render(container) {
    // Admin-only access check
    var user = App.getCurrentUser();
    if (!user || user.role !== 'admin') {
      container.innerHTML = '<div class="card"><div class="card-body">' +
        '<div class="empty-state">' +
        '<h3>Access Denied</h3>' +
        '<p>You do not have permission to access this page. Only administrators can manage settings.</p>' +
        '</div></div></div>';
      return;
    }

    state.tab = 'staff';
    renderView(container);
  }

  function renderView(container) {
    var html = '';

    // Tabs
    html += '<div class="tabs">';
    html += '<button class="tab-btn' + (state.tab === 'staff' ? ' active' : '') + '" data-tab="staff">Staff Management</button>';
    html += '<button class="tab-btn' + (state.tab === 'roles' ? ' active' : '') + '" data-tab="roles">Roles</button>';
    html += '<button class="tab-btn' + (state.tab === 'features' ? ' active' : '') + '" data-tab="features">Feature Toggles</button>';
    html += '<button class="tab-btn' + (state.tab === 'clinic' ? ' active' : '') + '" data-tab="clinic">Clinic Info</button>';
    html += '</div>';

    if (state.tab === 'staff') {
      html += renderStaff();
    } else if (state.tab === 'roles') {
      html += renderRoles();
    } else if (state.tab === 'features') {
      html += renderFeatures();
    } else if (state.tab === 'clinic') {
      html += renderClinicInfo();
    }

    container.innerHTML = html;
    bindEvents(container);
  }

  // ==================== STAFF MANAGEMENT ====================
  function renderStaff() {
    var users = Store.getUsers();
    var currentUser = App.getCurrentUser();
    var html = '';

    html += '<div class="card">';
    html += '<div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">';
    html += '<h3 style="margin:0;">Staff Members</h3>';
    html += '<button class="btn btn-primary" id="add-staff-btn">';
    html += '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
    html += ' Add Staff</button>';
    html += '</div>';
    html += '<div class="card-body"><div class="table-wrapper">';
    html += '<table class="data-table"><thead><tr>';
    html += '<th>Name</th><th>Username</th><th>Role</th><th>Phone</th><th>Email</th><th>Actions</th>';
    html += '</tr></thead><tbody>';

    if (users.length === 0) {
      html += '<tr class="no-hover"><td colspan="6"><div class="empty-state"><p>No staff members found</p></div></td></tr>';
    } else {
      for (var i = 0; i < users.length; i++) {
        var u = users[i];
        var roleBadge = getRoleBadge(u.role);
        var roleLabel = getRoleLabel(u.role);
        var isSelf = currentUser && u.id === currentUser.id;

        var pagesDisplay = '';
        if (u.role === 'admin') {
          pagesDisplay = '<span style="color:var(--text-muted);font-size:0.8em;">All pages</span>';
        } else if (u.allowedPages && u.allowedPages.length) {
          pagesDisplay = '<span style="color:var(--text-muted);font-size:0.8em;">' + u.allowedPages.join(', ') + '</span>';
        } else {
          pagesDisplay = '<span style="color:var(--text-muted);font-size:0.8em;">All pages</span>';
        }

        html += '<tr class="no-hover">';
        html += '<td style="font-weight:500;">' + Utils.escapeHtml(u.name) + (isSelf ? ' <span style="color:var(--text-muted);font-weight:400;">(you)</span>' : '') + '</td>';
        html += '<td>' + Utils.escapeHtml(u.username) + '</td>';
        html += '<td><span class="badge ' + roleBadge + '">' + Utils.escapeHtml(roleLabel) + '</span><br>' + pagesDisplay + '</td>';
        html += '<td>' + Utils.escapeHtml(u.phone || '-') + '</td>';
        html += '<td>' + Utils.escapeHtml(u.email || '-') + '</td>';
        html += '<td style="white-space:nowrap;">';
        html += '<button class="btn btn-sm btn-secondary edit-staff-btn" data-id="' + u.id + '" style="margin-right:4px;">Edit</button>';
        if (!isSelf) {
          html += '<button class="btn btn-sm btn-danger delete-staff-btn" data-id="' + u.id + '" data-name="' + Utils.escapeHtml(u.name) + '">Delete</button>';
        }
        html += '</td>';
        html += '</tr>';
      }
    }

    html += '</tbody></table></div></div></div>';

    // Role guide
    var allRolesGuide = getAllRoles();
    html += '<div class="card" style="margin-top:16px;">';
    html += '<div class="card-header"><h3 style="margin:0;">Role Guide</h3></div>';
    html += '<div class="card-body">';
    for (var r = 0; r < allRolesGuide.length; r++) {
      var rg = allRolesGuide[r];
      var defPages = (rg.defaultPages || []).join(', ') || 'dashboard';
      html += '<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;' + (r < allRolesGuide.length - 1 ? 'border-bottom:1px solid var(--border-color);' : '') + '">';
      html += '<span class="badge ' + rg.badge + '" style="min-width:110px;text-align:center;flex-shrink:0;">' + Utils.escapeHtml(rg.label) + '</span>';
      html += '<div>';
      html += '<div style="font-size:0.85em;color:var(--text-muted);">' + Utils.escapeHtml(rg.description) + '</div>';
      html += '<div style="font-size:0.8em;color:var(--text-muted);margin-top:2px;">Default pages: ' + Utils.escapeHtml(defPages) + '</div>';
      html += '</div>';
      html += '</div>';
    }
    html += '</div></div>';

    return html;
  }

  // ==================== ROLES TAB ====================
  function renderRoles() {
    var html = '';
    var custom = getCustomRoles();

    // Built-in roles
    html += '<div class="card">';
    html += '<div class="card-header"><h3 style="margin:0;">Built-in Roles</h3></div>';
    html += '<div class="card-body">';
    html += '<p style="color:var(--text-muted);font-size:0.85em;margin-bottom:12px;">These roles cannot be edited or deleted.</p>';
    for (var i = 0; i < BUILTIN_ROLES.length; i++) {
      var br = BUILTIN_ROLES[i];
      html += '<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;' + (i < BUILTIN_ROLES.length - 1 ? 'border-bottom:1px solid var(--border-color);' : '') + '">';
      html += '<span class="badge ' + br.badge + '" style="min-width:110px;text-align:center;flex-shrink:0;">' + Utils.escapeHtml(br.label) + '</span>';
      html += '<div>';
      html += '<div style="font-size:0.85em;">' + Utils.escapeHtml(br.description) + '</div>';
      html += '<div style="font-size:0.8em;color:var(--text-muted);margin-top:2px;">Default pages: ' + br.defaultPages.join(', ') + '</div>';
      html += '</div>';
      html += '</div>';
    }
    html += '</div></div>';

    // Custom roles
    html += '<div class="card" style="margin-top:16px;">';
    html += '<div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">';
    html += '<h3 style="margin:0;">Custom Roles</h3>';
    html += '<button class="btn btn-primary" id="add-role-btn">';
    html += '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
    html += ' Add Custom Role</button>';
    html += '</div>';
    html += '<div class="card-body">';

    if (custom.length === 0) {
      html += '<div class="empty-state"><p>No custom roles defined. Create one to customize access for your team.</p></div>';
    } else {
      for (var c = 0; c < custom.length; c++) {
        var cr = custom[c];
        var defPages = (cr.defaultPages || []).join(', ') || 'dashboard';
        html += '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;padding:8px 0;' + (c < custom.length - 1 ? 'border-bottom:1px solid var(--border-color);' : '') + '">';
        html += '<div style="display:flex;align-items:flex-start;gap:8px;">';
        html += '<span class="badge ' + (cr.badge || 'badge-success') + '" style="min-width:110px;text-align:center;flex-shrink:0;">' + Utils.escapeHtml(cr.label) + '</span>';
        html += '<div>';
        html += '<div style="font-size:0.85em;">' + Utils.escapeHtml(cr.description || '') + '</div>';
        html += '<div style="font-size:0.8em;color:var(--text-muted);margin-top:2px;">Default pages: ' + Utils.escapeHtml(defPages) + '</div>';
        html += '</div>';
        html += '</div>';
        html += '<div style="white-space:nowrap;flex-shrink:0;">';
        html += '<button class="btn btn-sm btn-secondary edit-role-btn" data-role="' + Utils.escapeHtml(cr.value) + '" style="margin-right:4px;">Edit</button>';
        html += '<button class="btn btn-sm btn-danger delete-role-btn" data-role="' + Utils.escapeHtml(cr.value) + '" data-label="' + Utils.escapeHtml(cr.label) + '">Delete</button>';
        html += '</div>';
        html += '</div>';
      }
    }
    html += '</div></div>';

    return html;
  }

  var BADGE_OPTIONS = [
    { value: 'badge-primary', label: 'Blue' },
    { value: 'badge-success', label: 'Green' },
    { value: 'badge-warning', label: 'Orange' },
    { value: 'badge-danger', label: 'Red' },
    { value: 'badge-info', label: 'Teal' }
  ];

  function showAddRoleModal(container) {
    var body = '<form id="add-role-form">';
    body += '<div class="form-group">';
    body += '<label>Role Name <span style="color:var(--danger);">*</span></label>';
    body += '<input type="text" name="label" required placeholder="e.g. Intern">';
    body += '</div>';
    body += '<div class="form-group">';
    body += '<label>Description</label>';
    body += '<input type="text" name="description" placeholder="e.g. Limited access for trainees">';
    body += '</div>';
    body += '<div class="form-group">';
    body += '<label>Badge Color</label>';
    body += '<select name="badge" style="width:100%;">';
    for (var b = 0; b < BADGE_OPTIONS.length; b++) {
      body += '<option value="' + BADGE_OPTIONS[b].value + '"' + (b === 0 ? ' selected' : '') + '>' + BADGE_OPTIONS[b].label + '</option>';
    }
    body += '</select>';
    body += '</div>';
    body += '<div class="form-group" id="page-access-group">';
    body += '<label>Default Page Access</label>';
    body += buildPageCheckboxes(['dashboard'], 'custom');
    body += '</div>';
    body += '</form>';

    var footer = '<button class="btn btn-secondary" id="modal-cancel">Cancel</button>';
    footer += '<button class="btn btn-primary" id="modal-save">Add Role</button>';

    Utils.showModal('Add Custom Role', body, footer);

    document.getElementById('modal-cancel').onclick = Utils.closeModal;
    document.getElementById('modal-save').onclick = function() {
      var form = document.getElementById('add-role-form');
      var data = Utils.getFormData(form);
      if (!data.label) {
        Utils.toast('Role name is required', 'error');
        return;
      }
      // Generate a slug value from the label
      var value = data.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      if (!value) {
        Utils.toast('Invalid role name', 'error');
        return;
      }
      // Check for duplicates
      var all = getAllRoles();
      for (var i = 0; i < all.length; i++) {
        if (all[i].value === value) {
          Utils.toast('A role with this name already exists', 'error');
          return;
        }
      }
      var pages = getCheckedPages();
      var custom = getCustomRoles();
      custom.push({
        value: value,
        label: data.label,
        description: data.description || '',
        badge: data.badge || 'badge-primary',
        defaultPages: pages,
        builtin: false
      });
      saveCustomRoles(custom);
      Utils.toast('Custom role "' + data.label + '" created', 'success');
      Utils.closeModal();
      renderView(container);
    };
  }

  function showEditRoleModal(container, roleValue) {
    var custom = getCustomRoles();
    var role = null;
    var roleIdx = -1;
    for (var i = 0; i < custom.length; i++) {
      if (custom[i].value === roleValue) { role = custom[i]; roleIdx = i; break; }
    }
    if (!role) { Utils.toast('Role not found', 'error'); return; }

    var body = '<form id="edit-role-form">';
    body += '<div class="form-group">';
    body += '<label>Role Name <span style="color:var(--danger);">*</span></label>';
    body += '<input type="text" name="label" required value="' + Utils.escapeHtml(role.label) + '">';
    body += '</div>';
    body += '<div class="form-group">';
    body += '<label>Description</label>';
    body += '<input type="text" name="description" value="' + Utils.escapeHtml(role.description || '') + '">';
    body += '</div>';
    body += '<div class="form-group">';
    body += '<label>Badge Color</label>';
    body += '<select name="badge" style="width:100%;">';
    for (var b = 0; b < BADGE_OPTIONS.length; b++) {
      body += '<option value="' + BADGE_OPTIONS[b].value + '"' + (role.badge === BADGE_OPTIONS[b].value ? ' selected' : '') + '>' + BADGE_OPTIONS[b].label + '</option>';
    }
    body += '</select>';
    body += '</div>';
    body += '<div class="form-group" id="page-access-group">';
    body += '<label>Default Page Access</label>';
    body += buildPageCheckboxes(role.defaultPages || ['dashboard'], 'custom');
    body += '</div>';
    body += '</form>';

    var footer = '<button class="btn btn-secondary" id="modal-cancel">Cancel</button>';
    footer += '<button class="btn btn-primary" id="modal-save">Save Changes</button>';

    Utils.showModal('Edit Role — ' + Utils.escapeHtml(role.label), body, footer);

    document.getElementById('modal-cancel').onclick = Utils.closeModal;
    document.getElementById('modal-save').onclick = function() {
      var form = document.getElementById('edit-role-form');
      var data = Utils.getFormData(form);
      if (!data.label) {
        Utils.toast('Role name is required', 'error');
        return;
      }
      var pages = getCheckedPages();
      custom[roleIdx].label = data.label;
      custom[roleIdx].description = data.description || '';
      custom[roleIdx].badge = data.badge || 'badge-primary';
      custom[roleIdx].defaultPages = pages;
      saveCustomRoles(custom);
      Utils.toast('Role updated', 'success');
      Utils.closeModal();
      renderView(container);
    };
  }

  function deleteCustomRole(container, roleValue, roleLabel) {
    // Check if any users have this role
    var users = Store.getUsers();
    var usersWithRole = [];
    for (var i = 0; i < users.length; i++) {
      if (users[i].role === roleValue) usersWithRole.push(users[i].name);
    }
    var msg = 'Delete custom role "' + roleLabel + '"?';
    if (usersWithRole.length > 0) {
      msg += '\n\nWarning: ' + usersWithRole.length + ' staff member(s) currently have this role (' + usersWithRole.join(', ') + '). They will keep the role label but it won\'t match any defined role.';
    }
    Utils.confirm(msg, function() {
      var custom = getCustomRoles();
      var filtered = [];
      for (var j = 0; j < custom.length; j++) {
        if (custom[j].value !== roleValue) filtered.push(custom[j]);
      }
      saveCustomRoles(filtered);
      Utils.toast('Role deleted', 'success');
      renderView(container);
    });
  }

  // ==================== FEATURE TOGGLES ====================
  function renderFeatures() {
    var settings = Store.getClinicSettings();
    var defaults = Store.getDefaultFeatures();
    var features = settings.features || defaults;

    // Merge defaults so new features appear even if settings.features exists
    for (var key in defaults) {
      if (defaults.hasOwnProperty(key) && !features.hasOwnProperty(key)) {
        features[key] = defaults[key];
      }
    }

    var featureList = [
      { key: 'billing', label: 'Billing', description: 'Invoice management and payment tracking' },
      { key: 'messaging', label: 'Messaging', description: 'WhatsApp messaging to patients' },
      { key: 'prescriptions', label: 'Prescriptions', description: 'Medication prescriptions management' },
      { key: 'exercises', label: 'Exercises', description: 'Exercise programs for patients' },
      { key: 'soapNotes', label: 'SOAP Notes', description: 'Session documentation with SOAP format' },
      { key: 'bodyDiagram', label: 'Body Diagram', description: 'Visual body region marking for patients' },
      { key: 'onlineBooking', label: 'Online Booking', description: 'Allow patients to book appointments online' },
      { key: 'tags', label: 'Tags', description: 'Patient categorization with tags' }
    ];

    var html = '';
    html += '<div class="card">';
    html += '<div class="card-header"><h3 style="margin:0;">Feature Toggles</h3></div>';
    html += '<div class="card-body">';
    html += '<p style="color:var(--text-muted);margin-bottom:16px;">Enable or disable features for your clinic. Changes take effect immediately.</p>';

    for (var i = 0; i < featureList.length; i++) {
      var f = featureList[i];
      var isOn = features[f.key] !== false;

      html += '<div class="settings-toggle-row" style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border-color);">';
      html += '<div>';
      html += '<div style="font-weight:500;">' + Utils.escapeHtml(f.label) + '</div>';
      html += '<div style="font-size:0.85em;color:var(--text-muted);">' + Utils.escapeHtml(f.description) + '</div>';
      html += '</div>';
      html += '<label class="toggle-switch" style="position:relative;display:inline-block;width:48px;height:26px;flex-shrink:0;margin-left:16px;">';
      html += '<input type="checkbox" class="feature-toggle" data-feature="' + f.key + '"' + (isOn ? ' checked' : '') + ' style="opacity:0;width:0;height:0;">';
      html += '<span class="toggle-slider" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background-color:' + (isOn ? 'var(--primary)' : '#ccc') + ';border-radius:26px;transition:0.3s;"></span>';
      html += '<span class="toggle-knob" style="position:absolute;content:\'\';height:20px;width:20px;left:' + (isOn ? '25px' : '3px') + ';bottom:3px;background-color:white;border-radius:50%;transition:0.3s;pointer-events:none;"></span>';
      html += '</label>';
      html += '</div>';
    }

    html += '</div></div>';
    return html;
  }

  // ==================== CLINIC INFO ====================
  function renderClinicInfo() {
    var settings = Store.getClinicSettings();
    var clinicName = settings.name || settings.clinicName || 'PhysioClinic';
    var ownerName = settings.ownerName || '-';
    var ownerEmail = settings.ownerEmail || '-';
    var ownerPhone = settings.ownerPhone || '-';
    var slug = settings.bookingSlug || '';
    var bookingUrl = slug ? (window.location.origin + window.location.pathname.replace('index.html', '') + 'book1/?c=' + slug) : '';

    var html = '';
    html += '<div class="card">';
    html += '<div class="card-header"><h3 style="margin:0;">Clinic Information</h3></div>';
    html += '<div class="card-body">';

    html += '<div class="form-group">';
    html += '<label style="font-weight:600;color:var(--text-muted);font-size:0.85em;text-transform:uppercase;">Clinic Name</label>';
    html += '<p style="font-size:1.1em;margin:4px 0 16px;">' + Utils.escapeHtml(clinicName) + '</p>';
    html += '</div>';

    html += '<div class="form-group">';
    html += '<label style="font-weight:600;color:var(--text-muted);font-size:0.85em;text-transform:uppercase;">Owner</label>';
    html += '<p style="font-size:1.1em;margin:4px 0 16px;">' + Utils.escapeHtml(ownerName) + '</p>';
    html += '</div>';

    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 24px;">';
    html += '<div class="form-group">';
    html += '<label style="font-weight:600;color:var(--text-muted);font-size:0.85em;text-transform:uppercase;">Email</label>';
    html += '<p style="font-size:1em;margin:4px 0 16px;">' + Utils.escapeHtml(ownerEmail) + '</p>';
    html += '</div>';
    html += '<div class="form-group">';
    html += '<label style="font-weight:600;color:var(--text-muted);font-size:0.85em;text-transform:uppercase;">Phone</label>';
    html += '<p style="font-size:1em;margin:4px 0 16px;">' + Utils.escapeHtml(ownerPhone) + '</p>';
    html += '</div>';
    html += '</div>';

    html += '<div class="form-group">';
    html += '<label style="font-weight:600;color:var(--text-muted);font-size:0.85em;text-transform:uppercase;">Booking Slug</label>';
    html += '<p style="font-size:1.1em;margin:4px 0 16px;">' + (slug ? Utils.escapeHtml(slug) : '<span style="color:var(--text-muted);">Not configured</span>') + '</p>';
    html += '</div>';

    html += '<div class="form-group">';
    html += '<label style="font-weight:600;color:var(--text-muted);font-size:0.85em;text-transform:uppercase;">Online Booking URL</label>';
    html += '<p style="font-size:1em;margin:4px 0 16px;">';
    if (bookingUrl) {
      html += '<code style="background:var(--bg-secondary);padding:4px 8px;border-radius:4px;font-size:0.9em;">' + Utils.escapeHtml(bookingUrl) + '</code>';
    } else {
      html += '<span style="color:var(--text-muted);">Set a booking slug to generate URL</span>';
    }
    html += '</p>';
    html += '</div>';

    html += '</div></div>';
    return html;
  }

  // ==================== EVENT BINDING ====================
  function bindEvents(container) {
    // Tab switching
    var tabBtns = container.querySelectorAll('.tab-btn');
    for (var t = 0; t < tabBtns.length; t++) {
      (function(btn) {
        btn.addEventListener('click', function() {
          state.tab = btn.getAttribute('data-tab');
          renderView(container);
        });
      })(tabBtns[t]);
    }

    // Feature toggle change events
    var toggles = container.querySelectorAll('.feature-toggle');
    for (var f = 0; f < toggles.length; f++) {
      (function(toggle) {
        toggle.addEventListener('change', function() {
          var featureKey = toggle.getAttribute('data-feature');
          var settings = Store.getClinicSettings();
          if (!settings.features) {
            settings.features = Store.getDefaultFeatures();
          }
          settings.features[featureKey] = toggle.checked;
          Store.saveClinicSettings(settings);

          // Update toggle visual state immediately
          var slider = toggle.parentNode.querySelector('.toggle-slider');
          var knob = toggle.parentNode.querySelector('.toggle-knob');
          if (slider) {
            slider.style.backgroundColor = toggle.checked ? 'var(--primary)' : '#ccc';
          }
          if (knob) {
            knob.style.left = toggle.checked ? '25px' : '3px';
          }

          var label = featureKey.replace(/([A-Z])/g, ' $1');
          label = label.charAt(0).toUpperCase() + label.slice(1);
          Utils.toast(label + (toggle.checked ? ' enabled' : ' disabled'), 'success');

          // Immediately apply feature toggles to nav if the function exists
          if (window.App && window.App.applyFeatureToggles) {
            App.applyFeatureToggles();
          }
        });
      })(toggles[f]);
    }

    // Remove old click handler to prevent duplicates
    if (_clickHandler) container.removeEventListener('click', _clickHandler);

    _clickHandler = function(e) {
      // Add Staff button
      if (e.target.closest('#add-staff-btn')) {
        showAddStaffModal(container);
        return;
      }

      // Edit Staff button
      var editBtn = e.target.closest('.edit-staff-btn');
      if (editBtn) {
        var editId = editBtn.getAttribute('data-id');
        showEditStaffModal(container, editId);
        return;
      }

      // Delete Staff button
      var deleteBtn = e.target.closest('.delete-staff-btn');
      if (deleteBtn) {
        var staffId = deleteBtn.getAttribute('data-id');
        var staffName = deleteBtn.getAttribute('data-name');
        Utils.confirm('Delete staff member "' + staffName + '"? This action cannot be undone.', function() {
          Store.remove(Store.KEYS.users, staffId);
          Store.logActivity('Staff member deleted: ' + staffName);
          Utils.toast('Staff member deleted', 'success');
          renderView(container);
        });
        return;
      }

      // Add Role button
      if (e.target.closest('#add-role-btn')) {
        showAddRoleModal(container);
        return;
      }

      // Edit Role button
      var editRoleBtn = e.target.closest('.edit-role-btn');
      if (editRoleBtn) {
        showEditRoleModal(container, editRoleBtn.getAttribute('data-role'));
        return;
      }

      // Delete Role button
      var deleteRoleBtn = e.target.closest('.delete-role-btn');
      if (deleteRoleBtn) {
        deleteCustomRole(container, deleteRoleBtn.getAttribute('data-role'), deleteRoleBtn.getAttribute('data-label'));
        return;
      }
    };
    container.addEventListener('click', _clickHandler);
  }

  // ==================== ROLE SELECT HTML ====================
  function buildRoleSelect(selectedValue) {
    var all = getAllRoles();
    var html = '<select name="role" style="width:100%;">';
    for (var i = 0; i < all.length; i++) {
      var r = all[i];
      html += '<option value="' + r.value + '"' + (selectedValue === r.value ? ' selected' : '') + '>' + Utils.escapeHtml(r.label) + ' — ' + Utils.escapeHtml(r.description) + '</option>';
    }
    html += '</select>';
    return html;
  }

  // ==================== ADD STAFF MODAL ====================
  function showAddStaffModal(container) {
    var body = '<form id="add-staff-form">';
    body += '<div class="form-group">';
    body += '<label>Full Name <span style="color:var(--danger);">*</span></label>';
    body += '<input type="text" name="name" required placeholder="e.g. Dr. Priya Sharma">';
    body += '</div>';

    body += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px;">';
    body += '<div class="form-group">';
    body += '<label>Phone</label>';
    body += '<input type="tel" name="phone" placeholder="e.g. 9876543210">';
    body += '</div>';
    body += '<div class="form-group">';
    body += '<label>Email</label>';
    body += '<input type="email" name="email" placeholder="e.g. priya@clinic.com">';
    body += '</div>';
    body += '</div>';

    body += '<div class="form-group">';
    body += '<label>Role <span style="color:var(--danger);">*</span></label>';
    body += buildRoleSelect('physiotherapist');
    body += '</div>';

    body += '<div class="form-group" id="page-access-group">';
    body += '<label>Page Access</label>';
    body += buildPageCheckboxes(getDefaultPagesForRole('physiotherapist'), 'physiotherapist');
    body += '</div>';

    body += '<hr style="border:none;border-top:1px solid var(--border-color);margin:12px 0;">';
    body += '<p style="font-size:0.85em;color:var(--text-muted);margin-bottom:12px;">Login Credentials</p>';

    body += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px;">';
    body += '<div class="form-group">';
    body += '<label>Username <span style="color:var(--danger);">*</span></label>';
    body += '<input type="text" name="username" required placeholder="Login username" autocomplete="off">';
    body += '</div>';
    body += '<div class="form-group">';
    body += '<label>Password <span style="color:var(--danger);">*</span></label>';
    body += '<input type="password" name="password" required placeholder="Login password">';
    body += '</div>';
    body += '</div>';

    body += '</form>';

    var footer = '<button class="btn btn-secondary" id="modal-cancel">Cancel</button>';
    footer += '<button class="btn btn-primary" id="modal-save">Add Staff</button>';

    Utils.showModal('Add Staff Member', body, footer);

    // Role change updates page checkboxes
    var roleSelect = document.querySelector('#add-staff-form select[name="role"]');
    if (roleSelect) {
      roleSelect.addEventListener('change', function() {
        var group = document.getElementById('page-access-group');
        if (group) {
          var role = roleSelect.value;
          group.innerHTML = '<label>Page Access</label>' + buildPageCheckboxes(getDefaultPagesForRole(role), role);
        }
      });
    }

    document.getElementById('modal-cancel').onclick = Utils.closeModal;
    document.getElementById('modal-save').onclick = function() {
      var form = document.getElementById('add-staff-form');
      var data = Utils.getFormData(form);

      if (!data.name || !data.username || !data.password) {
        Utils.toast('Please fill in all required fields', 'error');
        return;
      }

      if (data.password.length < 4) {
        Utils.toast('Password must be at least 4 characters', 'error');
        return;
      }

      // Check for duplicate username
      var existingUser = Store.getUserByUsername(data.username);
      if (existingUser) {
        Utils.toast('Username "' + data.username + '" is already taken', 'error');
        return;
      }

      var role = data.role || 'physiotherapist';
      var allowedPages = role === 'admin' ? null : getCheckedPages();

      var newUser = Store.create(Store.KEYS.users, {
        name: data.name,
        username: data.username,
        password: data.password,
        role: role,
        phone: data.phone || '',
        email: data.email || '',
        allowedPages: allowedPages
      });

      Store.logActivity('New staff member added: ' + data.name + ' (' + getRoleLabel(data.role) + ')');
      Utils.closeModal();
      renderView(container);

      // Show login credentials modal
      var clinicSlug = Store.getClinicSettings().bookingSlug || sessionStorage.getItem('physio_clinicId') || 'default';
      var credBody = '<div style="background:var(--bg-secondary);border-radius:8px;padding:16px;margin-bottom:12px;">';
      credBody += '<p style="margin:0 0 12px;color:var(--text-muted);font-size:0.85em;">Share these credentials with <strong>' + Utils.escapeHtml(data.name) + '</strong> to allow them to log in:</p>';
      credBody += '<table style="width:100%;border-collapse:collapse;">';
      credBody += '<tr><td style="padding:6px 8px;font-weight:600;width:110px;color:var(--text-muted);">Clinic Code</td><td style="padding:6px 8px;font-size:1.05em;"><code style="background:var(--bg-primary);padding:2px 8px;border-radius:4px;">' + Utils.escapeHtml(clinicSlug) + '</code></td></tr>';
      credBody += '<tr><td style="padding:6px 8px;font-weight:600;color:var(--text-muted);">Username</td><td style="padding:6px 8px;font-size:1.05em;"><code style="background:var(--bg-primary);padding:2px 8px;border-radius:4px;">' + Utils.escapeHtml(data.username) + '</code></td></tr>';
      credBody += '<tr><td style="padding:6px 8px;font-weight:600;color:var(--text-muted);">Password</td><td style="padding:6px 8px;font-size:1.05em;"><code style="background:var(--bg-primary);padding:2px 8px;border-radius:4px;">' + Utils.escapeHtml(data.password) + '</code></td></tr>';
      credBody += '<tr><td style="padding:6px 8px;font-weight:600;color:var(--text-muted);">Role</td><td style="padding:6px 8px;"><span class="badge ' + getRoleBadge(data.role) + '">' + Utils.escapeHtml(getRoleLabel(data.role)) + '</span></td></tr>';
      credBody += '</table></div>';
      credBody += '<p style="font-size:0.85em;color:var(--text-muted);margin:0;">This is the only time the password is shown. If forgotten, reset it from the staff edit page.</p>';

      var credFooter = '<button class="btn btn-primary" id="cred-done-btn">Done</button>';
      Utils.showModal('Staff Login Credentials', credBody, credFooter);
      document.getElementById('cred-done-btn').onclick = Utils.closeModal;
    };
  }

  // ==================== EDIT STAFF MODAL ====================
  function showEditStaffModal(container, userId) {
    var user = null;
    var users = Store.getUsers();
    for (var i = 0; i < users.length; i++) {
      if (users[i].id === userId) { user = users[i]; break; }
    }
    if (!user) { Utils.toast('Staff member not found', 'error'); return; }

    var currentUser = App.getCurrentUser();
    var isSelf = currentUser && user.id === currentUser.id;

    var body = '<form id="edit-staff-form">';
    body += '<div class="form-group">';
    body += '<label>Full Name <span style="color:var(--danger);">*</span></label>';
    body += '<input type="text" name="name" required value="' + Utils.escapeHtml(user.name || '') + '">';
    body += '</div>';

    body += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px;">';
    body += '<div class="form-group">';
    body += '<label>Phone</label>';
    body += '<input type="tel" name="phone" value="' + Utils.escapeHtml(user.phone || '') + '" placeholder="e.g. 9876543210">';
    body += '</div>';
    body += '<div class="form-group">';
    body += '<label>Email</label>';
    body += '<input type="email" name="email" value="' + Utils.escapeHtml(user.email || '') + '" placeholder="e.g. priya@clinic.com">';
    body += '</div>';
    body += '</div>';

    body += '<div class="form-group">';
    body += '<label>Role' + (isSelf ? ' <span style="color:var(--text-muted);font-weight:400;">(cannot change own role)</span>' : '') + '</label>';
    if (isSelf) {
      body += '<input type="text" value="' + Utils.escapeHtml(getRoleLabel(user.role)) + '" disabled>';
      body += '<input type="hidden" name="role" value="' + Utils.escapeHtml(user.role) + '">';
    } else {
      body += buildRoleSelect(user.role);
    }
    body += '</div>';

    var editPages = user.allowedPages || getDefaultPagesForRole(user.role);
    body += '<div class="form-group" id="page-access-group">';
    body += '<label>Page Access' + (isSelf ? ' <span style="color:var(--text-muted);font-weight:400;">(cannot change own access)</span>' : '') + '</label>';
    body += buildPageCheckboxes(editPages, user.role);
    body += '</div>';

    body += '<hr style="border:none;border-top:1px solid var(--border-color);margin:12px 0;">';
    body += '<p style="font-size:0.85em;color:var(--text-muted);margin-bottom:12px;">Login Credentials</p>';

    body += '<div class="form-group">';
    body += '<label>Username</label>';
    body += '<input type="text" name="username" value="' + Utils.escapeHtml(user.username || '') + '" disabled style="background:var(--bg-secondary);">';
    body += '<small style="color:var(--text-muted);">Username cannot be changed</small>';
    body += '</div>';

    body += '<div class="form-group">';
    body += '<label>New Password <span style="color:var(--text-muted);font-weight:400;">(leave blank to keep current)</span></label>';
    body += '<input type="password" name="newPassword" placeholder="Enter new password to change">';
    body += '</div>';

    body += '</form>';

    var footer = '<button class="btn btn-secondary" id="modal-cancel">Cancel</button>';
    footer += '<button class="btn btn-primary" id="modal-save">Save Changes</button>';

    Utils.showModal('Edit Staff — ' + Utils.escapeHtml(user.name), body, footer);

    // Disable page checkboxes when editing self
    if (isSelf) {
      var selfCbs = document.querySelectorAll('.page-access-cb');
      for (var s = 0; s < selfCbs.length; s++) selfCbs[s].disabled = true;
    }

    // Role change updates page checkboxes (only for non-self)
    if (!isSelf) {
      var editRoleSelect = document.querySelector('#edit-staff-form select[name="role"]');
      if (editRoleSelect) {
        editRoleSelect.addEventListener('change', function() {
          var group = document.getElementById('page-access-group');
          if (group) {
            var role = editRoleSelect.value;
            group.innerHTML = '<label>Page Access</label>' + buildPageCheckboxes(getDefaultPagesForRole(role), role);
          }
        });
      }
    }

    document.getElementById('modal-cancel').onclick = Utils.closeModal;
    document.getElementById('modal-save').onclick = function() {
      var form = document.getElementById('edit-staff-form');
      var data = Utils.getFormData(form);

      if (!data.name) {
        Utils.toast('Name is required', 'error');
        return;
      }

      var updatedRole = data.role || user.role;
      var allowedPages = updatedRole === 'admin' ? null : (isSelf ? user.allowedPages : getCheckedPages());

      var updates = {
        name: data.name,
        role: updatedRole,
        phone: data.phone || '',
        email: data.email || '',
        allowedPages: allowedPages
      };

      // Update password only if provided
      if (data.newPassword) {
        if (data.newPassword.length < 4) {
          Utils.toast('Password must be at least 4 characters', 'error');
          return;
        }
        updates.password = data.newPassword;
      }

      Store.update(Store.KEYS.users, userId, updates);

      // If editing self, update session
      if (isSelf) {
        var updatedUser = null;
        var allUsers = Store.getUsers();
        for (var j = 0; j < allUsers.length; j++) {
          if (allUsers[j].id === userId) { updatedUser = allUsers[j]; break; }
        }
        if (updatedUser) {
          sessionStorage.setItem('physio_session', JSON.stringify(updatedUser));
        }
      }

      Store.logActivity('Staff member updated: ' + data.name);
      Utils.toast('Staff member updated', 'success');
      Utils.closeModal();
      renderView(container);
    };
  }

  return { render: render };
})();
