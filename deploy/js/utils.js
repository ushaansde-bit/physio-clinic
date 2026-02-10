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

  // Currency options with phone code and digit length
  var CURRENCIES = [
    { code: 'INR', symbol: '\u20B9', name: 'Indian Rupee', phone: '+91', digits: 11 },
    { code: 'USD', symbol: '$', name: 'US Dollar', phone: '+1', digits: 10 },
    { code: 'GBP', symbol: '\u00A3', name: 'British Pound', phone: '+44', digits: 11 },
    { code: 'EUR', symbol: '\u20AC', name: 'Euro', phone: '+49', digits: 11 },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', phone: '+61', digits: 9 },
    { code: 'AED', symbol: 'AED', name: 'UAE Dirham', phone: '+971', digits: 9 },
    { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal', phone: '+966', digits: 9 },
    { code: 'QAR', symbol: 'QAR', name: 'Qatari Riyal', phone: '+974', digits: 8 },
    { code: 'OMR', symbol: 'OMR', name: 'Omani Rial', phone: '+968', digits: 8 },
    { code: 'BHD', symbol: 'BHD', name: 'Bahraini Dinar', phone: '+973', digits: 8 },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', phone: '+65', digits: 8 },
    { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', phone: '+60', digits: 10 },
    { code: 'NPR', symbol: 'Rs', name: 'Nepalese Rupee', phone: '+977', digits: 10 },
    { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee', phone: '+94', digits: 9 },
    { code: 'BDT', symbol: '\u09F3', name: 'Bangladeshi Taka', phone: '+880', digits: 10 },
    { code: 'PKR', symbol: 'Rs', name: 'Pakistani Rupee', phone: '+92', digits: 10 },
    { code: 'ZAR', symbol: 'R', name: 'South African Rand', phone: '+27', digits: 9 },
    { code: 'NGN', symbol: '\u20A6', name: 'Nigerian Naira', phone: '+234', digits: 10 },
    { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', phone: '+254', digits: 9 },
    { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', phone: '+55', digits: 11 },
    { code: 'JPY', symbol: '\u00A5', name: 'Japanese Yen', phone: '+81', digits: 10 },
    { code: 'KRW', symbol: '\u20A9', name: 'South Korean Won', phone: '+82', digits: 10 },
    { code: 'CNY', symbol: '\u00A5', name: 'Chinese Yuan', phone: '+86', digits: 11 }
  ];

  function getCurrencySymbol() {
    var code = localStorage.getItem('physio_currency') || 'INR';
    for (var i = 0; i < CURRENCIES.length; i++) {
      if (CURRENCIES[i].code === code) return CURRENCIES[i].symbol;
    }
    return '\u20B9';
  }

  function setCurrency(code) {
    localStorage.setItem('physio_currency', code);
    // Auto-sync phone code
    for (var i = 0; i < CURRENCIES.length; i++) {
      if (CURRENCIES[i].code === code) {
        localStorage.setItem('physio_phone_code', CURRENCIES[i].phone);
        localStorage.setItem('physio_phone_digits', CURRENCIES[i].digits.toString());
        break;
      }
    }
  }

  function getPhoneCode() {
    return localStorage.getItem('physio_phone_code') || '+91';
  }

  function getDigitsByPhoneCode(phoneCode) {
    var code = (phoneCode || '').trim();
    if (!code) return getPhoneDigits();
    if (code.charAt(0) !== '+') code = '+' + code;
    for (var i = 0; i < CURRENCIES.length; i++) {
      if (CURRENCIES[i].phone === code) return CURRENCIES[i].digits;
    }
    return getPhoneDigits();
  }

  function getPhoneDigits() {
    return parseInt(localStorage.getItem('physio_phone_digits'), 10) || 10;
  }

  // Format currency
  function formatCurrency(amount) {
    var num = parseFloat(amount) || 0;
    var sym = getCurrencySymbol();
    var parts = num.toFixed(2).split('.');
    var lastThree = parts[0].slice(-3);
    var rest = parts[0].slice(0, -3);
    if (rest) lastThree = ',' + lastThree;
    var formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
    var space = sym.length > 1 ? ' ' : '';
    return sym + space + formatted + '.' + parts[1];
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

  // ==================== AUTOCOMPLETE ====================
  // Lightweight autocomplete for textareas/inputs
  // Usage: Utils.bindAutocomplete(element, 'subjective')
  function bindAutocomplete(el, context) {
    if (!el || !window.PhysioTerms) return;
    var terms = PhysioTerms.getTerms(context);
    if (!terms || terms.length === 0) return;

    var dropdown = null;
    var selectedIdx = -1;
    var visible = false;
    var items = [];

    function createDropdown() {
      dropdown = document.createElement('div');
      dropdown.className = 'ac-dropdown';
      dropdown.style.cssText = 'position:absolute;z-index:9999;background:#fff;border:1px solid #d1d5db;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.12);max-height:200px;overflow-y:auto;display:none;width:100%;font-size:0.85rem;';
      // Position relative to parent
      var wrapper = el.parentNode;
      if (wrapper) {
        wrapper.style.position = 'relative';
        wrapper.appendChild(dropdown);
      }
      return dropdown;
    }

    function show(matches) {
      if (!dropdown) createDropdown();
      if (matches.length === 0) { hide(); return; }
      items = matches.slice(0, 8);
      selectedIdx = -1;
      var html = '';
      for (var i = 0; i < items.length; i++) {
        html += '<div class="ac-item" data-idx="' + i + '" style="padding:6px 10px;cursor:pointer;border-bottom:1px solid #f3f4f6;transition:background 0.1s;">' + escapeHtml(items[i]) + '</div>';
      }
      dropdown.innerHTML = html;
      dropdown.style.display = 'block';
      visible = true;

      // Bind click on items
      var itemEls = dropdown.querySelectorAll('.ac-item');
      for (var j = 0; j < itemEls.length; j++) {
        (function(itemEl) {
          itemEl.addEventListener('mousedown', function(e) {
            e.preventDefault();
            selectItem(parseInt(itemEl.getAttribute('data-idx')));
          });
          itemEl.addEventListener('mouseenter', function() {
            clearHighlight();
            itemEl.style.background = '#f0fdfa';
          });
          itemEl.addEventListener('mouseleave', function() {
            itemEl.style.background = '';
          });
        })(itemEls[j]);
      }
    }

    function hide() {
      if (dropdown) dropdown.style.display = 'none';
      visible = false;
      selectedIdx = -1;
      items = [];
    }

    function clearHighlight() {
      if (!dropdown) return;
      var all = dropdown.querySelectorAll('.ac-item');
      for (var i = 0; i < all.length; i++) all[i].style.background = '';
    }

    function highlight(idx) {
      clearHighlight();
      if (idx < 0 || idx >= items.length) return;
      var el = dropdown.querySelector('[data-idx="' + idx + '"]');
      if (el) {
        el.style.background = '#f0fdfa';
        el.scrollIntoView({ block: 'nearest' });
      }
    }

    function selectItem(idx) {
      if (idx < 0 || idx >= items.length) return;
      var text = items[idx];
      // Get current cursor position and find the word being typed
      var val = el.value;
      var cursorPos = el.selectionStart || val.length;

      // Find the start of the current line or after last newline
      var lineStart = val.lastIndexOf('\n', cursorPos - 1) + 1;
      var lineText = val.substring(lineStart, cursorPos);

      // Find what the user was typing (last segment after comma, period, or newline)
      var lastSep = Math.max(lineText.lastIndexOf(','), lineText.lastIndexOf('.'), lineText.lastIndexOf(';'));
      var typingStart = lastSep >= 0 ? lineStart + lastSep + 1 : lineStart;

      // Trim leading space from typing start
      while (typingStart < cursorPos && val[typingStart] === ' ') typingStart++;

      // Replace the typed portion with the selected term
      var before = val.substring(0, typingStart);
      var after = val.substring(cursorPos);
      el.value = before + text + after;

      // Position cursor after inserted text
      var newPos = typingStart + text.length;
      el.setSelectionRange(newPos, newPos);
      el.focus();
      el.dispatchEvent(new Event('input'));
      hide();
    }

    function getTypingText() {
      var val = el.value;
      var cursorPos = el.selectionStart || val.length;
      var lineStart = val.lastIndexOf('\n', cursorPos - 1) + 1;
      var lineText = val.substring(lineStart, cursorPos);
      var lastSep = Math.max(lineText.lastIndexOf(','), lineText.lastIndexOf('.'), lineText.lastIndexOf(';'));
      var typing = lastSep >= 0 ? lineText.substring(lastSep + 1).trim() : lineText.trim();
      return typing;
    }

    el.addEventListener('input', function() {
      var typing = getTypingText();
      if (typing.length < 2) { hide(); return; }

      var q = typing.toLowerCase();
      var matches = [];
      for (var i = 0; i < terms.length; i++) {
        if (terms[i].toLowerCase().indexOf(q) !== -1) {
          matches.push(terms[i]);
        }
        if (matches.length >= 8) break;
      }
      show(matches);
    });

    el.addEventListener('keydown', function(e) {
      if (!visible) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIdx = Math.min(selectedIdx + 1, items.length - 1);
        highlight(selectedIdx);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIdx = Math.max(selectedIdx - 1, 0);
        highlight(selectedIdx);
      } else if (e.key === 'Enter' && selectedIdx >= 0) {
        e.preventDefault();
        selectItem(selectedIdx);
      } else if (e.key === 'Escape') {
        hide();
      } else if (e.key === 'Tab' && selectedIdx >= 0) {
        e.preventDefault();
        selectItem(selectedIdx);
      }
    });

    el.addEventListener('blur', function() {
      setTimeout(hide, 150);
    });
  }

  // Bind autocomplete to all elements with data-ac attribute within a parent
  function bindAllAutocomplete(parentEl) {
    if (!window.PhysioTerms) return;
    var els = (parentEl || document).querySelectorAll('[data-ac]');
    for (var i = 0; i < els.length; i++) {
      var context = els[i].getAttribute('data-ac');
      bindAutocomplete(els[i], context);
    }
  }

  // ==================== DOB PICKER ====================
  // Generates Day/Month/Year dropdown HTML
  function dobPickerHtml(selectedDate) {
    var day = '', month = '', year = '';
    if (selectedDate) {
      var parts = selectedDate.split('-');
      if (parts.length === 3) {
        year = parts[0];
        month = parts[1];
        day = parts[2];
      }
    }

    var html = '<div class="dob-picker" style="display:grid;grid-template-columns:1fr 1.4fr 1fr;gap:6px;">';

    // Day
    html += '<select name="dob_day" class="dob-sel" style="width:100%;">';
    html += '<option value="">Day</option>';
    for (var d = 1; d <= 31; d++) {
      var dStr = d < 10 ? '0' + d : '' + d;
      html += '<option value="' + dStr + '"' + (day === dStr ? ' selected' : '') + '>' + d + '</option>';
    }
    html += '</select>';

    // Month
    var monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    html += '<select name="dob_month" class="dob-sel" style="width:100%;">';
    html += '<option value="">Month</option>';
    for (var m = 0; m < 12; m++) {
      var mStr = (m + 1) < 10 ? '0' + (m + 1) : '' + (m + 1);
      html += '<option value="' + mStr + '"' + (month === mStr ? ' selected' : '') + '>' + monthNames[m] + '</option>';
    }
    html += '</select>';

    // Year (current year down to 1920)
    var currentYear = new Date().getFullYear();
    html += '<select name="dob_year" class="dob-sel" style="width:100%;">';
    html += '<option value="">Year</option>';
    for (var y = currentYear; y >= 1920; y--) {
      html += '<option value="' + y + '"' + (year === '' + y ? ' selected' : '') + '>' + y + '</option>';
    }
    html += '</select>';

    html += '</div>';
    // Hidden input for the actual date value
    html += '<input type="hidden" name="dob" value="' + escapeHtml(selectedDate || '') + '">';

    return html;
  }

  // Bind DOB picker change events to update the hidden input
  function bindDobPicker(parentEl) {
    var selects = (parentEl || document).querySelectorAll('.dob-sel');
    for (var i = 0; i < selects.length; i++) {
      selects[i].addEventListener('change', function() {
        var container = this.closest('.form-group') || this.parentNode.parentNode;
        var dayEl = container.querySelector('[name="dob_day"]');
        var monthEl = container.querySelector('[name="dob_month"]');
        var yearEl = container.querySelector('[name="dob_year"]');
        var hiddenEl = container.querySelector('[name="dob"]');
        if (dayEl && monthEl && yearEl && hiddenEl) {
          var d = dayEl.value;
          var m = monthEl.value;
          var y = yearEl.value;
          if (d && m && y) {
            hiddenEl.value = y + '-' + m + '-' + d;
          } else {
            hiddenEl.value = '';
          }
          // Update age display if present
          var ageEl = container.querySelector('.dob-age');
          if (ageEl && hiddenEl.value) {
            ageEl.textContent = 'Age: ' + calculateAge(hiddenEl.value);
          } else if (ageEl) {
            ageEl.textContent = '';
          }
        }
      });
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
    getCurrencySymbol: getCurrencySymbol,
    setCurrency: setCurrency,
    getPhoneCode: getPhoneCode,
    getPhoneDigits: getPhoneDigits,
    getDigitsByPhoneCode: getDigitsByPhoneCode,
    CURRENCIES: CURRENCIES,
    DAYS_SHORT: DAYS_SHORT,
    DAYS_FULL: DAYS_FULL,
    MONTHS: MONTHS,
    isSameDay: isSameDay,
    getWeekStart: getWeekStart,
    addDays: addDays,
    toDateString: toDateString,
    micHtml: micHtml,
    bindMicButtons: bindMicButtons,
    bindAutocomplete: bindAutocomplete,
    bindAllAutocomplete: bindAllAutocomplete,
    dobPickerHtml: dobPickerHtml,
    bindDobPicker: bindDobPicker
  };
})();
