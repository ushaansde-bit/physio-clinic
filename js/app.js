/* ============================================
   App - Router, Auth Guard, Multi-tenant Login
   ============================================ */
(function() {

  // ---- Phase 7: Auto-migration from legacy flat data ----
  function migrateLocalStorageKeys() {
    // Check if we already migrated
    if (localStorage.getItem('physio_multitenant_migrated')) return;

    // Check if old flat keys exist
    var oldKeys = ['physio_users','physio_patients','physio_appointments','physio_sessions',
      'physio_exercises','physio_billing','physio_activity_log','physio_tags',
      'physio_message_templates','physio_message_log','physio_prescriptions'];

    var hasOldData = false;
    for (var i = 0; i < oldKeys.length; i++) {
      if (localStorage.getItem(oldKeys[i])) { hasOldData = true; break; }
    }

    if (!hasOldData) {
      localStorage.setItem('physio_multitenant_migrated', '1');
      return;
    }

    // Migrate old keys to default clinic
    var clinicId = 'default';
    var nameMap = {
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
      'physio_prescriptions': 'prescriptions'
    };

    for (var oldKey in nameMap) {
      if (nameMap.hasOwnProperty(oldKey)) {
        var data = localStorage.getItem(oldKey);
        if (data) {
          var newKey = 'physio_' + clinicId + '_' + nameMap[oldKey];
          localStorage.setItem(newKey, data);
        }
      }
    }

    // Create default clinic settings
    var defaultClinic = {
      id: clinicId,
      name: 'My Clinic',
      ownerName: 'Dr. Admin',
      bookingSlug: 'default',
      features: Store.getDefaultFeatures(),
      createdAt: new Date().toISOString()
    };
    localStorage.setItem('physio_clinic_default', JSON.stringify(defaultClinic));

    // Create slug lookup for default
    localStorage.setItem('physio_slug_default', clinicId);

    localStorage.setItem('physio_multitenant_migrated', '1');
    console.log('[App] Migrated legacy localStorage keys to default clinic');
  }

  // Run migration before anything else
  migrateLocalStorageKeys();

  // Initialize seed data for default clinic (if not already done)
  // Set clinicId temporarily for seeding
  if (!sessionStorage.getItem('physio_clinicId')) {
    sessionStorage.setItem('physio_clinicId', 'default');
  }

  if (!localStorage.getItem('physio_noid_v8')) {
    // Only clear if upgrading from v7 - but for multi-tenant we keep existing data
    // Just bump the version flag
    localStorage.setItem('physio_noid_v8', '1');
  }
  Store.seed();
  Store.migrate();

  // Initialize Firebase and sync
  if (window.FirebaseSync) {
    FirebaseSync.init().then(function() {
      // Check for legacy data migration to Firestore
      return FirebaseSync.hasLegacyData().then(function(hasLegacy) {
        if (hasLegacy && !localStorage.getItem('physio_firestore_migrated')) {
          console.log('[App] Found legacy Firestore data, migrating to default clinic...');
          return FirebaseSync.migrateLegacyToClinic('default').then(function() {
            localStorage.setItem('physio_firestore_migrated', '1');
            console.log('[App] Firestore migration complete');

            // Also create clinic doc + slug in Firestore
            var db = FirebaseSync.getDb();
            if (db) {
              var clinicData = {
                id: 'default',
                name: 'My Clinic',
                ownerName: 'Dr. Admin',
                bookingSlug: 'default',
                features: Store.getDefaultFeatures(),
                createdAt: new Date().toISOString()
              };
              db.collection('clinics').doc('default').set(clinicData, { merge: true });
              db.collection('booking_slugs').doc('default').set({ clinicId: 'default', createdAt: new Date().toISOString() });
            }
          });
        }
      });
    }).then(function() {
      return FirebaseSync.hasData();
    }).then(function(cloudHasData) {
      if (cloudHasData) {
        return FirebaseSync.pullAll().then(function() {
          // Also pull clinic settings
          return FirebaseSync.getClinicDoc().then(function(doc) {
            if (doc) {
              var clinicId = Store.getClinicId();
              localStorage.setItem('physio_clinic_' + clinicId, JSON.stringify(doc));
            }
          });
        }).then(function() {
          console.log('[App] Pulled cloud data to local');
          if (isLoggedIn()) {
            applyFeatureToggles();
            route();
          }
        });
      } else {
        return FirebaseSync.pushAll().then(function() {
          // Also push clinic settings
          var settings = Store.getClinicSettings();
          if (settings && settings.id) {
            FirebaseSync.saveClinicDoc(settings);
          }
          console.log('[App] Pushed local seed data to cloud');
        });
      }
    }).catch(function(e) {
      console.warn('[App] Firebase sync failed, using local data:', e);
    });
  }

  // DOM refs
  var loginScreen = document.getElementById('login-screen');
  var appShell = document.getElementById('app-shell');
  var content = document.getElementById('content');
  var pageTitle = document.getElementById('page-title');
  var topBarActions = document.getElementById('top-bar-actions');
  var sidebar = document.getElementById('sidebar');
  var sidebarOverlay = document.getElementById('sidebar-overlay');
  var menuToggle = document.getElementById('menu-toggle');

  // Auth check
  function isLoggedIn() {
    return sessionStorage.getItem('physio_session') !== null;
  }

  function getCurrentUser() {
    try { return JSON.parse(sessionStorage.getItem('physio_session')); }
    catch(e) { return null; }
  }

  function login(user, clinicId) {
    sessionStorage.setItem('physio_clinicId', clinicId);
    sessionStorage.setItem('physio_session', JSON.stringify(user));
    showApp();
  }

  function logout() {
    var fromAdmin = sessionStorage.getItem('physio_from_admin');
    sessionStorage.removeItem('physio_session');
    sessionStorage.removeItem('physio_clinicId');
    sessionStorage.removeItem('physio_from_admin');
    if (fromAdmin === '1') {
      window.location.href = 'admin.html';
      return;
    }
    showLogin();
  }

  function showLogin() {
    loginScreen.style.display = 'flex';
    appShell.style.display = 'none';
    window.LoginView.render();

    // Check URL param ?c= for clinic code pre-fill
    var params = new URLSearchParams(window.location.search);
    var clinicParam = params.get('c');
    if (clinicParam) {
      var clinicInput = document.getElementById('login-clinic');
      if (clinicInput) clinicInput.value = clinicParam;
    }
  }

  function showApp() {
    loginScreen.style.display = 'none';
    appShell.style.display = 'flex';
    var user = getCurrentUser();
    if (user) {
      document.getElementById('sidebar-username').textContent = user.name || user.username;
      // Show user avatar initial
      var avatarEl = document.querySelector('.user-avatar');
      if (avatarEl && user.name) {
        avatarEl.textContent = user.name.charAt(0).toUpperCase();
      }
    }
    applyFeatureToggles();
    route();
  }

  // ---- Page Access Check ----
  function canAccessPage(pageKey) {
    var user = getCurrentUser();
    if (!user) return false;
    // Admins always have full access
    if (user.role === 'admin') return true;
    // No allowedPages field = full access (backward compat)
    if (!user.allowedPages) return true;
    // Dashboard always accessible
    if (pageKey === 'dashboard') return true;
    return user.allowedPages.indexOf(pageKey) !== -1;
  }

  // ---- Feature Toggle & Page Access Enforcement ----
  function applyFeatureToggles() {
    var user = getCurrentUser();

    // Feature gate map: route key -> feature key
    var featureMap = {
      'billing': 'billing',
      'messaging': 'messaging'
    };

    // Loop all nav links with data-route
    var navLinks = document.querySelectorAll('.nav-link[data-route]');
    for (var i = 0; i < navLinks.length; i++) {
      var link = navLinks[i];
      var routeKey = link.getAttribute('data-route');

      // Settings: admin only
      if (routeKey === 'settings') {
        link.style.display = (user && user.role === 'admin') ? '' : 'none';
        continue;
      }

      // Check feature gate first
      if (featureMap[routeKey] && !Store.isFeatureEnabled(featureMap[routeKey])) {
        link.style.display = 'none';
        continue;
      }

      // Check page access
      link.style.display = canAccessPage(routeKey) ? '' : 'none';
    }
  }

  // Routing
  function getRoute() {
    var hash = window.location.hash || '#/dashboard';
    return hash.substring(1); // remove #
  }

  function navigate(path) {
    window.location.hash = '#' + path;
  }

  function route() {
    if (!isLoggedIn()) {
      showLogin();
      return;
    }

    var path = getRoute();
    var parts = path.split('/').filter(Boolean);
    var user = getCurrentUser();

    // Reset top bar actions
    topBarActions.innerHTML = '';

    // Close mobile sidebar
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('open');

    // Route guard: redirect disabled features to dashboard
    var featureRouteMap = {
      'billing': 'billing',
      'messaging': 'messaging'
    };
    if (featureRouteMap[parts[0]] && !Store.isFeatureEnabled(featureRouteMap[parts[0]])) {
      navigate('/dashboard');
      return;
    }

    // Settings: admin only
    if (parts[0] === 'settings' && (!user || user.role !== 'admin')) {
      navigate('/dashboard');
      return;
    }

    // Page access guard
    if (parts[0] && !canAccessPage(parts[0])) {
      navigate('/dashboard');
      return;
    }

    // Update active nav
    var links = document.querySelectorAll('.nav-link');
    for (var i = 0; i < links.length; i++) {
      links[i].classList.remove('active');
      var route_name = links[i].getAttribute('data-route');
      if (parts[0] === route_name || (parts[0] === '' && route_name === 'dashboard')) {
        links[i].classList.add('active');
      }
    }

    // Route matching
    if (parts[0] === 'dashboard' || parts.length === 0) {
      pageTitle.textContent = 'Dashboard';
      window.DashboardView.render(content);
    } else if (parts[0] === 'patients' && parts.length === 1) {
      pageTitle.textContent = 'Patients';
      window.PatientsView.render(content);
    } else if (parts[0] === 'patients' && parts.length === 2) {
      pageTitle.textContent = 'Patient Details';
      window.PatientDetailView.render(content, parts[1]);
    } else if (parts[0] === 'appointments') {
      pageTitle.textContent = 'Appointments';
      window.AppointmentsView.render(content);
    } else if (parts[0] === 'billing') {
      pageTitle.textContent = 'Billing';
      window.BillingView.render(content);
    } else if (parts[0] === 'messaging') {
      pageTitle.textContent = 'Messaging';
      window.MessagingView.render(content);
    } else if (parts[0] === 'settings') {
      pageTitle.textContent = 'Settings';
      window.SettingsView.render(content);
    } else {
      pageTitle.textContent = 'Dashboard';
      navigate('/dashboard');
    }
  }

  // Event listeners
  window.addEventListener('hashchange', function() {
    if (isLoggedIn()) route();
  });

  // ---- Login form (multi-tenant) ----
  document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var clinicCode = document.getElementById('login-clinic').value.trim().toLowerCase();
    var username = document.getElementById('login-username').value.trim();
    var password = document.getElementById('login-password').value;
    var errorEl = document.getElementById('login-error');
    var loginBtn = document.getElementById('login-btn');

    if (!clinicCode) {
      errorEl.textContent = 'Please enter a clinic code';
      errorEl.style.display = 'block';
      return;
    }

    // Show loading state
    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in...';

    // Resolve clinic code to clinicId
    resolveClinicAndLogin(clinicCode, username, password, errorEl, loginBtn);
  });

  function resolveClinicAndLogin(clinicCode, username, password, errorEl, loginBtn) {
    function resetBtn() {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Sign In';
    }

    // First try Firestore slug lookup
    if (window.FirebaseSync && FirebaseSync.resolveSlug) {
      FirebaseSync.init().then(function() {
        return FirebaseSync.resolveSlug(clinicCode);
      }).then(function(clinicId) {
        if (!clinicId) {
          // Maybe the clinic code IS the clinicId directly (e.g. "default")
          clinicId = clinicCode;
        }

        // Set clinicId so Store reads the right keys
        sessionStorage.setItem('physio_clinicId', clinicId);

        // Try Firestore login first
        return FirebaseSync.queryUserByUsername(clinicId, username).then(function(user) {
          if (user && user.password === password) {
            // Pull clinic data to localStorage
            return FirebaseSync.pullAll().then(function() {
              return FirebaseSync.getClinicDoc();
            }).then(function(clinicDoc) {
              if (clinicDoc) {
                localStorage.setItem('physio_clinic_' + clinicId, JSON.stringify(clinicDoc));

                // Check clinic approval status
                var status = clinicDoc.status;
                if (status === 'pending') {
                  sessionStorage.removeItem('physio_clinicId');
                  resetBtn();
                  errorEl.textContent = 'Your clinic registration is pending admin approval. Please wait for approval before logging in.';
                  errorEl.style.display = 'block';
                  return;
                }
                if (status === 'rejected') {
                  sessionStorage.removeItem('physio_clinicId');
                  resetBtn();
                  errorEl.textContent = 'Your clinic registration was not approved. Please contact the administrator.';
                  errorEl.style.display = 'block';
                  return;
                }
              }
              resetBtn();
              errorEl.style.display = 'none';
              login(user, clinicId);
            });
          } else {
            // Try local fallback
            var localUser = Store.getUserByUsername(username);
            if (localUser && localUser.password === password) {
              resetBtn();
              errorEl.style.display = 'none';
              login(localUser, clinicId);
            } else {
              sessionStorage.removeItem('physio_clinicId');
              resetBtn();
              errorEl.textContent = 'Invalid clinic code, username, or password';
              errorEl.style.display = 'block';
            }
          }
        });
      }).catch(function(err) {
        console.warn('[App] Firestore login failed, trying local:', err);
        // Firestore unavailable - try local
        localFallbackLogin(clinicCode, username, password, errorEl, loginBtn);
      });
    } else {
      // No Firebase - pure local login
      localFallbackLogin(clinicCode, username, password, errorEl, loginBtn);
    }
  }

  function localFallbackLogin(clinicCode, username, password, errorEl, loginBtn) {
    // Check if clinic code matches a known slug in localStorage
    var clinicId = localStorage.getItem('physio_slug_' + clinicCode) || clinicCode;
    sessionStorage.setItem('physio_clinicId', clinicId);

    var user = Store.getUserByUsername(username);
    if (user && user.password === password) {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Sign In';
      errorEl.style.display = 'none';
      login(user, clinicId);
    } else {
      sessionStorage.removeItem('physio_clinicId');
      loginBtn.disabled = false;
      loginBtn.textContent = 'Sign In';
      errorEl.textContent = 'Invalid clinic code, username, or password';
      errorEl.style.display = 'block';
    }
  }

  // Logout
  document.getElementById('logout-btn').addEventListener('click', function() {
    logout();
  });

  // Currency combo box (searchable dropdown)
  var currInput = document.getElementById('currency-input');
  var currDropdown = document.getElementById('currency-dropdown');
  var currArrow = document.getElementById('currency-arrow');
  var savedCurrency = localStorage.getItem('physio_currency') || 'INR';

  function getCurrencyDisplay(code) {
    for (var i = 0; i < Utils.CURRENCIES.length; i++) {
      if (Utils.CURRENCIES[i].code === code) {
        return Utils.CURRENCIES[i].symbol + ' ' + Utils.CURRENCIES[i].code;
      }
    }
    return code;
  }

  function buildCurrencyList(filter) {
    var q = (filter || '').toLowerCase();
    var html = '';
    var count = 0;
    for (var i = 0; i < Utils.CURRENCIES.length; i++) {
      var c = Utils.CURRENCIES[i];
      var text = c.symbol + ' ' + c.code + ' - ' + c.name;
      if (q && text.toLowerCase().indexOf(q) === -1 && c.code.toLowerCase().indexOf(q) === -1) continue;
      html += '<div class="currency-combo-item" data-code="' + c.code + '">';
      html += '<span class="curr-symbol">' + c.symbol + '</span>' + c.code + ' - ' + c.name;
      html += '</div>';
      count++;
    }
    if (count === 0) html = '<div class="currency-combo-empty">No match found</div>';
    currDropdown.innerHTML = html;
  }

  function selectCurrency(code) {
    Utils.setCurrency(code);
    currInput.value = getCurrencyDisplay(code);
    currDropdown.classList.remove('open');
    var navSym = document.getElementById('billing-nav-symbol');
    if (navSym) navSym.textContent = Utils.getCurrencySymbol();
    if (isLoggedIn()) route();
  }

  // Set initial value
  currInput.value = getCurrencyDisplay(savedCurrency);

  // Toggle dropdown on arrow click
  currArrow.addEventListener('click', function(e) {
    e.stopPropagation();
    if (currDropdown.classList.contains('open')) {
      currDropdown.classList.remove('open');
    } else {
      buildCurrencyList('');
      currDropdown.classList.add('open');
      currInput.focus();
    }
  });

  // Show dropdown and filter on typing
  currInput.addEventListener('focus', function() {
    this.select();
    buildCurrencyList('');
    currDropdown.classList.add('open');
  });

  currInput.addEventListener('input', function() {
    buildCurrencyList(this.value);
    currDropdown.classList.add('open');
  });

  // Select item on click
  currDropdown.addEventListener('click', function(e) {
    var item = e.target.closest('.currency-combo-item');
    if (item) {
      selectCurrency(item.getAttribute('data-code'));
    }
  });

  // Close dropdown on click outside
  document.addEventListener('click', function(e) {
    if (!e.target.closest('#currency-combo')) {
      currDropdown.classList.remove('open');
      // Reset display if input doesn't match
      currInput.value = getCurrencyDisplay(localStorage.getItem('physio_currency') || 'INR');
    }
  });

  // Keyboard navigation
  currInput.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      currDropdown.classList.remove('open');
      currInput.value = getCurrencyDisplay(localStorage.getItem('physio_currency') || 'INR');
      currInput.blur();
    } else if (e.key === 'Enter') {
      var activeItem = currDropdown.querySelector('.currency-combo-item');
      if (activeItem) {
        selectCurrency(activeItem.getAttribute('data-code'));
      }
      e.preventDefault();
    }
  });

  // Set billing nav symbol on load
  var navSymEl = document.getElementById('billing-nav-symbol');
  if (navSymEl) navSymEl.textContent = Utils.getCurrencySymbol();

  // Mobile sidebar toggle
  menuToggle.addEventListener('click', function() {
    sidebar.classList.toggle('open');
    sidebarOverlay.classList.toggle('open');
  });
  sidebarOverlay.addEventListener('click', function() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('open');
  });

  // Modal close
  document.getElementById('modal-close-btn').addEventListener('click', Utils.closeModal);
  document.getElementById('modal').addEventListener('click', function(e) {
    if (e.target === this) Utils.closeModal();
  });

  // Expose for views
  window.App = {
    navigate: navigate,
    getCurrentUser: getCurrentUser,
    isLoggedIn: isLoggedIn,
    setPageTitle: function(t) { pageTitle.textContent = t; },
    setTopBarActions: function(html) { topBarActions.innerHTML = html; },
    getContent: function() { return content; },
    refresh: route,
    applyFeatureToggles: applyFeatureToggles,
    canAccessPage: canAccessPage
  };

  // Initial load
  if (isLoggedIn()) {
    showApp();
  } else {
    showLogin();
  }

})();
