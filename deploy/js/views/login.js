/* ============================================
   Login View
   ============================================ */
window.LoginView = (function() {

  function render() {
    // Login form is in index.html, just reset fields
    var clinicInput = document.getElementById('login-clinic');
    if (clinicInput) clinicInput.value = '';
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-error').style.display = 'none';
    if (clinicInput) clinicInput.focus();
  }

  return { render: render };
})();
