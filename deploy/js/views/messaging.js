/* ============================================
   Messaging View - MobiPhysio Messaging
   ============================================ */
window.MessagingView = (function() {

  var _clickHandler = null;

  var state = {
    tab: 'compose',
    selectedTags: [],
    selectedPatients: [],
    messageText: '',
    selectedTemplate: '',
    templateSubView: 'list',
    templateEditId: null,
    historyPage: 1,
    historyPerPage: 10,
    // Campaign state
    campaignTags: [],
    campaignText: '',
    campaignType: 'campaign',
    campaignHistory: [],
    campaignHistoryLoaded: false
  };

  function render(container) {
    state.tab = 'compose';
    state.selectedTags = [];
    state.selectedPatients = [];
    state.messageText = '';
    state.selectedTemplate = '';
    state.templateSubView = 'list';
    state.templateEditId = null;
    state.historyPage = 1;
    state.campaignTags = [];
    state.campaignText = '';
    state.campaignType = 'campaign';
    state.campaignHistory = [];
    state.campaignHistoryLoaded = false;
    renderView(container);
  }

  function renderView(container) {
    var html = '';

    // Tabs
    html += '<div class="tabs">';
    html += '<button class="tab-btn' + (state.tab === 'compose' ? ' active' : '') + '" data-tab="compose">Compose</button>';
    html += '<button class="tab-btn' + (state.tab === 'campaigns' ? ' active' : '') + '" data-tab="campaigns">Campaigns</button>';
    html += '<button class="tab-btn' + (state.tab === 'templates' ? ' active' : '') + '" data-tab="templates">Templates</button>';
    html += '<button class="tab-btn' + (state.tab === 'history' ? ' active' : '') + '" data-tab="history">History</button>';
    html += '</div>';

    if (state.tab === 'compose') {
      html += renderCompose();
    } else if (state.tab === 'campaigns') {
      html += renderCampaigns();
    } else if (state.tab === 'templates') {
      if (state.templateSubView === 'form') {
        html += renderTemplateForm();
      } else {
        html += renderTemplates();
      }
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
        html += '<div class="patient-select-phone">' + Utils.escapeHtml(pt.phone || '') + '</div>';
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
    html += '<button class="btn btn-primary" id="send-compose-btn" style="width:100%;">';
    html += '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> ';
    html += 'Send to MobiPhysio (' + state.selectedPatients.length + ')</button>';

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

  function renderTemplateForm() {
    var template = state.templateEditId ? Store.getMessageTemplate(state.templateEditId) : null;
    var isEdit = !!template;

    var html = '<div class="inline-form-card">';
    html += '<div class="inline-form-header">';
    html += '<button class="back-btn" id="tpl-form-back">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>';
    html += '</button>';
    html += '<h3>' + (isEdit ? 'Edit Template' : 'New Template') + '</h3>';
    html += '</div>';
    html += '<div class="inline-form-body">';

    html += '<form id="template-form">';
    html += '<div class="form-group"><label>Template Name</label>';
    html += '<input type="text" name="name" value="' + Utils.escapeHtml(template ? template.name : '') + '" required placeholder="e.g., Appointment Reminder"></div>';
    html += '<div class="form-group"><label>Message Text ' + Utils.micHtml('tpl-text') + '</label>';
    html += '<textarea id="tpl-text" name="text" rows="5" required placeholder="Type message... Use {name}, {date}, {time}">' + Utils.escapeHtml(template ? template.text : '') + '</textarea>';
    html += '<div class="form-hint">Variables: {name} = patient name, {date} = today\'s date, {time} = current time</div>';
    html += '</div>';
    html += '</form>';

    html += '</div>';
    html += '<div class="inline-form-actions">';
    html += '<button class="btn btn-secondary" id="tpl-form-cancel">Cancel</button>';
    html += '<button class="btn btn-primary" id="tpl-form-save">' + (isEdit ? 'Update' : 'Create') + ' Template</button>';
    html += '</div>';
    html += '</div>';

    return html;
  }

  // ==================== CAMPAIGNS TAB ====================
  function renderCampaigns() {
    var tags = Store.getTags();
    var html = '';

    html += '<div class="messaging-grid">';

    // Left column - Campaign Compose
    html += '<div>';
    html += '<div class="card mb-2"><div class="card-header"><h3>Send Campaign Message</h3></div><div class="card-body">';
    html += '<div class="form-hint" style="margin-bottom:1rem;">Send in-app messages to patients in the MobiPhysio app. Select target tags or leave empty to broadcast to all patients.</div>';

    // Type selector
    html += '<div class="form-group"><label>Message Type</label>';
    html += '<select id="campaign-type">';
    html += '<option value="campaign"' + (state.campaignType === 'campaign' ? ' selected' : '') + '>Campaign (Promotional)</option>';
    html += '<option value="announcement"' + (state.campaignType === 'announcement' ? ' selected' : '') + '>Announcement (Important)</option>';
    html += '</select></div>';

    // Tag selection
    html += '<div style="margin-bottom:0.75rem;"><label style="font-size:0.78rem;font-weight:600;color:var(--gray-500);display:block;margin-bottom:0.35rem;">Target Tags (empty = all patients)</label>';
    html += '<div class="tag-filter-bar">';
    for (var j = 0; j < tags.length; j++) {
      var isActive = state.campaignTags.indexOf(tags[j].id) !== -1;
      html += '<span class="tag-chip campaign-tag-chip' + (isActive ? ' active' : '') + '" data-tag-id="' + tags[j].id + '" style="' + (isActive ? 'background:' + tags[j].color + ';border-color:' + tags[j].color + ';' : '') + '">' + Utils.escapeHtml(tags[j].name) + '</span>';
    }
    html += '</div></div>';

    // Count of targeted patients
    var patients = Store.getPatients();
    var targetCount = 0;
    for (var ci = 0; ci < patients.length; ci++) {
      if (patients[ci].status !== 'active') continue;
      if (state.campaignTags.length === 0) { targetCount++; continue; }
      for (var ct = 0; ct < state.campaignTags.length; ct++) {
        if (patients[ci].tags && patients[ci].tags.indexOf(state.campaignTags[ct]) !== -1) {
          targetCount++;
          break;
        }
      }
    }
    html += '<div class="form-hint" style="margin-bottom:0.75rem;">Targeting <strong>' + targetCount + '</strong> patient' + (targetCount !== 1 ? 's' : '') + '</div>';

    // Message text
    html += '<div class="form-group"><label>Message</label>';
    html += '<textarea id="campaign-text" rows="4" placeholder="Type your campaign message...">' + Utils.escapeHtml(state.campaignText) + '</textarea></div>';

    // Send button
    html += '<button class="btn btn-primary" id="send-campaign-btn" style="width:100%;">Send Campaign to ' + targetCount + ' Patient' + (targetCount !== 1 ? 's' : '') + '</button>';
    html += '</div></div>';
    html += '</div>';

    // Right column - Campaign History
    html += '<div>';
    html += '<div class="card mb-2"><div class="card-header"><h3>Sent Campaigns</h3></div><div class="card-body">';
    if (!state.campaignHistoryLoaded) {
      html += '<div class="empty-state"><p>Loading campaigns...</p></div>';
    } else if (state.campaignHistory.length === 0) {
      html += '<div class="empty-state"><p>No campaigns sent yet</p></div>';
    } else {
      for (var hi = 0; hi < state.campaignHistory.length; hi++) {
        var msg = state.campaignHistory[hi];
        var tagNames = [];
        if (msg.targetTags && msg.targetTags.length > 0) {
          for (var tn = 0; tn < msg.targetTags.length; tn++) {
            var tag = Store.getTag(msg.targetTags[tn]);
            tagNames.push(tag ? tag.name : msg.targetTags[tn]);
          }
        }
        html += '<div style="padding:0.75rem;border:1px solid var(--border);border-radius:var(--radius);margin-bottom:0.5rem;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.35rem;">';
        html += '<span class="badge ' + (msg.type === 'announcement' ? 'badge-warning' : 'badge-teal') + '">' + Utils.escapeHtml(msg.type || 'campaign') + '</span>';
        html += '<span style="font-size:0.75rem;color:var(--gray-500);">' + Utils.timeAgo(msg.sentAt) + '</span>';
        html += '</div>';
        html += '<div style="font-size:0.88rem;margin-bottom:0.35rem;">' + Utils.escapeHtml(msg.text) + '</div>';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
        html += '<div style="font-size:0.75rem;color:var(--gray-500);">By ' + Utils.escapeHtml(msg.sentBy || 'Unknown');
        if (tagNames.length > 0) {
          html += ' &middot; Tags: ' + Utils.escapeHtml(tagNames.join(', '));
        } else {
          html += ' &middot; All patients';
        }
        html += '</div>';
        html += '<button class="btn btn-sm btn-ghost delete-campaign-btn" data-msg-id="' + Utils.escapeHtml(msg.id) + '" style="color:var(--danger);padding:2px 6px;" title="Delete message">';
        html += '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>';
        html += '</button></div></div>';
      }
    }
    html += '</div></div>';
    html += '</div>';

    html += '</div>'; // end messaging-grid
    return html;
  }

  function loadCampaignHistory(container) {
    if (!window.FirebaseSync || !FirebaseSync.getDb()) {
      state.campaignHistoryLoaded = true;
      return;
    }
    var db = FirebaseSync.getDb();
    var clinicId = FirebaseSync.getClinicId();
    db.collection('clinics').doc(clinicId).collection('patient_messages')
      .orderBy('sentAt', 'desc').limit(20).get()
      .then(function(snapshot) {
        state.campaignHistory = [];
        snapshot.forEach(function(doc) {
          state.campaignHistory.push(doc.data());
        });
        state.campaignHistoryLoaded = true;
        renderView(container);
      }).catch(function(e) {
        console.error('[Messaging] Failed to load campaigns:', e);
        state.campaignHistoryLoaded = true;
        renderView(container);
      });
  }

  // ==================== HISTORY TAB ====================
  function renderHistory() {
    var log = Store.getMessageLog();
    log.sort(function(a, b) { return a.createdAt > b.createdAt ? -1 : 1; });

    var total = log.length;
    var totalPages = Math.max(1, Math.ceil(total / state.historyPerPage));
    if (state.historyPage > totalPages) state.historyPage = totalPages;
    var start = (state.historyPage - 1) * state.historyPerPage;
    var pageItems = log.slice(start, start + state.historyPerPage);

    var html = '<h3 style="font-size:1rem;margin-bottom:1rem;">Message History (' + total + ')</h3>';

    if (total === 0) {
      html += '<div class="empty-state"><p>No messages sent yet</p></div>';
    } else {
      html += '<div class="card"><div class="table-wrapper">';
      html += '<table class="data-table"><thead><tr>';
      html += '<th>Date</th><th>Patient</th><th>Message</th><th style="width:50px;"></th>';
      html += '</tr></thead><tbody>';
      for (var i = 0; i < pageItems.length; i++) {
        var entry = pageItems[i];
        var truncMsg = (entry.message || '').length > 60 ? entry.message.substring(0, 60) + '...' : (entry.message || '');
        html += '<tr class="no-hover">';
        html += '<td>' + Utils.timeAgo(entry.createdAt) + '</td>';
        html += '<td style="font-weight:500;">' + Utils.escapeHtml(entry.patientName || 'Unknown') + '</td>';
        html += '<td style="font-size:0.82rem;color:var(--gray-600);">' + Utils.escapeHtml(truncMsg) + '</td>';
        html += '<td><button class="btn btn-sm btn-ghost delete-history-btn" data-id="' + entry.id + '" style="color:var(--danger);padding:2px 6px;" title="Delete">';
        html += '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>';
        html += '</button></td>';
        html += '</tr>';
      }
      html += '</tbody></table></div>';

      // Pagination
      if (total > state.historyPerPage) {
        html += '<div class="card-footer"><div class="pagination">';
        html += '<span>Showing ' + (start + 1) + '-' + Math.min(start + state.historyPerPage, total) + ' of ' + total + '</span>';
        html += '<div class="pagination-buttons">';
        html += '<button class="page-btn history-page-btn" data-page="' + (state.historyPage - 1) + '"' + (state.historyPage <= 1 ? ' disabled' : '') + '>&laquo;</button>';
        for (var pg = 1; pg <= totalPages; pg++) {
          html += '<button class="page-btn history-page-btn' + (pg === state.historyPage ? ' active' : '') + '" data-page="' + pg + '">' + pg + '</button>';
        }
        html += '<button class="page-btn history-page-btn" data-page="' + (state.historyPage + 1) + '"' + (state.historyPage >= totalPages ? ' disabled' : '') + '>&raquo;</button>';
        html += '</div></div></div>';
      }

      html += '</div>';
    }
    return html;
  }

  // ==================== EVENT BINDING ====================
  function bindEvents(container) {
    if (_clickHandler) container.removeEventListener('click', _clickHandler);

    _clickHandler = function(e) {
      var tabBtn = e.target.closest('.tab-btn');
      if (tabBtn) {
        state.tab = tabBtn.getAttribute('data-tab');
        state.templateSubView = 'list';
        state.templateEditId = null;
        state.historyPage = 1;
        if (state.tab === 'campaigns' && !state.campaignHistoryLoaded) {
          renderView(container);
          loadCampaignHistory(container);
          return;
        }
        renderView(container);
        return;
      }

      // History pagination
      var historyPageBtn = e.target.closest('.history-page-btn');
      if (historyPageBtn && !historyPageBtn.disabled) {
        state.historyPage = parseInt(historyPageBtn.getAttribute('data-page'), 10);
        renderView(container);
        return;
      }

      // Delete campaign message (Firestore)
      var delCampaignBtn = e.target.closest('.delete-campaign-btn');
      if (delCampaignBtn) {
        var msgId = delCampaignBtn.getAttribute('data-msg-id');
        Utils.inlineConfirm(container, 'Delete this message? It will be removed from all patients\u0027 MobiPhysio app.', function() {
          if (window.FirebaseSync && FirebaseSync.deleteCampaignMessage) {
            FirebaseSync.deleteCampaignMessage(msgId).then(function() {
              state.campaignHistory = state.campaignHistory.filter(function(m) { return m.id !== msgId; });
              Utils.toast('Message deleted', 'success');
              renderView(container);
            });
          }
        }, { danger: true });
        return;
      }

      // Delete message log entry (localStorage)
      var delHistoryBtn = e.target.closest('.delete-history-btn');
      if (delHistoryBtn) {
        var logId = delHistoryBtn.getAttribute('data-id');
        Utils.inlineConfirm(container, 'Delete this log entry?', function() {
          Store.deleteMessageLog(logId);
          Utils.toast('Log entry deleted', 'success');
          renderView(container);
        }, { danger: true });
        return;
      }

      // Campaign tag chip toggle
      var campaignTagChip = e.target.closest('.campaign-tag-chip');
      if (campaignTagChip) {
        var cTagId = campaignTagChip.getAttribute('data-tag-id');
        var cIdx = state.campaignTags.indexOf(cTagId);
        if (cIdx !== -1) {
          state.campaignTags.splice(cIdx, 1);
        } else {
          state.campaignTags.push(cTagId);
        }
        renderView(container);
        return;
      }

      // Send campaign
      if (e.target.closest('#send-campaign-btn')) {
        sendCampaign(container);
        return;
      }

      // Tag chip toggle (compose tab)
      var tagChip = e.target.closest('.tag-chip:not(.campaign-tag-chip)');
      if (tagChip) {
        var tagId = tagChip.getAttribute('data-tag-id');
        var idx = state.selectedTags.indexOf(tagId);
        if (idx !== -1) {
          state.selectedTags.splice(idx, 1);
        } else {
          state.selectedTags.push(tagId);
        }
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

      // Send message (compose)
      if (e.target.closest('#send-compose-btn')) {
        sendCompose(container);
        return;
      }

      // Templates tab
      if (e.target.closest('#add-template-btn')) {
        state.templateSubView = 'form';
        state.templateEditId = null;
        renderView(container);
        return;
      }
      var editTplBtn = e.target.closest('.edit-template-btn');
      if (editTplBtn) {
        state.templateSubView = 'form';
        state.templateEditId = editTplBtn.getAttribute('data-id');
        renderView(container);
        return;
      }
      var deleteTplBtn = e.target.closest('.delete-template-btn');
      if (deleteTplBtn) {
        Utils.inlineConfirm(container, 'Delete this template?', function() {
          Store.deleteMessageTemplate(deleteTplBtn.getAttribute('data-id'));
          Utils.toast('Template deleted', 'success');
          renderView(container);
        }, { danger: true });
        return;
      }

      // Template form buttons
      if (e.target.closest('#tpl-form-back') || e.target.closest('#tpl-form-cancel')) {
        state.templateSubView = 'list';
        state.templateEditId = null;
        renderView(container);
        return;
      }
      if (e.target.closest('#tpl-form-save')) {
        saveTemplate(container);
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

    // Campaign type selector
    var campaignType = document.getElementById('campaign-type');
    if (campaignType) {
      campaignType.addEventListener('change', function() {
        state.campaignType = this.value;
      });
    }

    // Campaign textarea
    var campaignText = document.getElementById('campaign-text');
    if (campaignText) {
      campaignText.addEventListener('input', function() {
        state.campaignText = this.value;
      });
    }

    // Message textarea
    var msgText = document.getElementById('message-text');
    if (msgText) {
      msgText.addEventListener('input', function() {
        state.messageText = this.value;
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
    var hh = ('0' + now.getHours()).slice(-2);
    var mm = ('0' + now.getMinutes()).slice(-2);
    var result = text.replace(/\{name\}/g, patient.name || '');
    result = result.replace(/\{date\}/g, Utils.formatDate(Utils.today()));
    result = result.replace(/\{time\}/g, Utils.formatTime(hh + ':' + mm));
    return result;
  }

  function cleanPhone(phone) {
    if (!phone) return '';
    return phone.replace(/[^\d]/g, '');
  }

  function hasValidPhone(patient) {
    var phone = cleanPhone(patient.phone);
    return phone.length >= 7;
  }

  function sendCompose(container) {
    if (state.selectedPatients.length === 0) {
      Utils.toast('Please select at least one patient', 'error');
      return;
    }
    if (!state.messageText.trim()) {
      Utils.toast('Please enter a message', 'error');
      return;
    }

    if (!window.FirebaseSync || !FirebaseSync.saveCampaignMessage) {
      Utils.toast('Firebase not available - message not sent', 'error');
      return;
    }

    var currentUser = null;
    try { currentUser = JSON.parse(sessionStorage.getItem('physio_user')); } catch(e) {}
    var appMsg = {
      id: 'msg_' + Date.now(),
      text: state.messageText.trim(),
      targetPatients: state.selectedPatients.slice(),
      targetTags: [],
      sentBy: (currentUser && currentUser.name) || 'Unknown',
      sentAt: new Date().toISOString(),
      type: 'message'
    };
    FirebaseSync.saveCampaignMessage(null, appMsg).then(function() {
      Utils.toast('Message sent (' + state.selectedPatients.length + ' patients)', 'success');
      Store.logActivity('Message sent to ' + state.selectedPatients.length + ' patient(s)');
      state.messageText = '';
      state.selectedPatients = [];
      renderView(container);
    }).catch(function() {
      Utils.toast('Failed to send message', 'error');
    });
  }

  function sendCampaign(container) {
    if (!state.campaignText.trim()) {
      Utils.toast('Please enter a message', 'error');
      return;
    }
    if (!window.FirebaseSync || !FirebaseSync.saveCampaignMessage) {
      Utils.toast('Firebase not available', 'error');
      return;
    }
    var currentUser = null;
    try { currentUser = JSON.parse(sessionStorage.getItem('physio_user')); } catch(e) {}
    var message = {
      id: 'msg_' + Date.now(),
      text: state.campaignText.trim(),
      targetTags: state.campaignTags.slice(),
      sentBy: (currentUser && currentUser.name) || 'Unknown',
      sentAt: new Date().toISOString(),
      type: state.campaignType
    };
    FirebaseSync.saveCampaignMessage(null, message).then(function() {
      Utils.toast('Campaign message sent!', 'success');
      Store.logActivity('Campaign message sent to ' + (state.campaignTags.length > 0 ? state.campaignTags.length + ' tag groups' : 'all patients'));
      state.campaignText = '';
      state.campaignTags = [];
      state.campaignHistoryLoaded = false;
      loadCampaignHistory(container);
    }).catch(function() {
      Utils.toast('Failed to send campaign', 'error');
    });
  }

  function saveTemplate(container) {
    var form = document.getElementById('template-form');
    var data = Utils.getFormData(form);
    if (!data.name || !data.text) {
      Utils.toast('Name and message are required', 'error');
      return;
    }
    if (state.templateEditId) {
      Store.updateMessageTemplate(state.templateEditId, data);
      Utils.toast('Template updated', 'success');
    } else {
      Store.createMessageTemplate(data);
      Utils.toast('Template created', 'success');
    }
    state.templateSubView = 'list';
    state.templateEditId = null;
    renderView(container);
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
