// Config Settings - Injectable settings panel for editing all user details
// Stores data in localStorage and live-patches the rendered DOM

(function () {
  'use strict';

  var SETTINGS_KEY = 'vicroads_config';
  var PHOTO_KEY = 'vicroads_photo';
  var PANEL_ID = 'vr-config-panel';
  var OVERLAY_ID = 'vr-config-overlay';
  var BTN_ID = 'vr-config-btn';

  // ─── Default config schema ─────────────────────────────────
  var DEFAULT_CONFIG = {
    profile: {
      full_name: '',
      first_name: '',
      date_of_birth: '',
      address_line1: '',
      address_line2: '',
      photo_url: '',
      signature_url: ''
    },
    licence: {
      permit_number: '',
      permit_type: 'P1',
      issue_date: '',
      expiry_date: '',
      card_number: ''
    },
    demeritPoints: {
      balance: 0,
      threshold: 12
    }
  };

  // ─── Storage helpers ───────────────────────────────────────
  function loadConfig() {
    try {
      var raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return deepClone(DEFAULT_CONFIG);
      var parsed = JSON.parse(raw);
      return mergeDeep(deepClone(DEFAULT_CONFIG), parsed);
    } catch (e) {
      return deepClone(DEFAULT_CONFIG);
    }
  }

  function saveConfig(config) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(config));
    } catch (e) {
      console.error('Failed to save config:', e);
    }
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function mergeDeep(target, source) {
    for (var key in source) {
      if (source.hasOwnProperty(key)) {
        if (
          target[key] &&
          typeof target[key] === 'object' &&
          typeof source[key] === 'object' &&
          !Array.isArray(source[key])
        ) {
          mergeDeep(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    }
    return target;
  }

  // ─── CSS injection ─────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('vr-config-styles')) return;
    var style = document.createElement('style');
    style.id = 'vr-config-styles';
    style.textContent = [
      /* Gear button */
      '#' + BTN_ID + '{',
      '  position:fixed;right:16px;top:50%;transform:translateY(-50%);z-index:9998;',
      '  width:44px;height:44px;border-radius:50%;border:none;cursor:pointer;',
      '  background:rgba(45,62,80,0.85);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);',
      '  display:flex;align-items:center;justify-content:center;',
      '  box-shadow:0 4px 20px rgba(0,0,0,0.25);transition:all 0.3s cubic-bezier(.4,0,.2,1);',
      '}',
      '#' + BTN_ID + ':hover{background:rgba(82,184,72,0.95);transform:translateY(-50%) scale(1.08);}',
      '#' + BTN_ID + ':active{transform:translateY(-50%) scale(0.95);}',
      '#' + BTN_ID + ' svg{width:22px;height:22px;color:#fff;transition:transform 0.5s cubic-bezier(.4,0,.2,1);}',
      '#' + BTN_ID + ':hover svg{transform:rotate(90deg);}',

      /* Overlay */
      '#' + OVERLAY_ID + '{',
      '  position:fixed;inset:0;z-index:9999;',
      '  background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);',
      '  opacity:0;visibility:hidden;transition:all 0.3s ease;',
      '}',
      '#' + OVERLAY_ID + '.open{opacity:1;visibility:visible;}',

      /* Panel */
      '#' + PANEL_ID + '{',
      '  position:fixed;right:0;top:0;bottom:0;z-index:10000;',
      '  width:min(380px,92vw);background:#fff;',
      '  box-shadow:-8px 0 40px rgba(0,0,0,0.15);',
      '  transform:translateX(100%);transition:transform 0.35s cubic-bezier(.4,0,.2,1);',
      '  display:flex;flex-direction:column;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;',
      '  overflow:hidden;',
      '}',
      '#' + PANEL_ID + '.open{transform:translateX(0);}',

      /* Panel header */
      '.vr-cfg-header{',
      '  background:linear-gradient(135deg,#2D3E50 0%,#1a2a3a 100%);',
      '  padding:20px;flex-shrink:0;position:relative;overflow:hidden;',
      '}',
      '.vr-cfg-header::after{',
      '  content:"";position:absolute;right:-20px;top:-20px;',
      '  width:100px;height:100px;border-radius:50%;',
      '  background:rgba(82,184,72,0.15);',
      '}',
      '.vr-cfg-header h2{margin:0;color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.3px;}',
      '.vr-cfg-header p{margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:13px;font-weight:400;}',
      '.vr-cfg-close{',
      '  position:absolute;right:16px;top:16px;',
      '  width:32px;height:32px;border-radius:50%;border:none;cursor:pointer;',
      '  background:rgba(255,255,255,0.15);color:#fff;',
      '  display:flex;align-items:center;justify-content:center;font-size:18px;',
      '  transition:background 0.2s;',
      '}',
      '.vr-cfg-close:hover{background:rgba(255,255,255,0.3);}',

      /* Panel body */
      '.vr-cfg-body{',
      '  flex:1;overflow-y:auto;padding:0;',
      '  -webkit-overflow-scrolling:touch;',
      '}',
      '.vr-cfg-body::-webkit-scrollbar{width:4px;}',
      '.vr-cfg-body::-webkit-scrollbar-thumb{background:#ddd;border-radius:4px;}',

      /* Sections */
      '.vr-cfg-section{padding:20px 20px 4px;}',
      '.vr-cfg-section-title{',
      '  display:flex;align-items:center;gap:8px;margin:0 0 16px;',
      '  font-size:14px;font-weight:700;color:#2D3E50;text-transform:uppercase;letter-spacing:0.8px;',
      '}',
      '.vr-cfg-section-title .vr-icon{',
      '  width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;',
      '  font-size:14px;color:#fff;flex-shrink:0;',
      '}',
      '.vr-cfg-section-divider{height:1px;background:#f0f0f5;margin:0;}',

      /* Fields */
      '.vr-cfg-field{margin-bottom:16px;}',
      '.vr-cfg-label{',
      '  display:block;font-size:12px;font-weight:600;color:#6B7280;',
      '  margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;',
      '}',
      '.vr-cfg-input{',
      '  width:100%;box-sizing:border-box;padding:10px 14px;',
      '  border:1.5px solid #E5E7EB;border-radius:10px;',
      '  font-size:15px;font-family:inherit;color:#1f2937;',
      '  background:#FAFBFC;outline:none;transition:all 0.2s;',
      '}',
      '.vr-cfg-input:focus{border-color:#52B848;background:#fff;box-shadow:0 0 0 3px rgba(82,184,72,0.12);}',
      '.vr-cfg-input::placeholder{color:#c4c8cf;}',
      '.vr-cfg-input[type="number"]{-moz-appearance:textfield;}',
      '.vr-cfg-input[type="number"]::-webkit-inner-spin-button,',
      '.vr-cfg-input[type="number"]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0;}',

      /* Number stepper */
      '.vr-cfg-stepper{display:flex;align-items:center;gap:12px;}',
      '.vr-cfg-stepper-btn{',
      '  width:36px;height:36px;border-radius:10px;border:1.5px solid #E5E7EB;',
      '  background:#fff;color:#2D3E50;font-size:20px;font-weight:600;cursor:pointer;',
      '  display:flex;align-items:center;justify-content:center;transition:all 0.15s;flex-shrink:0;',
      '}',
      '.vr-cfg-stepper-btn:hover{background:#f0fdf4;border-color:#52B848;}',
      '.vr-cfg-stepper-btn:active{transform:scale(0.92);}',
      '.vr-cfg-stepper-val{font-size:24px;font-weight:700;color:#2D3E50;min-width:40px;text-align:center;}',

      /* Photo upload area */
      '.vr-cfg-photo-area{',
      '  display:flex;align-items:center;gap:14px;',
      '  padding:14px;border:1.5px dashed #E5E7EB;border-radius:12px;',
      '  background:#FAFBFC;cursor:pointer;transition:all 0.2s;',
      '}',
      '.vr-cfg-photo-area:hover{border-color:#52B848;background:#f0fdf4;}',
      '.vr-cfg-photo-preview{',
      '  width:56px;height:56px;border-radius:10px;object-fit:cover;flex-shrink:0;',
      '  border:2px solid #E5E7EB;',
      '}',
      '.vr-cfg-photo-placeholder{',
      '  width:56px;height:56px;border-radius:10px;background:#E5E7EB;flex-shrink:0;',
      '  display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:22px;',
      '}',
      '.vr-cfg-photo-text{font-size:13px;color:#6B7280;line-height:1.4;}',
      '.vr-cfg-photo-text strong{color:#2D3E50;font-weight:600;display:block;}',

      /* Footer */
      '.vr-cfg-footer{',
      '  padding:16px 20px;flex-shrink:0;',
      '  background:#fff;border-top:1px solid #f0f0f5;',
      '}',
      '.vr-cfg-save-btn{',
      '  width:100%;padding:14px;border:none;border-radius:12px;cursor:pointer;',
      '  font-size:16px;font-weight:700;font-family:inherit;color:#fff;',
      '  background:linear-gradient(135deg,#52B848 0%,#45A03A 100%);',
      '  box-shadow:0 4px 14px rgba(82,184,72,0.3);',
      '  transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:8px;',
      '}',
      '.vr-cfg-save-btn:hover{box-shadow:0 6px 20px rgba(82,184,72,0.4);transform:translateY(-1px);}',
      '.vr-cfg-save-btn:active{transform:translateY(0);box-shadow:0 2px 10px rgba(82,184,72,0.3);}',
      '.vr-cfg-reset-btn{',
      '  width:100%;padding:10px;border:none;border-radius:10px;cursor:pointer;',
      '  font-size:13px;font-weight:600;font-family:inherit;color:#EF4444;',
      '  background:transparent;margin-top:8px;transition:background 0.2s;',
      '}',
      '.vr-cfg-reset-btn:hover{background:#FEF2F2;}',

      /* Toast */
      '#vr-cfg-toast{',
      '  position:fixed;top:20px;left:50%;transform:translateX(-50%) translateY(-100px);',
      '  z-index:10001;background:#2D3E50;color:#fff;padding:12px 20px;',
      '  border-radius:12px;font-size:14px;font-weight:600;font-family:system-ui,sans-serif;',
      '  box-shadow:0 8px 30px rgba(0,0,0,0.2);transition:transform 0.4s cubic-bezier(.4,0,.2,1);',
      '  white-space:nowrap;',
      '}',
      '#vr-cfg-toast.show{transform:translateX(-50%) translateY(0);}',
      '#vr-cfg-toast.ok{background:linear-gradient(135deg,#52B848,#45A03A);}',

      /* Safe area (iOS) */
      '@supports(-webkit-touch-callout:none){',
      '  #' + BTN_ID + '{right:max(16px,env(safe-area-inset-right));}',
      '  .vr-cfg-footer{padding-bottom:max(16px,env(safe-area-inset-bottom));}',
      '  .vr-cfg-header{padding-top:max(20px,calc(env(safe-area-inset-top) + 8px));}',
      '}',

      /* Animations */
      '@keyframes vr-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}',
      '.vr-shake{animation:vr-shake 0.3s ease;}',
    ].join('\n');
    document.head.appendChild(style);
  }

  // ─── SVG Icons ─────────────────────────────────────────────
  var ICONS = {
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    save: '✓',
    person: '👤',
    card: '🪪',
    points: '🔢',
    camera: '📷',
    close: '✕',
    reset: '↺'
  };

  // ─── Toast ─────────────────────────────────────────────────
  function showToast(msg, ok) {
    var toast = document.getElementById('vr-cfg-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'vr-cfg-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.className = ok ? 'show ok' : 'show';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () {
      toast.className = '';
    }, 2500);
  }

  // ─── Build the panel ───────────────────────────────────────
  function buildPanel() {
    if (document.getElementById(PANEL_ID)) return;

    var config = loadConfig();

    // Overlay
    var overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.addEventListener('click', closePanel);
    document.body.appendChild(overlay);

    // Panel
    var panel = document.createElement('div');
    panel.id = PANEL_ID;

    // Header
    var header = document.createElement('div');
    header.className = 'vr-cfg-header';
    header.innerHTML =
      '<h2>⚙️ Config Settings</h2>' +
      '<p>Edit your licence & personal details</p>' +
      '<button class="vr-cfg-close" id="vr-cfg-close-btn">' + ICONS.close + '</button>';
    panel.appendChild(header);

    // Body
    var body = document.createElement('div');
    body.className = 'vr-cfg-body';

    // ── Personal Information Section ──
    body.appendChild(createSection('Personal Information', '#52B848', ICONS.person, [
      createTextField('cfg-full-name', 'Full Name', config.profile.full_name, 'e.g. JOHN MICHAEL DOE'),
      createTextField('cfg-first-name', 'First Name (Greeting)', config.profile.first_name, 'e.g. John'),
      createTextField('cfg-dob', 'Date of Birth', config.profile.date_of_birth, 'DD/MM/YYYY'),
      createTextField('cfg-addr1', 'Address Line 1', config.profile.address_line1, 'e.g. 123 Collins Street'),
      createTextField('cfg-addr2', 'Address Line 2', config.profile.address_line2, 'e.g. Melbourne VIC 3000'),
      createPhotoField('cfg-photo', 'Licence Photo', config.profile.photo_url, 'Upload your ID photo'),
      createPhotoField('cfg-sig', 'Signature Image', config.profile.signature_url, 'Upload your signature'),
    ]));

    body.appendChild(createDivider());

    // ── Licence Information Section ──
    body.appendChild(createSection('Licence Details', '#DE3424', ICONS.card, [
      createTextField('cfg-permit-num', 'Permit Number', config.licence.permit_number, 'e.g. 12345678'),
      createTextField('cfg-permit-type', 'Permit Type', config.licence.permit_type, 'e.g. P1, P2, Full'),
      createTextField('cfg-issue', 'Issue Date', config.licence.issue_date, 'DD/MM/YYYY'),
      createTextField('cfg-expiry', 'Expiry Date', config.licence.expiry_date, 'DD/MM/YYYY'),
      createTextField('cfg-card-num', 'Card Number', config.licence.card_number, 'e.g. A12345678'),
    ]));

    body.appendChild(createDivider());

    // ── Demerit Points Section ──
    body.appendChild(createSection('Demerit Points', '#FDB913', ICONS.points, [
      createStepperField('cfg-balance', 'Current Balance', config.demeritPoints.balance, 0, 99),
      createStepperField('cfg-threshold', 'Maximum Threshold', config.demeritPoints.threshold, 1, 99),
    ]));

    panel.appendChild(body);

    // Footer
    var footer = document.createElement('div');
    footer.className = 'vr-cfg-footer';
    footer.innerHTML =
      '<button class="vr-cfg-save-btn" id="vr-cfg-save">' + ICONS.save + ' Save & Apply</button>' +
      '<button class="vr-cfg-reset-btn" id="vr-cfg-reset">' + ICONS.reset + ' Reset All Data</button>';
    panel.appendChild(footer);

    document.body.appendChild(panel);

    // Event listeners
    document.getElementById('vr-cfg-close-btn').addEventListener('click', closePanel);
    document.getElementById('vr-cfg-save').addEventListener('click', handleSave);
    document.getElementById('vr-cfg-reset').addEventListener('click', handleReset);
  }

  // ─── Field builders ────────────────────────────────────────
  function createSection(title, color, icon, fields) {
    var section = document.createElement('div');
    section.className = 'vr-cfg-section';

    var titleEl = document.createElement('div');
    titleEl.className = 'vr-cfg-section-title';
    titleEl.innerHTML = '<span class="vr-icon" style="background:' + color + '">' + icon + '</span>' + title;
    section.appendChild(titleEl);

    for (var i = 0; i < fields.length; i++) {
      section.appendChild(fields[i]);
    }
    return section;
  }

  function createDivider() {
    var div = document.createElement('div');
    div.className = 'vr-cfg-section-divider';
    return div;
  }

  function createTextField(id, label, value, placeholder) {
    var field = document.createElement('div');
    field.className = 'vr-cfg-field';
    field.innerHTML =
      '<label class="vr-cfg-label" for="' + id + '">' + label + '</label>' +
      '<input class="vr-cfg-input" id="' + id + '" type="text" value="' + escapeAttr(value || '') + '" placeholder="' + escapeAttr(placeholder || '') + '">';
    return field;
  }

  function createPhotoField(id, label, value, helpText) {
    var field = document.createElement('div');
    field.className = 'vr-cfg-field';

    var lbl = document.createElement('label');
    lbl.className = 'vr-cfg-label';
    lbl.textContent = label;
    field.appendChild(lbl);

    var area = document.createElement('div');
    area.className = 'vr-cfg-photo-area';
    area.id = id + '-area';

    if (value) {
      area.innerHTML =
        '<img class="vr-cfg-photo-preview" id="' + id + '-preview" src="' + escapeAttr(value) + '" alt="' + label + '">' +
        '<div class="vr-cfg-photo-text"><strong>Tap to change</strong>or long-press to remove</div>';
    } else {
      area.innerHTML =
        '<div class="vr-cfg-photo-placeholder">' + ICONS.camera + '</div>' +
        '<div class="vr-cfg-photo-text"><strong>Tap to upload</strong>' + escapeHtml(helpText) + '</div>';
    }
    field.appendChild(area);

    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.id = id + '-input';
    input.style.display = 'none';
    field.appendChild(input);

    // Click to upload
    area.addEventListener('click', function () {
      input.click();
    });

    // Long press to remove
    var pressTimer = null;
    area.addEventListener('touchstart', function () {
      pressTimer = setTimeout(function () {
        removePhoto(id);
      }, 600);
    }, { passive: true });
    area.addEventListener('touchend', function () { clearTimeout(pressTimer); });
    area.addEventListener('touchcancel', function () { clearTimeout(pressTimer); });
    area.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      removePhoto(id);
    });

    input.addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        var data = ev.target.result;
        var previewImg = document.getElementById(id + '-preview');
        if (previewImg) {
          previewImg.src = data;
        } else {
          area.innerHTML =
            '<img class="vr-cfg-photo-preview" id="' + id + '-preview" src="' + escapeAttr(data) + '" alt="' + label + '">' +
            '<div class="vr-cfg-photo-text"><strong>Tap to change</strong>or long-press to remove</div>';
        }
        // Store the data URL temporarily on the element
        area.dataset.photoData = data;
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    });

    // If there's initial data, store it
    if (value) {
      area.dataset.photoData = value;
    }

    return field;
  }

  function removePhoto(id) {
    var area = document.getElementById(id + '-area');
    if (!area) return;
    area.innerHTML =
      '<div class="vr-cfg-photo-placeholder">' + ICONS.camera + '</div>' +
      '<div class="vr-cfg-photo-text"><strong>Tap to upload</strong>Photo removed</div>';
    area.dataset.photoData = '';
    showToast('Photo removed', false);
  }

  function createStepperField(id, label, value, min, max) {
    var field = document.createElement('div');
    field.className = 'vr-cfg-field';

    var lbl = document.createElement('label');
    lbl.className = 'vr-cfg-label';
    lbl.textContent = label;
    field.appendChild(lbl);

    var stepper = document.createElement('div');
    stepper.className = 'vr-cfg-stepper';

    var minusBtn = document.createElement('button');
    minusBtn.className = 'vr-cfg-stepper-btn';
    minusBtn.textContent = '−';
    minusBtn.type = 'button';

    var valDisplay = document.createElement('span');
    valDisplay.className = 'vr-cfg-stepper-val';
    valDisplay.id = id + '-val';
    valDisplay.textContent = value || 0;

    var plusBtn = document.createElement('button');
    plusBtn.className = 'vr-cfg-stepper-btn';
    plusBtn.textContent = '+';
    plusBtn.type = 'button';

    var hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.id = id;
    hiddenInput.value = value || 0;

    minusBtn.addEventListener('click', function () {
      var v = parseInt(hiddenInput.value) || 0;
      if (v > min) {
        v--;
        hiddenInput.value = v;
        valDisplay.textContent = v;
      }
    });

    plusBtn.addEventListener('click', function () {
      var v = parseInt(hiddenInput.value) || 0;
      if (v < max) {
        v++;
        hiddenInput.value = v;
        valDisplay.textContent = v;
      }
    });

    stepper.appendChild(minusBtn);
    stepper.appendChild(valDisplay);
    stepper.appendChild(plusBtn);
    field.appendChild(stepper);
    field.appendChild(hiddenInput);

    return field;
  }

  // ─── Collect & save ────────────────────────────────────────
  function handleSave() {
    var config = {
      profile: {
        full_name: getVal('cfg-full-name'),
        first_name: getVal('cfg-first-name'),
        date_of_birth: getVal('cfg-dob'),
        address_line1: getVal('cfg-addr1'),
        address_line2: getVal('cfg-addr2'),
        photo_url: getPhotoData('cfg-photo'),
        signature_url: getPhotoData('cfg-sig'),
      },
      licence: {
        permit_number: getVal('cfg-permit-num'),
        permit_type: getVal('cfg-permit-type'),
        issue_date: getVal('cfg-issue'),
        expiry_date: getVal('cfg-expiry'),
        card_number: getVal('cfg-card-num'),
      },
      demeritPoints: {
        balance: parseInt(getVal('cfg-balance')) || 0,
        threshold: parseInt(getVal('cfg-threshold')) || 12,
      }
    };

    saveConfig(config);

    // Also save the photo to the separate photo key used by photo-upload.js
    if (config.profile.photo_url) {
      try {
        localStorage.setItem(PHOTO_KEY, config.profile.photo_url);
      } catch (e) {}
    }

    // Apply to DOM immediately
    applyToDom(config);

    showToast('✅ Settings saved & applied!', true);

    // Subtle save feedback
    var saveBtn = document.getElementById('vr-cfg-save');
    if (saveBtn) {
      saveBtn.textContent = '✓ Saved!';
      setTimeout(function () {
        saveBtn.innerHTML = ICONS.save + ' Save & Apply';
      }, 1500);
    }
  }

  function handleReset() {
    if (!confirm('Reset all config data? This cannot be undone.')) return;
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.removeItem(PHOTO_KEY);
    showToast('All data reset', false);
    closePanel();
    // Rebuild panel with defaults
    var panel = document.getElementById(PANEL_ID);
    var overlay = document.getElementById(OVERLAY_ID);
    if (panel) panel.remove();
    if (overlay) overlay.remove();
    setTimeout(function () {
      location.reload();
    }, 500);
  }

  function getVal(id) {
    var el = document.getElementById(id);
    return el ? el.value : '';
  }

  function getPhotoData(id) {
    var area = document.getElementById(id + '-area');
    return area ? (area.dataset.photoData || '') : '';
  }

  // ─── DOM Patching ──────────────────────────────────────────
  // Directly update rendered text nodes to reflect saved config
  function applyToDom(config) {
    if (!config) config = loadConfig();

    // Helper: find element by text content within a selector scope
    function patchTextNextTo(labelText, newValue, scope) {
      if (!newValue) return;
      var root = scope || document.getElementById('root');
      if (!root) return;
      var paragraphs = root.querySelectorAll('p');
      for (var i = 0; i < paragraphs.length; i++) {
        var p = paragraphs[i];
        if (p.textContent.trim() === labelText) {
          // Find the sibling or next element that holds the value
          var next = p.nextElementSibling;
          if (next && (next.tagName === 'P' || next.tagName === 'SPAN' || next.tagName === 'DIV')) {
            // Don't override if it already matches
            if (next.textContent.trim() !== newValue) {
              next.textContent = newValue;
            }
          }
        }
      }
    }

    // Patch the greeting "Hi {name}" on home screen
    var greetings = document.querySelectorAll('h1');
    for (var i = 0; i < greetings.length; i++) {
      var h = greetings[i];
      if (h.textContent.indexOf('Hi ') === 0 && config.profile.first_name) {
        h.textContent = 'Hi ' + config.profile.first_name;
      }
    }

    // Patch full name (large headers in licence detail)
    var h2s = document.querySelectorAll('h2');
    for (var j = 0; j < h2s.length; j++) {
      var h2 = h2s[j];
      if (
        (h2.textContent === 'NAME NOT SET' || h2.dataset.vrPatched === '1') &&
        config.profile.full_name
      ) {
        h2.textContent = config.profile.full_name;
        h2.dataset.vrPatched = '1';
      }
    }

    // Patch individual fields via label matching
    patchTextNextTo('Permit number', config.licence.permit_number);
    patchTextNextTo('Expiry', config.licence.expiry_date);
    patchTextNextTo('Date of birth', config.profile.date_of_birth);
    patchTextNextTo('Issue date', config.licence.issue_date);
    patchTextNextTo('Address', config.profile.address_line1);

    // Patch demerit points
    var bigNumbers = document.querySelectorAll('span');
    for (var k = 0; k < bigNumbers.length; k++) {
      var span = bigNumbers[k];
      var parent = span.parentElement;
      if (
        parent &&
        parent.className &&
        parent.className.indexOf('items-baseline') !== -1 &&
        span.className.indexOf('text-5xl') !== -1
      ) {
        span.textContent = config.demeritPoints.balance;
      }
    }

    // Inject photo if we have one
    if (config.profile.photo_url) {
      injectLicencePhoto(config.profile.photo_url);
    }

    // Inject signature if we have one
    if (config.profile.signature_url) {
      var sigImgs = document.querySelectorAll('img[alt="Signature"]');
      for (var m = 0; m < sigImgs.length; m++) {
        sigImgs[m].src = config.profile.signature_url;
      }
    }
  }

  function injectLicencePhoto(photoData) {
    if (!photoData) return;
    // Find the aspect photo container
    var slots = document.querySelectorAll('[class*="aspect-"][class*="overflow-hidden"]');
    for (var i = 0; i < slots.length; i++) {
      var text = (slots[i].textContent || '').trim().toLowerCase();
      if (text.indexOf('no photo') !== -1 || slots[i].querySelector('img[alt="License photo"]')) {
        var existing = slots[i].querySelector('img[alt="License photo"]');
        if (existing) {
          existing.src = photoData;
        } else {
          slots[i].innerHTML = '';
          var img = document.createElement('img');
          img.src = photoData;
          img.alt = 'License photo';
          img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
          slots[i].appendChild(img);
        }
        break;
      }
    }
  }

  // ─── Open / close ──────────────────────────────────────────
  function openPanel() {
    buildPanel();
    requestAnimationFrame(function () {
      var panel = document.getElementById(PANEL_ID);
      var overlay = document.getElementById(OVERLAY_ID);
      if (panel) panel.classList.add('open');
      if (overlay) overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  }

  function closePanel() {
    var panel = document.getElementById(PANEL_ID);
    var overlay = document.getElementById(OVERLAY_ID);
    if (panel) panel.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
    // Clean up after animation
    setTimeout(function () {
      if (panel) panel.remove();
      if (overlay) overlay.remove();
    }, 400);
  }

  // ─── Gear button ───────────────────────────────────────────
  function createGearButton() {
    if (document.getElementById(BTN_ID)) return;
    var btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.type = 'button';
    btn.title = 'Config Settings';
    btn.innerHTML = ICONS.gear;
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      openPanel();
    });
    document.body.appendChild(btn);
  }

  // ─── HTML helpers ──────────────────────────────────────────
  function escapeAttr(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ─── Continuous DOM patching via MutationObserver ──────────
  function startDomWatcher() {
    var config = loadConfig();
    var hasData = config.profile.full_name || config.profile.first_name || config.licence.permit_number;

    if (hasData) {
      applyToDom(config);
    }

    var observer = new MutationObserver(function () {
      var freshConfig = loadConfig();
      var freshHasData = freshConfig.profile.full_name || freshConfig.profile.first_name || freshConfig.licence.permit_number;
      if (freshHasData) {
        applyToDom(freshConfig);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ─── Init ──────────────────────────────────────────────────
  function init() {
    injectStyles();
    createGearButton();
    startDomWatcher();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Also re-apply after full load
  window.addEventListener('load', function () {
    setTimeout(function () {
      var config = loadConfig();
      if (config.profile.full_name || config.profile.first_name) {
        applyToDom(config);
      }
    }, 1000);
  });

})();
