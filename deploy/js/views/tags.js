/* ============================================
   Tags Management View
   ============================================ */
window.TagsView = (function() {

  var _clickHandler = null;

  var state = {
    subView: 'list',  // 'list' | 'form'
    editId: null
  };

  function render(container) {
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
    var tags = Store.getTags();
    tags.sort(function(a, b) { return a.name.localeCompare(b.name); });

    var html = '';

    // Header
    html += '<div class="flex-between mb-2">';
    html += '<h3 style="font-size:1rem;">Tags (' + tags.length + ')</h3>';
    html += '<button class="btn btn-primary btn-sm" id="add-tag-btn">';
    html += '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
    html += ' Add Tag</button>';
    html += '</div>';

    if (tags.length === 0) {
      html += '<div class="empty-state"><p>No tags yet</p><p class="empty-sub">Tags help you categorize patients for quick filtering.</p></div>';
    } else {
      html += '<div class="card"><div class="table-wrapper">';
      html += '<table class="data-table"><thead><tr>';
      html += '<th>Tag</th><th>Patients</th><th>Actions</th>';
      html += '</tr></thead><tbody>';

      var patients = Store.getPatients();

      for (var i = 0; i < tags.length; i++) {
        var tag = tags[i];
        // Count patients with this tag
        var count = 0;
        for (var j = 0; j < patients.length; j++) {
          if (patients[j].tags && patients[j].tags.indexOf(tag.id) !== -1) count++;
        }

        html += '<tr class="no-hover">';
        html += '<td><span class="tag-badge" style="background:' + tag.color + ';font-size:0.85rem;padding:0.3rem 0.75rem;">' + Utils.escapeHtml(tag.name) + '</span></td>';
        html += '<td style="font-size:0.85rem;">' + count + ' patient' + (count !== 1 ? 's' : '') + '</td>';
        html += '<td><div class="btn-group">';
        html += '<button class="btn btn-sm btn-ghost edit-tag-btn" data-id="' + tag.id + '">Edit</button>';
        html += '<button class="btn btn-sm btn-ghost delete-tag-btn" data-id="' + tag.id + '" style="color:var(--danger);">Delete</button>';
        html += '</div></td>';
        html += '</tr>';
      }

      html += '</tbody></table></div></div>';
    }

    container.innerHTML = html;
    bindListEvents(container);
  }

  function renderForm(container) {
    var tag = state.editId ? Store.getTag(state.editId) : null;
    var title = tag ? 'Edit Tag' : 'New Tag';

    var colors = [
      '#3b82f6', '#ef4444', '#f59e0b', '#22c55e', '#8b5cf6',
      '#ec4899', '#06b6d4', '#6b7280', '#f97316', '#14b8a6',
      '#a855f7', '#0891b2', '#dc2626', '#16a34a', '#7c3aed'
    ];
    var currentColor = tag ? tag.color : colors[0];

    var html = '<div class="inline-form-card">';
    html += '<div class="inline-form-header">';
    html += '<button class="back-btn" id="tag-form-back">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>';
    html += '</button>';
    html += '<h3>' + title + '</h3>';
    html += '</div>';
    html += '<div class="inline-form-body">';
    html += '<form id="tag-form">';
    html += '<div class="form-group"><label>Tag Name</label>';
    html += '<input type="text" name="name" value="' + Utils.escapeHtml(tag ? tag.name : '') + '" required placeholder="e.g., Knee, Post-Surgery, Senior"></div>';
    html += '<div class="form-group"><label>Color</label>';
    html += '<div class="tag-color-picker">';
    for (var c = 0; c < colors.length; c++) {
      var isActive = colors[c] === currentColor;
      html += '<button type="button" class="tag-color-btn' + (isActive ? ' active' : '') + '" data-color="' + colors[c] + '" style="background:' + colors[c] + ';">';
      if (isActive) html += '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
      html += '</button>';
    }
    html += '</div>';
    html += '<input type="hidden" name="color" value="' + currentColor + '">';
    html += '</div>';

    // Preview
    html += '<div class="form-group"><label>Preview</label>';
    html += '<div id="tag-preview"><span class="tag-badge" style="background:' + currentColor + ';font-size:0.9rem;padding:0.35rem 0.85rem;">' + Utils.escapeHtml(tag ? tag.name : 'Tag Name') + '</span></div>';
    html += '</div>';

    html += '</form>';

    // Patient assignment section (for existing tags)
    if (tag) {
      var patients = Store.getPatients();
      patients.sort(function(a, b) { return a.name.localeCompare(b.name); });
      var assigned = [];
      var unassigned = [];
      for (var pi = 0; pi < patients.length; pi++) {
        var hasTag = patients[pi].tags && patients[pi].tags.indexOf(tag.id) !== -1;
        if (hasTag) assigned.push(patients[pi]);
        else unassigned.push(patients[pi]);
      }

      html += '<div style="border-top:1px solid var(--border);margin-top:1rem;padding-top:1rem;">';
      html += '<div class="flex-between mb-2">';
      html += '<label style="font-weight:600;">Patients with this tag (' + assigned.length + ')</label>';
      html += '</div>';

      // Search
      html += '<input type="text" id="tag-patient-search" placeholder="Search patients..." style="margin-bottom:0.75rem;width:100%;padding:0.5rem 0.75rem;border:1px solid var(--border);border-radius:8px;font-size:0.85rem;">';

      // Patient list with toggles
      html += '<div id="tag-patient-list" style="max-height:320px;overflow-y:auto;">';
      // Assigned first
      for (var ai = 0; ai < assigned.length; ai++) {
        html += patientToggleRow(assigned[ai], true);
      }
      for (var ui = 0; ui < unassigned.length; ui++) {
        html += patientToggleRow(unassigned[ui], false);
      }
      html += '</div>';
      html += '</div>';
    }

    html += '</div>';
    html += '<div class="inline-form-actions">';
    html += '<button class="btn btn-secondary" id="tag-form-cancel">Cancel</button>';
    html += '<button class="btn btn-primary" id="tag-form-save">' + (tag ? 'Save' : 'Create Tag') + '</button>';
    html += '</div></div>';

    container.innerHTML = html;
    bindFormEvents(container);
  }

  function patientToggleRow(patient, isAssigned) {
    var html = '<label class="tag-patient-row' + (isAssigned ? ' assigned' : '') + '" data-patient-id="' + patient.id + '" data-name="' + Utils.escapeHtml(patient.name.toLowerCase()) + '">';
    html += '<input type="checkbox" class="tag-patient-cb" value="' + patient.id + '"' + (isAssigned ? ' checked' : '') + '>';
    html += '<div class="patient-avatar" style="width:28px;height:28px;font-size:0.65rem;">' + Utils.getInitials(patient.name) + '</div>';
    html += '<div style="flex:1;min-width:0;">';
    html += '<div style="font-weight:600;font-size:0.85rem;">' + Utils.escapeHtml(patient.name) + '</div>';
    html += '<div style="font-size:0.75rem;color:var(--gray-400);">' + Utils.escapeHtml(patient.phone || 'No phone') + '</div>';
    html += '</div>';
    html += '</label>';
    return html;
  }

  function bindListEvents(container) {
    if (_clickHandler) container.removeEventListener('click', _clickHandler);

    _clickHandler = function(e) {
      if (e.target.closest('#add-tag-btn')) {
        state.subView = 'form';
        state.editId = null;
        renderView(container);
        return;
      }

      var editBtn = e.target.closest('.edit-tag-btn');
      if (editBtn) {
        state.subView = 'form';
        state.editId = editBtn.getAttribute('data-id');
        renderView(container);
        return;
      }

      var deleteBtn = e.target.closest('.delete-tag-btn');
      if (deleteBtn) {
        var delId = deleteBtn.getAttribute('data-id');
        var tag = Store.getTag(delId);
        Utils.inlineConfirm(container, 'Delete tag "' + tag.name + '"? It will be removed from all patients.', function() {
          Store.deleteTag(delId);
          Utils.toast('Tag deleted', 'success');
          renderList(container);
        }, { danger: true });
        return;
      }
    };
    container.addEventListener('click', _clickHandler);
  }

  function bindFormEvents(container) {
    var backBtn = document.getElementById('tag-form-back');
    var cancelBtn = document.getElementById('tag-form-cancel');
    var saveBtn = document.getElementById('tag-form-save');

    function goBack() {
      state.subView = 'list';
      state.editId = null;
      renderView(container);
    }

    if (backBtn) backBtn.onclick = goBack;
    if (cancelBtn) cancelBtn.onclick = goBack;

    // Color picker
    var colorBtns = container.querySelectorAll('.tag-color-btn');
    var colorInput = container.querySelector('[name="color"]');
    var nameInput = container.querySelector('[name="name"]');
    var preview = document.getElementById('tag-preview');

    for (var i = 0; i < colorBtns.length; i++) {
      colorBtns[i].addEventListener('click', function() {
        for (var j = 0; j < colorBtns.length; j++) {
          colorBtns[j].classList.remove('active');
          colorBtns[j].innerHTML = '';
        }
        this.classList.add('active');
        this.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
        var color = this.getAttribute('data-color');
        colorInput.value = color;
        updatePreview();
      });
    }

    // Live preview on name input
    if (nameInput) {
      nameInput.addEventListener('input', updatePreview);
    }

    function updatePreview() {
      if (preview) {
        var name = nameInput.value.trim() || 'Tag Name';
        var color = colorInput.value;
        preview.innerHTML = '<span class="tag-badge" style="background:' + color + ';font-size:0.9rem;padding:0.35rem 0.85rem;">' + Utils.escapeHtml(name) + '</span>';
      }
    }

    // Patient search filter
    var patientSearch = document.getElementById('tag-patient-search');
    if (patientSearch) {
      patientSearch.addEventListener('input', function() {
        var q = this.value.toLowerCase();
        var rows = container.querySelectorAll('.tag-patient-row');
        for (var r = 0; r < rows.length; r++) {
          var name = rows[r].getAttribute('data-name');
          rows[r].style.display = (!q || name.indexOf(q) !== -1) ? '' : 'none';
        }
      });
    }

    // Checkbox visual toggle
    var checkboxes = container.querySelectorAll('.tag-patient-cb');
    for (var ci = 0; ci < checkboxes.length; ci++) {
      checkboxes[ci].addEventListener('change', function() {
        this.parentElement.classList.toggle('assigned', this.checked);
      });
    }

    // Save
    if (saveBtn) {
      saveBtn.onclick = function() {
        var name = nameInput.value.trim();
        if (!name) {
          Utils.toast('Tag name is required', 'error');
          return;
        }
        var color = colorInput.value;

        var tagId = state.editId;
        if (tagId) {
          Store.updateTag(tagId, { name: name, color: color });
        } else {
          var created = Store.createTag({ name: name, color: color });
          tagId = created.id;
        }

        // Update patient assignments
        var cbs = container.querySelectorAll('.tag-patient-cb');
        for (var k = 0; k < cbs.length; k++) {
          var pid = cbs[k].value;
          var patient = Store.getPatient(pid);
          if (!patient) continue;
          var tags = (patient.tags || []).slice();
          var idx = tags.indexOf(tagId);
          if (cbs[k].checked && idx === -1) {
            tags.push(tagId);
            Store.updatePatient(pid, { tags: tags });
          } else if (!cbs[k].checked && idx !== -1) {
            tags.splice(idx, 1);
            Store.updatePatient(pid, { tags: tags });
          }
        }

        Utils.toast(state.editId ? 'Tag updated' : 'Tag created', 'success');
        state.subView = 'list';
        state.editId = null;
        renderView(container);
      };
    }
  }

  return { render: render };
})();
