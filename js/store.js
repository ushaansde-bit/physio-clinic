/* ============================================
   Store - localStorage CRUD + Seed Data
   Multi-tenant: keys scoped by clinicId
   ============================================ */
window.Store = (function() {

  // Dynamic key scoped to current clinic
  function KEY(name) {
    var cid = sessionStorage.getItem('physio_clinicId') || 'default';
    return 'physio_' + cid + '_' + name;
  }

  // Legacy static keys (used during migration check only)
  var LEGACY_KEYS = {
    users: 'physio_users',
    patients: 'physio_patients',
    appointments: 'physio_appointments',
    sessions: 'physio_sessions',
    exercises: 'physio_exercises',
    billing: 'physio_billing',
    activity: 'physio_activity_log',
    tags: 'physio_tags',
    messageTemplates: 'physio_message_templates',
    messageLog: 'physio_message_log',
    prescriptions: 'physio_prescriptions'
  };

  // Property-style accessor that returns scoped keys
  var KEYS = {
    get users() { return KEY('users'); },
    get patients() { return KEY('patients'); },
    get appointments() { return KEY('appointments'); },
    get sessions() { return KEY('sessions'); },
    get exercises() { return KEY('exercises'); },
    get billing() { return KEY('billing'); },
    get activity() { return KEY('activity_log'); },
    get tags() { return KEY('tags'); },
    get messageTemplates() { return KEY('message_templates'); },
    get messageLog() { return KEY('message_log'); },
    get prescriptions() { return KEY('prescriptions'); }
  };

  // --- Clinic Settings ---
  function getClinicSettings() {
    var cid = sessionStorage.getItem('physio_clinicId') || 'default';
    try {
      return JSON.parse(localStorage.getItem('physio_clinic_' + cid)) || {};
    } catch(e) { return {}; }
  }

  function saveClinicSettings(settings) {
    var cid = sessionStorage.getItem('physio_clinicId') || 'default';
    localStorage.setItem('physio_clinic_' + cid, JSON.stringify(settings));
    // Sync to Firestore
    if (window.FirebaseSync && FirebaseSync.saveClinicDoc) {
      FirebaseSync.saveClinicDoc(settings);
    }
  }

  function isFeatureEnabled(featureName) {
    var settings = getClinicSettings();
    if (!settings.features) return true; // all enabled by default
    return settings.features[featureName] !== false;
  }

  function getDefaultFeatures() {
    return {
      billing: true,
      messaging: true,
      prescriptions: true,
      exercises: true,
      soapNotes: true,
      bodyDiagram: true,
      onlineBooking: true,
      tags: true
    };
  }

  // --- Generic CRUD ---
  function getAll(key, includeDeleted) {
    try {
      var data = JSON.parse(localStorage.getItem(key)) || [];
      if (includeDeleted) return data;
      return data.filter(function(item) { return !item._deleted; });
    }
    catch(e) { return []; }
  }

  function saveAll(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
    // Sync entire collection to Firestore
    if (window.FirebaseSync) FirebaseSync.saveCollection(key);
  }

  function getById(key, id) {
    var items = getAll(key, true);
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) return items[i];
    }
    return null;
  }

  function create(key, item) {
    var items = getAll(key, true);
    item.id = item.id || Utils.generateId();
    item.createdAt = item.createdAt || new Date().toISOString();
    items.push(item);
    localStorage.setItem(key, JSON.stringify(items));
    // Sync single doc to Firestore (faster than full collection)
    if (window.FirebaseSync) FirebaseSync.saveDoc(key, item);
    return item;
  }

  function update(key, id, updates) {
    var items = getAll(key, true);
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) {
        for (var k in updates) {
          if (updates.hasOwnProperty(k)) items[i][k] = updates[k];
        }
        items[i].updatedAt = new Date().toISOString();
        localStorage.setItem(key, JSON.stringify(items));
        // Sync updated doc to Firestore
        if (window.FirebaseSync) FirebaseSync.saveDoc(key, items[i]);
        return items[i];
      }
    }
    return null;
  }

  function remove(key, id) {
    var items = getAll(key, true);
    var filtered = [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].id !== id) filtered.push(items[i]);
    }
    localStorage.setItem(key, JSON.stringify(filtered));
    // Delete doc from Firestore
    if (window.FirebaseSync) FirebaseSync.deleteDoc(key, id);
  }

  function getByField(key, field, value) {
    var items = getAll(key);
    var result = [];
    for (var i = 0; i < items.length; i++) {
      if (items[i][field] === value) result.push(items[i]);
    }
    return result;
  }

  // --- Trash / Soft Delete ---
  function moveToTrash(key, id) {
    return update(key, id, { _deleted: true, _deletedAt: new Date().toISOString() });
  }

  function getTrash(key) {
    var data = getAll(key, true);
    return data.filter(function(item) { return item._deleted; });
  }

  function getAllTrash() {
    var types = [
      { key: KEYS.patients, type: 'Patient' },
      { key: KEYS.appointments, type: 'Appointment' },
      { key: KEYS.sessions, type: 'Session' },
      { key: KEYS.exercises, type: 'Exercise' },
      { key: KEYS.billing, type: 'Invoice' },
      { key: KEYS.prescriptions, type: 'Prescription' },
      { key: KEYS.messageTemplates, type: 'Message Template' },
      { key: KEYS.users, type: 'Staff' }
    ];
    var result = [];
    for (var i = 0; i < types.length; i++) {
      var trashed = getTrash(types[i].key);
      for (var j = 0; j < trashed.length; j++) {
        trashed[j]._type = types[i].type;
        trashed[j]._storeKey = types[i].key;
        result.push(trashed[j]);
      }
    }
    result.sort(function(a, b) {
      return (b._deletedAt || '').localeCompare(a._deletedAt || '');
    });
    return result;
  }

  function restoreFromTrash(key, id) {
    var items = getAll(key, true);
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) {
        delete items[i]._deleted;
        delete items[i]._deletedAt;
        delete items[i]._deletedBy;
        items[i].updatedAt = new Date().toISOString();
        localStorage.setItem(key, JSON.stringify(items));
        if (window.FirebaseSync) FirebaseSync.saveDoc(key, items[i]);
        return items[i];
      }
    }
    return null;
  }

  function restorePatientFromTrash(id) {
    var patient = restoreFromTrash(KEYS.patients, id);
    if (!patient) return null;
    // Restore cascade-deleted items
    var cascadeKeys = [KEYS.appointments, KEYS.sessions, KEYS.exercises, KEYS.billing, KEYS.prescriptions];
    for (var k = 0; k < cascadeKeys.length; k++) {
      var items = getAll(cascadeKeys[k], true);
      var changed = false;
      for (var i = 0; i < items.length; i++) {
        if (items[i]._deletedBy === id) {
          delete items[i]._deleted;
          delete items[i]._deletedAt;
          delete items[i]._deletedBy;
          items[i].updatedAt = new Date().toISOString();
          if (window.FirebaseSync) FirebaseSync.saveDoc(cascadeKeys[k], items[i]);
          changed = true;
        }
      }
      if (changed) localStorage.setItem(cascadeKeys[k], JSON.stringify(items));
    }
    return patient;
  }

  function permanentDelete(key, id) {
    remove(key, id);
  }

  function emptyTrash() {
    var types = [KEYS.patients, KEYS.appointments, KEYS.sessions, KEYS.exercises, KEYS.billing, KEYS.prescriptions, KEYS.messageTemplates, KEYS.users];
    var count = 0;
    for (var i = 0; i < types.length; i++) {
      var items = getAll(types[i], true);
      var kept = [];
      for (var j = 0; j < items.length; j++) {
        if (items[j]._deleted) {
          count++;
          if (window.FirebaseSync) FirebaseSync.deleteDoc(types[i], items[j].id);
        } else {
          kept.push(items[j]);
        }
      }
      localStorage.setItem(types[i], JSON.stringify(kept));
    }
    return count;
  }

  // --- Export / Import Backup ---
  function exportBackup() {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      clinicId: sessionStorage.getItem('physio_clinicId') || 'default',
      data: {
        patients: getAll(KEYS.patients, true),
        appointments: getAll(KEYS.appointments, true),
        sessions: getAll(KEYS.sessions, true),
        exercises: getAll(KEYS.exercises, true),
        billing: getAll(KEYS.billing, true),
        prescriptions: getAll(KEYS.prescriptions, true),
        users: getAll(KEYS.users, true),
        tags: getAll(KEYS.tags, true),
        messageTemplates: getAll(KEYS.messageTemplates, true),
        messageLog: getAll(KEYS.messageLog, true),
        activityLog: getAll(KEYS.activity, true)
      }
    };
  }

  function importBackup(backup) {
    if (!backup || !backup.data || backup.version !== 1) {
      return { error: 'Invalid backup format' };
    }
    var keyMap = {
      patients: KEYS.patients,
      appointments: KEYS.appointments,
      sessions: KEYS.sessions,
      exercises: KEYS.exercises,
      billing: KEYS.billing,
      prescriptions: KEYS.prescriptions,
      users: KEYS.users,
      tags: KEYS.tags,
      messageTemplates: KEYS.messageTemplates,
      messageLog: KEYS.messageLog,
      activityLog: KEYS.activity
    };
    var counts = {};
    for (var type in keyMap) {
      if (!keyMap.hasOwnProperty(type) || !backup.data[type]) continue;
      var key = keyMap[type];
      var existing = getAll(key, true);
      var existingIds = {};
      for (var i = 0; i < existing.length; i++) {
        if (existing[i].id) existingIds[existing[i].id] = true;
      }
      var added = 0;
      for (var j = 0; j < backup.data[type].length; j++) {
        var item = backup.data[type][j];
        if (item.id && !existingIds[item.id]) {
          existing.push(item);
          added++;
        }
      }
      if (added > 0) {
        localStorage.setItem(key, JSON.stringify(existing));
        if (window.FirebaseSync) FirebaseSync.saveCollection(key);
      }
      counts[type] = added;
    }
    var parts = [];
    for (var t in counts) {
      if (counts[t] > 0) parts.push(counts[t] + ' ' + t);
    }
    if (parts.length > 0) logActivity('Backup imported: ' + parts.join(', '));
    return counts;
  }

  // --- Activity Log ---
  function logActivity(text) {
    var log = getAll(KEYS.activity);
    log.unshift({ text: text, time: new Date().toISOString() });
    if (log.length > 50) log = log.slice(0, 50);
    saveAll(KEYS.activity, log);
  }

  // --- Public API wrappers ---
  var api = {
    // Users
    getUsers: function() { return getAll(KEYS.users); },
    getUserByUsername: function(u) {
      var users = getAll(KEYS.users);
      for (var i = 0; i < users.length; i++) {
        if (users[i].username === u) return users[i];
      }
      return null;
    },

    // Patients
    getPatients: function() { return getAll(KEYS.patients); },
    getPatient: function(id) { return getById(KEYS.patients, id); },
    getPatientByPhone: function(phone) {
      var patients = getAll(KEYS.patients);
      for (var i = 0; i < patients.length; i++) {
        if (patients[i].phone && patients[i].phone.replace(/\D/g, '') === phone.replace(/\D/g, '')) return patients[i];
      }
      return null;
    },
    createPatient: function(p) { var r = create(KEYS.patients, p); logActivity('New patient added: ' + p.name); return r; },
    updatePatient: function(id, u) { var r = update(KEYS.patients, id, u); if(r) logActivity('Patient updated: ' + r.name); return r; },
    deletePatient: function(id) {
      var p = getById(KEYS.patients, id);
      moveToTrash(KEYS.patients, id);
      // Cascade soft-delete related data
      var now = new Date().toISOString();
      var cascadeFields = { _deleted: true, _deletedAt: now, _deletedBy: id };
      var appts = getByField(KEYS.appointments, 'patientId', id);
      for (var i = 0; i < appts.length; i++) update(KEYS.appointments, appts[i].id, cascadeFields);
      var sess = getByField(KEYS.sessions, 'patientId', id);
      for (var j = 0; j < sess.length; j++) update(KEYS.sessions, sess[j].id, cascadeFields);
      var exs = getByField(KEYS.exercises, 'patientId', id);
      for (var k = 0; k < exs.length; k++) update(KEYS.exercises, exs[k].id, cascadeFields);
      var bills = getByField(KEYS.billing, 'patientId', id);
      for (var l = 0; l < bills.length; l++) update(KEYS.billing, bills[l].id, cascadeFields);
      var rxs = getByField(KEYS.prescriptions, 'patientId', id);
      for (var m = 0; m < rxs.length; m++) update(KEYS.prescriptions, rxs[m].id, cascadeFields);
      if (p) logActivity('Patient deleted: ' + p.name);
    },

    // Appointments
    getAppointments: function() { return getAll(KEYS.appointments); },
    getAppointment: function(id) { return getById(KEYS.appointments, id); },
    createAppointment: function(a) { var r = create(KEYS.appointments, a); logActivity('Appointment booked for ' + (a.patientName || 'patient')); return r; },
    updateAppointment: function(id, u) { var r = update(KEYS.appointments, id, u); return r; },
    deleteAppointment: function(id) { moveToTrash(KEYS.appointments, id); },
    getAppointmentsByPatient: function(pid) { return getByField(KEYS.appointments, 'patientId', pid); },
    getAppointmentsByDate: function(date) { return getByField(KEYS.appointments, 'date', date); },

    // Check conflicts
    hasConflict: function(date, time, duration, excludeId) {
      var appts = getAll(KEYS.appointments);
      var newStart = timeToMinutes(time);
      var newEnd = newStart + (parseInt(duration,10) || 30);
      for (var i = 0; i < appts.length; i++) {
        var a = appts[i];
        if (a.date === date && a.status !== 'cancelled' && a.id !== excludeId) {
          var aStart = timeToMinutes(a.time);
          var aEnd = aStart + (parseInt(a.duration,10) || 30);
          if (newStart < aEnd && newEnd > aStart) return a;
        }
      }
      return null;
    },

    // Sessions
    getSessions: function() { return getAll(KEYS.sessions); },
    getSession: function(id) { return getById(KEYS.sessions, id); },
    getSessionsByPatient: function(pid) { return getByField(KEYS.sessions, 'patientId', pid); },
    createSession: function(s) { var r = create(KEYS.sessions, s); logActivity('Session note added for patient'); return r; },
    updateSession: function(id, u) { return update(KEYS.sessions, id, u); },
    deleteSession: function(id) { moveToTrash(KEYS.sessions, id); },

    // Exercises
    getExercises: function() { return getAll(KEYS.exercises); },
    getExercisesByPatient: function(pid) { return getByField(KEYS.exercises, 'patientId', pid); },
    createExercise: function(e) { var r = create(KEYS.exercises, e); logActivity('Exercise prescribed'); return r; },
    updateExercise: function(id, u) { return update(KEYS.exercises, id, u); },
    deleteExercise: function(id) { moveToTrash(KEYS.exercises, id); },

    // Billing
    getBilling: function() { return getAll(KEYS.billing); },
    getBillingByPatient: function(pid) { return getByField(KEYS.billing, 'patientId', pid); },
    createBilling: function(b) { var r = create(KEYS.billing, b); logActivity('Invoice created: ' + Utils.formatCurrency(b.amount)); return r; },
    updateBilling: function(id, u) { return update(KEYS.billing, id, u); },
    deleteBilling: function(id) { moveToTrash(KEYS.billing, id); },

    // Tags
    getTags: function() { return getAll(KEYS.tags); },
    getTag: function(id) { return getById(KEYS.tags, id); },
    createTag: function(t) { return create(KEYS.tags, t); },
    updateTag: function(id, u) { return update(KEYS.tags, id, u); },
    deleteTag: function(id) {
      remove(KEYS.tags, id);
      // Cascade: remove tag from all patients (include deleted to not lose them)
      var patients = getAll(KEYS.patients, true);
      for (var i = 0; i < patients.length; i++) {
        if (patients[i].tags && patients[i].tags.length > 0) {
          var filtered = [];
          for (var j = 0; j < patients[i].tags.length; j++) {
            if (patients[i].tags[j] !== id) filtered.push(patients[i].tags[j]);
          }
          patients[i].tags = filtered;
        }
      }
      saveAll(KEYS.patients, patients);
    },

    // Message Templates
    getMessageTemplates: function() { return getAll(KEYS.messageTemplates); },
    getMessageTemplate: function(id) { return getById(KEYS.messageTemplates, id); },
    createMessageTemplate: function(t) { return create(KEYS.messageTemplates, t); },
    updateMessageTemplate: function(id, u) { return update(KEYS.messageTemplates, id, u); },
    deleteMessageTemplate: function(id) { moveToTrash(KEYS.messageTemplates, id); },

    // Prescriptions
    getPrescriptions: function() { return getAll(KEYS.prescriptions); },
    getPrescriptionsByPatient: function(pid) { return getByField(KEYS.prescriptions, 'patientId', pid); },
    getPrescription: function(id) { return getById(KEYS.prescriptions, id); },
    createPrescription: function(p) { var r = create(KEYS.prescriptions, p); logActivity('Prescription added for patient'); return r; },
    updatePrescription: function(id, u) { return update(KEYS.prescriptions, id, u); },
    deletePrescription: function(id) { moveToTrash(KEYS.prescriptions, id); },

    // Message Log
    getMessageLog: function() { return getAll(KEYS.messageLog); },
    createMessageLog: function(entry) { return create(KEYS.messageLog, entry); },

    // Activity
    getActivity: function() { return getAll(KEYS.activity); },
    logActivity: logActivity,

    // Seed & Migrate
    seed: seed,
    migrate: migrate,

    // Trash
    moveToTrash: moveToTrash,
    getTrash: getTrash,
    getAllTrash: getAllTrash,
    restoreFromTrash: restoreFromTrash,
    restorePatientFromTrash: restorePatientFromTrash,
    permanentDelete: permanentDelete,
    emptyTrash: emptyTrash,

    // Backup
    exportBackup: exportBackup,
    importBackup: importBackup,

    // Generic CRUD (used by settings for users)
    create: create,
    update: update,
    remove: remove,
    getAll: getAll,

    // Multi-tenant helpers
    KEY: KEY,
    KEYS: KEYS,
    LEGACY_KEYS: LEGACY_KEYS,
    getClinicSettings: getClinicSettings,
    saveClinicSettings: saveClinicSettings,
    isFeatureEnabled: isFeatureEnabled,
    getDefaultFeatures: getDefaultFeatures,
    getClinicId: function() { return sessionStorage.getItem('physio_clinicId') || 'default'; },
    setClinicId: function(id) { sessionStorage.setItem('physio_clinicId', id); }
  };

  // --- Migration for existing installs ---
  function migrate() {
    // Ensure all patients have tags and bodyRegions arrays
    var patients = getAll(KEYS.patients, true);
    var patientsDirty = false;
    for (var i = 0; i < patients.length; i++) {
      if (!patients[i].tags) {
        patients[i].tags = [];
        patientsDirty = true;
      }
      if (!patients[i].bodyRegions) {
        patients[i].bodyRegions = [];
        patientsDirty = true;
      }
    }
    if (patientsDirty) saveAll(KEYS.patients, patients);

    // Seed tags if not present
    if (!localStorage.getItem(KEYS.tags)) {
      var tags = [
        { id: 'tag1', name: 'Knee', color: '#3b82f6' },
        { id: 'tag2', name: 'Back Pain', color: '#ef4444' },
        { id: 'tag3', name: 'Shoulder', color: '#f59e0b' },
        { id: 'tag4', name: 'Post-Surgery', color: '#8b5cf6' },
        { id: 'tag5', name: 'Senior', color: '#6b7280' },
        { id: 'tag6', name: 'Sports Injury', color: '#22c55e' },
        { id: 'tag7', name: 'Chronic Pain', color: '#ec4899' },
        { id: 'tag8', name: 'Neurological', color: '#06b6d4' }
      ];
      for (var t = 0; t < tags.length; t++) {
        tags[t].createdAt = new Date().toISOString();
      }
      saveAll(KEYS.tags, tags);

      // Assign demo tags to seed patients
      patients = getAll(KEYS.patients, true);
      var tagMap = {
        'p1': ['tag1', 'tag4'],       // Sarah Johnson: Knee, Post-Surgery
        'p2': ['tag2', 'tag7'],        // Robert Chen: Back Pain, Chronic Pain
        'p3': ['tag3'],                // Emily Watson: Shoulder
        'p4': ['tag1', 'tag4', 'tag5'],// James Miller: Knee, Post-Surgery, Senior
        'p5': ['tag3', 'tag6'],        // Maria Garcia: Shoulder, Sports Injury
        'p6': ['tag8', 'tag5'],        // William Taylor: Neurological, Senior
        'p7': ['tag6'],                // Anna Kowalski: Sports Injury
        'p8': ['tag2']                 // David Park: Back Pain
      };
      // Assign demo body regions to seed patients (new dual-view IDs)
      var bodyMap = {
        'p1': ['l-knee', 'l-thigh'],                                    // Sarah: ACL Reconstruction Left
        'p2': ['lumbar', 'sacrum-sij', 'l-shin'],                       // Robert: Lower Back + L leg radiculopathy
        'p3': ['r-shoulder-front', 'r-shoulder-back', 'r-scapula'],     // Emily: Frozen Shoulder Right
        'p4': ['l-knee', 'l-thigh', 'l-hip'],                          // James: Total Knee Replacement Left
        'p5': ['l-shoulder-front', 'l-shoulder-back', 'l-scapula'],     // Maria: Rotator Cuff Left
        'p6': ['head', 'l-ankle', 'r-ankle', 'l-foot', 'r-foot'],      // William: Parkinson's balance
        'p7': ['l-ankle', 'r-ankle', 'l-heel', 'r-heel', 'l-foot', 'r-foot'], // Anna: Plantar Fasciitis Bilateral
        'p8': ['neck-back', 'neck-front', 'r-shoulder-back', 'r-upper-arm'] // David: Cervical Radiculopathy + R arm
      };
      for (var j = 0; j < patients.length; j++) {
        if (tagMap[patients[j].id]) {
          patients[j].tags = tagMap[patients[j].id];
        }
        if (bodyMap[patients[j].id]) {
          patients[j].bodyRegions = bodyMap[patients[j].id];
        }
      }
      saveAll(KEYS.patients, patients);
    }

    // Seed message templates if not present
    if (!localStorage.getItem(KEYS.messageTemplates)) {
      var templates = [
        { id: 'mt1', name: 'Appointment Reminder', text: 'Hi {name}, this is a reminder about your appointment on {date} at {time}. Please arrive 10 minutes early. See you soon!' },
        { id: 'mt2', name: 'Follow-up Reminder', text: 'Hi {name}, it\'s time for your follow-up visit. Please call us to schedule your next appointment. We look forward to seeing your progress!' },
        { id: 'mt3', name: 'General Announcement', text: 'Hi {name}, we have an important update from PhysioClinic. Please contact us for more details. Thank you!' },
        { id: 'mt4', name: 'Exercise Reminder', text: 'Hi {name}, just a friendly reminder to keep up with your home exercise program. Consistency is key to your recovery! Let us know if you have any questions.' }
      ];
      for (var m = 0; m < templates.length; m++) {
        templates[m].createdAt = new Date().toISOString();
      }
      saveAll(KEYS.messageTemplates, templates);
    }

    // Initialize message log if not present
    if (!localStorage.getItem(KEYS.messageLog)) {
      saveAll(KEYS.messageLog, []);
    }

    // Initialize prescriptions if not present
    if (!localStorage.getItem(KEYS.prescriptions)) {
      saveAll(KEYS.prescriptions, []);
    }
  }

  function timeToMinutes(t) {
    var parts = t.split(':');
    return parseInt(parts[0],10) * 60 + parseInt(parts[1],10);
  }

  // --- Seed Data ---
  function seed() {
    if (localStorage.getItem(KEYS.users)) return; // Already seeded

    // Users
    saveAll(KEYS.users, [
      { id: 'u1', username: 'admin', password: 'admin123', name: 'Dr. Admin', role: 'admin' }
    ]);

    var todayStr = Utils.today();
    var td = new Date(todayStr);

    function dayOffset(n) {
      var d = new Date(td);
      d.setDate(d.getDate() + n);
      return Utils.toDateString(d);
    }

    // Patients
    var patients = [
      { id: 'p1', name: 'Sarah Johnson', dob: '1985-03-15', gender: 'female', phone: '555-0101', email: 'sarah.j@email.com', address: '123 Oak Street, Springfield',
        diagnosis: 'ACL Reconstruction - Post-operative', treatmentPlan: 'Progressive ROM and strengthening protocol. Phase 2: weeks 4-8. Focus on quad activation, hamstring curls, and proprioception.',
        emergencyContact: 'Mark Johnson', emergencyPhone: '555-0102', status: 'active', insurance: 'Blue Cross', notes: 'Motivated patient. Athletic background.' },
      { id: 'p2', name: 'Robert Chen', dob: '1972-08-22', gender: 'male', phone: '555-0201', email: 'r.chen@email.com', address: '456 Maple Ave, Springfield',
        diagnosis: 'Chronic Lower Back Pain - L4/L5 disc herniation', treatmentPlan: 'McKenzie extension protocol. Core stabilization. Ergonomic assessment. Pain management with TENS and manual therapy.',
        emergencyContact: 'Lisa Chen', emergencyPhone: '555-0202', status: 'active', insurance: 'Aetna', notes: 'Desk worker. Reports sitting 8+ hours/day.' },
      { id: 'p3', name: 'Emily Watson', dob: '1990-11-08', gender: 'female', phone: '555-0301', email: 'e.watson@email.com', address: '789 Pine Road, Springfield',
        diagnosis: 'Frozen Shoulder (Adhesive Capsulitis) - Right', treatmentPlan: 'Joint mobilization grades III-IV. Stretching protocol. Home exercise program with pulleys. NSAIDs as prescribed by MD.',
        emergencyContact: 'David Watson', emergencyPhone: '555-0302', status: 'active', insurance: 'United Health', notes: 'Gradually improving ROM.' },
      { id: 'p4', name: 'James Miller', dob: '1968-05-30', gender: 'male', phone: '555-0401', email: 'j.miller@email.com', address: '321 Elm Blvd, Springfield',
        diagnosis: 'Total Knee Replacement - Left, Post-op Week 6', treatmentPlan: 'Achieve 0-120 degrees ROM. Progressive weight bearing. Gait training. Stair negotiation. Strengthening program.',
        emergencyContact: 'Nancy Miller', emergencyPhone: '555-0402', status: 'active', insurance: 'Medicare', notes: 'Using walker, transitioning to cane.' },
      { id: 'p5', name: 'Maria Garcia', dob: '1995-01-20', gender: 'female', phone: '555-0501', email: 'm.garcia@email.com', address: '654 Birch Lane, Springfield',
        diagnosis: 'Rotator Cuff Tendinopathy - Left Shoulder', treatmentPlan: 'Eccentric strengthening protocol. Scapular stabilization exercises. Activity modification. Gradual return to overhead activities.',
        emergencyContact: 'Carlos Garcia', emergencyPhone: '555-0502', status: 'active', insurance: 'Cigna', notes: 'Recreational volleyball player.' },
      { id: 'p6', name: 'William Taylor', dob: '1958-12-03', gender: 'male', phone: '555-0601', email: 'w.taylor@email.com', address: '987 Cedar Court, Springfield',
        diagnosis: 'Parkinson\'s Disease - Balance and gait training', treatmentPlan: 'LSVT BIG protocol. Balance training. Fall prevention. Dual-task activities. Caregiver education.',
        emergencyContact: 'Dorothy Taylor', emergencyPhone: '555-0602', status: 'active', insurance: 'Medicare', notes: 'Stage 2 Hoehn & Yahr. Motivated.' },
      { id: 'p7', name: 'Anna Kowalski', dob: '1988-07-14', gender: 'female', phone: '555-0701', email: 'a.kowalski@email.com', address: '147 Walnut Street, Springfield',
        diagnosis: 'Plantar Fasciitis - Bilateral', treatmentPlan: 'Stretching program (calf, plantar fascia). Night splints. Custom orthotics fitting. Gradual return to running.',
        emergencyContact: 'Peter Kowalski', emergencyPhone: '555-0702', status: 'completed', insurance: 'Blue Cross', notes: 'Runner. Completed treatment successfully.' },
      { id: 'p8', name: 'David Park', dob: '1979-04-25', gender: 'male', phone: '555-0801', email: 'd.park@email.com', address: '258 Spruce Drive, Springfield',
        diagnosis: 'Cervical Radiculopathy - C5/C6', treatmentPlan: 'Cervical traction. Neural gliding exercises. Postural correction. Ergonomic workstation setup. Strengthening deep neck flexors.',
        emergencyContact: 'Sue Park', emergencyPhone: '555-0802', status: 'active', insurance: 'Aetna', notes: 'Software developer. Needs ergonomic education.' }
    ];
    for (var i = 0; i < patients.length; i++) {
      patients[i].createdAt = new Date(td.getTime() - (30 - i) * 86400000).toISOString();
    }
    saveAll(KEYS.patients, patients);

    // ===== 3-MONTH COMPREHENSIVE TEST DATA =====
    // Appointments spanning 90 days back + upcoming
    var appts = [];
    var aId = 1;

    // Helper: generate weekly appointments for a patient over a date range
    function addWeeklyAppts(pid, pname, startDay, endDay, time, dur, type, skipDays) {
      skipDays = skipDays || [];
      for (var d = startDay; d <= endDay; d += 7) {
        var skip = false;
        for (var s = 0; s < skipDays.length; s++) { if (Math.abs(d - skipDays[s]) < 2) skip = true; }
        if (skip) continue;
        var st = d <= 0 ? 'completed' : 'scheduled';
        if (d <= 0 && Math.random() < 0.08) st = 'no-show';
        if (d <= 0 && Math.random() < 0.05) st = 'cancelled';
        appts.push({ id: 'a' + (aId++), patientId: pid, patientName: pname, date: dayOffset(d), time: time, duration: dur, type: type, status: st, notes: '' });
      }
    }

    // P1 Sarah Johnson - ACL rehab, 2x/week for 3 months
    addWeeklyAppts('p1', 'Sarah Johnson', -84, 7, '09:00', '45', 'Treatment', []);
    addWeeklyAppts('p1', 'Sarah Johnson', -81, 7, '09:00', '45', 'Follow-up', []);
    // P2 Robert Chen - Back pain, 1x/week for 3 months
    addWeeklyAppts('p2', 'Robert Chen', -84, 7, '10:00', '30', 'Treatment', [-49]);
    // P3 Emily Watson - Frozen shoulder, 2x/week
    addWeeklyAppts('p3', 'Emily Watson', -70, 7, '11:00', '45', 'Treatment', []);
    addWeeklyAppts('p3', 'Emily Watson', -67, 7, '11:00', '45', 'Treatment', []);
    // P4 James Miller - TKR, 3x/week intensive for 2 months then 2x/week
    addWeeklyAppts('p4', 'James Miller', -60, -21, '14:00', '60', 'Treatment', []);
    addWeeklyAppts('p4', 'James Miller', -58, -21, '14:00', '60', 'Treatment', []);
    addWeeklyAppts('p4', 'James Miller', -56, -21, '14:00', '45', 'Treatment', []);
    addWeeklyAppts('p4', 'James Miller', -14, 7, '14:00', '45', 'Follow-up', []);
    // P5 Maria Garcia - Rotator cuff, 1x/week for 6 weeks
    addWeeklyAppts('p5', 'Maria Garcia', -42, 7, '15:30', '45', 'Treatment', []);
    // P6 William Taylor - Parkinsons, 2x/week
    addWeeklyAppts('p6', 'William Taylor', -84, 7, '09:30', '60', 'Treatment', []);
    addWeeklyAppts('p6', 'William Taylor', -82, 7, '09:30', '60', 'Treatment', []);
    // P7 Anna Kowalski - Plantar fasciitis, completed after 8 weeks
    addWeeklyAppts('p7', 'Anna Kowalski', -84, -28, '16:00', '30', 'Treatment', []);
    // P8 David Park - Cervical, 1x/week
    addWeeklyAppts('p8', 'David Park', -56, 7, '10:30', '30', 'Treatment', [-35]);

    // Add initial evaluations
    appts.push({ id: 'a' + (aId++), patientId: 'p1', patientName: 'Sarah Johnson', date: dayOffset(-87), time: '09:00', duration: '60', type: 'Initial Evaluation', status: 'completed', notes: 'Post ACL reconstruction evaluation' });
    appts.push({ id: 'a' + (aId++), patientId: 'p2', patientName: 'Robert Chen', date: dayOffset(-87), time: '10:00', duration: '45', type: 'Initial Evaluation', status: 'completed', notes: 'Chronic LBP assessment' });
    appts.push({ id: 'a' + (aId++), patientId: 'p3', patientName: 'Emily Watson', date: dayOffset(-73), time: '11:00', duration: '45', type: 'Initial Evaluation', status: 'completed', notes: 'Frozen shoulder assessment' });
    appts.push({ id: 'a' + (aId++), patientId: 'p4', patientName: 'James Miller', date: dayOffset(-63), time: '14:00', duration: '60', type: 'Initial Evaluation', status: 'completed', notes: 'Post TKR evaluation' });
    appts.push({ id: 'a' + (aId++), patientId: 'p5', patientName: 'Maria Garcia', date: dayOffset(-45), time: '15:30', duration: '45', type: 'Initial Evaluation', status: 'completed', notes: 'Rotator cuff assessment' });
    appts.push({ id: 'a' + (aId++), patientId: 'p6', patientName: 'William Taylor', date: dayOffset(-87), time: '09:30', duration: '60', type: 'Initial Evaluation', status: 'completed', notes: 'Balance and gait assessment' });
    appts.push({ id: 'a' + (aId++), patientId: 'p7', patientName: 'Anna Kowalski', date: dayOffset(-87), time: '16:00', duration: '45', type: 'Initial Evaluation', status: 'completed', notes: 'Bilateral plantar fasciitis' });
    appts.push({ id: 'a' + (aId++), patientId: 'p8', patientName: 'David Park', date: dayOffset(-59), time: '10:30', duration: '45', type: 'Initial Evaluation', status: 'completed', notes: 'Cervical radiculopathy eval' });

    // Today's specific appointments
    appts.push({ id: 'a' + (aId++), patientId: 'p1', patientName: 'Sarah Johnson', date: todayStr, time: '09:00', duration: '45', type: 'Follow-up', status: 'scheduled', notes: 'Check ROM progress, advance to Phase 3' });
    appts.push({ id: 'a' + (aId++), patientId: 'p2', patientName: 'Robert Chen', date: todayStr, time: '10:00', duration: '30', type: 'Treatment', status: 'scheduled', notes: 'Core stabilization session' });
    appts.push({ id: 'a' + (aId++), patientId: 'p3', patientName: 'Emily Watson', date: todayStr, time: '11:00', duration: '45', type: 'Treatment', status: 'scheduled', notes: 'Joint mobilization grade IV' });
    appts.push({ id: 'a' + (aId++), patientId: 'p4', patientName: 'James Miller', date: todayStr, time: '14:00', duration: '45', type: 'Follow-up', status: 'scheduled', notes: 'Reassessment - discharge planning' });
    appts.push({ id: 'a' + (aId++), patientId: 'p5', patientName: 'Maria Garcia', date: todayStr, time: '15:30', duration: '45', type: 'Treatment', status: 'scheduled', notes: 'Eccentric loading program' });

    for (var j = 0; j < appts.length; j++) {
      appts[j].createdAt = appts[j].date + 'T08:00:00.000Z';
    }
    saveAll(KEYS.appointments, appts);

    // Sessions (SOAP notes) - comprehensive 3-month notes
    var sessions = [
      // --- Sarah Johnson (p1) - ACL rehab journey ---
      { id: 's1', patientId: 'p1', date: dayOffset(-84), painScore: 8, functionScore: 2,
        subjective: 'First session post-surgery. Significant swelling and pain. Difficulty with any weight bearing.',
        objective: 'ROM: Flexion 60 deg, Extension -10 deg. Quad lag present. Significant effusion. Non-weight bearing with crutches.',
        assessment: 'Post-op day 14. Expected presentation. Phase 1 protocol initiated.',
        plan: 'Quad sets, ankle pumps, ice elevation. Patellar mobilization. NMES for quad activation. See 2x/week.' },
      { id: 's2', patientId: 'p1', date: dayOffset(-70), painScore: 6, functionScore: 3,
        subjective: 'Swelling reducing. Can tolerate partial weight bearing. Pain mainly with stairs.',
        objective: 'ROM: Flexion 80 deg, Extension -7 deg. Quad strength 2+/5. Mild effusion. PWB with crutches.',
        assessment: 'Phase 1 progressing. ROM gains consistent. Need to focus on extension deficit.',
        plan: 'Prone hang for extension. SLR 4-way. Stationary bike if tolerated. Continue 2x/week.' },
      { id: 's3', patientId: 'p1', date: dayOffset(-56), painScore: 5, functionScore: 4,
        subjective: 'Walking without crutches at home. Morning stiffness improving. Able to do light housework.',
        objective: 'ROM: Flexion 95 deg, Extension -3 deg. Quad strength 3+/5. Trace effusion. Gait: mild antalgic.',
        assessment: 'Good progress. Transitioning to Phase 2. Weight bearing as tolerated.',
        plan: 'Mini squats, step-ups, leg press. Proprioception board. Pool therapy if available.' },
      { id: 's4', patientId: 'p1', date: dayOffset(-42), painScore: 4, functionScore: 5,
        subjective: 'Much better. Walking longer distances. Occasional ache after prolonged activity.',
        objective: 'ROM: Flexion 110 deg, Extension 0 deg. Quad strength 4-/5. No effusion. Normal gait pattern.',
        assessment: 'Phase 2 milestones met. ROM approaching functional levels. Ready for advanced strengthening.',
        plan: 'Lunges, single leg squats. Agility ladder. Begin jogging prep exercises. Step-downs.' },
      { id: 's5', patientId: 'p1', date: dayOffset(-28), painScore: 3, functionScore: 7,
        subjective: 'Feeling strong. Wants to start light jogging. No significant pain with daily activities.',
        objective: 'ROM: Flexion 125 deg, Extension 0 deg. Quad strength 4+/5. Hop test 75% of contralateral. Balance excellent.',
        assessment: 'Phase 3 criteria met. Cleared for light jogging on flat surface. Excellent rehab compliance.',
        plan: 'Walk-jog program. Plyometric prep. Sport-specific drills. Progress to 1x/week visits.' },
      { id: 's6', patientId: 'p1', date: dayOffset(-14), painScore: 2, functionScore: 8,
        subjective: 'Jogging 15 min without pain. Feeling confident. Wants to return to recreational sports.',
        objective: 'ROM: Full symmetrical. Quad strength 5-/5. Hop test 85%. Single leg squat: good form.',
        assessment: 'Progressing well through Phase 3. On track for return to sport at 6 months.',
        plan: 'Continue jogging progression. Add cutting drills. Plyometrics. Monthly follow-up.' },
      // --- Robert Chen (p2) - Chronic LBP ---
      { id: 's7', patientId: 'p2', date: dayOffset(-84), painScore: 8, functionScore: 2,
        subjective: 'Severe back pain radiating to left leg. Cannot sit more than 15 min. Sleep disturbed. Very anxious.',
        objective: 'Lumbar flexion 30%. Extension limited 50%. SLR positive 30 deg left. Neuro intact. Core strength 1/5.',
        assessment: 'Acute presentation of chronic L4/L5 herniation with radiculopathy. Needs McKenzie approach.',
        plan: 'Prone lying progression. Repeated extensions. Pain education. Avoid prolonged flexion. 1x/week.' },
      { id: 's8', patientId: 'p2', date: dayOffset(-70), painScore: 7, functionScore: 3,
        subjective: 'Some improvement with extension exercises. Still cannot sit long. Leg pain intermittent now.',
        objective: 'Lumbar flexion 45%. SLR positive 50 deg left. Centralization with repeated extension. Core 2/5.',
        assessment: 'Centralization occurring. Positive sign. Continue directional preference approach.',
        plan: 'Progress to standing extension. Begin gentle core activation. Ergonomic assessment scheduled.' },
      { id: 's9', patientId: 'p2', date: dayOffset(-56), painScore: 6, functionScore: 4,
        subjective: 'Back pain reducing. Leg symptoms mostly gone. Can sit 30 min with breaks. Using standing desk.',
        objective: 'Lumbar flexion 60%. SLR negative bilateral. Core activation improving. Plank hold 10 sec.',
        assessment: 'Significant improvement. Leg symptoms centralizing. Core program can advance.',
        plan: 'Dead bugs, bird-dogs. Progress plank duration. Continue extension exercises. Ergonomic mods.' },
      { id: 's10', patientId: 'p2', date: dayOffset(-42), painScore: 5, functionScore: 5,
        subjective: 'Good improvement. Occasional flare-ups with heavy lifting. Doing exercises regularly.',
        objective: 'Lumbar ROM 75% flexion, full extension. Core strength 3/5. Plank 30 sec. Good movement patterns.',
        assessment: 'Responding well. Need to address lifting mechanics and continue core strengthening.',
        plan: 'Add hip hinge training. Deadlift pattern. Progress core to pallof press. Lifting education.' },
      { id: 's11', patientId: 'p2', date: dayOffset(-28), painScore: 4, functionScore: 6,
        subjective: 'Much better overall. Able to work full day. Occasional mild stiffness. Exercises becoming routine.',
        objective: 'Full lumbar ROM. Core strength 4/5. Plank 45 sec. Good lifting mechanics demonstrated.',
        assessment: 'Approaching discharge criteria. Self-management skills developing well.',
        plan: 'Gym-based program design. Self-management strategies. Reduce to fortnightly visits.' },
      { id: 's12', patientId: 'p2', date: dayOffset(-7), painScore: 3, functionScore: 7,
        subjective: 'Doing well. Back to all activities. Using gym regularly. Knows flare-up management.',
        objective: 'Full ROM. Core 4+/5. Excellent movement patterns. Independent with exercise program.',
        assessment: 'Excellent outcome. Ready for discharge with home program.',
        plan: 'Discharge plan finalized. Home program provided. Follow-up PRN.' },
      // --- Emily Watson (p3) - Frozen shoulder ---
      { id: 's13', patientId: 'p3', date: dayOffset(-70), painScore: 7, functionScore: 3,
        subjective: 'Cannot reach overhead or behind back. Significant night pain. Difficulty dressing.',
        objective: 'AROM: Flexion 100 deg, ABD 70 deg, ER 10 deg, IR hand to buttock. Capsular end-feel.',
        assessment: 'Adhesive capsulitis - freezing stage. ER most restricted. Night pain management needed.',
        plan: 'Grade II-III mobilizations. Pendulum exercises. Sleep positioning. Pulley flexion at home.' },
      { id: 's14', patientId: 'p3', date: dayOffset(-56), painScore: 6, functionScore: 3,
        subjective: 'Night pain slightly better. Still cannot reach overhead. Using other arm to compensate.',
        objective: 'AROM: Flexion 110 deg, ABD 80 deg, ER 15 deg. Less pain with mobilization. Scapular dyskinesis.',
        assessment: 'Slow progress expected with frozen shoulder. Slight gains in flexion. Scapular work needed.',
        plan: 'Progress to grade III-IV mobilizations. Scapular stabilization exercises. Continue home program.' },
      { id: 's15', patientId: 'p3', date: dayOffset(-42), painScore: 5, functionScore: 4,
        subjective: 'Gradual improvement. Can reach shelf height now. Night pain only occasional.',
        objective: 'AROM: Flexion 130 deg, ABD 100 deg, ER 25 deg, IR hand to L3. Good scapular control.',
        assessment: 'Transitioning from freezing to thawing stage. ROM gains accelerating.',
        plan: 'Aggressive mobilization. Stretching program. Add strengthening as ROM allows.' },
      { id: 's16', patientId: 'p3', date: dayOffset(-21), painScore: 3, functionScore: 6,
        subjective: 'Much better. Can wash hair and dress normally. Only stiff in mornings.',
        objective: 'AROM: Flexion 155 deg, ABD 140 deg, ER 40 deg. Strength 4/5 all planes.',
        assessment: 'Excellent progress in thawing phase. Near-functional ROM achieved.',
        plan: 'Continue stretching and strengthening. Functional activities. Reduce to 1x/week.' },
      // --- James Miller (p4) - TKR ---
      { id: 's17', patientId: 'p4', date: dayOffset(-60), painScore: 6, functionScore: 3,
        subjective: 'Post-op week 2. Significant swelling and stiffness. Using walker for all mobility.',
        objective: 'ROM: Flexion 70 deg, Extension -8 deg. Quad strength 2/5. Moderate effusion. FWB with walker.',
        assessment: 'Expected post-TKR presentation. Focus on ROM and quad activation.',
        plan: 'CPM supplement. Quad sets, SLR. Ankle pumps. Ice and elevation. 3x/week.' },
      { id: 's18', patientId: 'p4', date: dayOffset(-46), painScore: 4, functionScore: 5,
        subjective: 'Improving steadily. Walking better with walker. Less swelling. Starting to feel stronger.',
        objective: 'ROM: Flexion 95 deg, Extension -3 deg. Quad strength 3+/5. Trace effusion. Gait improving.',
        assessment: 'Good progress for 4 weeks post-op. ROM gains on track.',
        plan: 'Add step-ups, stationary bike. Begin cane transition assessment. Progressive strengthening.' },
      { id: 's19', patientId: 'p4', date: dayOffset(-32), painScore: 3, functionScore: 6,
        subjective: 'Using cane outdoors, independent at home. Can do stairs with rail. Feeling much more confident.',
        objective: 'ROM: Flexion 115 deg, Extension 0 deg. Quad strength 4/5. Gait: normalized cadence.',
        assessment: 'Exceeding milestones. ROM excellent. Ready to progress to community activities.',
        plan: 'Community walking. Stairs without rail. Balance exercises. Reduce to 2x/week.' },
      { id: 's20', patientId: 'p4', date: dayOffset(-14), painScore: 2, functionScore: 7,
        subjective: 'Walking without any aid. Returned to driving. Only mild ache after long walks.',
        objective: 'ROM: Flexion 120 deg, Extension 0 deg. Quad strength 4+/5. TUG test: 10 sec. Excellent balance.',
        assessment: 'Outstanding recovery. Approaching discharge criteria. Independent with all ADLs.',
        plan: 'Gym-based program. Continue ROM maintenance. Discharge planning. Monthly follow-up.' },
      // --- Maria Garcia (p5) - Rotator cuff ---
      { id: 's21', patientId: 'p5', date: dayOffset(-42), painScore: 6, functionScore: 4,
        subjective: 'Pain with overhead activities. Cannot serve in volleyball. Pain at rest improving.',
        objective: 'Shoulder flexion 160 deg, ABD 150 deg with painful arc 60-120. Supraspinatus 3+/5. Positive Neer test.',
        assessment: 'Rotator cuff tendinopathy. Subacromial impingement pattern. Activity modification needed.',
        plan: 'Eccentric cuff strengthening. Scapular stabilization. Avoid overhead activities temporarily.' },
      { id: 's22', patientId: 'p5', date: dayOffset(-28), painScore: 4, functionScore: 5,
        subjective: 'Pain reducing with exercises. Less painful arc. Still avoiding volleyball.',
        objective: 'Painful arc reduced (80-110 deg). Supraspinatus 4/5. Scapular control improving.',
        assessment: 'Good response to eccentric loading. Impingement signs reducing.',
        plan: 'Progress eccentric load. Add kinetic chain exercises. Begin overhead reaching.' },
      { id: 's23', patientId: 'p5', date: dayOffset(-14), painScore: 3, functionScore: 7,
        subjective: 'Significant improvement. Tried light hitting - no pain. Wants to return to volleyball.',
        objective: 'Full ROM pain-free. Cuff strength 4+/5. No impingement signs. Good scapulohumeral rhythm.',
        assessment: 'Excellent progress. Ready for graded return to sport.',
        plan: 'Graduated return to volleyball protocol. Plyometric throwing program. Continue strengthening.' },
      // --- William Taylor (p6) - Parkinsons ---
      { id: 's24', patientId: 'p6', date: dayOffset(-84), painScore: 2, functionScore: 3,
        subjective: 'Balance deteriorating over past 6 months. Two near-falls last month. Shuffling gait worsening.',
        objective: 'BBS: 38/56. TUG: 16 sec. Gait: reduced step length, reduced arm swing. Festinating pattern. Rigidity bilateral.',
        assessment: 'Parkinsons Hoehn & Yahr Stage 2. Fall risk moderate. LSVT BIG appropriate.',
        plan: 'LSVT BIG protocol 4x/week for 4 weeks. Balance training. Fall prevention education.' },
      { id: 's25', patientId: 'p6', date: dayOffset(-56), painScore: 2, functionScore: 4,
        subjective: 'Feeling more confident walking. Using BIG movements regularly. Caregiver reports improvement.',
        objective: 'BBS: 44/56. TUG: 13 sec. Gait: improved step length and arm swing. Less festination.',
        assessment: 'Good response to LSVT BIG. Balance improving. Continue maintenance program.',
        plan: 'Transition to maintenance LSVT. Dual-task training. Community walking. Tai chi recommended.' },
      { id: 's26', patientId: 'p6', date: dayOffset(-28), painScore: 1, functionScore: 5,
        subjective: 'Most confident in months. Walking in community. Doing tai chi group class.',
        objective: 'BBS: 48/56. TUG: 11 sec. Dual-task: maintained gait speed with cognitive task.',
        assessment: 'Excellent response. Maintaining gains. Dual-task performance good.',
        plan: 'Continue 2x/week. Progressive dual-task challenges. Caregiver education refresher.' },
      // --- David Park (p8) - Cervical ---
      { id: 's27', patientId: 'p8', date: dayOffset(-56), painScore: 7, functionScore: 3,
        subjective: 'Neck pain radiating to right arm. Numbness in thumb and index finger. Worse with computer work.',
        objective: 'Cervical ROM: flexion 30 deg, rotation right 40 deg. Spurling positive right. Grip strength reduced right. DTF 1/5.',
        assessment: 'C5/C6 radiculopathy. Neural tension positive. Ergonomic issues contributing.',
        plan: 'Cervical traction 10 min. Neural glides. Postural correction. Workstation assessment.' },
      { id: 's28', patientId: 'p8', date: dayOffset(-42), painScore: 5, functionScore: 4,
        subjective: 'Arm pain reducing. Numbness less frequent. New ergonomic setup helping.',
        objective: 'Cervical ROM improved: flexion 40 deg, rotation right 55 deg. Spurling negative. DTF 2/5.',
        assessment: 'Responding to traction and neural mobilization. Ergonomic changes positive.',
        plan: 'Continue traction. Progress neural glides. Strengthen DTF. Add scapular exercises.' },
      { id: 's29', patientId: 'p8', date: dayOffset(-21), painScore: 3, functionScore: 6,
        subjective: 'Much better. Can work full day. Only mild neck tension end of day. No arm symptoms.',
        objective: 'Cervical ROM 90% normal. Neural tension negative. DTF 3+/5. Good posture awareness.',
        assessment: 'Excellent progress. Radiculopathy resolved. Focus on prevention.',
        plan: 'Progress strengthening. Workplace wellness exercises. Reduce to fortnightly.' }
    ];
    for (var k = 0; k < sessions.length; k++) {
      sessions[k].createdAt = sessions[k].date + 'T10:00:00.000Z';
    }
    saveAll(KEYS.sessions, sessions);

    // Exercises
    var exercises = [
      { id: 'e1', patientId: 'p1', name: 'Quad Sets', sets: '3', reps: '10', hold: '5 sec', frequency: '3x daily',
        instructions: 'Sit or lie with leg extended. Tighten thigh muscle pressing knee down. Hold 5 seconds, release.', status: 'active' },
      { id: 'e2', patientId: 'p1', name: 'Heel Slides', sets: '3', reps: '15', hold: '-', frequency: '2x daily',
        instructions: 'Lie on back. Slowly slide heel toward buttock bending knee. Hold briefly at end range. Return slowly.', status: 'active' },
      { id: 'e3', patientId: 'p1', name: 'Straight Leg Raises', sets: '3', reps: '10', hold: '3 sec', frequency: '2x daily',
        instructions: 'Lie on back, one knee bent. Tighten quad on straight leg, lift 12 inches. Hold 3 seconds. Lower slowly.', status: 'active' },
      { id: 'e4', patientId: 'p2', name: 'Prone Press-ups', sets: '3', reps: '10', hold: '3 sec', frequency: 'Every 2 hours',
        instructions: 'Lie face down. Place hands by shoulders. Press upper body up keeping hips on surface. Hold at top, lower slowly.', status: 'active' },
      { id: 'e5', patientId: 'p2', name: 'Bird Dog', sets: '3', reps: '8 each side', hold: '5 sec', frequency: '2x daily',
        instructions: 'Start on hands and knees. Extend opposite arm and leg. Hold 5 seconds maintaining level pelvis. Alternate sides.', status: 'active' },
      { id: 'e6', patientId: 'p3', name: 'Pendulum Exercises', sets: '2', reps: '20 circles', hold: '-', frequency: '3x daily',
        instructions: 'Lean forward supporting yourself with good arm. Let affected arm hang. Make small circles. Increase size gradually.', status: 'active' },
      { id: 'e7', patientId: 'p3', name: 'Pulley Flexion', sets: '3', reps: '15', hold: '2 sec', frequency: '2x daily',
        instructions: 'Sit facing pulley. Hold handles. Use good arm to assist affected arm overhead. Hold at comfortable end range.', status: 'active' },
      { id: 'e8', patientId: 'p4', name: 'Seated Knee Extension', sets: '3', reps: '12', hold: '3 sec', frequency: '2x daily',
        instructions: 'Sit in firm chair. Slowly straighten knee fully. Hold 3 seconds at top. Lower slowly. Add ankle weight as tolerated.', status: 'active' },
      { id: 'e9', patientId: 'p5', name: 'Eccentric Shoulder ER', sets: '3', reps: '12', hold: '-', frequency: '1x daily',
        instructions: 'Stand with elbow at side, band attached. Slowly rotate forearm outward against resistance. Return slowly taking 4 seconds.', status: 'active' },
      { id: 'e10', patientId: 'p6', name: 'LSVT BIG Sit-to-Stand', sets: '3', reps: '10', hold: '-', frequency: '2x daily',
        instructions: 'Sit at edge of chair. Stand up using BIG exaggerated movements. Reach arms forward and up. Sit slowly.', status: 'active' },
      { id: 'e11', patientId: 'p6', name: 'Tandem Walking', sets: '1', reps: '20 steps', hold: '-', frequency: '2x daily',
        instructions: 'Walk heel-to-toe in a straight line. Use BIG steps. Focus on arm swing. Use wall for safety initially.', status: 'active' },
      { id: 'e12', patientId: 'p8', name: 'Chin Tucks', sets: '3', reps: '10', hold: '5 sec', frequency: '3x daily',
        instructions: 'Sit tall. Gently tuck chin making a double chin. Hold 5 seconds. Should feel stretch at base of skull.', status: 'active' },
      { id: 'e13', patientId: 'p8', name: 'Median Nerve Glides', sets: '2', reps: '10', hold: '2 sec', frequency: '3x daily',
        instructions: 'Stand with arm at side. Extend wrist back, then slowly straighten elbow and abduct arm. Hold gently. Return slowly.', status: 'active' }
    ];
    for (var l = 0; l < exercises.length; l++) {
      exercises[l].createdAt = new Date().toISOString();
    }
    saveAll(KEYS.exercises, exercises);

    // Billing - 3 months of INR billing data
    var billing = [];
    var bId = 1;

    function addBill(pid, dayOff, desc, amt, status, paidDayOff) {
      billing.push({
        id: 'b' + (bId++), patientId: pid, date: dayOffset(dayOff), description: desc,
        amount: amt, status: status, paidDate: status === 'paid' ? dayOffset(paidDayOff) : '',
        createdAt: dayOffset(dayOff) + 'T12:00:00.000Z'
      });
    }

    // Sarah Johnson (p1) - 12 sessions over 3 months
    addBill('p1', -87, 'Initial Evaluation', '2000', 'paid', -85);
    addBill('p1', -84, 'Therapeutic Exercise + NMES', '1200', 'paid', -82);
    addBill('p1', -77, 'Manual Therapy + Therapeutic Exercise', '1200', 'paid', -75);
    addBill('p1', -70, 'Therapeutic Exercise + Gait Training', '1000', 'paid', -68);
    addBill('p1', -63, 'Therapeutic Exercise + Balance', '1000', 'paid', -60);
    addBill('p1', -56, 'Therapeutic Exercise + Proprioception', '1000', 'paid', -54);
    addBill('p1', -49, 'Manual Therapy + Strengthening', '1200', 'paid', -47);
    addBill('p1', -42, 'Therapeutic Exercise + Agility', '1000', 'paid', -40);
    addBill('p1', -35, 'Therapeutic Exercise + Plyometric', '1000', 'paid', -33);
    addBill('p1', -28, 'Reassessment + Exercise Progression', '1500', 'paid', -26);
    addBill('p1', -14, 'Therapeutic Exercise + Sport-specific', '1000', 'pending', 0);
    addBill('p1', -7, 'Follow-up + Exercise Update', '800', 'pending', 0);

    // Robert Chen (p2) - 12 sessions
    addBill('p2', -87, 'Initial Evaluation (Complex)', '2500', 'paid', -84);
    addBill('p2', -84, 'McKenzie Protocol + Manual Therapy', '1500', 'paid', -81);
    addBill('p2', -77, 'Manual Therapy + Neural Glides', '1500', 'paid', -74);
    addBill('p2', -70, 'Therapeutic Exercise + Ergonomic Assessment', '1800', 'paid', -67);
    addBill('p2', -63, 'Core Stabilization + Manual Therapy', '1200', 'paid', -60);
    addBill('p2', -56, 'Therapeutic Exercise + Core Program', '1000', 'paid', -53);
    addBill('p2', -49, 'No-show fee', '500', 'pending', 0);
    addBill('p2', -42, 'Manual Therapy + Lifting Education', '1200', 'paid', -39);
    addBill('p2', -35, 'Therapeutic Exercise + Functional Training', '1000', 'paid', -32);
    addBill('p2', -28, 'Reassessment + Core Progression', '1500', 'paid', -25);
    addBill('p2', -14, 'Gym Program Design + Discharge', '1200', 'paid', -12);
    addBill('p2', -7, 'Follow-up Session', '800', 'pending', 0);

    // Emily Watson (p3) - 10 sessions
    addBill('p3', -73, 'Initial Evaluation', '2000', 'paid', -70);
    addBill('p3', -70, 'Joint Mobilization + Pendulums', '1500', 'paid', -67);
    addBill('p3', -63, 'Joint Mobilization Grade III', '1500', 'paid', -60);
    addBill('p3', -56, 'Joint Mobilization + Scapular Work', '1500', 'paid', -53);
    addBill('p3', -49, 'Joint Mobilization Grade IV', '1500', 'paid', -46);
    addBill('p3', -42, 'Manual Therapy + Stretching', '1200', 'paid', -39);
    addBill('p3', -35, 'Therapeutic Exercise + Mobilization', '1200', 'paid', -32);
    addBill('p3', -28, 'Strengthening + ROM', '1000', 'paid', -25);
    addBill('p3', -21, 'Reassessment + Exercise Progression', '1500', 'pending', 0);
    addBill('p3', -14, 'Therapeutic Exercise + Functional', '1000', 'pending', 0);

    // James Miller (p4) - 15 sessions (intensive TKR rehab)
    addBill('p4', -63, 'Initial Evaluation (Complex)', '2500', 'paid', -60);
    addBill('p4', -60, 'Therapeutic Exercise + CPM', '1200', 'paid', -57);
    addBill('p4', -58, 'Therapeutic Exercise + Gait', '1200', 'paid', -55);
    addBill('p4', -56, 'Therapeutic Exercise + ROM', '1000', 'paid', -53);
    addBill('p4', -53, 'Manual Therapy + Strengthening', '1500', 'paid', -50);
    addBill('p4', -51, 'Therapeutic Exercise + Balance', '1000', 'paid', -48);
    addBill('p4', -49, 'Therapeutic Exercise + Gait Training', '1200', 'paid', -46);
    addBill('p4', -46, 'Therapeutic Exercise + Stairs', '1000', 'paid', -43);
    addBill('p4', -42, 'Reassessment + Cane Training', '1500', 'paid', -39);
    addBill('p4', -39, 'Therapeutic Exercise + Community Walk', '1000', 'paid', -36);
    addBill('p4', -35, 'Balance Training + Strengthening', '1000', 'paid', -32);
    addBill('p4', -32, 'Therapeutic Exercise + Functional', '1000', 'paid', -29);
    addBill('p4', -21, 'Follow-up + Gym Program', '1200', 'pending', 0);
    addBill('p4', -14, 'Therapeutic Exercise + ADL', '1000', 'pending', 0);
    addBill('p4', -7, 'Reassessment + Discharge Plan', '1500', 'pending', 0);

    // Maria Garcia (p5) - 7 sessions
    addBill('p5', -45, 'Initial Evaluation', '2000', 'paid', -42);
    addBill('p5', -42, 'Eccentric Loading + Scapular', '1200', 'paid', -39);
    addBill('p5', -35, 'Therapeutic Exercise + Manual Therapy', '1200', 'paid', -32);
    addBill('p5', -28, 'Eccentric Progression + Kinetic Chain', '1000', 'paid', -25);
    addBill('p5', -21, 'Therapeutic Exercise + Overhead Prep', '1000', 'paid', -18);
    addBill('p5', -14, 'Reassessment + Sport Return Protocol', '1500', 'pending', 0);
    addBill('p5', -7, 'Plyometric + Sport-specific', '1200', 'pending', 0);

    // William Taylor (p6) - 14 sessions (2x/week for 3 months)
    addBill('p6', -87, 'Initial Evaluation (Complex)', '2500', 'paid', -84);
    addBill('p6', -84, 'LSVT BIG Session 1 + Balance', '1500', 'paid', -81);
    addBill('p6', -77, 'LSVT BIG + Gait Training', '1500', 'paid', -74);
    addBill('p6', -70, 'LSVT BIG + Dual-task', '1500', 'paid', -67);
    addBill('p6', -63, 'Balance Training + Fall Prevention', '1200', 'paid', -60);
    addBill('p6', -56, 'LSVT Maintenance + Balance', '1200', 'paid', -53);
    addBill('p6', -49, 'Gait Training + Community Walk', '1200', 'paid', -46);
    addBill('p6', -42, 'Balance + Dual-task Challenge', '1200', 'paid', -39);
    addBill('p6', -35, 'Therapeutic Exercise + Balance', '1000', 'paid', -32);
    addBill('p6', -28, 'Reassessment + Program Update', '1500', 'paid', -25);
    addBill('p6', -21, 'Balance + Tai Chi Prep', '1000', 'paid', -18);
    addBill('p6', -14, 'Therapeutic Exercise + Dual-task', '1000', 'pending', 0);
    addBill('p6', -7, 'Balance Training + Gait', '1000', 'pending', 0);

    // Anna Kowalski (p7) - 8 sessions (completed)
    addBill('p7', -87, 'Initial Evaluation', '2000', 'paid', -84);
    addBill('p7', -84, 'Stretching Protocol + Night Splint Fit', '1200', 'paid', -81);
    addBill('p7', -77, 'Manual Therapy + Stretching', '1200', 'paid', -74);
    addBill('p7', -70, 'Therapeutic Exercise + Orthotics Review', '1500', 'paid', -67);
    addBill('p7', -63, 'Stretching + Gait Analysis', '1200', 'paid', -60);
    addBill('p7', -56, 'Therapeutic Exercise + Running Prep', '1000', 'paid', -53);
    addBill('p7', -42, 'Running Assessment + Progression', '1500', 'paid', -39);
    addBill('p7', -28, 'Discharge Assessment + Home Program', '1200', 'paid', -25);

    // David Park (p8) - 8 sessions
    addBill('p8', -59, 'Initial Evaluation', '2000', 'paid', -56);
    addBill('p8', -56, 'Cervical Traction + Neural Glides', '1500', 'paid', -53);
    addBill('p8', -49, 'Traction + Postural Correction', '1500', 'paid', -46);
    addBill('p8', -42, 'Manual Therapy + Ergonomic Education', '1800', 'paid', -39);
    addBill('p8', -35, 'Traction + DTF Strengthening', '1200', 'paid', -32);
    addBill('p8', -28, 'Therapeutic Exercise + Neural Mob', '1000', 'paid', -25);
    addBill('p8', -21, 'Reassessment + Strengthening', '1500', 'pending', 0);
    addBill('p8', -14, 'Therapeutic Exercise + Workplace Wellness', '1000', 'pending', 0);

    saveAll(KEYS.billing, billing);

    // Prescriptions - realistic physio prescriptions
    var prescriptions = [
      // Sarah Johnson (p1) - ACL rehab
      { id: 'rx1', patientId: 'p1', date: dayOffset(-84), medication: 'Aceclofenac', dosage: '100mg', route: 'Oral', frequency: 'Twice daily (after meals)', duration: '7 days',
        instructions: 'Take after food. Avoid on empty stomach. Stop if gastric irritation occurs.', prescribedBy: 'Dr. Admin', status: 'discontinued' },
      { id: 'rx2', patientId: 'p1', date: dayOffset(-84), medication: 'Pantoprazole', dosage: '40mg', route: 'Oral', frequency: 'Once daily (before breakfast)', duration: '7 days',
        instructions: 'Take 30 minutes before breakfast. Gastric protection while on NSAIDs.', prescribedBy: 'Dr. Admin', status: 'discontinued' },
      { id: 'rx3', patientId: 'p1', date: dayOffset(-56), medication: 'Calcium + Vitamin D3', dosage: '500mg + 250IU', route: 'Oral', frequency: 'Once daily', duration: '90 days',
        instructions: 'Take with meals for better absorption. Continue for bone health during recovery.', prescribedBy: 'Dr. Admin', status: 'active' },
      { id: 'rx4', patientId: 'p1', date: dayOffset(-14), medication: 'Thiocolchicoside', dosage: '4mg', route: 'Oral', frequency: 'Twice daily', duration: '5 days',
        instructions: 'Muscle relaxant for post-exercise stiffness. Take after meals. May cause drowsiness.', prescribedBy: 'Dr. Admin', status: 'active' },

      // Robert Chen (p2) - Chronic LBP
      { id: 'rx5', patientId: 'p2', date: dayOffset(-84), medication: 'Pregabalin', dosage: '75mg', route: 'Oral', frequency: 'Twice daily', duration: '30 days',
        instructions: 'For neuropathic pain. May cause dizziness/drowsiness. Do not drive initially. Taper before stopping.', prescribedBy: 'Dr. Admin', status: 'discontinued' },
      { id: 'rx6', patientId: 'p2', date: dayOffset(-84), medication: 'Etoricoxib', dosage: '60mg', route: 'Oral', frequency: 'Once daily', duration: '14 days',
        instructions: 'Take after food. For acute pain relief. Monitor BP. Stop if any gastric issues.', prescribedBy: 'Dr. Admin', status: 'discontinued' },
      { id: 'rx7', patientId: 'p2', date: dayOffset(-56), medication: 'Methylcobalamin', dosage: '1500mcg', route: 'Oral', frequency: 'Once daily', duration: '60 days',
        instructions: 'For nerve health and repair. Take with breakfast.', prescribedBy: 'Dr. Admin', status: 'active' },
      { id: 'rx8', patientId: 'p2', date: dayOffset(-28), medication: 'Diclofenac Gel', dosage: '1%', route: 'Topical', frequency: 'Three times daily', duration: '14 days',
        instructions: 'Apply thin layer on lower back. Massage gently. Wash hands after application. Do not cover with bandage.', prescribedBy: 'Dr. Admin', status: 'active' },

      // Emily Watson (p3) - Frozen shoulder
      { id: 'rx9', patientId: 'p3', date: dayOffset(-70), medication: 'Tramadol', dosage: '50mg', route: 'Oral', frequency: 'As needed (max 3/day)', duration: '7 days',
        instructions: 'For severe pain. Take only when pain is unbearable. May cause nausea. Do not drive.', prescribedBy: 'Dr. Admin', status: 'discontinued' },
      { id: 'rx10', patientId: 'p3', date: dayOffset(-70), medication: 'Amitriptyline', dosage: '10mg', route: 'Oral', frequency: 'Once daily at bedtime', duration: '30 days',
        instructions: 'Low-dose for night pain and sleep. Take at bedtime. May cause dry mouth.', prescribedBy: 'Dr. Admin', status: 'discontinued' },
      { id: 'rx11', patientId: 'p3', date: dayOffset(-42), medication: 'Capsaicin Cream', dosage: '0.025%', route: 'Topical', frequency: 'Three times daily', duration: '30 days',
        instructions: 'Apply to shoulder area. Initial burning sensation is normal and will decrease. Avoid eyes and broken skin.', prescribedBy: 'Dr. Admin', status: 'active' },

      // James Miller (p4) - TKR
      { id: 'rx12', patientId: 'p4', date: dayOffset(-60), medication: 'Paracetamol', dosage: '650mg', route: 'Oral', frequency: 'Three times daily', duration: '14 days',
        instructions: 'For post-operative pain. Do not exceed 3 tablets per day. Take after meals.', prescribedBy: 'Dr. Admin', status: 'discontinued' },
      { id: 'rx13', patientId: 'p4', date: dayOffset(-60), medication: 'Enoxaparin', dosage: '40mg', route: 'Subcutaneous', frequency: 'Once daily', duration: '14 days',
        instructions: 'DVT prophylaxis post-surgery. Inject in abdomen. Rotate injection sites. Monitor for bruising.', prescribedBy: 'Dr. Admin', status: 'discontinued' },
      { id: 'rx14', patientId: 'p4', date: dayOffset(-60), medication: 'Ferrous Sulphate', dosage: '200mg', route: 'Oral', frequency: 'Once daily', duration: '30 days',
        instructions: 'Iron supplement post-surgery. Take with Vitamin C for better absorption. May cause dark stools.', prescribedBy: 'Dr. Admin', status: 'discontinued' },
      { id: 'rx15', patientId: 'p4', date: dayOffset(-32), medication: 'Glucosamine + Chondroitin', dosage: '500mg + 400mg', route: 'Oral', frequency: 'Twice daily', duration: '90 days',
        instructions: 'Joint supplement. Take with meals. Long-term use recommended for joint health.', prescribedBy: 'Dr. Admin', status: 'active' },

      // Maria Garcia (p5) - Rotator cuff
      { id: 'rx16', patientId: 'p5', date: dayOffset(-42), medication: 'Aceclofenac + Paracetamol', dosage: '100mg + 325mg', route: 'Oral', frequency: 'Twice daily (after meals)', duration: '7 days',
        instructions: 'For pain and inflammation. Take strictly after food. Do not take on empty stomach.', prescribedBy: 'Dr. Admin', status: 'discontinued' },
      { id: 'rx17', patientId: 'p5', date: dayOffset(-28), medication: 'Piroxicam Gel', dosage: '0.5%', route: 'Topical', frequency: 'Three times daily', duration: '21 days',
        instructions: 'Apply on shoulder joint area. Massage gently for 2-3 minutes. Wash hands after use.', prescribedBy: 'Dr. Admin', status: 'active' },

      // William Taylor (p6) - Parkinsons
      { id: 'rx18', patientId: 'p6', date: dayOffset(-84), medication: 'Levodopa/Carbidopa', dosage: '100/25mg', route: 'Oral', frequency: 'Three times daily', duration: 'Ongoing',
        instructions: 'Take 30 min before meals. Do not crush. Report any dyskinesia or wearing-off symptoms.', prescribedBy: 'Dr. Admin (Neurology referral)', status: 'active' },
      { id: 'rx19', patientId: 'p6', date: dayOffset(-56), medication: 'Vitamin D3', dosage: '60000IU', route: 'Oral', frequency: 'Once weekly', duration: '8 weeks',
        instructions: 'Fall prevention supplement. Take with fatty meal for absorption. Recheck levels after 8 weeks.', prescribedBy: 'Dr. Admin', status: 'active' },

      // David Park (p8) - Cervical
      { id: 'rx20', patientId: 'p8', date: dayOffset(-56), medication: 'Tizanidine', dosage: '2mg', route: 'Oral', frequency: 'Twice daily', duration: '10 days',
        instructions: 'Muscle relaxant for cervical spasm. May cause drowsiness. Avoid driving. Take at bedtime if drowsy.', prescribedBy: 'Dr. Admin', status: 'discontinued' },
      { id: 'rx21', patientId: 'p8', date: dayOffset(-42), medication: 'Gabapentin', dosage: '300mg', route: 'Oral', frequency: 'Once daily at bedtime', duration: '30 days',
        instructions: 'For radicular arm pain. Titrate: 300mg x 3 days, then 300mg BD if needed. Report any dizziness.', prescribedBy: 'Dr. Admin', status: 'discontinued' },
      { id: 'rx22', patientId: 'p8', date: dayOffset(-21), medication: 'Methylcobalamin + Alpha Lipoic Acid', dosage: '1500mcg + 100mg', route: 'Oral', frequency: 'Once daily', duration: '60 days',
        instructions: 'Nerve supplement. Take with breakfast. For nerve regeneration and neuropathic symptom relief.', prescribedBy: 'Dr. Admin', status: 'active' }
    ];
    for (var rx = 0; rx < prescriptions.length; rx++) {
      prescriptions[rx].createdAt = prescriptions[rx].date + 'T10:00:00.000Z';
    }
    saveAll(KEYS.prescriptions, prescriptions);

    // Activity log - recent activities with INR
    var activities = [
      { text: 'Appointment completed: Robert Chen', time: new Date(td.getTime() - 3600000).toISOString() },
      { text: 'Session note added for Sarah Johnson', time: new Date(td.getTime() - 7200000).toISOString() },
      { text: 'Payment received: \u20B91,500 from Emily Watson', time: new Date(td.getTime() - 14400000).toISOString() },
      { text: 'Invoice created: \u20B91,000 for James Miller', time: new Date(td.getTime() - 86400000).toISOString() },
      { text: 'Exercise prescribed for William Taylor', time: new Date(td.getTime() - 86400000).toISOString() },
      { text: 'Appointment booked for Maria Garcia', time: new Date(td.getTime() - 86400000 * 2).toISOString() },
      { text: 'Payment received: \u20B92,500 from Robert Chen', time: new Date(td.getTime() - 86400000 * 2).toISOString() },
      { text: 'Invoice created: \u20B91,200 for David Park', time: new Date(td.getTime() - 86400000 * 3).toISOString() },
      { text: 'Session note added for James Miller', time: new Date(td.getTime() - 86400000 * 3).toISOString() },
      { text: 'Appointment completed: Emily Watson', time: new Date(td.getTime() - 86400000 * 4).toISOString() },
      { text: 'Payment received: \u20B91,200 from Anna Kowalski', time: new Date(td.getTime() - 86400000 * 4).toISOString() },
      { text: 'Treatment completed: Anna Kowalski', time: new Date(td.getTime() - 86400000 * 5).toISOString() },
      { text: 'New patient added: David Park', time: new Date(td.getTime() - 86400000 * 7).toISOString() },
      { text: 'Reassessment completed: William Taylor', time: new Date(td.getTime() - 86400000 * 7).toISOString() },
      { text: 'Payment received: \u20B91,500 from James Miller', time: new Date(td.getTime() - 86400000 * 10).toISOString() }
    ];
    saveAll(KEYS.activity, activities);
  }

  return api;
})();
