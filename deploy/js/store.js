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
    createPatient: function(p) {
      var r = create(KEYS.patients, p);
      logActivity('New patient added: ' + p.name);
      // Update phone index in Firestore
      if (window.FirebaseSync && FirebaseSync.updatePatientPhoneIndex && r.phone) {
        FirebaseSync.updatePatientPhoneIndex(null, r);
      }
      return r;
    },
    updatePatient: function(id, u) {
      var r = update(KEYS.patients, id, u);
      if (r) {
        logActivity('Patient updated: ' + r.name);
        // Update phone index in Firestore
        if (window.FirebaseSync && FirebaseSync.updatePatientPhoneIndex && r.phone) {
          FirebaseSync.updatePatientPhoneIndex(null, r);
        }
      }
      return r;
    },
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

    // Check for duplicate future scheduled appointment for same patient
    hasDuplicateFutureAppointment: function(patientId, excludeId) {
      var today = Utils.today();
      var appts = getAll(KEYS.appointments);
      for (var i = 0; i < appts.length; i++) {
        var a = appts[i];
        if (a.patientId === patientId && a.status === 'scheduled' && a.date >= today && a.id !== excludeId) {
          return a;
        }
      }
      return null;
    },

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

      // Assign tags/bodyRegions to patients that don't already have them (from seed)
      patients = getAll(KEYS.patients, true);
      var anyChanged = false;
      for (var j = 0; j < patients.length; j++) {
        if (!patients[j].tags || patients[j].tags.length === 0) {
          patients[j].tags = [];
          anyChanged = true;
        }
        if (!patients[j].bodyRegions || patients[j].bodyRegions.length === 0) {
          patients[j].bodyRegions = [];
          anyChanged = true;
        }
      }
      if (anyChanged) saveAll(KEYS.patients, patients);
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

    // Phone index backfill is handled in app.js after Firebase init
  }

  function timeToMinutes(t) {
    var parts = t.split(':');
    return parseInt(parts[0],10) * 60 + parseInt(parts[1],10);
  }

  // --- Seed Data (70 Indian-named patients, 3 months of comprehensive data) ---
  function seed() {
    var cid = sessionStorage.getItem('physio_clinicId') || 'default';
    if (cid !== 'default') return; // Only seed demo data for default clinic
    if (localStorage.getItem(KEYS.users)) return; // Already seeded

    // Users
    saveAll(KEYS.users, [
      { id: 'u1', username: 'admin', password: 'admin123', name: 'Dr. Priya Sharma', role: 'admin' }
    ]);

    var todayStr = Utils.today();
    var td = new Date(todayStr);

    function dayOffset(n) {
      var d = new Date(td);
      d.setDate(d.getDate() + n);
      return Utils.toDateString(d);
    }

    // Deterministic pseudo-random for reproducible seed data
    var _seed = 42;
    function rand() { _seed = (_seed * 16807 + 0) % 2147483647; return (_seed - 1) / 2147483646; }
    function randInt(min, max) { return Math.floor(rand() * (max - min + 1)) + min; }
    function pick(arr) { return arr[randInt(0, arr.length - 1)]; }

    // ===== NAME POOLS =====
    var maleFirst = ['Rajesh','Amit','Suresh','Vikram','Arjun','Ravi','Anil','Sanjay','Deepak','Manoj','Kiran','Rahul','Gaurav','Nitin','Ajay','Rohit','Vinod','Ashok','Prakash','Hemant','Sachin','Dinesh','Naveen','Mukesh','Pankaj','Vishal','Sandeep','Arun','Ramesh','Mohan','Harish','Vijay','Pradeep','Sunil'];
    var femaleFirst = ['Priya','Neha','Anjali','Sunita','Kavita','Pooja','Rekha','Meena','Divya','Swati','Ritu','Anita','Seema','Geeta','Nisha','Pallavi','Shweta','Rashmi','Manisha','Aarti','Sushma','Vandana','Jyoti','Sarita','Deepa','Lakshmi','Kamala','Radha','Usha','Bhavana','Sneha','Manju','Padma','Archana'];
    var lastNames = ['Sharma','Patel','Gupta','Singh','Kumar','Reddy','Nair','Pillai','Joshi','Verma','Rao','Iyer','Mishra','Desai','Mehta','Agarwal','Bhat','Saxena','Tiwari','Chauhan','Menon','Das','Roy','Chopra','Kulkarni','Hegde','Shetty','Thakur','Bose','Mukherjee','Banerjee','Chowdhury','Naidu','Patil'];
    var streets = ['MG Road','Park Street','Anna Nagar','Banjara Hills','Koramangala','Sector 15','Civil Lines','Model Town','Indiranagar','Jubilee Hills','Malviya Nagar','Defence Colony','Salt Lake','Vasant Kunj','Aundh','Bandra West','Mylapore','Camp Area','Jayanagar','Andheri West'];
    var cities = ['Mumbai','Delhi','Bangalore','Hyderabad','Chennai','Pune','Kolkata','Ahmedabad','Jaipur','Lucknow','Chandigarh','Bhopal','Kochi','Coimbatore','Nagpur','Indore','Mysore','Vadodara','Surat','Vizag'];

    // ===== DIAGNOSIS TEMPLATES =====
    var diagTemplates = [
      { diag: 'Chronic Low Back Pain - Lumbar spondylosis', plan: 'Core strengthening. McKenzie protocol. Ergonomic education. TENS for pain management. Postural correction.', tags: ['tag2','tag7'], body: ['lumbar','sacrum-sij'] },
      { diag: 'Knee Osteoarthritis - Bilateral', plan: 'Quadriceps strengthening. ROM exercises. Weight management counselling. Hot pack + US therapy. Activity modification.', tags: ['tag1','tag5'], body: ['l-knee','r-knee'] },
      { diag: 'Frozen Shoulder (Adhesive Capsulitis) - Right', plan: 'Joint mobilization grades III-IV. Stretching protocol. Pendulum exercises. Pulley exercises at home.', tags: ['tag3'], body: ['r-shoulder-front','r-shoulder-back'] },
      { diag: 'Cervical Spondylosis with Radiculopathy', plan: 'Cervical traction. Isometric neck exercises. Neural glides. Postural correction. Ergonomic workstation setup.', tags: ['tag7'], body: ['neck-back','neck-front'] },
      { diag: 'ACL Reconstruction - Post-operative Rehab', plan: 'Progressive ROM protocol. Quad activation. Proprioception training. Sport-specific rehabilitation.', tags: ['tag1','tag4','tag6'], body: ['l-knee','l-thigh'] },
      { diag: 'Rotator Cuff Tear - Post-surgical Repair', plan: 'Passive ROM progression. Scapular stabilization. Eccentric strengthening. Gradual return to overhead activities.', tags: ['tag3','tag4'], body: ['r-shoulder-front','r-shoulder-back','r-scapula'] },
      { diag: 'Lumbar Disc Herniation - L5/S1', plan: 'McKenzie extension protocol. Core stabilization. Neural mobilization. Avoid flexion activities. Pain education.', tags: ['tag2','tag7'], body: ['lumbar','sacrum-sij','l-shin'] },
      { diag: 'Plantar Fasciitis - Right Foot', plan: 'Calf stretching. Plantar fascia release. Night splint. Orthotics. Ice massage. Gradual activity progression.', tags: ['tag6'], body: ['r-heel','r-foot','r-ankle'] },
      { diag: 'Tennis Elbow (Lateral Epicondylitis)', plan: 'Eccentric wrist extension exercises. Forearm stretching. Activity modification. Brace use during activities.', tags: ['tag6'], body: ['r-forearm','r-elbow'] },
      { diag: 'Post-stroke Rehabilitation - Left Hemiparesis', plan: 'Neurodevelopmental approach. Task-specific training. Balance and gait training. Upper limb retraining.', tags: ['tag8','tag5'], body: ['l-shoulder-front','l-upper-arm','l-forearm','l-thigh','l-shin'] },
      { diag: 'Total Knee Replacement - Right', plan: 'ROM restoration to 0-120 deg. Progressive weight bearing. Gait training. Stair negotiation. Quad strengthening.', tags: ['tag1','tag4','tag5'], body: ['r-knee','r-thigh'] },
      { diag: 'Sciatica - Left Lower Extremity', plan: 'Neural mobilization. Core stabilization. McKenzie approach if centralizing. Avoid prolonged sitting. Pain education.', tags: ['tag2','tag7'], body: ['lumbar','l-hip','l-thigh','l-shin'] },
      { diag: 'Ankle Sprain - Grade II Right', plan: 'RICE protocol. Progressive ankle strengthening. Proprioception training. Balance board exercises. Taping during activity.', tags: ['tag6'], body: ['r-ankle','r-foot'] },
      { diag: 'Thoracic Outlet Syndrome', plan: 'Postural correction. Scalene stretching. First rib mobilization. Neural glides. Strengthening lower trapezius.', tags: ['tag7'], body: ['neck-front','r-shoulder-front','r-upper-arm'] },
      { diag: 'Carpal Tunnel Syndrome - Bilateral', plan: 'Nerve gliding exercises. Wrist splinting at night. Ergonomic modifications. Tendon gliding. US therapy.', tags: ['tag7'], body: ['l-hand','r-hand'] },
      { diag: 'Hip Osteoarthritis - Right', plan: 'Joint mobilization. Hip strengthening. Pool therapy. Weight management. Gait training with assistive device.', tags: ['tag5','tag7'], body: ['r-hip'] },
      { diag: 'Fibromyalgia', plan: 'Graded exercise therapy. Pain education. Relaxation techniques. Aquatic therapy. Sleep hygiene counselling.', tags: ['tag7'], body: ['neck-back','lumbar','r-shoulder-back','l-shoulder-back'] },
      { diag: 'Cervical Whiplash Injury', plan: 'Gentle ROM exercises. Deep neck flexor activation. Graduated return to activity. Pain management. Postural education.', tags: ['tag7'], body: ['neck-back','neck-front'] },
      { diag: 'Patellofemoral Pain Syndrome - Left', plan: 'VMO strengthening. Patellar taping. Hip abductor exercises. Stretching IT band and quads. Activity modification.', tags: ['tag1','tag6'], body: ['l-knee'] },
      { diag: 'Frozen Shoulder (Adhesive Capsulitis) - Left', plan: 'Joint mobilization. Stretching protocol. Wall walking exercises. Pulley exercises. Hot pack before mobilization.', tags: ['tag3'], body: ['l-shoulder-front','l-shoulder-back'] },
      { diag: 'De Quervain Tenosynovitis - Right', plan: 'Thumb spica splint. Tendon gliding exercises. Ice massage. Activity modification. Gradual return to gripping activities.', tags: [], body: ['r-hand'] },
      { diag: 'Piriformis Syndrome - Right', plan: 'Piriformis stretching. Hip rotator strengthening. Self-myofascial release. Core stability. Ergonomic sitting advice.', tags: ['tag2'], body: ['r-hip','lumbar'] },
      { diag: 'Meniscus Tear - Right Knee (Conservative)', plan: 'Quad strengthening. Hamstring curls. ROM restoration. Proprioception. Gradual return to pivoting activities.', tags: ['tag1','tag6'], body: ['r-knee'] },
      { diag: 'Post-fracture Rehab - Distal Radius Right', plan: 'ROM exercises wrist and forearm. Grip strengthening progression. Scar mobilization. Functional hand therapy.', tags: ['tag4'], body: ['r-hand','r-forearm'] },
      { diag: 'Ankylosing Spondylitis', plan: 'Spinal extension exercises. Breathing exercises. Posture program. Aquatic therapy. Maintain mobility focus.', tags: ['tag7'], body: ['lumbar','thoracic','neck-back'] },
      { diag: 'Achilles Tendinopathy - Left', plan: 'Eccentric heel drops. Calf stretching. Activity modification. Gradual loading progression. Footwear advice.', tags: ['tag6'], body: ['l-ankle','l-shin'] },
      { diag: 'Total Hip Replacement - Left', plan: 'Hip precautions education. Progressive mobilization. Gait training. Strengthening program. Stair training.', tags: ['tag4','tag5'], body: ['l-hip','l-thigh'] },
      { diag: 'Golfer\'s Elbow (Medial Epicondylitis)', plan: 'Eccentric wrist flexion exercises. Forearm stretching. Ice therapy. Gradual return to gripping. Brace use.', tags: ['tag6'], body: ['r-elbow','r-forearm'] },
      { diag: 'Cervical Myelopathy', plan: 'Gentle cervical ROM. Balance training. Gait training. Upper limb dexterity exercises. Monitor for progression.', tags: ['tag8'], body: ['neck-back','neck-front'] },
      { diag: 'IT Band Syndrome - Left', plan: 'IT band foam rolling. Hip strengthening (glut med). Stretching. Running gait correction. Gradual mileage increase.', tags: ['tag6'], body: ['l-knee','l-thigh'] }
    ];

    // ===== TIME SLOTS =====
    var timeSlots = ['09:00','09:30','10:00','10:30','11:00','11:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00'];
    var durations = ['30','45','45','60'];
    var apptTypes = ['Treatment','Treatment','Treatment','Follow-up','Follow-up'];

    // ===== SOAP NOTE TEMPLATES =====
    var subjectives = [
      'Pain reducing gradually. Able to perform daily activities better. Compliance with home exercises.',
      'Some improvement since last visit. Morning stiffness still present but shorter duration.',
      'Feeling stronger. Pain only at end range. Can tolerate exercises well.',
      'Mild flare-up after increased activity. Settled with rest and ice. Continuing exercises.',
      'Significant improvement. No night pain. Can perform most functional tasks.',
      'Slow progress. Pain intermittent. Some difficulty with prolonged activities.',
      'Good response to treatment. Wants to increase activity level. Motivated.',
      'Occasional discomfort with specific movements. Overall trend improving.',
      'Much better compared to initial visit. Confidence increasing. Doing exercises regularly.',
      'Slight setback from overdoing activities. Advised on activity pacing.'
    ];
    var objectives = [
      'ROM improving. Strength gains noted. Gait pattern normalizing.',
      'Active ROM 80% of normal. MMT 4/5 involved muscles. Mild tenderness on palpation.',
      'Full PROM. Active ROM 90% normal. Special tests negative. Functional movements improved.',
      'Moderate improvement in ROM. Strength 3+/5. Compensatory patterns reducing.',
      'Near-normal ROM bilateral. Strength 4+/5. Functional tests within normal limits.',
      'Slight improvement in ROM. Pain on resistance 4/10. Swelling minimal.',
      'Good ROM gains. Strength improving 4/5. Balance and proprioception adequate.',
      'Functional ROM achieved. Strength 4/5. Special tests negative. Good movement quality.',
      'ROM within functional limits. MMT 4+/5. No instability. Good proprioception.',
      'Modest gains in ROM. Strength 3/5. Still some guarding with end-range movements.'
    ];
    var assessments = [
      'Progressing well. On track with rehabilitation goals. Continue current program.',
      'Steady improvement. Responding to manual therapy and exercises. Advance program.',
      'Good outcome expected. Compliance excellent. Ready to progress to next phase.',
      'Moderate response. May need to adjust treatment approach. Consider additional modalities.',
      'Excellent progress. Approaching discharge criteria. Transition to home program.',
      'Satisfactory progress. Continue current plan with minor modifications.',
      'Responding well to treatment. Functional goals being met. Continue progression.',
      'Good rehabilitation trajectory. Self-management skills developing well.',
      'Meeting expected milestones. Pain well controlled. Strength gains consistent.',
      'Slower than expected progress. Reassess if no improvement in 2 weeks.'
    ];
    var plans = [
      'Continue current exercise program. Progress resistance. Review in 1 week.',
      'Advance strengthening protocol. Add functional exercises. Reduce to weekly visits.',
      'Progress to sport-specific training. Home program updated. Follow-up in 2 weeks.',
      'Modify exercise intensity. Add manual therapy component. Continue weekly.',
      'Begin discharge planning. Home program finalized. Monthly follow-up.',
      'Increase exercise complexity. Add balance training. Continue current frequency.',
      'Progress loading parameters. Add endurance component. Review progress next visit.',
      'Maintain current program. Focus on activity-specific rehabilitation. Weekly review.',
      'Continue progression. Add proprioception challenges. Educate on self-management.',
      'Reassess treatment approach. Consider additional modalities. Weekly visits.'
    ];

    // ===== BILLING DESCRIPTIONS =====
    var billDescs = [
      'Therapeutic Exercise + Manual Therapy', 'Joint Mobilization + Exercises', 'Strengthening + Balance Training',
      'Manual Therapy + Modalities', 'Therapeutic Exercise + Gait Training', 'Assessment + Exercise Progression',
      'Core Stabilization + Manual Therapy', 'Stretching + Strengthening Program', 'Functional Training + Exercises',
      'Treatment Session + Home Program Update'
    ];
    var billAmounts = ['800','900','1000','1000','1200','1200','1500','1500','1800','2000'];

    // ===== GENERATE 70 PATIENTS =====
    var patients = [];
    var usedPhones = {};
    for (var i = 0; i < 70; i++) {
      var isMale = rand() < 0.48;
      var first = isMale ? pick(maleFirst) : pick(femaleFirst);
      var last = pick(lastNames);
      var name = first + ' ' + last;
      var age = randInt(22, 75);
      var birthYear = td.getFullYear() - age;
      var bMonth = randInt(1, 12);
      var bDay = randInt(1, 28);
      var dob = birthYear + '-' + (bMonth < 10 ? '0' : '') + bMonth + '-' + (bDay < 10 ? '0' : '') + bDay;
      var phone = '' + pick(['6','7','8','9']) + randInt(100000000, 999999999);
      while (usedPhones[phone]) { phone = '' + pick(['6','7','8','9']) + randInt(100000000, 999999999); }
      usedPhones[phone] = true;
      var diagIdx = i % diagTemplates.length;
      var dt = diagTemplates[diagIdx];
      var isCompleted = i >= 60; // last 10 patients are completed
      patients.push({
        id: 'p' + (i + 1),
        name: name,
        dob: dob,
        gender: isMale ? 'male' : 'female',
        phone: phone,
        phoneCode: '+91',
        email: first.toLowerCase() + '.' + last.toLowerCase() + '@email.com',
        address: randInt(1, 500) + ', ' + pick(streets) + ', ' + pick(cities),
        diagnosis: dt.diag,
        treatmentPlan: dt.plan,
        emergencyContact: pick(isMale ? femaleFirst : maleFirst) + ' ' + last,
        emergencyPhone: '' + pick(['6','7','8','9']) + randInt(100000000, 999999999),
        emergencyPhoneCode: '+91',
        status: isCompleted ? 'completed' : 'active',
        insurance: pick(['Star Health','ICICI Lombard','Max Bupa','New India Assurance','HDFC Ergo','None','None','None']),
        notes: '',
        tags: dt.tags.slice(),
        bodyRegions: dt.body.slice(),
        createdAt: new Date(td.getTime() - randInt(30, 100) * 86400000).toISOString()
      });
    }
    saveAll(KEYS.patients, patients);

    // ===== GENERATE APPOINTMENTS (3-5 per patient, spanning 3 months) =====
    var appts = [];
    var aId = 1;

    for (var ai = 0; ai < patients.length; ai++) {
      var pt = patients[ai];
      var isComp = pt.status === 'completed';
      var numAppts = randInt(3, 6);
      var startOffset = isComp ? randInt(-85, -50) : randInt(-75, -20);
      var interval = randInt(7, 14);
      var ptTime = pick(timeSlots);
      var ptDur = pick(durations);

      for (var aj = 0; aj < numAppts; aj++) {
        var apptDay = startOffset + (aj * interval);
        var status;
        if (apptDay < -1) {
          status = 'completed';
          if (rand() < 0.06) status = 'no-show';
          if (rand() < 0.04) status = 'cancelled';
        } else if (apptDay <= 0) {
          status = 'scheduled';
        } else {
          status = 'scheduled';
        }
        if (isComp && apptDay > -10) continue; // completed patients don't have recent/future appts
        appts.push({
          id: 'a' + (aId++),
          patientId: pt.id,
          patientName: pt.name,
          date: dayOffset(apptDay),
          time: ptTime,
          duration: ptDur,
          type: aj === 0 ? 'Initial Evaluation' : pick(apptTypes),
          status: status,
          notes: aj === 0 ? 'Initial evaluation and assessment' : '',
          createdAt: dayOffset(apptDay) + 'T08:00:00.000Z'
        });
      }
    }

    // Add specific today appointments for visibility
    var todayPatients = ['p1','p2','p3','p5','p8','p12','p15','p20'];
    var todayTimes = ['09:00','09:30','10:00','10:30','11:00','14:00','14:30','15:00'];
    for (var ti = 0; ti < todayPatients.length; ti++) {
      var tp = null;
      for (var tpi = 0; tpi < patients.length; tpi++) {
        if (patients[tpi].id === todayPatients[ti]) { tp = patients[tpi]; break; }
      }
      if (tp) {
        appts.push({
          id: 'a' + (aId++),
          patientId: tp.id,
          patientName: tp.name,
          date: todayStr,
          time: todayTimes[ti],
          duration: '45',
          type: 'Treatment',
          status: 'scheduled',
          notes: 'Regular treatment session',
          createdAt: todayStr + 'T08:00:00.000Z'
        });
      }
    }
    saveAll(KEYS.appointments, appts);

    // ===== GENERATE SESSIONS (1 per completed appointment) =====
    var sessions = [];
    var sId = 1;
    for (var si = 0; si < appts.length; si++) {
      var ap = appts[si];
      if (ap.status !== 'completed') continue;
      var painStart = randInt(5, 8);
      var painDelta = Math.min(sId % 3, painStart - 2);
      sessions.push({
        id: 's' + (sId++),
        patientId: ap.patientId,
        date: ap.date,
        painScore: Math.max(2, painStart - painDelta),
        functionScore: Math.min(8, randInt(3, 7)),
        subjective: pick(subjectives),
        objective: pick(objectives),
        assessment: pick(assessments),
        plan: pick(plans),
        createdAt: ap.date + 'T10:00:00.000Z'
      });
    }
    saveAll(KEYS.sessions, sessions);

    // ===== GENERATE EXERCISES (~50% of patients, 1-3 per patient) =====
    var exercises = [];
    var eId = 1;
    var exercisePool = [
      { name: 'Quad Sets', sets: '3', reps: '10', hold: '5 sec', freq: '3x daily', instr: 'Tighten thigh muscle pressing knee down. Hold 5 seconds, release.' },
      { name: 'Heel Slides', sets: '3', reps: '15', hold: '-', freq: '2x daily', instr: 'Slide heel toward buttock bending knee. Hold briefly at end range. Return slowly.' },
      { name: 'Straight Leg Raises', sets: '3', reps: '10', hold: '3 sec', freq: '2x daily', instr: 'Lie on back, tighten quad, lift leg 12 inches. Hold 3 seconds. Lower slowly.' },
      { name: 'Prone Press-ups', sets: '3', reps: '10', hold: '3 sec', freq: 'Every 2 hours', instr: 'Lie face down. Press upper body up keeping hips on surface. Hold at top.' },
      { name: 'Bird Dog', sets: '3', reps: '8 each side', hold: '5 sec', freq: '2x daily', instr: 'Hands and knees. Extend opposite arm and leg. Hold 5 seconds. Alternate.' },
      { name: 'Pendulum Exercises', sets: '2', reps: '20 circles', hold: '-', freq: '3x daily', instr: 'Lean forward, let affected arm hang. Make small circles. Increase gradually.' },
      { name: 'Wall Push-ups', sets: '3', reps: '12', hold: '-', freq: '2x daily', instr: 'Stand arm length from wall. Place hands on wall. Do push-ups. Keep body straight.' },
      { name: 'Calf Raises', sets: '3', reps: '15', hold: '2 sec', freq: '2x daily', instr: 'Stand on edge of step. Rise up on toes. Hold 2 seconds. Lower slowly below step level.' },
      { name: 'Chin Tucks', sets: '3', reps: '10', hold: '5 sec', freq: '3x daily', instr: 'Sit tall. Gently tuck chin making a double chin. Hold 5 seconds.' },
      { name: 'Ankle Pumps', sets: '3', reps: '20', hold: '-', freq: '3x daily', instr: 'Point toes down then pull toes up. Repeat rhythmically. Good for circulation.' },
      { name: 'Hamstring Stretches', sets: '3', reps: '3', hold: '30 sec', freq: '2x daily', instr: 'Lie on back. Loop towel around foot. Straighten leg. Hold stretch 30 seconds.' },
      { name: 'Bridging', sets: '3', reps: '10', hold: '5 sec', freq: '2x daily', instr: 'Lie on back, knees bent. Lift hips to form straight line. Hold 5 seconds. Lower slowly.' },
      { name: 'Side-lying Hip Abduction', sets: '3', reps: '12', hold: '2 sec', freq: '2x daily', instr: 'Lie on side. Lift top leg keeping knee straight. Hold 2 seconds. Lower slowly.' },
      { name: 'Scapular Squeezes', sets: '3', reps: '10', hold: '5 sec', freq: '3x daily', instr: 'Sit or stand tall. Squeeze shoulder blades together. Hold 5 seconds. Release.' },
      { name: 'Wrist Curls', sets: '3', reps: '12', hold: '-', freq: '2x daily', instr: 'Rest forearm on table, wrist over edge. Curl weight up and down slowly. Both directions.' }
    ];

    for (var ei = 0; ei < patients.length; ei++) {
      if (rand() < 0.5) continue; // ~50% get exercises
      var numEx = randInt(1, 3);
      var usedEx = {};
      for (var ej = 0; ej < numEx; ej++) {
        var exIdx = randInt(0, exercisePool.length - 1);
        if (usedEx[exIdx]) continue;
        usedEx[exIdx] = true;
        var ex = exercisePool[exIdx];
        exercises.push({
          id: 'e' + (eId++),
          patientId: patients[ei].id,
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          hold: ex.hold,
          frequency: ex.freq,
          instructions: ex.instr,
          status: patients[ei].status === 'completed' ? 'discontinued' : 'active',
          createdAt: new Date(td.getTime() - randInt(10, 60) * 86400000).toISOString()
        });
      }
    }
    saveAll(KEYS.exercises, exercises);

    // ===== GENERATE BILLING (1 per appointment) =====
    var billing = [];
    var bId = 1;
    for (var bi = 0; bi < appts.length; bi++) {
      var ba = appts[bi];
      if (ba.status === 'cancelled') continue;
      var bAmt = ba.type === 'Initial Evaluation' ? pick(['2000','2500']) : pick(billAmounts);
      var bDesc = ba.type === 'Initial Evaluation' ? 'Initial Evaluation' : pick(billDescs);
      var bStatus = 'pending';
      var bPaidDate = '';
      if (ba.status === 'completed') {
        bStatus = rand() < 0.85 ? 'paid' : 'pending';
        if (bStatus === 'paid') bPaidDate = dayOffset(Math.min(0, parseInt(ba.date.substring(8), 10) - parseInt(todayStr.substring(8), 10) + 2));
      }
      if (ba.status === 'no-show') {
        bAmt = '500';
        bDesc = 'No-show fee';
        bStatus = 'pending';
      }
      billing.push({
        id: 'b' + (bId++),
        patientId: ba.patientId,
        date: ba.date,
        description: bDesc,
        amount: bAmt,
        status: bStatus,
        paidDate: bPaidDate,
        createdAt: ba.date + 'T12:00:00.000Z'
      });
    }
    saveAll(KEYS.billing, billing);

    // ===== GENERATE PRESCRIPTIONS (~30% of patients) =====
    var prescriptions = [];
    var rxId = 1;
    var rxPool = [
      { med: 'Aceclofenac', dose: '100mg', route: 'Oral', freq: 'Twice daily (after meals)', dur: '7 days', instr: 'Take after food. Avoid on empty stomach.', active: false },
      { med: 'Paracetamol', dose: '650mg', route: 'Oral', freq: 'Three times daily', dur: '5 days', instr: 'For pain relief. Do not exceed 3 tablets per day.', active: false },
      { med: 'Thiocolchicoside', dose: '4mg', route: 'Oral', freq: 'Twice daily', dur: '5 days', instr: 'Muscle relaxant. Take after meals. May cause drowsiness.', active: false },
      { med: 'Calcium + Vitamin D3', dose: '500mg + 250IU', route: 'Oral', freq: 'Once daily', dur: '90 days', instr: 'Take with meals for better absorption. For bone health.', active: true },
      { med: 'Methylcobalamin', dose: '1500mcg', route: 'Oral', freq: 'Once daily', dur: '60 days', instr: 'Nerve health supplement. Take with breakfast.', active: true },
      { med: 'Diclofenac Gel', dose: '1%', route: 'Topical', freq: 'Three times daily', dur: '14 days', instr: 'Apply thin layer. Massage gently. Wash hands after.', active: true },
      { med: 'Pregabalin', dose: '75mg', route: 'Oral', freq: 'Twice daily', dur: '30 days', instr: 'For neuropathic pain. May cause dizziness. Taper before stopping.', active: false },
      { med: 'Etoricoxib', dose: '60mg', route: 'Oral', freq: 'Once daily', dur: '14 days', instr: 'Take after food. Monitor BP. Stop if gastric issues.', active: false },
      { med: 'Glucosamine + Chondroitin', dose: '500mg + 400mg', route: 'Oral', freq: 'Twice daily', dur: '90 days', instr: 'Joint supplement. Take with meals. Long-term use recommended.', active: true },
      { med: 'Pantoprazole', dose: '40mg', route: 'Oral', freq: 'Once daily (before breakfast)', dur: '14 days', instr: 'Take 30 min before breakfast. Gastric protection.', active: false },
      { med: 'Tizanidine', dose: '2mg', route: 'Oral', freq: 'Twice daily', dur: '10 days', instr: 'Muscle relaxant. May cause drowsiness. Avoid driving.', active: false },
      { med: 'Capsaicin Cream', dose: '0.025%', route: 'Topical', freq: 'Three times daily', dur: '30 days', instr: 'Apply to affected area. Initial burning is normal. Avoid eyes.', active: true },
      { med: 'Vitamin D3', dose: '60000IU', route: 'Oral', freq: 'Once weekly', dur: '8 weeks', instr: 'Take with fatty meal. Recheck levels after 8 weeks.', active: true },
      { med: 'Piroxicam Gel', dose: '0.5%', route: 'Topical', freq: 'Three times daily', dur: '21 days', instr: 'Apply on affected joint. Massage 2-3 minutes. Wash hands after.', active: true }
    ];

    for (var ri = 0; ri < patients.length; ri++) {
      if (rand() < 0.7) continue; // ~30% get prescriptions
      var numRx = randInt(1, 3);
      for (var rj = 0; rj < numRx; rj++) {
        var rxT = pick(rxPool);
        prescriptions.push({
          id: 'rx' + (rxId++),
          patientId: patients[ri].id,
          date: dayOffset(randInt(-70, -7)),
          medication: rxT.med,
          dosage: rxT.dose,
          route: rxT.route,
          frequency: rxT.freq,
          duration: rxT.dur,
          instructions: rxT.instr,
          prescribedBy: 'Dr. Priya Sharma',
          status: rxT.active ? 'active' : 'discontinued',
          createdAt: new Date(td.getTime() - randInt(7, 70) * 86400000).toISOString()
        });
      }
    }
    saveAll(KEYS.prescriptions, prescriptions);

    // ===== ACTIVITY LOG =====
    var activities = [];
    var recentPatients = patients.slice(0, 15);
    for (var ali = 0; ali < 20; ali++) {
      var alp = pick(recentPatients);
      var msgs = [
        'Appointment completed: ' + alp.name,
        'Session note added for ' + alp.name,
        'Payment received from ' + alp.name,
        'Invoice created for ' + alp.name,
        'Exercise prescribed for ' + alp.name,
        'Appointment booked for ' + alp.name
      ];
      activities.push({
        text: pick(msgs),
        time: new Date(td.getTime() - ali * 3600000 * randInt(2, 8)).toISOString()
      });
    }
    saveAll(KEYS.activity, activities);
  }

  return api;
})();
