/* ============================================
   FirebaseSync - Firestore Cloud Storage
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

  // localStorage key -> Firestore collection name
  var COLLECTION_MAP = {
    'physio_users': 'users',
    'physio_patients': 'patients',
    'physio_appointments': 'appointments',
    'physio_sessions': 'sessions',
    'physio_exercises': 'exercises',
    'physio_billing': 'billing',
    'physio_activity_log': 'activity_log',
    'physio_tags': 'tags',
    'physio_message_templates': 'message_templates',
    'physio_message_log': 'message_log',
    'physio_prescriptions': 'prescriptions',
    'physio_online_bookings': 'online_bookings'
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

  // Get Firestore collection name for a localStorage key
  function getCollection(localKey) {
    return COLLECTION_MAP[localKey] || null;
  }

  // ---- PUSH: localStorage -> Firestore ----
  // Saves entire array as individual documents in a collection
  function pushCollection(localKey) {
    if (!db) return Promise.reject('Not initialized');
    var collName = getCollection(localKey);
    if (!collName) return Promise.resolve();

    var items = [];
    try { items = JSON.parse(localStorage.getItem(localKey)) || []; }
    catch(e) { items = []; }

    if (items.length === 0) return Promise.resolve();

    // Use a batch for efficiency (max 500 per batch)
    var batches = [];
    var currentBatch = db.batch();
    var count = 0;

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var docId = item.id || ('doc_' + i);
      var ref = db.collection(collName).doc(docId);
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
    return Promise.all(promises).then(function() {
      console.log('[FirebaseSync] Pushed ' + items.length + ' docs to ' + collName);
    });
  }

  // Push ALL collections to Firestore
  function pushAll() {
    if (!db) return Promise.reject('Not initialized');
    var keys = Object.keys(COLLECTION_MAP);
    var promises = [];
    for (var i = 0; i < keys.length; i++) {
      promises.push(pushCollection(keys[i]));
    }
    return Promise.all(promises).then(function() {
      console.log('[FirebaseSync] All collections pushed');
    });
  }

  // ---- PULL: Firestore -> localStorage ----
  function pullCollection(localKey) {
    if (!db) return Promise.reject('Not initialized');
    var collName = getCollection(localKey);
    if (!collName) return Promise.resolve();

    return db.collection(collName).get().then(function(snapshot) {
      if (snapshot.empty) return;
      var items = [];
      snapshot.forEach(function(doc) {
        items.push(doc.data());
      });
      localStorage.setItem(localKey, JSON.stringify(items));
      console.log('[FirebaseSync] Pulled ' + items.length + ' docs from ' + collName);
    });
  }

  // Pull ALL collections from Firestore
  function pullAll() {
    if (!db) return Promise.reject('Not initialized');
    var keys = Object.keys(COLLECTION_MAP);
    var promises = [];
    for (var i = 0; i < keys.length; i++) {
      promises.push(pullCollection(keys[i]));
    }
    return Promise.all(promises).then(function() {
      console.log('[FirebaseSync] All collections pulled');
    });
  }

  // ---- SAVE: Save a single item to Firestore ----
  function saveDoc(localKey, item) {
    if (!db) return Promise.resolve();
    var collName = getCollection(localKey);
    if (!collName || !item) return Promise.resolve();

    var docId = item.id || ('doc_' + Date.now());
    return db.collection(collName).doc(docId).set(JSON.parse(JSON.stringify(item))).then(function() {
      console.log('[FirebaseSync] Saved doc ' + docId + ' to ' + collName);
    }).catch(function(e) {
      console.error('[FirebaseSync] Save failed:', e);
    });
  }

  // ---- DELETE: Remove a single doc from Firestore ----
  function deleteDoc(localKey, docId) {
    if (!db) return Promise.resolve();
    var collName = getCollection(localKey);
    if (!collName || !docId) return Promise.resolve();

    return db.collection(collName).doc(docId).delete().then(function() {
      console.log('[FirebaseSync] Deleted doc ' + docId + ' from ' + collName);
    }).catch(function(e) {
      console.error('[FirebaseSync] Delete failed:', e);
    });
  }

  // ---- SAVE ALL: Replace entire collection in Firestore ----
  function saveCollection(localKey) {
    return pushCollection(localKey);
  }

  // ---- Check if Firestore has data ----
  function hasData() {
    if (!db) return Promise.resolve(false);
    return db.collection('users').limit(1).get().then(function(snapshot) {
      return !snapshot.empty;
    }).catch(function() {
      return false;
    });
  }

  return {
    init: init,
    pushAll: pushAll,
    pushCollection: pushCollection,
    pullAll: pullAll,
    pullCollection: pullCollection,
    saveDoc: saveDoc,
    deleteDoc: deleteDoc,
    saveCollection: saveCollection,
    hasData: hasData,
    getCollection: getCollection
  };

})();
