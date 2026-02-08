/* ============================================
   App - Router, Auth Guard, Initialization
   ============================================ */
(function() {

  // Initialize seed data
  // Reset to load fresh 3-month INR test data (remove this block after first load)
  if (!localStorage.getItem('physio_ptid_v6')) {
    var physioKeys = ['physio_users','physio_patients','physio_appointments','physio_sessions',
      'physio_exercises','physio_billing','physio_activity_log','physio_tags',
      'physio_message_templates','physio_message_log','physio_prescriptions'];
    for (var ri = 0; ri < physioKeys.length; ri++) localStorage.removeItem(physioKeys[ri]);
    localStorage.setItem('physio_ptid_v6', '1');
  }
  Store.seed();
  Store.migrate();

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

  function login(user) {
    sessionStorage.setItem('physio_session', JSON.stringify(user));
    showApp();
  }

  function logout() {
    sessionStorage.removeItem('physio_session');
    showLogin();
  }

  function showLogin() {
    loginScreen.style.display = 'flex';
    appShell.style.display = 'none';
    window.LoginView.render();
  }

  function showApp() {
    loginScreen.style.display = 'none';
    appShell.style.display = 'flex';
    var user = getCurrentUser();
    if (user) {
      document.getElementById('sidebar-username').textContent = user.name || user.username;
    }
    route();
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

    // Reset top bar actions
    topBarActions.innerHTML = '';

    // Close mobile sidebar
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('open');

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
    } else {
      pageTitle.textContent = 'Dashboard';
      navigate('/dashboard');
    }
  }

  // Event listeners
  window.addEventListener('hashchange', function() {
    if (isLoggedIn()) route();
  });

  // Login form
  document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var username = document.getElementById('login-username').value.trim();
    var password = document.getElementById('login-password').value;
    var user = Store.getUserByUsername(username);
    var errorEl = document.getElementById('login-error');
    if (user && user.password === password) {
      errorEl.style.display = 'none';
      login(user);
    } else {
      errorEl.textContent = 'Invalid username or password';
      errorEl.style.display = 'block';
    }
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', function() {
    logout();
  });

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
    refresh: route
  };

  // Initial load
  if (isLoggedIn()) {
    showApp();
  } else {
    showLogin();
  }

})();
