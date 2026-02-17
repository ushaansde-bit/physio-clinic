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
    html += '<button class="tab-btn' + (state.tab === 'staff' ? ' active' : '') + '" data-tab="staff">Staff</button>';
    html += '<button class="tab-btn' + (state.tab === 'roles' ? ' active' : '') + '" data-tab="roles">Roles</button>';
    html += '<button class="tab-btn' + (state.tab === 'features' ? ' active' : '') + '" data-tab="features">Features</button>';
    html += '<button class="tab-btn' + (state.tab === 'clinic' ? ' active' : '') + '" data-tab="clinic">Clinic</button>';
    html += '<button class="tab-btn' + (state.tab === 'trash' ? ' active' : '') + '" data-tab="trash">Trash</button>';
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
    }

    container.innerHTML = html;
    bindEvents(container);
  }

  // ==================== STAFF MANAGEMENT ====================
  function renderStaff() {
    var users = Store.getUsers();
    var currentUser = App.getCurrentUser();
    var html = '';

    html += '<div class="card mb-2">';
    html += '<div class="card-header"><h3>Staff Members (' + users.length + ')</h3>';
    html += '<button class="btn btn-primary btn-sm" id="add-staff-btn">';
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

        html += '<tr class="no-hover">';
        html += '<td style="font-weight:500;">' + Utils.escapeHtml(u.name) + (isSelf ? ' <span class="text-muted">(you)</span>' : '') + '</td>';
        html += '<td><code>' + Utils.escapeHtml(u.username || '-') + '</code></td>';
        html += '<td><span class="badge ' + roleBadge + '">' + Utils.escapeHtml(roleLabel) + '</span></td>';
        html += '<td>' + Utils.escapeHtml(u.phone || '-') + '</td>';
        html += '<td>' + Utils.escapeHtml(u.email || '-') + '</td>';
        html += '<td><div class="btn-group">';
        html += '<button class="btn btn-sm btn-secondary edit-staff-btn" data-id="' + u.id + '">Edit</button>';
        if (!isSelf) {
          html += '<button class="btn btn-sm btn-ghost delete-staff-btn" data-id="' + u.id + '" data-name="' + Utils.escapeHtml(u.name) + '" style="color:var(--danger);">Delete</button>';
        }
        html += '</div></td>';
        html += '</tr>';
      }
    }

    html += '</tbody></table></div></div></div>';

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

    html += '<div class="form-row">';
    html += '<div class="form-group">';
    html += '<label>Username <span style="color:var(--danger);">*</span></label>';
    html += '<input type="text" name="username" required placeholder="e.g. priya" value="' + Utils.escapeHtml(isEdit ? user.username || '' : '') + '">';
    html += '</div>';
    html += '<div class="form-group">';
    html += '<label>Password' + (isEdit ? '' : ' <span style="color:var(--danger);">*</span>') + '</label>';
    html += '<input type="password" name="password" placeholder="' + (isEdit ? 'Leave blank to keep current' : 'Min 4 characters') + '"' + (isEdit ? '' : ' required') + '>';
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

        var username = (data.username || '').trim();
        if (!username) {
          Utils.toast('Username is required', 'error');
          return;
        }

        // Check username uniqueness
        var existingUser = Store.getUserByUsername(username);
        if (existingUser && (!isEdit || existingUser.id !== state.staffEditId)) {
          Utils.toast('Username "' + username + '" is already taken', 'error');
          return;
        }

        var passwordVal = data.password || '';
        if (!isEdit && passwordVal.length < 4) {
          Utils.toast('Password must be at least 4 characters', 'error');
          return;
        }
        if (isEdit && passwordVal && passwordVal.length < 4) {
          Utils.toast('Password must be at least 4 characters', 'error');
          return;
        }

        var role = data.role || (isEdit ? user.role : 'physiotherapist');
        var allowedPages = role === 'admin' ? null : (isSelf ? user.allowedPages : getCheckedPages());
        var billingPerms = role === 'admin' ? null : (isSelf ? user.billingPermissions : getCheckedBillingPerms());

        if (isEdit) {
          var updateData = {
            name: data.name,
            username: username,
            role: role,
            phone: data.phone || '',
            email: data.email || '',
            allowedPages: allowedPages,
            billingPermissions: billingPerms
          };
          if (passwordVal) {
            updateData.password = passwordVal;
          }
          Store.update(Store.KEYS.users, state.staffEditId, updateData);

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
            username: username,
            password: passwordVal,
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
    html += '<div class="card mb-2">';
    html += '<div class="card-header"><h3>Built-in Roles</h3></div>';
    html += '<div class="card-body">';
    for (var i = 0; i < BUILTIN_ROLES.length; i++) {
      var br = BUILTIN_ROLES[i];
      html += '<div class="settings-toggle-row">';
      html += '<div>';
      html += '<div style="font-weight:500;"><span class="badge ' + br.badge + '">' + Utils.escapeHtml(br.label) + '</span></div>';
      html += '<div class="text-muted" style="font-size:0.85em;margin-top:0.25rem;">' + Utils.escapeHtml(br.description) + '</div>';
      html += '</div>';
      html += '</div>';
    }
    html += '</div></div>';

    // Custom roles
    html += '<div class="card mb-2">';
    html += '<div class="card-header"><h3>Custom Roles (' + custom.length + ')</h3>';
    html += '<button class="btn btn-primary btn-sm" id="add-role-btn">';
    html += '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
    html += ' Add Role</button>';
    html += '</div>';
    html += '<div class="card-body">';

    if (custom.length === 0) {
      html += '<div class="empty-state"><p>No custom roles yet</p></div>';
    } else {
      for (var c = 0; c < custom.length; c++) {
        var cr = custom[c];
        var defPages = (cr.defaultPages || []).join(', ') || 'dashboard';
        html += '<div class="settings-toggle-row">';
        html += '<div>';
        html += '<div style="font-weight:500;"><span class="badge ' + (cr.badge || 'badge-success') + '">' + Utils.escapeHtml(cr.label) + '</span></div>';
        html += '<div class="text-muted" style="font-size:0.85em;margin-top:0.25rem;">' + Utils.escapeHtml(cr.description || '') + '</div>';
        html += '<div class="text-muted" style="font-size:0.8em;">Pages: ' + Utils.escapeHtml(defPages) + '</div>';
        html += '</div>';
        html += '<div class="btn-group">';
        html += '<button class="btn btn-sm btn-secondary edit-role-btn" data-role="' + Utils.escapeHtml(cr.value) + '">Edit</button>';
        html += '<button class="btn btn-sm btn-ghost delete-role-btn" data-role="' + Utils.escapeHtml(cr.value) + '" data-label="' + Utils.escapeHtml(cr.label) + '" style="color:var(--danger);">Delete</button>';
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
    html += buildPageCheckboxes(selectedPages, isEdit ? role.value : '');
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
      { key: 'billing', label: 'Billing', description: 'Invoice management and payment tracking', nav: true },
      { key: 'messaging', label: 'Messaging', description: 'WhatsApp messaging to patients', nav: true },
      { key: 'prescriptions', label: 'Prescriptions', description: 'Medication prescriptions in patient detail' },
      { key: 'exercises', label: 'Exercises', description: 'Exercise programs in patient detail' },
      { key: 'soapNotes', label: 'SOAP Notes', description: 'Session documentation with SOAP format' },
      { key: 'bodyDiagram', label: 'Body Diagram', description: 'Visual body region marking for patients' },
      { key: 'onlineBooking', label: 'Online Booking', description: 'Allow patients to book appointments online' },
      { key: 'tags', label: 'Tags', description: 'Patient categorization and filtering with tags', nav: true }
    ];

    var enabledCount = 0;
    for (var c = 0; c < featureList.length; c++) {
      if (features[featureList[c].key] !== false) enabledCount++;
    }

    var html = '';

    // ---- Clinic App (Web) ----
    html += '<div class="card mb-2">';
    html += '<div class="card-header"><h3>Clinic App (Web)</h3><span class="badge badge-teal">' + enabledCount + '/' + featureList.length + ' enabled</span></div>';
    html += '<div class="card-body">';
    html += '<p style="font-size:0.82em;color:var(--text-muted);margin-bottom:0.75rem;">These settings control what staff members see in the clinic web application.</p>';

    for (var i = 0; i < featureList.length; i++) {
      var f = featureList[i];
      var isOn = features[f.key] !== false;

      html += '<div class="settings-toggle-row">';
      html += '<div>';
      html += '<div style="font-weight:500;">' + Utils.escapeHtml(f.label);
      if (f.nav) html += ' <span class="badge badge-gray" style="font-size:0.7em;vertical-align:middle;">Nav</span>';
      html += '</div>';
      html += '<div class="text-muted" style="font-size:0.85em;">' + Utils.escapeHtml(f.description) + '</div>';
      html += '</div>';
      html += '<label class="toggle-switch">';
      html += '<input type="checkbox" class="feature-toggle" data-feature="' + f.key + '"' + (isOn ? ' checked' : '') + '>';
      html += '<span class="toggle-slider"></span>';
      html += '<span class="toggle-knob"></span>';
      html += '</label>';
      html += '</div>';
    }

    html += '</div></div>';

    // ---- Patient App (MobiPhysio) ----
    var mobileDefaults = { billing: true, exercises: true, prescriptions: true, messaging: true };
    var mobileFeatures = settings.mobileFeatures || mobileDefaults;
    for (var mk in mobileDefaults) {
      if (mobileDefaults.hasOwnProperty(mk) && !mobileFeatures.hasOwnProperty(mk)) {
        mobileFeatures[mk] = mobileDefaults[mk];
      }
    }

    var mobileFeatureList = [
      { key: 'billing', label: 'Billing', description: 'Show bills and payment history to patients' },
      { key: 'exercises', label: 'Exercises', description: 'Show exercise programs (HEP) to patients' },
      { key: 'prescriptions', label: 'Prescriptions', description: 'Show prescriptions to patients' },
      { key: 'messaging', label: 'Messages', description: 'Show clinic messages to patients' }
    ];

    var mobileEnabledCount = 0;
    for (var mc = 0; mc < mobileFeatureList.length; mc++) {
      if (mobileFeatures[mobileFeatureList[mc].key] !== false) mobileEnabledCount++;
    }

    html += '<div class="card mb-2">';
    html += '<div class="card-header"><h3>Patient App (MobiPhysio)</h3><span class="badge badge-teal">' + mobileEnabledCount + '/' + mobileFeatureList.length + ' enabled</span></div>';
    html += '<div class="card-body">';
    html += '<p style="font-size:0.82em;color:var(--text-muted);margin-bottom:0.75rem;">These settings control what patients see in the MobiPhysio mobile app. These are independent of the clinic app settings above.</p>';

    for (var mi = 0; mi < mobileFeatureList.length; mi++) {
      var mf = mobileFeatureList[mi];
      var mIsOn = mobileFeatures[mf.key] !== false;

      html += '<div class="settings-toggle-row">';
      html += '<div>';
      html += '<div style="font-weight:500;">' + Utils.escapeHtml(mf.label) + '</div>';
      html += '<div class="text-muted" style="font-size:0.85em;">' + Utils.escapeHtml(mf.description) + '</div>';
      html += '</div>';
      html += '<label class="toggle-switch">';
      html += '<input type="checkbox" class="mobile-feature-toggle" data-feature="' + mf.key + '"' + (mIsOn ? ' checked' : '') + '>';
      html += '<span class="toggle-slider"></span>';
      html += '<span class="toggle-knob"></span>';
      html += '</label>';
      html += '</div>';
    }

    html += '</div></div>';

    // Online Booking Configuration
    if (features.onlineBooking !== false) {
      var booking = settings.booking || {};
      var bMaxPerSlot = booking.maxPerSlot !== undefined ? parseInt(booking.maxPerSlot, 10) : 1;
      var bSlotDuration = booking.slotDuration !== undefined ? parseInt(booking.slotDuration, 10) : 30;

      // Parse existing sessions into morning/afternoon/evening slots
      var slotDefaults = {
        morning:   { enabled: true,  start: '08:00', end: '12:00' },
        afternoon: { enabled: false, start: '13:00', end: '17:00' },
        evening:   { enabled: false, start: '18:00', end: '20:00' }
      };

      // Map saved sessions back to slots by start time
      var existingSessions = [];
      if (booking.sessions && booking.sessions.length > 0) {
        existingSessions = booking.sessions;
      } else if (booking.startHour !== undefined) {
        var lsh = parseInt(booking.startHour, 10);
        var leh = parseInt(booking.endHour, 10);
        existingSessions = [{ start: (lsh < 10 ? '0' : '') + lsh + ':00', end: (leh < 10 ? '0' : '') + leh + ':00' }];
      }

      if (existingSessions.length > 0) {
        // Reset all to disabled, then enable matched ones
        slotDefaults.morning.enabled = false;
        slotDefaults.afternoon.enabled = false;
        slotDefaults.evening.enabled = false;
        for (var es = 0; es < existingSessions.length; es++) {
          var sParts = existingSessions[es].start.split(':');
          var sHour = parseInt(sParts[0], 10);
          if (sHour < 12) {
            slotDefaults.morning.enabled = true;
            slotDefaults.morning.start = existingSessions[es].start;
            slotDefaults.morning.end = existingSessions[es].end;
          } else if (sHour < 17) {
            slotDefaults.afternoon.enabled = true;
            slotDefaults.afternoon.start = existingSessions[es].start;
            slotDefaults.afternoon.end = existingSessions[es].end;
          } else {
            slotDefaults.evening.enabled = true;
            slotDefaults.evening.start = existingSessions[es].start;
            slotDefaults.evening.end = existingSessions[es].end;
          }
        }
      }

      // Generate time options in 30-min steps (5:00 AM to 11:00 PM)
      var timeOpts = [];
      for (var th = 5; th <= 23; th++) {
        for (var tm = 0; tm < 60; tm += 30) {
          if (th === 23 && tm > 0) continue;
          var tv = (th < 10 ? '0' : '') + th + ':' + (tm === 0 ? '00' : '30');
          var tAP = th >= 12 ? 'PM' : 'AM';
          var tH12 = th % 12 || 12;
          var tLabel = tH12 + ':' + (tm === 0 ? '00' : '30') + ' ' + tAP;
          timeOpts.push({ value: tv, label: tLabel });
        }
      }

      function bookingTimeSelect(name, selectedVal) {
        var s = '<select name="' + name + '" style="width:100%;">';
        for (var oi = 0; oi < timeOpts.length; oi++) {
          s += '<option value="' + timeOpts[oi].value + '"' + (timeOpts[oi].value === selectedVal ? ' selected' : '') + '>' + timeOpts[oi].label + '</option>';
        }
        s += '</select>';
        return s;
      }

      var sessionSlots = [
        { key: 'morning',   label: 'Morning',   icon: '\u2600', defaults: slotDefaults.morning },
        { key: 'afternoon', label: 'Afternoon',  icon: '\u26C5', defaults: slotDefaults.afternoon },
        { key: 'evening',   label: 'Evening',    icon: '\uD83C\uDF19', defaults: slotDefaults.evening }
      ];

      html += '<div class="card mb-2">';
      html += '<div class="card-header"><h3>Online Booking Settings</h3></div>';
      html += '<div class="card-body">';
      html += '<form id="booking-config-form">';

      // Session rows
      html += '<div style="font-weight:600;font-size:0.9em;margin-bottom:0.5rem;padding:0.3rem 0;border-bottom:1px solid var(--border);">Clinic Sessions</div>';
      html += '<p style="font-size:0.82em;color:var(--text-muted);margin-bottom:0.75rem;">Enable the time slots when your clinic is open for appointments.</p>';

      for (var si = 0; si < sessionSlots.length; si++) {
        var ss = sessionSlots[si];
        var isEnabled = ss.defaults.enabled;

        html += '<div class="booking-session-row" style="background:var(--bg-secondary);border-radius:var(--radius);padding:0.75rem;margin-bottom:0.5rem;' + (isEnabled ? '' : 'opacity:0.6;') + '" id="session-row-' + ss.key + '">';

        // Header with toggle
        html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:' + (isEnabled ? '0.5rem' : '0') + ';">';
        html += '<div style="font-weight:600;font-size:0.9em;">' + ss.icon + ' ' + ss.label + '</div>';
        html += '<label class="toggle-switch" style="margin:0;">';
        html += '<input type="checkbox" class="session-toggle" data-session="' + ss.key + '"' + (isEnabled ? ' checked' : '') + '>';
        html += '<span class="toggle-slider"></span>';
        html += '<span class="toggle-knob"></span>';
        html += '</label>';
        html += '</div>';

        // Time range (shown when enabled)
        html += '<div class="session-times" id="session-times-' + ss.key + '" style="' + (isEnabled ? '' : 'display:none;') + '">';
        html += '<div class="form-row" style="margin-bottom:0;">';
        html += '<div class="form-group" style="margin-bottom:0;"><label style="font-size:0.8em;">From</label>' + bookingTimeSelect(ss.key + '_start', ss.defaults.start) + '</div>';
        html += '<div class="form-group" style="margin-bottom:0;"><label style="font-size:0.8em;">To</label>' + bookingTimeSelect(ss.key + '_end', ss.defaults.end) + '</div>';
        html += '</div>';
        html += '</div>';

        html += '</div>';
      }

      // Slot settings
      html += '<div style="font-weight:600;font-size:0.9em;margin-bottom:0.4rem;margin-top:1rem;padding:0.3rem 0;border-bottom:1px solid var(--border);">Slot Settings</div>';
      html += '<div class="form-row">';
      html += '<div class="form-group"><label>Slot Duration</label>';
      html += '<select name="slotDuration">';
      var durations = [15, 20, 30, 45, 60];
      for (var di = 0; di < durations.length; di++) {
        html += '<option value="' + durations[di] + '"' + (durations[di] === bSlotDuration ? ' selected' : '') + '>' + durations[di] + ' min</option>';
      }
      html += '</select></div>';
      html += '<div class="form-group"><label>Max per Slot</label>';
      html += '<select name="maxPerSlot">';
      for (var mp = 1; mp <= 10; mp++) {
        html += '<option value="' + mp + '"' + (mp === bMaxPerSlot ? ' selected' : '') + '>' + mp + (mp === 1 ? ' patient' : ' patients') + '</option>';
      }
      html += '</select></div>';
      html += '</div>';
      html += '<button type="button" class="btn btn-primary btn-sm" id="save-booking-config">Save Booking Settings</button>';
      html += '</form>';
      html += '</div></div>';
    }

    return html;
  }

  // ==================== CLINIC INFO ====================
  function renderClinicInfo() {
    var settings = Store.getClinicSettings();
    var clinicName = settings.name || settings.clinicName || 'PhysioClinic';
    var ownerName = settings.ownerName || '';
    var ownerEmail = settings.ownerEmail || '';
    var ownerPhone = settings.ownerPhone || '';
    var slug = settings.bookingSlug || '';
    var googlePlaceId = settings.googlePlaceId || '';
    var basePath = window.location.origin + window.location.pathname.replace('index.html', '').replace(/\/$/, '');
    var bookingUrl = slug ? (basePath + '/book1/index.html?c=' + slug) : '';
    var patientAppUrl = slug ? (basePath + '/mobi/index.html?c=' + slug) : '';

    var html = '';

    // Clinic Info (editable form)
    html += '<div class="card mb-2">';
    html += '<div class="card-header"><h3>Clinic Information</h3></div>';
    html += '<div class="card-body">';
    html += '<form id="clinic-info-form">';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>Clinic Name</label><input type="text" name="clinicName" value="' + Utils.escapeHtml(clinicName) + '"></div>';
    html += '<div class="form-group"><label>Owner Name</label><input type="text" name="ownerName" value="' + Utils.escapeHtml(ownerName) + '"></div>';
    html += '</div>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>Email</label><input type="email" name="ownerEmail" value="' + Utils.escapeHtml(ownerEmail) + '"></div>';
    html += '<div class="form-group"><label>Phone</label><input type="text" name="ownerPhone" value="' + Utils.escapeHtml(ownerPhone) + '"></div>';
    html += '</div>';
    html += '<div class="form-group"><label>Booking Slug</label><input type="text" name="bookingSlug" value="' + Utils.escapeHtml(slug) + '" readonly style="background:var(--bg-secondary);cursor:not-allowed;" title="Set during registration"></div>';
    html += '</form>';
    html += '</div></div>';

    // Google Reviews Setup
    html += '<div class="card mb-2">';
    html += '<div class="card-header"><h3>Google Reviews</h3></div>';
    html += '<div class="card-body">';
    html += '<form id="google-review-form">';
    html += '<div class="form-group"><label>Google Place ID</label>';
    html += '<input type="text" name="googlePlaceId" value="' + Utils.escapeHtml(googlePlaceId) + '" placeholder="e.g. ChIJN1t_tDeuEmsRUsoyG83frY4">';
    html += '<div class="form-hint">Find your Place ID at Google\'s Place ID Finder. Used for the patient app review feature.</div>';
    html += '<div class="form-hint" style="margin-top:0.5rem;color:var(--gray-500);">Review suggestions are auto-generated in the patient app based on each patient\'s treatment data.</div>';
    html += '</div>';
    html += '</form>';
    html += '<button type="button" class="btn btn-primary btn-sm" id="save-clinic-info-btn">Save Clinic Settings</button>';
    html += '</div></div>';

    // Links & QR Code
    if (slug) {
      html += '<div class="card mb-2">';
      html += '<div class="card-header"><h3>Links & QR Codes</h3></div>';
      html += '<div class="card-body">';

      // Booking URL
      html += '<div style="margin-bottom:1.25rem;">';
      html += '<div style="font-weight:600;font-size:0.9em;margin-bottom:0.35rem;">Online Booking URL</div>';
      html += '<div style="display:flex;gap:0.5rem;align-items:center;">';
      html += '<input type="text" value="' + Utils.escapeHtml(bookingUrl) + '" readonly style="flex:1;font-size:0.82em;background:var(--bg-secondary);" id="booking-url-input">';
      html += '<button class="btn btn-sm btn-secondary copy-url-btn" data-url="' + Utils.escapeHtml(bookingUrl) + '">Copy</button>';
      html += '</div></div>';

      // Patient App URL
      html += '<div style="margin-bottom:1.25rem;">';
      html += '<div style="font-weight:600;font-size:0.9em;margin-bottom:0.35rem;">Patient App URL (MobiPhysio)</div>';
      html += '<div style="display:flex;gap:0.5rem;align-items:center;">';
      html += '<input type="text" value="' + Utils.escapeHtml(patientAppUrl) + '" readonly style="flex:1;font-size:0.82em;background:var(--bg-secondary);" id="patient-app-url-input">';
      html += '<button class="btn btn-sm btn-secondary copy-url-btn" data-url="' + Utils.escapeHtml(patientAppUrl) + '">Copy</button>';
      html += '<button class="btn btn-sm btn-primary" id="share-patient-app-btn" title="Share via WhatsApp"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="vertical-align:-2px;"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 01-4.243-1.214l-.252-.149-2.868.852.852-2.868-.149-.252A8 8 0 1112 20z"/></svg> Share</button>';
      html += '</div></div>';

      // QR Codes
      html += '<div style="display:flex;gap:2rem;flex-wrap:wrap;">';
      html += '<div style="text-align:center;"><div style="font-weight:600;font-size:0.85em;margin-bottom:0.5rem;">Booking QR</div><div id="qr-booking" style="display:inline-block;"></div></div>';
      html += '<div style="text-align:center;"><div style="font-weight:600;font-size:0.85em;margin-bottom:0.5rem;">Patient App QR</div><div id="qr-patient-app" style="display:inline-block;"></div></div>';
      html += '</div>';

      // Print section with radio selector
      html += '<div style="margin-top:1rem;padding:0.75rem;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-secondary);">';
      html += '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;">';
      html += '<div style="display:flex;gap:1.25rem;">';
      html += '<label style="display:flex;align-items:center;gap:0.35rem;cursor:pointer;font-size:0.85em;font-weight:500;"><input type="radio" name="print-qr-choice" value="booking" checked> Booking QR</label>';
      html += '<label style="display:flex;align-items:center;gap:0.35rem;cursor:pointer;font-size:0.85em;font-weight:500;"><input type="radio" name="print-qr-choice" value="patient"> Patient App QR</label>';
      html += '</div>';
      html += '<button class="btn btn-sm btn-secondary" id="print-qr-btn"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px;"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>Print</button>';
      html += '</div></div>';

      html += '</div></div>';
    }

    return html;
  }

  function infoItem(label, value) {
    return '<div class="info-item"><label>' + label + '</label><span>' + Utils.escapeHtml(value || '-') + '</span></div>';
  }

  // ==================== TRASH ====================
  function renderTrash() {
    var trashed = Store.getAllTrash();
    var html = '';

    html += '<div class="card mb-2">';
    html += '<div class="card-header"><h3>Trash (' + trashed.length + ')</h3>';
    if (trashed.length > 0) {
      html += '<button class="btn btn-sm btn-ghost" id="empty-trash-btn" style="color:var(--danger);">Empty Trash</button>';
    }
    html += '</div>';
    html += '<div class="card-body">';

    if (trashed.length === 0) {
      html += '<div class="empty-state"><p>Trash is empty. Deleted items appear here for recovery.</p></div>';
    } else {
      html += '<div class="table-wrapper"><table class="data-table"><thead><tr>';
      html += '<th>Type</th><th>Name</th><th>Deleted</th><th>Actions</th>';
      html += '</tr></thead><tbody>';

      for (var i = 0; i < trashed.length; i++) {
        var item = trashed[i];
        var name = item.name || item.patientName || item.medication || item.description || item.text || item.id;
        var deletedDate = item._deletedAt ? Utils.formatDate(item._deletedAt.split('T')[0]) : '-';
        var isCascade = !!item._deletedBy;

        html += '<tr class="no-hover">';
        html += '<td><span class="badge badge-secondary">' + Utils.escapeHtml(item._type) + '</span></td>';
        html += '<td style="font-weight:500;">' + Utils.escapeHtml(name);
        if (isCascade) html += ' <span class="text-muted">(cascade)</span>';
        html += '</td>';
        html += '<td>' + deletedDate + '</td>';
        html += '<td><div class="btn-group">';
        if (!isCascade) {
          html += '<button class="btn btn-sm btn-secondary restore-trash-btn" data-key="' + Utils.escapeHtml(item._storeKey) + '" data-id="' + item.id + '" data-type="' + Utils.escapeHtml(item._type) + '">Restore</button>';
        }
        html += '<button class="btn btn-sm btn-ghost delete-forever-btn" data-key="' + Utils.escapeHtml(item._storeKey) + '" data-id="' + item.id + '" data-name="' + Utils.escapeHtml(name) + '" style="color:var(--danger);">Delete</button>';
        html += '</div></td>';
        html += '</tr>';
      }

      html += '</tbody></table></div>';
    }

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

          var label = featureKey.replace(/([A-Z])/g, ' $1');
          label = label.charAt(0).toUpperCase() + label.slice(1);
          Utils.toast(label + (toggle.checked ? ' enabled' : ' disabled'), 'success');

          if (window.App && window.App.applyFeatureToggles) {
            App.applyFeatureToggles();
          }

          // Update the enabled count badge
          var badge = container.querySelector('.card-header .badge-teal');
          if (badge) {
            var allToggles = container.querySelectorAll('.feature-toggle');
            var count = 0;
            for (var ct = 0; ct < allToggles.length; ct++) {
              if (allToggles[ct].checked) count++;
            }
            badge.textContent = count + '/' + allToggles.length + ' enabled';
          }
        });
      })(toggles[f]);
    }

    // Mobile feature toggle change events
    var mobileToggles = container.querySelectorAll('.mobile-feature-toggle');
    for (var mf = 0; mf < mobileToggles.length; mf++) {
      (function(toggle) {
        toggle.addEventListener('change', function() {
          var featureKey = toggle.getAttribute('data-feature');
          var settings = Store.getClinicSettings();
          if (!settings.mobileFeatures) {
            settings.mobileFeatures = { billing: true, exercises: true, prescriptions: true, messaging: true };
          }
          settings.mobileFeatures[featureKey] = toggle.checked;
          Store.saveClinicSettings(settings);

          var label = featureKey.charAt(0).toUpperCase() + featureKey.slice(1);
          Utils.toast('Patient App: ' + label + (toggle.checked ? ' enabled' : ' disabled'), 'success');

          // Update the mobile enabled count badge
          var mobileCard = toggle.closest('.card');
          var badge = mobileCard ? mobileCard.querySelector('.badge-teal') : null;
          if (badge) {
            var allMToggles = container.querySelectorAll('.mobile-feature-toggle');
            var mCount = 0;
            for (var mt = 0; mt < allMToggles.length; mt++) {
              if (allMToggles[mt].checked) mCount++;
            }
            badge.textContent = mCount + '/' + allMToggles.length + ' enabled';
          }
        });
      })(mobileToggles[mf]);
    }

    // Session toggle interactivity
    var sessionToggles = container.querySelectorAll('.session-toggle');
    for (var st = 0; st < sessionToggles.length; st++) {
      (function(toggle) {
        toggle.addEventListener('change', function() {
          var key = toggle.getAttribute('data-session');
          var row = document.getElementById('session-row-' + key);
          var times = document.getElementById('session-times-' + key);
          if (row) row.style.opacity = toggle.checked ? '1' : '0.6';
          if (times) times.style.display = toggle.checked ? '' : 'none';
        });
      })(sessionToggles[st]);
    }

    // Booking config save
    var saveBookingBtn = container.querySelector('#save-booking-config');
    if (saveBookingBtn) {
      saveBookingBtn.addEventListener('click', function() {
        var form = document.getElementById('booking-config-form');
        var data = Utils.getFormData(form);
        var sessionKeys = ['morning', 'afternoon', 'evening'];
        var sessions = [];

        for (var sk = 0; sk < sessionKeys.length; sk++) {
          var key = sessionKeys[sk];
          var toggle = container.querySelector('.session-toggle[data-session="' + key + '"]');
          if (!toggle || !toggle.checked) continue;

          var start = data[key + '_start'];
          var end = data[key + '_end'];
          if (!start || !end || start >= end) {
            Utils.toast(key.charAt(0).toUpperCase() + key.slice(1) + ': "From" must be before "To"', 'error');
            return;
          }
          sessions.push({ start: start, end: end });
        }

        if (sessions.length === 0) {
          Utils.toast('Please enable at least one session', 'error');
          return;
        }

        var settings = Store.getClinicSettings();
        settings.booking = {
          sessions: sessions,
          slotDuration: parseInt(data.slotDuration, 10),
          maxPerSlot: parseInt(data.maxPerSlot, 10)
        };
        Store.saveClinicSettings(settings);
        Utils.toast('Booking settings saved', 'success');
      });
    }

    // Save clinic info + Google review settings
    var saveClinicBtn = container.querySelector('#save-clinic-info-btn');
    if (saveClinicBtn) {
      saveClinicBtn.addEventListener('click', function() {
        var clinicForm = document.getElementById('clinic-info-form');
        var reviewForm = document.getElementById('google-review-form');
        var clinicData = Utils.getFormData(clinicForm);
        var reviewData = Utils.getFormData(reviewForm);
        var settings = Store.getClinicSettings();
        settings.name = clinicData.clinicName || settings.name;
        settings.clinicName = clinicData.clinicName || settings.clinicName;
        settings.ownerName = clinicData.ownerName || '';
        settings.ownerEmail = clinicData.ownerEmail || '';
        settings.ownerPhone = clinicData.ownerPhone || '';
        settings.googlePlaceId = reviewData.googlePlaceId || '';
        Store.saveClinicSettings(settings);
        Utils.toast('Clinic settings saved', 'success');
      });
    }

    // Copy URL buttons
    var copyBtns = container.querySelectorAll('.copy-url-btn');
    for (var cb = 0; cb < copyBtns.length; cb++) {
      (function(btn) {
        btn.addEventListener('click', function() {
          var url = btn.getAttribute('data-url');
          if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(function() {
              Utils.toast('URL copied to clipboard', 'success');
            });
          } else {
            // Fallback
            var tmp = document.createElement('textarea');
            tmp.value = url;
            document.body.appendChild(tmp);
            tmp.select();
            document.execCommand('copy');
            document.body.removeChild(tmp);
            Utils.toast('URL copied to clipboard', 'success');
          }
        });
      })(copyBtns[cb]);
    }

    // Share Patient App via WhatsApp
    var shareBtn = container.querySelector('#share-patient-app-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', function() {
        var settings = Store.getClinicSettings();
        var slug = settings.bookingSlug || '';
        if (!slug) { Utils.toast('No booking slug configured', 'warning'); return; }
        var basePath = window.location.origin + window.location.pathname.replace('index.html', '').replace(/\/$/, '');
        var appUrl = basePath + '/mobi/index.html?c=' + slug;
        var clinicName = settings.name || settings.clinicName || 'our clinic';
        var msg = 'Open MobiPhysio to view your appointments, bills & prescriptions from ' + clinicName + ': ' + appUrl;
        window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
      });
    }

    // Generate QR codes if qrcode library is available
    if (typeof qrcode !== 'undefined') {
      var qrBooking = container.querySelector('#qr-booking');
      var qrPatient = container.querySelector('#qr-patient-app');
      var settings = Store.getClinicSettings();
      var slug = settings.bookingSlug || '';
      if (slug) {
        var basePath = window.location.origin + window.location.pathname.replace('index.html', '').replace(/\/$/, '');
        if (qrBooking) {
          var qr1 = qrcode(0, 'M');
          qr1.addData(basePath + '/book1/index.html?c=' + slug);
          qr1.make();
          qrBooking.innerHTML = qr1.createImgTag(4, 8);
        }
        if (qrPatient) {
          var qr2 = qrcode(0, 'M');
          qr2.addData(basePath + '/mobi/index.html?c=' + slug);
          qr2.make();
          qrPatient.innerHTML = qr2.createImgTag(4, 8);
        }
      }
    }

    // Print QR code based on radio selection
    var printQrBtn = container.querySelector('#print-qr-btn');
    if (printQrBtn) {
      printQrBtn.addEventListener('click', function() {
        var selected = container.querySelector('input[name="print-qr-choice"]:checked');
        if (!selected) return;
        var isBooking = selected.value === 'booking';
        var qrImg = container.querySelector(isBooking ? '#qr-booking img' : '#qr-patient-app img');
        if (!qrImg) { Utils.toast('QR code not generated yet', 'error'); return; }
        var settings = Store.getClinicSettings();
        var clinicName = settings.name || settings.clinicName || 'PhysioClinic';
        var title = isBooking ? 'Book Appointment' : 'Patient App';
        var hint = isBooking ? 'Scan to book an appointment online' : 'Scan to access your bills, prescriptions & messages';
        var printWin = window.open('', '_blank', 'width=600,height=700');
        var ph = '<!DOCTYPE html><html><head><title>' + title + ' - ' + clinicName + '</title>';
        ph += '<style>';
        ph += 'body { font-family: Arial, sans-serif; text-align: center; margin: 0; padding: 60px 20px; }';
        ph += 'h1 { font-size: 32px; margin-bottom: 6px; }';
        ph += '.title { font-size: 22px; font-weight: 700; margin-bottom: 24px; color: #333; }';
        ph += '.qr-img { width: 280px; height: 280px; }';
        ph += '.hint { font-size: 15px; color: #666; margin-top: 20px; }';
        ph += '.scan-text { font-size: 13px; color: #999; margin-top: 32px; }';
        ph += '</style></head><body>';
        ph += '<h1>' + clinicName + '</h1>';
        ph += '<div class="title">' + title + '</div>';
        ph += '<img class="qr-img" src="' + qrImg.src + '">';
        ph += '<div class="hint">' + hint + '</div>';
        ph += '<div class="scan-text">Scan with your phone camera</div>';
        ph += '</body></html>';
        printWin.document.write(ph);
        printWin.document.close();
        printWin.onload = function() { printWin.print(); };
      });
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

    };
    container.addEventListener('click', _clickHandler);
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
