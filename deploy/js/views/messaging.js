/* ============================================
   Messaging View - WhatsApp Messaging
   ============================================ */
window.MessagingView = (function() {

  var _clickHandler = null;

  var state = {
    tab: 'compose',
    selectedTags: [],
    selectedPatients: [],
    messageText: '',
    selectedTemplate: ''
  };

  function render(container) {
    state.selectedTags = [];
    state.selectedPatients = [];
    state.messageText = '';
    state.selectedTemplate = '';
    renderView(container);
  }

  function renderView(container) {
    var html = '';

    // Tabs
    html += '<div class="tabs">';
    html += '<button class="tab-btn' + (state.tab === 'compose' ? ' active' : '') + '" data-tab="compose">Compose</button>';
    html += '<button class="tab-btn' + (state.tab === 'templates' ? ' active' : '') + '" data-tab="templates">Templates</button>';
    html += '<button class="tab-btn' + (state.tab === 'history' ? ' active' : '') + '" data-tab="history">History</button>';
    html += '</div>';

    if (state.tab === 'compose') {
      html += renderCompose();
    } else if (state.tab === 'templates') {
      html += renderTemplates();
    } else if (state.tab === 'history') {
      html += renderHistory();
    }

    container.innerHTML = html;
    bindEvents(container);
    Utils.bindMicButtons(container);
  }

  // ==================== COMPOSE TAB ====================
  function renderCompose() {
    var tags = Store.getTags();
    var patients = Store.getPatients();
    var templates = Store.getMessageTemplates();

    // Filter patients by selected tags
    var filteredPatients = [];
    for (var i = 0; i < patients.length; i++) {
      var p = patients[i];
      if (p.status !== 'active') continue;
      if (state.selectedTags.length > 0) {
        var hasTag = false;
        for (var t = 0; t < state.selectedTags.length; t++) {
          if (p.tags && p.tags.indexOf(state.selectedTags[t]) !== -1) {
            hasTag = true;
            break;
          }
        }
        if (!hasTag) continue;
      }
      filteredPatients.push(p);
    }
    filteredPatients.sort(function(a, b) { return a.name.localeCompare(b.name); });

    var html = '<div class="messaging-grid">';

    // Left column - Patient Selection
    html += '<div>';
    html += '<div class="card mb-2"><div class="card-header"><h3>Select Patients</h3>';
    html += '<span class="badge badge-teal">' + state.selectedPatients.length + ' selected</span>';
    html += '</div><div class="card-body">';

    // Tag filter chips
    html += '<div style="margin-bottom:0.75rem;"><label style="font-size:0.78rem;font-weight:600;color:var(--gray-500);display:block;margin-bottom:0.35rem;">Filter by Tag</label>';
    html += '<div class="tag-filter-bar">';
    for (var j = 0; j < tags.length; j++) {
      var isActive = state.selectedTags.indexOf(tags[j].id) !== -1;
      html += '<span class="tag-chip' + (isActive ? ' active' : '') + '" data-tag-id="' + tags[j].id + '" style="' + (isActive ? 'background:' + tags[j].color + ';border-color:' + tags[j].color + ';' : '') + '">' + Utils.escapeHtml(tags[j].name) + '</span>';
    }
    html += '</div></div>';

    // Select all / none
    html += '<div style="display:flex;gap:0.5rem;margin-bottom:0.5rem;">';
    html += '<button class="btn btn-sm btn-ghost" id="select-all-patients">Select All</button>';
    html += '<button class="btn btn-sm btn-ghost" id="select-none-patients">Select None</button>';
    html += '</div>';

    // Patient list
    html += '<div class="patient-select-list">';
    if (filteredPatients.length === 0) {
      html += '<div class="empty-state" style="padding:1.5rem;"><p>No patients match the selected tags</p></div>';
    } else {
      for (var k = 0; k < filteredPatients.length; k++) {
        var pt = filteredPatients[k];
        var isChecked = state.selectedPatients.indexOf(pt.id) !== -1;
        html += '<label class="patient-select-item">';
        html += '<input type="checkbox" class="patient-check" data-patient-id="' + pt.id + '"' + (isChecked ? ' checked' : '') + '>';
        html += '<div>';
        html += '<div class="patient-select-name">' + Utils.escapeHtml(pt.name) + '</div>';
        html += '<div class="patient-select-phone">' + Utils.escapeHtml(pt.phone || 'No phone') + '</div>';
        html += '</div></label>';
      }
    }
    html += '</div>';
    html += '</div></div>';
    html += '</div>';

    // Right column - Message Composition
    html += '<div>';
    html += '<div class="card mb-2"><div class="card-header"><h3>Compose Message</h3></div><div class="card-body">';

    // Template selector
    html += '<div class="form-group"><label>Template</label>';
    html += '<select id="template-selector">';
    html += '<option value="">Custom Message</option>';
    for (var m = 0; m < templates.length; m++) {
      html += '<option value="' + templates[m].id + '"' + (state.selectedTemplate === templates[m].id ? ' selected' : '') + '>' + Utils.escapeHtml(templates[m].name) + '</option>';
    }
    html += '</select></div>';

    // Message text
    html += '<div class="form-group"><label>Message ' + Utils.micHtml('message-text') + '</label>';
    html += '<textarea id="message-text" rows="5" placeholder="Type your message... Use {name}, {date}, {time} for variables">' + Utils.escapeHtml(state.messageText) + '</textarea>';
    html += '<div class="form-hint">Variables: {name} = patient name, {date} = today\'s date, {time} = current time</div>';
    html += '</div>';

    // Preview
    html += '<div class="form-group"><label>Preview</label>';
    html += '<div class="message-preview" id="message-preview">';
    if (state.messageText && state.selectedPatients.length > 0) {
      var previewPatient = Store.getPatient(state.selectedPatients[0]);
      if (previewPatient) {
        html += Utils.escapeHtml(resolveVariables(state.messageText, previewPatient));
      }
    } else {
      html += '<span style="color:var(--gray-400);">Select patients and enter a message to see preview</span>';
    }
    html += '</div></div>';

    // Send button
    html += '<button class="btn btn-whatsapp" id="send-whatsapp-btn" style="width:100%;">';
    html += '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.61.61l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.33 0-4.484-.763-6.227-2.053l-.436-.334-2.652.889.889-2.652-.334-.436A9.935 9.935 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>';
    html += ' Send via WhatsApp (' + state.selectedPatients.length + ')</button>';

    html += '</div></div>';
    html += '</div>';

    html += '</div>'; // end messaging-grid
    return html;
  }

  // ==================== TEMPLATES TAB ====================
  function renderTemplates() {
    var templates = Store.getMessageTemplates();
    var html = '';

    html += '<div class="flex-between mb-2">';
    html += '<h3 style="font-size:1rem;">Message Templates (' + templates.length + ')</h3>';
    html += '<button class="btn btn-primary btn-sm" id="add-template-btn">Add Template</button>';
    html += '</div>';

    if (templates.length === 0) {
      html += '<div class="empty-state"><p>No templates yet</p></div>';
    } else {
      html += '<div class="card"><div class="table-wrapper">';
      html += '<table class="data-table"><thead><tr>';
      html += '<th>Name</th><th>Message</th><th>Actions</th>';
      html += '</tr></thead><tbody>';
      for (var i = 0; i < templates.length; i++) {
        var t = templates[i];
        var truncText = t.text.length > 80 ? t.text.substring(0, 80) + '...' : t.text;
        html += '<tr class="no-hover">';
        html += '<td style="font-weight:600;">' + Utils.escapeHtml(t.name) + '</td>';
        html += '<td style="font-size:0.82rem;color:var(--gray-600);max-width:400px;">' + Utils.escapeHtml(truncText) + '</td>';
        html += '<td><div class="btn-group">';
        html += '<button class="btn btn-sm btn-ghost edit-template-btn" data-id="' + t.id + '">Edit</button>';
        html += '<button class="btn btn-sm btn-ghost delete-template-btn" data-id="' + t.id + '" style="color:var(--danger);">Delete</button>';
        html += '</div></td>';
        html += '</tr>';
      }
      html += '</tbody></table></div></div>';
    }
    return html;
  }

  // ==================== HISTORY TAB ====================
  function renderHistory() {
    var log = Store.getMessageLog();
    log.sort(function(a, b) { return a.createdAt > b.createdAt ? -1 : 1; });

    var html = '<h3 style="font-size:1rem;margin-bottom:1rem;">Message History (' + log.length + ')</h3>';

    if (log.length === 0) {
      html += '<div class="empty-state"><p>No messages sent yet</p></div>';
    } else {
      html += '<div class="card"><div class="table-wrapper">';
      html += '<table class="data-table"><thead><tr>';
      html += '<th>Date</th><th>Patient</th><th>Message</th>';
      html += '</tr></thead><tbody>';
      for (var i = 0; i < log.length; i++) {
        var entry = log[i];
        var truncMsg = (entry.message || '').length > 60 ? entry.message.substring(0, 60) + '...' : (entry.message || '');
        html += '<tr class="no-hover">';
        html += '<td>' + Utils.timeAgo(entry.createdAt) + '</td>';
        html += '<td style="font-weight:500;">' + Utils.escapeHtml(entry.patientName || 'Unknown') + '</td>';
        html += '<td style="font-size:0.82rem;color:var(--gray-600);">' + Utils.escapeHtml(truncMsg) + '</td>';
        html += '</tr>';
      }
      html += '</tbody></table></div></div>';
    }
    return html;
  }

  // ==================== EVENT BINDING ====================
  function bindEvents(container) {
    // Remove old click handler to prevent duplicates
    if (_clickHandler) container.removeEventListener('click', _clickHandler);

    _clickHandler = function(e) {
      var tabBtn = e.target.closest('.tab-btn');
      if (tabBtn) {
        state.tab = tabBtn.getAttribute('data-tab');
        renderView(container);
        return;
      }

      // Tag chip toggle
      var tagChip = e.target.closest('.tag-chip');
      if (tagChip) {
        var tagId = tagChip.getAttribute('data-tag-id');
        var idx = state.selectedTags.indexOf(tagId);
        if (idx !== -1) {
          state.selectedTags.splice(idx, 1);
        } else {
          state.selectedTags.push(tagId);
        }
        // Reset patient selection when tag filter changes
        state.selectedPatients = [];
        renderView(container);
        return;
      }

      // Select all / none patients
      if (e.target.closest('#select-all-patients')) {
        var checks = container.querySelectorAll('.patient-check');
        state.selectedPatients = [];
        for (var i = 0; i < checks.length; i++) {
          state.selectedPatients.push(checks[i].getAttribute('data-patient-id'));
        }
        renderView(container);
        return;
      }
      if (e.target.closest('#select-none-patients')) {
        state.selectedPatients = [];
        renderView(container);
        return;
      }

      // Send WhatsApp
      if (e.target.closest('#send-whatsapp-btn')) {
        sendWhatsApp(container);
        return;
      }

      // Templates tab
      if (e.target.closest('#add-template-btn')) {
        showTemplateForm(null, container);
        return;
      }
      var editTplBtn = e.target.closest('.edit-template-btn');
      if (editTplBtn) {
        showTemplateForm(editTplBtn.getAttribute('data-id'), container);
        return;
      }
      var deleteTplBtn = e.target.closest('.delete-template-btn');
      if (deleteTplBtn) {
        Utils.confirm('Delete this template?', function() {
          Store.deleteMessageTemplate(deleteTplBtn.getAttribute('data-id'));
          Utils.toast('Template deleted', 'success');
          renderView(container);
        });
        return;
      }
    };
    container.addEventListener('click', _clickHandler);

    // Patient checkboxes
    var patientChecks = container.querySelectorAll('.patient-check');
    for (var j = 0; j < patientChecks.length; j++) {
      patientChecks[j].addEventListener('change', function() {
        var pid = this.getAttribute('data-patient-id');
        var idx = state.selectedPatients.indexOf(pid);
        if (this.checked && idx === -1) {
          state.selectedPatients.push(pid);
        } else if (!this.checked && idx !== -1) {
          state.selectedPatients.splice(idx, 1);
        }
        renderView(container);
      });
    }

    // Template selector
    var tplSelect = document.getElementById('template-selector');
    if (tplSelect) {
      tplSelect.addEventListener('change', function() {
        state.selectedTemplate = this.value;
        if (this.value) {
          var tpl = Store.getMessageTemplate(this.value);
          if (tpl) state.messageText = tpl.text;
        }
        renderView(container);
      });
    }

    // Message textarea
    var msgText = document.getElementById('message-text');
    if (msgText) {
      msgText.addEventListener('input', function() {
        state.messageText = this.value;
        // Update preview
        var preview = document.getElementById('message-preview');
        if (preview && state.selectedPatients.length > 0) {
          var previewPatient = Store.getPatient(state.selectedPatients[0]);
          if (previewPatient) {
            preview.textContent = resolveVariables(state.messageText, previewPatient);
          }
        }
      });
    }
  }

  function resolveVariables(text, patient) {
    var now = new Date();
    var result = text.replace(/\{name\}/g, patient.name || '');
    result = result.replace(/\{date\}/g, Utils.formatDate(Utils.today()));
    result = result.replace(/\{time\}/g, Utils.formatTime(now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0')));
    return result;
  }

  function cleanPhone(phone) {
    if (!phone) return '';
    // Strip non-digits
    return phone.replace(/[^\d]/g, '');
  }

  function sendWhatsApp(container) {
    if (state.selectedPatients.length === 0) {
      Utils.toast('Please select at least one patient', 'error');
      return;
    }
    if (!state.messageText.trim()) {
      Utils.toast('Please enter a message', 'error');
      return;
    }

    var patients = [];
    for (var i = 0; i < state.selectedPatients.length; i++) {
      var p = Store.getPatient(state.selectedPatients[i]);
      if (p) patients.push(p);
    }

    if (patients.length === 1) {
      // Single patient - open directly
      var pt = patients[0];
      var msg = resolveVariables(state.messageText, pt);
      var phone = cleanPhone(pt.phone);
      var pCode = (pt.phoneCode || Utils.getPhoneCode()).replace('+', '');
      var url = 'https://wa.me/' + pCode + phone + '?text=' + encodeURIComponent(msg);
      window.open(url, '_blank');

      // Log
      Store.createMessageLog({
        patientId: pt.id,
        patientName: pt.name,
        phone: pt.phone,
        message: msg
      });
      Store.logActivity('WhatsApp message sent to ' + pt.name);
      Utils.toast('Opening WhatsApp for ' + pt.name, 'success');
    } else {
      // Multiple patients - show modal with links
      var body = '<p class="confirm-text">Click each link to open WhatsApp for each patient:</p>';
      body += '<div style="max-height:350px;overflow-y:auto;">';
      for (var j = 0; j < patients.length; j++) {
        var p2 = patients[j];
        var msg2 = resolveVariables(state.messageText, p2);
        var phone2 = cleanPhone(p2.phone);
        var pCode2 = (p2.phoneCode || Utils.getPhoneCode()).replace('+', '');
        var url2 = 'https://wa.me/' + pCode2 + phone2 + '?text=' + encodeURIComponent(msg2);
        body += '<div style="display:flex;align-items:center;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid var(--gray-100);">';
        body += '<div><div style="font-weight:500;">' + Utils.escapeHtml(p2.name) + '</div>';
        body += '<div style="font-size:0.75rem;color:var(--gray-500);">' + Utils.escapeHtml(p2.phone || 'No phone') + '</div></div>';
        body += '<a href="' + url2 + '" target="_blank" class="btn btn-sm btn-whatsapp wa-link" data-patient-id="' + p2.id + '" data-patient-name="' + Utils.escapeHtml(p2.name) + '" data-message="' + Utils.escapeHtml(msg2) + '">Open</a>';
        body += '</div>';
      }
      body += '</div>';

      var footer = '<button class="btn btn-whatsapp" id="open-all-wa">Open All (' + patients.length + ')</button>';
      footer += '<button class="btn btn-secondary" id="modal-cancel">Close</button>';

      Utils.showModal('Send WhatsApp Messages', body, footer);

      // Log individual sends when clicked
      var waLinks = document.querySelectorAll('.wa-link');
      for (var k = 0; k < waLinks.length; k++) {
        waLinks[k].addEventListener('click', function() {
          var pId = this.getAttribute('data-patient-id');
          var pName = this.getAttribute('data-patient-name');
          var pMsg = this.getAttribute('data-message');
          Store.createMessageLog({
            patientId: pId,
            patientName: pName,
            message: pMsg
          });
        });
      }

      document.getElementById('modal-cancel').onclick = function() {
        Utils.closeModal();
        renderView(container);
      };
      document.getElementById('open-all-wa').onclick = function() {
        var links = document.querySelectorAll('.wa-link');
        for (var l = 0; l < links.length; l++) {
          window.open(links[l].href, '_blank');
          // Log each
          var pId = links[l].getAttribute('data-patient-id');
          var pName = links[l].getAttribute('data-patient-name');
          var pMsg = links[l].getAttribute('data-message');
          Store.createMessageLog({
            patientId: pId,
            patientName: pName,
            message: pMsg
          });
        }
        Store.logActivity('WhatsApp messages sent to ' + links.length + ' patients');
        Utils.toast('Opening WhatsApp for ' + links.length + ' patients', 'success');
        Utils.closeModal();
        renderView(container);
      };
    }
  }

  function showTemplateForm(templateId, container) {
    var template = templateId ? Store.getMessageTemplate(templateId) : null;
    var title = template ? 'Edit Template' : 'New Template';

    var body = '<form id="template-form">';
    body += '<div class="form-group"><label>Template Name</label>';
    body += '<input type="text" name="name" value="' + Utils.escapeHtml(template ? template.name : '') + '" required placeholder="e.g., Appointment Reminder"></div>';
    body += '<div class="form-group"><label>Message Text ' + Utils.micHtml('tpl-text') + '</label>';
    body += '<textarea id="tpl-text" name="text" rows="5" required placeholder="Type message... Use {name}, {date}, {time}">' + Utils.escapeHtml(template ? template.text : '') + '</textarea>';
    body += '<div class="form-hint">Variables: {name} = patient name, {date} = today\'s date, {time} = current time</div>';
    body += '</div>';
    body += '</form>';

    var footer = '<button class="btn btn-secondary" id="modal-cancel">Cancel</button>';
    footer += '<button class="btn btn-primary" id="modal-save">' + (template ? 'Update' : 'Create') + ' Template</button>';

    Utils.showModal(title, body, footer);

    Utils.bindMicButtons(document.getElementById('modal-body'));

    document.getElementById('modal-cancel').onclick = Utils.closeModal;
    document.getElementById('modal-save').onclick = function() {
      var form = document.getElementById('template-form');
      var data = Utils.getFormData(form);
      if (!data.name || !data.text) {
        Utils.toast('Name and message are required', 'error');
        return;
      }
      if (template) {
        Store.updateMessageTemplate(template.id, data);
        Utils.toast('Template updated', 'success');
      } else {
        Store.createMessageTemplate(data);
        Utils.toast('Template created', 'success');
      }
      Utils.closeModal();
      renderView(container);
    };
  }

  return { render: render };
})();
