/* ============================================
   Utils - Helper Functions
   ============================================ */
window.Utils = (function() {

  // Generate unique ID
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  // Format date: "Jan 15, 2025"
  function formatDate(dateStr) {
    if (!dateStr) return '-';
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  // Format date short: "Jan 15"
  function formatDateShort(dateStr) {
    if (!dateStr) return '-';
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[d.getMonth()] + ' ' + d.getDate();
  }

  // Format time: "9:00 AM"
  function formatTime(timeStr) {
    if (!timeStr) return '-';
    var parts = timeStr.split(':');
    var h = parseInt(parts[0], 10);
    var m = parts[1];
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + m + ' ' + ampm;
  }

  // Today's date as YYYY-MM-DD
  function today() {
    return new Date().toISOString().split('T')[0];
  }

  // Get relative time: "2 hours ago"
  function timeAgo(dateStr) {
    var d = new Date(dateStr);
    var now = new Date();
    var diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
    return formatDate(dateStr);
  }

  // Escape HTML
  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Show toast notification
  function toast(message, type) {
    type = type || 'info';
    var container = document.getElementById('toast-container');
    var el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.innerHTML = '<span class="toast-message">' + escapeHtml(message) + '</span>';
    container.appendChild(el);
    setTimeout(function() {
      el.classList.add('removing');
      setTimeout(function() {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 300);
    }, 3000);
  }

  // Show modal
  function showModal(title, bodyHtml, footerHtml, options) {
    options = options || {};
    var overlay = document.getElementById('modal');
    var dialog = document.getElementById('modal-dialog');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    document.getElementById('modal-footer').innerHTML = footerHtml || '';
    if (options.large) {
      dialog.classList.add('modal-lg');
    } else {
      dialog.classList.remove('modal-lg');
    }
    overlay.style.display = 'flex';
  }

  // Close modal
  function closeModal() {
    document.getElementById('modal').style.display = 'none';
    document.getElementById('modal-body').innerHTML = '';
    document.getElementById('modal-footer').innerHTML = '';
  }

  // Confirm dialog
  function confirm(message, onConfirm) {
    showModal('Confirm', '<p class="confirm-text">' + escapeHtml(message) + '</p>',
      '<button class="btn btn-secondary" id="confirm-cancel">Cancel</button>' +
      '<button class="btn btn-danger" id="confirm-ok">Confirm</button>'
    );
    document.getElementById('confirm-cancel').onclick = closeModal;
    document.getElementById('confirm-ok').onclick = function() {
      closeModal();
      onConfirm();
    };
  }

  // Get form data as object
  function getFormData(formEl) {
    var data = {};
    var inputs = formEl.querySelectorAll('input, select, textarea');
    for (var i = 0; i < inputs.length; i++) {
      var el = inputs[i];
      if (el.name) {
        data[el.name] = el.value.trim();
      }
    }
    return data;
  }

  // Calculate age from DOB
  function calculateAge(dob) {
    if (!dob) return '-';
    var birth = new Date(dob);
    var now = new Date();
    var age = now.getFullYear() - birth.getFullYear();
    var m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age;
  }

  // Get initials
  function getInitials(name) {
    if (!name) return '?';
    var parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  // Format currency
  function formatCurrency(amount) {
    var num = parseFloat(amount) || 0;
    var parts = num.toFixed(2).split('.');
    var lastThree = parts[0].slice(-3);
    var rest = parts[0].slice(0, -3);
    if (rest) lastThree = ',' + lastThree;
    var formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
    return '\u20B9' + formatted + '.' + parts[1];
  }

  // Days of week
  var DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  // Is same day
  function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }

  // Get start of week (Sunday)
  function getWeekStart(date) {
    var d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    return d;
  }

  // Add days
  function addDays(date, n) {
    var d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  }

  // Format YYYY-MM-DD
  function toDateString(date) {
    var d = new Date(date);
    var m = (d.getMonth() + 1).toString();
    var day = d.getDate().toString();
    if (m.length < 2) m = '0' + m;
    if (day.length < 2) day = '0' + day;
    return d.getFullYear() + '-' + m + '-' + day;
  }

  // --- Microphone / Voice Input ---
  var MIC_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">' +
    '<path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>' +
    '<path d="M19 10v2a7 7 0 01-14 0v-2"/>' +
    '<line x1="12" y1="19" x2="12" y2="23"/>' +
    '<line x1="8" y1="23" x2="16" y2="23"/></svg>';

  function micHtml(targetId) {
    return '<button type="button" class="mic-btn" data-mic-target="' + targetId + '" title="Voice input">' + MIC_SVG + '</button>';
  }

  function bindMicButtons(parentEl) {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    var btns = (parentEl || document).querySelectorAll('.mic-btn');
    for (var i = 0; i < btns.length; i++) {
      (function(btn) {
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          var targetId = btn.getAttribute('data-mic-target');
          var target = document.getElementById(targetId);
          if (!target) return;
          if (btn.classList.contains('recording')) {
            if (btn._rec) btn._rec.stop();
            return;
          }
          var rec = new SR();
          rec.continuous = false;
          rec.interimResults = false;
          rec.lang = 'en-IN';
          btn._rec = rec;
          btn.classList.add('recording');
          rec.onresult = function(ev) {
            var text = ev.results[0][0].transcript;
            if (target.value) target.value += ' ';
            target.value += text;
            target.dispatchEvent(new Event('input'));
          };
          rec.onend = function() { btn.classList.remove('recording'); };
          rec.onerror = function() {
            btn.classList.remove('recording');
            toast('Voice input not available in this browser', 'error');
          };
          rec.start();
        });
      })(btns[i]);
    }
  }

  return {
    generateId: generateId,
    formatDate: formatDate,
    formatDateShort: formatDateShort,
    formatTime: formatTime,
    today: today,
    timeAgo: timeAgo,
    escapeHtml: escapeHtml,
    toast: toast,
    showModal: showModal,
    closeModal: closeModal,
    confirm: confirm,
    getFormData: getFormData,
    calculateAge: calculateAge,
    getInitials: getInitials,
    formatCurrency: formatCurrency,
    DAYS_SHORT: DAYS_SHORT,
    DAYS_FULL: DAYS_FULL,
    MONTHS: MONTHS,
    isSameDay: isSameDay,
    getWeekStart: getWeekStart,
    addDays: addDays,
    toDateString: toDateString,
    micHtml: micHtml,
    bindMicButtons: bindMicButtons
  };
})();
