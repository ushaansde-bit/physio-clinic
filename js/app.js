/* ============================================
   App - Router, Auth Guard, Initialization
   ============================================ */
(function() {

  // Initialize seed data
  // Reset to load fresh 3-month INR test data (remove this block after first load)
  if (!localStorage.getItem('physio_noid_v7')) {
    var physioKeys = ['physio_users','physio_patients','physio_appointments','physio_sessions',
      'physio_exercises','physio_billing','physio_activity_log','physio_tags',
      'physio_message_templates','physio_message_log','physio_prescriptions'];
    for (var ri = 0; ri < physioKeys.length; ri++) localStorage.removeItem(physioKeys[ri]);
    localStorage.setItem('physio_noid_v7', '1');
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
    refresh: route
  };

  // Initial load
  if (isLoggedIn()) {
    showApp();
  } else {
    showLogin();
  }

})();
