/* ============================================
   FirebaseSync - Firestore Cloud Storage
   Multi-tenant: subcollections under clinics/{clinicId}
   ============================================ */
window.FirebaseSync = (function() {
  'use strict';

  // Firebase config
  var firebaseConfig = {
    apiKey: "AIzaSyBcaymsJYlDpQ-EPF2Wtd-nYX2P6u7HQoE",
    authDomain: "physio-clinic-4ae53.firebaseapp.com",
    projectId: "physio-clinic-4ae53",
    storageBucket: "physio-clinic-4ae53.firebasestorage.app",
    messagingSenderId: "791291492733",
    appId: "1:791291492733:web:9edaccf13df450b5513414"
  };

  var db = null;
  var initialized = false;

  // Subcollection name for each localStorage key suffix
  var COLLECTION_NAMES = {
    'users': 'users',
    'patients': 'patients',
    'appointments': 'appointments',
    'sessions': 'sessions',
    'exercises': 'exercises',
    'billing': 'billing',
    'activity_log': 'activity_log',
    'tags': 'tags',
    'message_templates': 'message_templates',
    'message_log': 'message_log',
    'prescriptions': 'prescriptions',
    'online_bookings': 'online_bookings'
  };

  // Initialize Firebase
  function init() {
    if (initialized) return Promise.resolve();
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      db = firebase.firestore();
      initialized = true;
      console.log('[FirebaseSync] Initialized');
      return Promise.resolve();
    } catch(e) {
      console.error('[FirebaseSync] Init failed:', e);
      return Promise.reject(e);
    }
  }

  function getDb() { return db; }

  // Get current clinicId from sessionStorage
  function getClinicId() {
    return sessionStorage.getItem('physio_clinicId') || 'default';
  }

  // Get the Firestore collection reference scoped to current clinic
  // localKey is like "physio_c_abc123_patients" - extract the collection name
  function getCollectionRef(localKey) {
    if (!db) return null;
    var collName = resolveCollName(localKey);
    if (!collName) return null;
    var clinicId = getClinicId();
    return db.collection('clinics').doc(clinicId).collection(collName);
  }

  // Extract collection name from a scoped localStorage key
  // "physio_c_abc123_patients" -> "patients"
  // Also handles legacy keys: "physio_patients" -> "patients"
  function resolveCollName(localKey) {
    // Try scoped format: physio_{clinicId}_{collName}
    var clinicId = getClinicId();
    var prefix = 'physio_' + clinicId + '_';
    if (localKey.indexOf(prefix) === 0) {
      var suffix = localKey.substring(prefix.length);
      return COLLECTION_NAMES[suffix] || null;
    }
    // Try legacy format: physio_{collName}
    if (localKey.indexOf('physio_') === 0) {
      var legacySuffix = localKey.substring(7); // remove 'physio_'
      return COLLECTION_NAMES[legacySuffix] || null;
    }
    return null;
  }

  // ---- Clinic Document (settings + features) ----
  function getClinicDoc() {
    if (!db) return Promise.resolve(null);
    var clinicId = getClinicId();
    return db.collection('clinics').doc(clinicId).get().then(function(doc) {
      return doc.exists ? doc.data() : null;
    });
  }

  function saveClinicDoc(data) {
    if (!db) return Promise.resolve();
    var clinicId = getClinicId();
    return db.collection('clinics').doc(clinicId).set(data, { merge: true }).then(function() {
      console.log('[FirebaseSync] Saved clinic doc for ' + clinicId);
    }).catch(function(e) {
      console.error('[FirebaseSync] Failed to save clinic doc:', e);
    });
  }

  // ---- Booking Slug helpers ----
  function resolveSlug(slug) {
    if (!db) return Promise.resolve(null);
    return db.collection('booking_slugs').doc(slug).get().then(function(doc) {
      if (doc.exists) return doc.data().clinicId;
      // Fallback: query clinics by bookingSlug field (self-healing for missing slug docs)
      return db.collection('clinics').where('bookingSlug', '==', slug).limit(1).get().then(function(snap) {
        if (snap.empty) return null;
        var clinicDoc = snap.docs[0];
        var clinicData = clinicDoc.data();
        // Skip deleted clinics
        if (clinicData._deleted) return null;
        var clinicId = clinicDoc.id;
        // Auto-repair: recreate the missing booking_slugs doc
        db.collection('booking_slugs').doc(slug).set({
          clinicId: clinicId,
          createdAt: new Date().toISOString()
        }).then(function() {
          console.log('[FirebaseSync] Auto-repaired missing booking_slug for ' + slug);
        }).catch(function() {});
        return clinicId;
      });
    });
  }

  function createSlug(slug, clinicId) {
    if (!db) return Promise.resolve();
    return db.collection('booking_slugs').doc(slug).set({ clinicId: clinicId, createdAt: new Date().toISOString() });
  }

  function checkSlugAvailable(slug) {
    if (!db) return Promise.resolve(true);
    return db.collection('booking_slugs').doc(slug).get().then(function(doc) {
      return !doc.exists;
    });
  }

  // ---- PUSH: localStorage -> Firestore (scoped) ----
  function pushCollection(localKey) {
    var collRef = getCollectionRef(localKey);
    if (!collRef) return Promise.resolve();

    var items = [];
    try { items = JSON.parse(localStorage.getItem(localKey)) || []; }
    catch(e) { items = []; }

    if (items.length === 0) return Promise.resolve();

    var batches = [];
    var currentBatch = db.batch();
    var count = 0;

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var docId = item.id || ('doc_' + i);
      var ref = collRef.doc(docId);
      currentBatch.set(ref, JSON.parse(JSON.stringify(item)));
      count++;
      if (count >= 450) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        count = 0;
      }
    }
    if (count > 0) batches.push(currentBatch);

    var promises = [];
    for (var b = 0; b < batches.length; b++) {
      promises.push(batches[b].commit());
    }
    var collName = resolveCollName(localKey) || localKey;
    return Promise.all(promises).then(function() {
      console.log('[FirebaseSync] Pushed ' + items.length + ' docs to clinics/' + getClinicId() + '/' + collName);
    });
  }

  // Push ALL collections to Firestore
  function pushAll() {
    if (!db) return Promise.reject('Not initialized');
    var collNames = Object.keys(COLLECTION_NAMES);
    var clinicId = getClinicId();
    var promises = [];
    for (var i = 0; i < collNames.length; i++) {
      var localKey = 'physio_' + clinicId + '_' + collNames[i];
      promises.push(pushCollection(localKey));
    }
    return Promise.all(promises).then(function() {
      console.log('[FirebaseSync] All collections pushed for clinic ' + clinicId);
    });
  }

  // ---- PULL: Firestore -> localStorage (scoped) ----
  function pullCollection(localKey) {
    var collRef = getCollectionRef(localKey);
    if (!collRef) return Promise.resolve();

    return collRef.get().then(function(snapshot) {
      if (snapshot.empty) return;
      var items = [];
      snapshot.forEach(function(doc) {
        items.push(doc.data());
      });
      localStorage.setItem(localKey, JSON.stringify(items));
      var collName = resolveCollName(localKey) || localKey;
      console.log('[FirebaseSync] Pulled ' + items.length + ' docs from clinics/' + getClinicId() + '/' + collName);
    });
  }

  // Pull ALL collections from Firestore
  function pullAll() {
    if (!db) return Promise.reject('Not initialized');
    var collNames = Object.keys(COLLECTION_NAMES);
    var clinicId = getClinicId();
    var promises = [];
    for (var i = 0; i < collNames.length; i++) {
      var localKey = 'physio_' + clinicId + '_' + collNames[i];
      promises.push(pullCollection(localKey));
    }
    return Promise.all(promises).then(function() {
      console.log('[FirebaseSync] All collections pulled for clinic ' + clinicId);
    });
  }

  // ---- SAVE: Save a single item to Firestore ----
  function saveDoc(localKey, item) {
    var collRef = getCollectionRef(localKey);
    if (!collRef || !item) return Promise.resolve();

    var docId = item.id || ('doc_' + Date.now());
    return collRef.doc(docId).set(JSON.parse(JSON.stringify(item))).then(function() {
      console.log('[FirebaseSync] Saved doc ' + docId);
    }).catch(function(e) {
      console.error('[FirebaseSync] Save failed:', e);
    });
  }

  // ---- DELETE: Remove a single doc from Firestore ----
  function deleteDoc(localKey, docId) {
    var collRef = getCollectionRef(localKey);
    if (!collRef || !docId) return Promise.resolve();

    return collRef.doc(docId).delete().then(function() {
      console.log('[FirebaseSync] Deleted doc ' + docId);
    }).catch(function(e) {
      console.error('[FirebaseSync] Delete failed:', e);
    });
  }

  // ---- SAVE ALL: Replace entire collection in Firestore ----
  function saveCollection(localKey) {
    return pushCollection(localKey);
  }

  // ---- Check if Firestore has data for current clinic ----
  function hasData() {
    if (!db) return Promise.resolve(false);
    var clinicId = getClinicId();
    return db.collection('clinics').doc(clinicId).collection('users').limit(1).get().then(function(snapshot) {
      return !snapshot.empty;
    }).catch(function() {
      return false;
    });
  }

  // ---- Check if OLD flat data exists (for migration) ----
  function hasLegacyData() {
    if (!db) return Promise.resolve(false);
    return db.collection('users').limit(1).get().then(function(snapshot) {
      return !snapshot.empty;
    }).catch(function() {
      return false;
    });
  }

  // ---- Migrate legacy flat collections into a clinic's subcollections ----
  function migrateLegacyToClinic(clinicId) {
    if (!db) return Promise.resolve();
    var collNames = ['users', 'patients', 'appointments', 'sessions', 'exercises',
      'billing', 'activity_log', 'tags', 'message_templates', 'message_log', 'prescriptions', 'online_bookings'];

    var promises = [];
    for (var c = 0; c < collNames.length; c++) {
      (function(collName) {
        promises.push(
          db.collection(collName).get().then(function(snapshot) {
            if (snapshot.empty) return Promise.resolve();
            var batch = db.batch();
            var count = 0;
            snapshot.forEach(function(doc) {
              var ref = db.collection('clinics').doc(clinicId).collection(collName).doc(doc.id);
              batch.set(ref, doc.data());
              count++;
            });
            if (count > 0) {
              return batch.commit().then(function() {
                console.log('[FirebaseSync] Migrated ' + count + ' docs from ' + collName + ' to clinics/' + clinicId + '/' + collName);
              });
            }
          })
        );
      })(collNames[c]);
    }
    return Promise.all(promises);
  }

  // ---- Phone Normalization ----
  // Strips non-digits; 10-digit Indian numbers get '91' prefix
  function normalizePhone(phone, phoneCode) {
    if (!phone) return '';
    var digits = phone.replace(/\D/g, '');
    if (!digits) return '';
    // If phoneCode provided, strip leading '+' and use it
    var code = (phoneCode || '+91').replace('+', '');
    // If already starts with country code, return as-is
    if (digits.length > 10 && digits.indexOf(code) === 0) return digits;
    // 10-digit Indian number
    if (digits.length === 10) return code + digits;
    return digits;
  }

  // ---- Patient Phone Index ----
  // Upserts an entry in patient_phones/{normalizedPhone} for cross-clinic lookup
  function updatePatientPhoneIndex(clinicId, patient) {
    if (!db || !patient || !patient.phone) return Promise.resolve();
    var norm = normalizePhone(patient.phone, patient.phoneCode);
    if (!norm) return Promise.resolve();

    var clinicSettings = {};
    try {
      var cid = clinicId || getClinicId();
      clinicSettings = JSON.parse(localStorage.getItem('physio_clinic_' + cid)) || {};
    } catch(e) {}

    var entry = {
      clinicId: clinicId || getClinicId(),
      clinicName: clinicSettings.name || clinicSettings.clinicName || 'PhysioClinic',
      patientId: patient.id,
      patientName: patient.name || ''
    };

    var docRef = db.collection('patient_phones').doc(norm);
    return docRef.get().then(function(doc) {
      var data = doc.exists ? doc.data() : { clinics: [] };
      var clinics = data.clinics || [];
      // Update existing entry or add new
      var found = false;
      for (var i = 0; i < clinics.length; i++) {
        if (clinics[i].clinicId === entry.clinicId && clinics[i].patientId === entry.patientId) {
          clinics[i] = entry;
          found = true;
          break;
        }
      }
      if (!found) clinics.push(entry);
      return docRef.set({ clinics: clinics, updatedAt: new Date().toISOString() });
    }).then(function() {
      console.log('[FirebaseSync] Updated patient phone index for ' + norm);
    }).catch(function(e) {
      console.error('[FirebaseSync] Phone index update failed:', e);
    });
  }

  // ---- Campaign Messages (patient_messages subcollection) ----
  function saveCampaignMessage(clinicId, message) {
    if (!db) return Promise.resolve();
    var cid = clinicId || getClinicId();
    var ref = db.collection('clinics').doc(cid).collection('patient_messages');
    var docId = message.id || ('msg_' + Date.now());
    message.id = docId;
    return ref.doc(docId).set(JSON.parse(JSON.stringify(message))).then(function() {
      console.log('[FirebaseSync] Saved campaign message ' + docId);
    }).catch(function(e) {
      console.error('[FirebaseSync] Campaign message save failed:', e);
    });
  }

  function deleteCampaignMessage(messageId) {
    if (!db) return Promise.resolve();
    var cid = getClinicId();
    return db.collection('clinics').doc(cid).collection('patient_messages').doc(messageId).delete().then(function() {
      console.log('[FirebaseSync] Deleted campaign message ' + messageId);
    }).catch(function(e) {
      console.error('[FirebaseSync] Campaign message delete failed:', e);
    });
  }

  // ---- Query users by username in a clinic ----
  function queryUserByUsername(clinicId, username) {
    if (!db) return Promise.resolve(null);
    return db.collection('clinics').doc(clinicId).collection('users')
      .where('username', '==', username).limit(1).get()
      .then(function(snapshot) {
        if (snapshot.empty) return null;
        var user = null;
        snapshot.forEach(function(doc) { user = doc.data(); });
        return user;
      });
  }

  return {
    init: init,
    getDb: getDb,
    getClinicId: getClinicId,
    pushAll: pushAll,
    pushCollection: pushCollection,
    pullAll: pullAll,
    pullCollection: pullCollection,
    saveDoc: saveDoc,
    deleteDoc: deleteDoc,
    saveCollection: saveCollection,
    hasData: hasData,
    hasLegacyData: hasLegacyData,
    migrateLegacyToClinic: migrateLegacyToClinic,
    getClinicDoc: getClinicDoc,
    saveClinicDoc: saveClinicDoc,
    resolveSlug: resolveSlug,
    createSlug: createSlug,
    checkSlugAvailable: checkSlugAvailable,
    queryUserByUsername: queryUserByUsername,
    getCollectionRef: getCollectionRef,
    normalizePhone: normalizePhone,
    updatePatientPhoneIndex: updatePatientPhoneIndex,
    saveCampaignMessage: saveCampaignMessage,
    deleteCampaignMessage: deleteCampaignMessage
  };

})();
