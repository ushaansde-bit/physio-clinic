/* ============================================
   Settings View - Clinic Administration
   ============================================ */
window.SettingsView = (function() {

  var _clickHandler = null;

  var state = {
    tab: 'staff',
    staffSubView: 'list',
    staffEditId: null,
    roleSubView: 'list',
    roleEditValue: null
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

  // Granular billing permissions
  var BILLING_PERMISSIONS = [
    { key: 'billing_view', label: 'View Invoices' },
    { key: 'billing_viewFinancials', label: 'View Financial Summary' },
    { key: 'billing_create', label: 'Create Invoices' },
    { key: 'billing_recordPayment', label: 'Record Payments' },
    { key: 'billing_delete', label: 'Delete Invoices' }
  ];

  var ALL_BILLING_PERM_KEYS = [];
  for (var bp = 0; bp < BILLING_PERMISSIONS.length; bp++) ALL_BILLING_PERM_KEYS.push(BILLING_PERMISSIONS[bp].key);

  function getDefaultBillingPerms(role) {
    if (role === 'admin') return ALL_BILLING_PERM_KEYS.slice();
    if (role === 'receptionist') return ['billing_view', 'billing_viewFinancials', 'billing_create', 'billing_recordPayment'];
    if (role === 'physiotherapist') return ['billing_view', 'billing_create'];
    var all = getAllRoles();
    for (var i = 0; i < all.length; i++) {
      if (all[i].value === role && all[i].defaultBillingPerms) return all[i].defaultBillingPerms.slice();
    }
    return ['billing_view'];
  }

  function buildBillingPermCheckboxes(selectedPerms) {
    var html = '<div class="billing-perm-checkboxes" style="display:flex;flex-wrap:wrap;gap:6px 16px;">';
    for (var i = 0; i < BILLING_PERMISSIONS.length; i++) {
      var p = BILLING_PERMISSIONS[i];
      var checked = selectedPerms.indexOf(p.key) !== -1;
      var isView = p.key === 'billing_view';
      html += '<label style="display:flex;align-items:center;gap:4px;font-size:0.9em;cursor:' + (isView ? 'default' : 'pointer') + ';">';
      html += '<input type="checkbox" class="billing-perm-cb" data-perm="' + p.key + '"' + (checked ? ' checked' : '') + (isView ? ' checked disabled' : '') + '>';
      html += Utils.escapeHtml(p.label);
      html += '</label>';
    }
    html += '</div>';
    return html;
  }

  function getCheckedBillingPerms() {
    var perms = [];
    var cbs = document.querySelectorAll('.billing-perm-cb');
    for (var i = 0; i < cbs.length; i++) {
      if (cbs[i].checked) perms.push(cbs[i].getAttribute('data-perm'));
    }
    if (perms.indexOf('billing_view') === -1) perms.unshift('billing_view');
    return perms;
  }

  // Built-in role definitions
  var BUILTIN_ROLES = [
    { value: 'admin', label: 'Admin', badge: 'badge-info', description: 'Full access - manage staff, settings, all features', defaultPages: ['dashboard','patients','appointments','billing','messaging','settings'], defaultBillingPerms: ALL_BILLING_PERM_KEYS.slice(), builtin: true },
    { value: 'physiotherapist', label: 'Physiotherapist', badge: 'badge-primary', description: 'Patients, sessions, exercises, prescriptions', defaultPages: ['dashboard','patients','appointments'], defaultBillingPerms: ['billing_view', 'billing_create'], builtin: true },
    { value: 'receptionist', label: 'Receptionist', badge: 'badge-success', description: 'Appointments, billing, patient registration', defaultPages: ['dashboard','patients','appointments','billing'], defaultBillingPerms: ['billing_view', 'billing_viewFinancials', 'billing_create', 'billing_recordPayment'], builtin: true }
  ];

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
      if (p.adminOnly) continue;
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
    state.staffSubView = 'list';
    state.staffEditId = null;
    state.roleSubView = 'list';
    state.roleEditValue = null;
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
    html += '<button class="tab-btn' + (state.tab === 'trash' ? ' active' : '') + '" data-tab="trash">Trash</button>';
    html += '<button class="tab-btn' + (state.tab === 'backup' ? ' active' : '') + '" data-tab="backup">Backup</button>';
    html += '</div>';

    if (state.tab === 'staff') {
      html += state.staffSubView === 'form' ? renderStaffForm() : renderStaff();
    } else if (state.tab === 'roles') {
      html += state.roleSubView === 'form' ? renderRoleForm() : renderRoles();
    } else if (state.tab === 'features') {
      html += renderFeatures();
    } else if (state.tab === 'clinic') {
      html += renderClinicInfo();
    } else if (state.tab === 'trash') {
      html += renderTrash();
    } else if (state.tab === 'backup') {
      html += renderBackup();
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
    html += '<th>Name</th><th>Role</th><th>Phone</th><th>Email</th><th>Actions</th>';
    html += '</tr></thead><tbody>';

    if (users.length === 0) {
      html += '<tr class="no-hover"><td colspan="5"><div class="empty-state"><p>No staff members found</p></div></td></tr>';
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

  // ==================== STAFF FORM (INLINE) ====================
  function renderStaffForm() {
    var isEdit = !!state.staffEditId;
    var user = null;
    var currentUser = App.getCurrentUser();
    var isSelf = false;

    if (isEdit) {
      var users = Store.getUsers();
      for (var i = 0; i < users.length; i++) {
        if (users[i].id === state.staffEditId) { user = users[i]; break; }
      }
      if (!user) { state.staffSubView = 'list'; return renderStaff(); }
      isSelf = currentUser && user.id === currentUser.id;
    }

    var selectedRole = isEdit ? user.role : 'physiotherapist';
    var selectedPages = isEdit ? (user.allowedPages || getDefaultPagesForRole(user.role)) : getDefaultPagesForRole('physiotherapist');
    var selectedBillingPerms = isEdit ? (user.billingPermissions || getDefaultBillingPerms(user.role)) : getDefaultBillingPerms('physiotherapist');
    var billingVisible = selectedRole !== 'admin' && selectedPages.indexOf('billing') !== -1;

    var html = '<div class="inline-form-card">';
    html += '<div class="inline-form-header">';
    html += '<button class="back-btn" id="staff-form-back">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>';
    html += '</button>';
    html += '<h3>' + (isEdit ? 'Edit Staff \u2014 ' + Utils.escapeHtml(user.name) : 'Add Staff Member') + '</h3>';
    html += '</div>';
    html += '<div class="inline-form-body">';

    html += '<form id="staff-form">';
    html += '<div class="form-group">';
    html += '<label>Full Name <span style="color:var(--danger);">*</span></label>';
    html += '<input type="text" name="name" required placeholder="e.g. Dr. Priya Sharma" value="' + Utils.escapeHtml(isEdit ? user.name || '' : '') + '">';
    html += '</div>';

    html += '<div class="form-row">';
    html += '<div class="form-group">';
    html += '<label>Phone</label>';
    html += '<input type="tel" name="phone" placeholder="e.g. 9876543210" value="' + Utils.escapeHtml(isEdit ? user.phone || '' : '') + '">';
    html += '</div>';
    html += '<div class="form-group">';
    html += '<label>Email</label>';
    html += '<input type="email" name="email" placeholder="e.g. priya@clinic.com" value="' + Utils.escapeHtml(isEdit ? user.email || '' : '') + '">';
    html += '</div>';
    html += '</div>';

    html += '<div class="form-group">';
    html += '<label>Role' + (isSelf ? ' <span style="color:var(--text-muted);font-weight:400;">(cannot change own role)</span>' : '') + '</label>';
    if (isSelf) {
      html += '<input type="text" value="' + Utils.escapeHtml(getRoleLabel(user.role)) + '" disabled>';
      html += '<input type="hidden" name="role" value="' + Utils.escapeHtml(user.role) + '">';
    } else {
      html += buildRoleSelect(selectedRole);
    }
    html += '</div>';

    html += '<div class="form-group" id="page-access-group">';
    html += '<label>Page Access' + (isSelf ? ' <span style="color:var(--text-muted);font-weight:400;">(cannot change own access)</span>' : '') + '</label>';
    html += buildPageCheckboxes(selectedPages, selectedRole);
    html += '</div>';

    html += '<div class="form-group" id="billing-perms-group" style="' + (billingVisible ? '' : 'display:none;') + '">';
    html += '<label>Billing Permissions' + (isSelf ? ' <span style="color:var(--text-muted);font-weight:400;">(cannot change own access)</span>' : '') + '</label>';
    html += buildBillingPermCheckboxes(selectedBillingPerms);
    html += '</div>';

    html += '</form>';

    html += '</div>';
    html += '<div class="inline-form-actions">';
    html += '<button class="btn btn-secondary" id="staff-form-cancel">Cancel</button>';
    html += '<button class="btn btn-primary" id="staff-form-save">' + (isEdit ? 'Save Changes' : 'Add Staff') + '</button>';
    html += '</div>';
    html += '</div>';

    return html;
  }

  function bindStaffForm(container) {
    var isEdit = !!state.staffEditId;
    var user = null;
    var currentUser = App.getCurrentUser();
    var isSelf = false;

    if (isEdit) {
      var users = Store.getUsers();
      for (var i = 0; i < users.length; i++) {
        if (users[i].id === state.staffEditId) { user = users[i]; break; }
      }
      isSelf = currentUser && user && user.id === currentUser.id;
    }

    // Disable checkboxes for self-edit
    if (isSelf) {
      var selfCbs = document.querySelectorAll('.page-access-cb');
      for (var s = 0; s < selfCbs.length; s++) selfCbs[s].disabled = true;
      var selfBpCbs = document.querySelectorAll('.billing-perm-cb');
      for (var sb = 0; sb < selfBpCbs.length; sb++) selfBpCbs[sb].disabled = true;
    }

    function updateBillingPermsVisibility() {
      var billingCb = document.querySelector('.page-access-cb[data-page="billing"]');
      var billingGroup = document.getElementById('billing-perms-group');
      var roleVal = document.querySelector('#staff-form select[name="role"]');
      if (!billingGroup) return;
      if (roleVal && roleVal.value === 'admin') {
        billingGroup.style.display = 'none';
      } else if (billingCb && billingCb.checked) {
        billingGroup.style.display = '';
      } else {
        billingGroup.style.display = 'none';
      }
    }

    // Page access checkbox changes
    var pageGroup = document.getElementById('page-access-group');
    if (pageGroup) {
      pageGroup.addEventListener('change', function(e) {
        if (e.target.classList.contains('page-access-cb') && e.target.getAttribute('data-page') === 'billing') {
          updateBillingPermsVisibility();
        }
      });
    }

    // Role change updates page checkboxes + billing perms (only for non-self)
    if (!isSelf) {
      var roleSelect = document.querySelector('#staff-form select[name="role"]');
      if (roleSelect) {
        roleSelect.addEventListener('change', function() {
          var group = document.getElementById('page-access-group');
          var billingGroup = document.getElementById('billing-perms-group');
          var role = roleSelect.value;
          if (group) {
            var labelText = isSelf ? 'Page Access <span style="color:var(--text-muted);font-weight:400;">(cannot change own access)</span>' : 'Page Access';
            group.innerHTML = '<label>' + labelText + '</label>' + buildPageCheckboxes(getDefaultPagesForRole(role), role);
            group.addEventListener('change', function(e) {
              if (e.target.classList.contains('page-access-cb') && e.target.getAttribute('data-page') === 'billing') {
                updateBillingPermsVisibility();
              }
            });
          }
          if (billingGroup) {
            var perms = getDefaultBillingPerms(role);
            var bpLabel = isSelf ? 'Billing Permissions <span style="color:var(--text-muted);font-weight:400;">(cannot change own access)</span>' : 'Billing Permissions';
            billingGroup.innerHTML = '<label>' + bpLabel + '</label>' + buildBillingPermCheckboxes(perms);
          }
          updateBillingPermsVisibility();
        });
      }
    }

    // Back/Cancel
    var goBack = function() {
      state.staffSubView = 'list';
      state.staffEditId = null;
      renderView(container);
    };
    var backBtn = document.getElementById('staff-form-back');
    var cancelBtn = document.getElementById('staff-form-cancel');
    if (backBtn) backBtn.onclick = goBack;
    if (cancelBtn) cancelBtn.onclick = goBack;

    // Save
    var saveBtn = document.getElementById('staff-form-save');
    if (saveBtn) {
      saveBtn.onclick = function() {
        var form = document.getElementById('staff-form');
        var data = Utils.getFormData(form);

        if (!data.name) {
          Utils.toast('Name is required', 'error');
          return;
        }

        var role = data.role || (isEdit ? user.role : 'physiotherapist');
        var allowedPages = role === 'admin' ? null : (isSelf ? user.allowedPages : getCheckedPages());
        var billingPerms = role === 'admin' ? null : (isSelf ? user.billingPermissions : getCheckedBillingPerms());

        if (isEdit) {
          Store.update(Store.KEYS.users, state.staffEditId, {
            name: data.name,
            role: role,
            phone: data.phone || '',
            email: data.email || '',
            allowedPages: allowedPages,
            billingPermissions: billingPerms
          });

          // If editing self, update session
          if (isSelf) {
            var updatedUser = null;
            var allUsers = Store.getUsers();
            for (var j = 0; j < allUsers.length; j++) {
              if (allUsers[j].id === state.staffEditId) { updatedUser = allUsers[j]; break; }
            }
            if (updatedUser) {
              sessionStorage.setItem('physio_session', JSON.stringify(updatedUser));
            }
          }

          Store.logActivity('Staff member updated: ' + data.name);
          Utils.toast('Staff member updated', 'success');
        } else {
          Store.create(Store.KEYS.users, {
            name: data.name,
            role: role,
            phone: data.phone || '',
            email: data.email || '',
            allowedPages: allowedPages,
            billingPermissions: billingPerms
          });
          Store.logActivity('New staff member added: ' + data.name + ' (' + getRoleLabel(role) + ')');
          Utils.toast('Staff member added', 'success');
        }

        state.staffSubView = 'list';
        state.staffEditId = null;
        renderView(container);
      };
    }
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

  // ==================== ROLE FORM (INLINE) ====================
  function renderRoleForm() {
    var isEdit = !!state.roleEditValue;
    var role = null;
    if (isEdit) {
      var custom = getCustomRoles();
      for (var i = 0; i < custom.length; i++) {
        if (custom[i].value === state.roleEditValue) { role = custom[i]; break; }
      }
      if (!role) { state.roleSubView = 'list'; return renderRoles(); }
    }

    var selectedPages = isEdit ? (role.defaultPages || ['dashboard']) : ['dashboard'];
    var selectedBillingPerms = isEdit ? (role.defaultBillingPerms || ['billing_view']) : ['billing_view'];
    var billingVisible = selectedPages.indexOf('billing') !== -1;

    var html = '<div class="inline-form-card">';
    html += '<div class="inline-form-header">';
    html += '<button class="back-btn" id="role-form-back">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>';
    html += '</button>';
    html += '<h3>' + (isEdit ? 'Edit Role \u2014 ' + Utils.escapeHtml(role.label) : 'Add Custom Role') + '</h3>';
    html += '</div>';
    html += '<div class="inline-form-body">';

    html += '<form id="role-form">';
    html += '<div class="form-group">';
    html += '<label>Role Name <span style="color:var(--danger);">*</span></label>';
    html += '<input type="text" name="label" required placeholder="e.g. Intern" value="' + Utils.escapeHtml(isEdit ? role.label : '') + '">';
    html += '</div>';
    html += '<div class="form-group">';
    html += '<label>Description</label>';
    html += '<input type="text" name="description" placeholder="e.g. Limited access for trainees" value="' + Utils.escapeHtml(isEdit ? role.description || '' : '') + '">';
    html += '</div>';
    html += '<div class="form-group">';
    html += '<label>Badge Color</label>';
    html += '<select name="badge" style="width:100%;">';
    for (var b = 0; b < BADGE_OPTIONS.length; b++) {
      var sel = isEdit ? (role.badge === BADGE_OPTIONS[b].value) : (b === 0);
      html += '<option value="' + BADGE_OPTIONS[b].value + '"' + (sel ? ' selected' : '') + '>' + BADGE_OPTIONS[b].label + '</option>';
    }
    html += '</select>';
    html += '</div>';
    html += '<div class="form-group" id="page-access-group">';
    html += '<label>Default Page Access</label>';
    html += buildPageCheckboxes(selectedPages, 'custom');
    html += '</div>';
    html += '<div class="form-group" id="billing-perms-group" style="' + (billingVisible ? '' : 'display:none;') + '">';
    html += '<label>Default Billing Permissions</label>';
    html += buildBillingPermCheckboxes(selectedBillingPerms);
    html += '</div>';
    html += '</form>';

    html += '</div>';
    html += '<div class="inline-form-actions">';
    html += '<button class="btn btn-secondary" id="role-form-cancel">Cancel</button>';
    html += '<button class="btn btn-primary" id="role-form-save">' + (isEdit ? 'Save Changes' : 'Add Role') + '</button>';
    html += '</div>';
    html += '</div>';

    return html;
  }

  function bindRoleForm(container) {
    function updateRoleBillingPermsVisibility() {
      var billingCb = document.querySelector('.page-access-cb[data-page="billing"]');
      var billingGroup = document.getElementById('billing-perms-group');
      if (!billingGroup) return;
      billingGroup.style.display = (billingCb && billingCb.checked) ? '' : 'none';
    }

    var rolePageGroup = document.getElementById('page-access-group');
    if (rolePageGroup) {
      rolePageGroup.addEventListener('change', function(e) {
        if (e.target.classList.contains('page-access-cb') && e.target.getAttribute('data-page') === 'billing') {
          updateRoleBillingPermsVisibility();
        }
      });
    }

    var goBack = function() {
      state.roleSubView = 'list';
      state.roleEditValue = null;
      renderView(container);
    };
    var backBtn = document.getElementById('role-form-back');
    var cancelBtn = document.getElementById('role-form-cancel');
    if (backBtn) backBtn.onclick = goBack;
    if (cancelBtn) cancelBtn.onclick = goBack;

    var saveBtn = document.getElementById('role-form-save');
    if (saveBtn) {
      saveBtn.onclick = function() {
        var form = document.getElementById('role-form');
        var data = Utils.getFormData(form);
        if (!data.label) {
          Utils.toast('Role name is required', 'error');
          return;
        }

        var pages = getCheckedPages();
        var billingPerms = pages.indexOf('billing') !== -1 ? getCheckedBillingPerms() : ['billing_view'];

        if (state.roleEditValue) {
          // Edit existing
          var custom = getCustomRoles();
          for (var i = 0; i < custom.length; i++) {
            if (custom[i].value === state.roleEditValue) {
              custom[i].label = data.label;
              custom[i].description = data.description || '';
              custom[i].badge = data.badge || 'badge-primary';
              custom[i].defaultPages = pages;
              custom[i].defaultBillingPerms = billingPerms;
              break;
            }
          }
          saveCustomRoles(custom);
          Utils.toast('Role updated', 'success');
        } else {
          // Create new
          var value = data.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
          if (!value) {
            Utils.toast('Invalid role name', 'error');
            return;
          }
          var all = getAllRoles();
          for (var j = 0; j < all.length; j++) {
            if (all[j].value === value) {
              Utils.toast('A role with this name already exists', 'error');
              return;
            }
          }
          var customRoles = getCustomRoles();
          customRoles.push({
            value: value,
            label: data.label,
            description: data.description || '',
            badge: data.badge || 'badge-primary',
            defaultPages: pages,
            defaultBillingPerms: billingPerms,
            builtin: false
          });
          saveCustomRoles(customRoles);
          Utils.toast('Custom role "' + data.label + '" created', 'success');
        }

        state.roleSubView = 'list';
        state.roleEditValue = null;
        renderView(container);
      };
    }
  }

  function deleteCustomRole(container, roleValue, roleLabel) {
    var users = Store.getUsers();
    var usersWithRole = [];
    for (var i = 0; i < users.length; i++) {
      if (users[i].role === roleValue) usersWithRole.push(users[i].name);
    }
    var msg = 'Delete custom role "' + roleLabel + '"?';
    if (usersWithRole.length > 0) {
      msg += ' Warning: ' + usersWithRole.length + ' staff member(s) currently have this role (' + usersWithRole.join(', ') + ').';
    }
    Utils.inlineConfirm(container, msg, function() {
      var custom = getCustomRoles();
      var filtered = [];
      for (var j = 0; j < custom.length; j++) {
        if (custom[j].value !== roleValue) filtered.push(custom[j]);
      }
      saveCustomRoles(filtered);
      Utils.toast('Role deleted', 'success');
      renderView(container);
    }, { danger: true });
  }

  // ==================== FEATURE TOGGLES ====================
  function renderFeatures() {
    var settings = Store.getClinicSettings();
    var defaults = Store.getDefaultFeatures();
    var features = settings.features || defaults;

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

  // ==================== TRASH ====================
  function renderTrash() {
    var trashed = Store.getAllTrash();
    var html = '';

    html += '<div class="card">';
    html += '<div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">';
    html += '<h3 style="margin:0;">Trash <span style="color:var(--text-muted);font-weight:400;font-size:0.85em;">(' + trashed.length + ' item' + (trashed.length !== 1 ? 's' : '') + ')</span></h3>';
    if (trashed.length > 0) {
      html += '<button class="btn btn-danger" id="empty-trash-btn">Empty Trash</button>';
    }
    html += '</div>';
    html += '<div class="card-body">';

    if (trashed.length === 0) {
      html += '<div class="empty-state">';
      html += '<p>Trash is empty. Deleted items will appear here for recovery.</p>';
      html += '</div>';
    } else {
      html += '<div class="table-wrapper"><table class="data-table"><thead><tr>';
      html += '<th>Type</th><th>Name / Description</th><th>Deleted</th><th>Actions</th>';
      html += '</tr></thead><tbody>';

      for (var i = 0; i < trashed.length; i++) {
        var item = trashed[i];
        var name = item.name || item.patientName || item.medication || item.description || item.text || item.id;
        var deletedDate = item._deletedAt ? Utils.formatDate(item._deletedAt.split('T')[0]) : '-';
        var isCascade = !!item._deletedBy;

        html += '<tr class="no-hover">';
        html += '<td><span class="badge badge-secondary">' + Utils.escapeHtml(item._type) + '</span></td>';
        html += '<td>' + Utils.escapeHtml(name);
        if (isCascade) {
          html += ' <span style="font-size:0.8em;color:var(--text-muted);">(cascade)</span>';
        }
        html += '</td>';
        html += '<td style="white-space:nowrap;">' + deletedDate + '</td>';
        html += '<td style="white-space:nowrap;">';
        if (!isCascade) {
          html += '<button class="btn btn-sm btn-secondary restore-trash-btn" data-key="' + Utils.escapeHtml(item._storeKey) + '" data-id="' + item.id + '" data-type="' + Utils.escapeHtml(item._type) + '" style="margin-right:4px;">Restore</button>';
        }
        html += '<button class="btn btn-sm btn-danger delete-forever-btn" data-key="' + Utils.escapeHtml(item._storeKey) + '" data-id="' + item.id + '" data-name="' + Utils.escapeHtml(name) + '">Delete Forever</button>';
        html += '</td>';
        html += '</tr>';
      }

      html += '</tbody></table></div>';
    }

    html += '</div></div>';
    return html;
  }

  // ==================== BACKUP ====================
  function renderBackup() {
    var html = '';

    // Export section
    html += '<div class="card">';
    html += '<div class="card-header"><h3 style="margin:0;">Export Backup</h3></div>';
    html += '<div class="card-body">';
    html += '<p style="color:var(--text-muted);margin-bottom:16px;">Download all clinic data as a JSON file. This includes patients, appointments, sessions, exercises, billing, prescriptions, staff, tags, messages, and activity log.</p>';
    html += '<button class="btn btn-primary" id="export-backup-btn">';
    html += '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
    html += ' Export Backup</button>';
    html += '</div></div>';

    // Import section
    html += '<div class="card" style="margin-top:16px;">';
    html += '<div class="card-header"><h3 style="margin:0;">Import Backup</h3></div>';
    html += '<div class="card-body">';
    html += '<p style="color:var(--text-muted);margin-bottom:16px;">Restore data from a previously exported JSON backup file. New items are merged in \u2014 existing items (by ID) are not overwritten.</p>';
    html += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">';
    html += '<input type="file" id="import-file-input" accept=".json" style="flex:1;min-width:200px;">';
    html += '<button class="btn btn-primary" id="import-backup-btn" disabled>';
    html += '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';
    html += ' Import Backup</button>';
    html += '</div>';
    html += '<div id="import-preview" style="margin-top:12px;display:none;"></div>';
    html += '</div></div>';

    return html;
  }

  // ==================== ROLE SELECT HTML ====================
  function buildRoleSelect(selectedValue) {
    var all = getAllRoles();
    var html = '<select name="role" style="width:100%;">';
    for (var i = 0; i < all.length; i++) {
      var r = all[i];
      html += '<option value="' + r.value + '"' + (selectedValue === r.value ? ' selected' : '') + '>' + Utils.escapeHtml(r.label) + ' \u2014 ' + Utils.escapeHtml(r.description) + '</option>';
    }
    html += '</select>';
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
          state.staffSubView = 'list';
          state.staffEditId = null;
          state.roleSubView = 'list';
          state.roleEditValue = null;
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

          if (window.App && window.App.applyFeatureToggles) {
            App.applyFeatureToggles();
          }
        });
      })(toggles[f]);
    }

    // Bind inline form events if showing a form
    if (state.staffSubView === 'form') {
      bindStaffForm(container);
    }
    if (state.roleSubView === 'form') {
      bindRoleForm(container);
    }

    // Remove old click handler to prevent duplicates
    if (_clickHandler) container.removeEventListener('click', _clickHandler);

    _clickHandler = function(e) {
      // Add Staff button
      if (e.target.closest('#add-staff-btn')) {
        state.staffSubView = 'form';
        state.staffEditId = null;
        renderView(container);
        return;
      }

      // Edit Staff button
      var editBtn = e.target.closest('.edit-staff-btn');
      if (editBtn) {
        state.staffSubView = 'form';
        state.staffEditId = editBtn.getAttribute('data-id');
        renderView(container);
        return;
      }

      // Delete Staff button
      var deleteBtn = e.target.closest('.delete-staff-btn');
      if (deleteBtn) {
        var staffId = deleteBtn.getAttribute('data-id');
        var staffName = deleteBtn.getAttribute('data-name');
        Utils.inlineConfirm(container, 'Delete staff member "' + staffName + '"? They can be restored from trash.', function() {
          Store.moveToTrash(Store.KEYS.users, staffId);
          Store.logActivity('Staff member deleted: ' + staffName);
          Utils.toast('Staff member moved to trash', 'success');
          renderView(container);
        }, { danger: true });
        return;
      }

      // Add Role button
      if (e.target.closest('#add-role-btn')) {
        state.roleSubView = 'form';
        state.roleEditValue = null;
        renderView(container);
        return;
      }

      // Edit Role button
      var editRoleBtn = e.target.closest('.edit-role-btn');
      if (editRoleBtn) {
        state.roleSubView = 'form';
        state.roleEditValue = editRoleBtn.getAttribute('data-role');
        renderView(container);
        return;
      }

      // Delete Role button
      var deleteRoleBtn = e.target.closest('.delete-role-btn');
      if (deleteRoleBtn) {
        deleteCustomRole(container, deleteRoleBtn.getAttribute('data-role'), deleteRoleBtn.getAttribute('data-label'));
        return;
      }

      // Restore from trash
      var restoreBtn = e.target.closest('.restore-trash-btn');
      if (restoreBtn) {
        var rKey = restoreBtn.getAttribute('data-key');
        var rId = restoreBtn.getAttribute('data-id');
        var rType = restoreBtn.getAttribute('data-type');
        if (rType === 'Patient') {
          Store.restorePatientFromTrash(rId);
          Store.logActivity('Patient restored from trash');
        } else {
          Store.restoreFromTrash(rKey, rId);
        }
        Utils.toast(rType + ' restored', 'success');
        renderView(container);
        return;
      }

      // Delete forever from trash
      var foreverBtn = e.target.closest('.delete-forever-btn');
      if (foreverBtn) {
        var fKey = foreverBtn.getAttribute('data-key');
        var fId = foreverBtn.getAttribute('data-id');
        var fName = foreverBtn.getAttribute('data-name');
        Utils.inlineConfirm(container, 'Permanently delete "' + fName + '"? This cannot be undone.', function() {
          Store.permanentDelete(fKey, fId);
          Utils.toast('Permanently deleted', 'success');
          renderView(container);
        }, { danger: true });
        return;
      }

      // Empty trash
      if (e.target.closest('#empty-trash-btn')) {
        Utils.inlineConfirm(container, 'Permanently delete ALL items in trash? This cannot be undone.', function() {
          var count = Store.emptyTrash();
          Utils.toast(count + ' item' + (count !== 1 ? 's' : '') + ' permanently deleted', 'success');
          renderView(container);
        }, { danger: true });
        return;
      }

      // Export backup
      if (e.target.closest('#export-backup-btn')) {
        var backup = Store.exportBackup();
        var json = JSON.stringify(backup, null, 2);
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        var dateStr = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = 'clinic-backup-' + dateStr + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Utils.toast('Backup exported', 'success');
        return;
      }

      // Import backup
      if (e.target.closest('#import-backup-btn')) {
        var fileInput = document.getElementById('import-file-input');
        if (!fileInput || !fileInput.files || !fileInput.files[0]) {
          Utils.toast('Please select a file first', 'error');
          return;
        }
        var reader = new FileReader();
        reader.onload = function(ev) {
          try {
            var data = JSON.parse(ev.target.result);
            if (!data || !data.data || data.version !== 1) {
              Utils.toast('Invalid backup file format', 'error');
              return;
            }
            Utils.inlineConfirm(container, 'Import backup data? New items will be merged. Existing items will not be overwritten.', function() {
              var counts = Store.importBackup(data);
              if (counts.error) {
                Utils.toast(counts.error, 'error');
                return;
              }
              var parts = [];
              for (var ct in counts) {
                if (counts[ct] > 0) parts.push(counts[ct] + ' ' + ct);
              }
              var msg = parts.length > 0 ? 'Imported: ' + parts.join(', ') : 'No new items to import';
              Utils.toast(msg, 'success');
              renderView(container);
            });
          } catch(ex) {
            Utils.toast('Error reading file: invalid JSON', 'error');
          }
        };
        reader.readAsText(fileInput.files[0]);
        return;
      }
    };
    container.addEventListener('click', _clickHandler);

    // File input change handler for import preview
    var importInput = container.querySelector('#import-file-input');
    if (importInput) {
      importInput.addEventListener('change', function() {
        var importBtn = document.getElementById('import-backup-btn');
        var preview = document.getElementById('import-preview');
        if (!importInput.files || !importInput.files[0]) {
          if (importBtn) importBtn.disabled = true;
          if (preview) preview.style.display = 'none';
          return;
        }
        var reader = new FileReader();
        reader.onload = function(ev) {
          try {
            var data = JSON.parse(ev.target.result);
            if (!data || !data.data || data.version !== 1) {
              if (preview) {
                preview.style.display = '';
                preview.innerHTML = '<div style="color:var(--danger);font-size:0.9em;">Invalid backup file format.</div>';
              }
              if (importBtn) importBtn.disabled = true;
              return;
            }
            if (importBtn) importBtn.disabled = false;
            if (preview) {
              var html = '<div style="background:var(--bg-secondary);border-radius:8px;padding:12px;font-size:0.9em;">';
              html += '<strong>Backup Preview</strong>';
              html += '<div style="color:var(--text-muted);font-size:0.85em;margin-bottom:8px;">Exported: ' + (data.exportedAt ? Utils.formatDate(data.exportedAt.split('T')[0]) : 'Unknown') + '</div>';
              var typeLabels = { patients: 'Patients', appointments: 'Appointments', sessions: 'Sessions', exercises: 'Exercises', billing: 'Invoices', prescriptions: 'Prescriptions', users: 'Staff', tags: 'Tags', messageTemplates: 'Templates', messageLog: 'Messages', activityLog: 'Activity' };
              for (var key in data.data) {
                if (data.data.hasOwnProperty(key) && data.data[key] && data.data[key].length > 0) {
                  html += '<div>' + (typeLabels[key] || key) + ': <strong>' + data.data[key].length + '</strong></div>';
                }
              }
              html += '</div>';
              preview.style.display = '';
              preview.innerHTML = html;
            }
          } catch(ex) {
            if (preview) {
              preview.style.display = '';
              preview.innerHTML = '<div style="color:var(--danger);font-size:0.9em;">Error reading file: invalid JSON.</div>';
            }
            if (importBtn) importBtn.disabled = true;
          }
        };
        reader.readAsText(importInput.files[0]);
      });
    }
  }

  return { render: render };
})();
