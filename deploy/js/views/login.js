/* ============================================
   Login View
   ============================================ */
window.LoginView = (function() {

  function render() {
    // Login form is in index.html, just reset fields
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-error').style.display = 'none';
    document.getElementById('login-username').focus();
  }

  return { render: render };
})();
