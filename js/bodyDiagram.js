/* ============================================
   Body Diagram - Elegant Physio Body Region Selector
   Front + Back dual view with comprehensive regions
   ============================================ */
window.BodyDiagram = (function() {

  // Front body silhouette (left half, mirrored)
  var FRONT_BODY = 'M100,18 C84,18 76,28 76,40 C76,52 84,60 92,64 L90,72 ' +
    'L56,82 C46,85 40,94 42,104 L38,148 C36,156 40,162 46,160 L52,156 L54,130 L60,102 L72,86 ' +
    'L70,180 L68,216 L70,260 L66,308 C64,334 64,358 68,378 L72,388 C76,394 84,396 90,392 ' +
    'L98,392 C100,388 100,376 98,362 L92,330 L90,292 L92,254 L96,222 ' +
    'L100,204 ' +
    'L104,222 L108,254 L110,292 L108,330 L102,362 C100,376 100,388 102,392 ' +
    'L110,392 C116,396 124,394 128,388 L132,378 C136,358 136,334 134,308 ' +
    'L130,260 L132,216 L130,180 ' +
    'L128,86 L140,102 L146,130 L148,156 L154,160 C160,162 164,156 162,148 L158,104 C160,94 154,85 144,82 ' +
    'L108,72 L108,64 C116,60 124,52 124,40 C124,28 116,18 100,18 Z';

  var BACK_BODY = FRONT_BODY; // same silhouette for back

  // All regions with front/back designation
  var REGIONS = [
    // --- FRONT VIEW ---
    // Head & Neck
    { id: 'head', name: 'Head', view: 'front', type: 'ellipse', cx: 100, cy: 38, rx: 20, ry: 18 },
    { id: 'neck-front', name: 'Neck (Ant)', view: 'front', type: 'rect', x: 89, y: 58, w: 22, h: 14, rx: 5 },
    // Shoulders
    { id: 'l-shoulder-front', name: 'L. Shoulder', view: 'front', type: 'ellipse', cx: 64, cy: 84, rx: 12, ry: 8 },
    { id: 'r-shoulder-front', name: 'R. Shoulder', view: 'front', type: 'ellipse', cx: 136, cy: 84, rx: 12, ry: 8 },
    // Chest
    { id: 'chest', name: 'Chest', view: 'front', type: 'rect', x: 76, y: 78, w: 48, h: 28, rx: 4 },
    // Upper Arms
    { id: 'l-upper-arm', name: 'L. Upper Arm', view: 'front', type: 'rect', x: 38, y: 92, w: 14, h: 28, rx: 6 },
    { id: 'r-upper-arm', name: 'R. Upper Arm', view: 'front', type: 'rect', x: 148, y: 92, w: 14, h: 28, rx: 6 },
    // Elbows
    { id: 'l-elbow', name: 'L. Elbow', view: 'front', type: 'ellipse', cx: 44, cy: 126, rx: 8, ry: 6 },
    { id: 'r-elbow', name: 'R. Elbow', view: 'front', type: 'ellipse', cx: 156, cy: 126, rx: 8, ry: 6 },
    // Forearms
    { id: 'l-forearm', name: 'L. Forearm', view: 'front', type: 'rect', x: 38, y: 132, w: 12, h: 22, rx: 5 },
    { id: 'r-forearm', name: 'R. Forearm', view: 'front', type: 'rect', x: 150, y: 132, w: 12, h: 22, rx: 5 },
    // Wrists & Hands
    { id: 'l-wrist-hand', name: 'L. Wrist/Hand', view: 'front', type: 'ellipse', cx: 46, cy: 160, rx: 8, ry: 8 },
    { id: 'r-wrist-hand', name: 'R. Wrist/Hand', view: 'front', type: 'ellipse', cx: 154, cy: 160, rx: 8, ry: 8 },
    // Abdomen
    { id: 'abdomen', name: 'Abdomen', view: 'front', type: 'rect', x: 78, y: 108, w: 44, h: 24, rx: 4 },
    // Groin/Pelvis
    { id: 'groin', name: 'Groin/Pelvis', view: 'front', type: 'rect', x: 78, y: 134, w: 44, h: 18, rx: 4 },
    // Hips
    { id: 'l-hip', name: 'L. Hip', view: 'front', type: 'ellipse', cx: 82, cy: 170, rx: 12, ry: 10 },
    { id: 'r-hip', name: 'R. Hip', view: 'front', type: 'ellipse', cx: 118, cy: 170, rx: 12, ry: 10 },
    // Thighs
    { id: 'l-thigh', name: 'L. Thigh', view: 'front', type: 'rect', x: 72, y: 184, w: 18, h: 44, rx: 6 },
    { id: 'r-thigh', name: 'R. Thigh', view: 'front', type: 'rect', x: 110, y: 184, w: 18, h: 44, rx: 6 },
    // Knees
    { id: 'l-knee', name: 'L. Knee', view: 'front', type: 'ellipse', cx: 82, cy: 238, rx: 10, ry: 10 },
    { id: 'r-knee', name: 'R. Knee', view: 'front', type: 'ellipse', cx: 118, cy: 238, rx: 10, ry: 10 },
    // Shins/Calves
    { id: 'l-shin', name: 'L. Shin', view: 'front', type: 'rect', x: 72, y: 252, w: 16, h: 50, rx: 6 },
    { id: 'r-shin', name: 'R. Shin', view: 'front', type: 'rect', x: 112, y: 252, w: 16, h: 50, rx: 6 },
    // Ankles
    { id: 'l-ankle', name: 'L. Ankle', view: 'front', type: 'ellipse', cx: 80, cy: 312, rx: 8, ry: 8 },
    { id: 'r-ankle', name: 'R. Ankle', view: 'front', type: 'ellipse', cx: 120, cy: 312, rx: 8, ry: 8 },
    // Feet
    { id: 'l-foot', name: 'L. Foot', view: 'front', type: 'ellipse', cx: 80, cy: 336, rx: 10, ry: 16 },
    { id: 'r-foot', name: 'R. Foot', view: 'front', type: 'ellipse', cx: 120, cy: 336, rx: 10, ry: 16 },

    // --- BACK VIEW ---
    { id: 'neck-back', name: 'Neck (Post)', view: 'back', type: 'rect', x: 89, y: 58, w: 22, h: 14, rx: 5 },
    { id: 'l-shoulder-back', name: 'L. Shoulder', view: 'back', type: 'ellipse', cx: 64, cy: 84, rx: 12, ry: 8 },
    { id: 'r-shoulder-back', name: 'R. Shoulder', view: 'back', type: 'ellipse', cx: 136, cy: 84, rx: 12, ry: 8 },
    // Scapulae
    { id: 'l-scapula', name: 'L. Scapula', view: 'back', type: 'rect', x: 72, y: 80, w: 18, h: 24, rx: 4 },
    { id: 'r-scapula', name: 'R. Scapula', view: 'back', type: 'rect', x: 110, y: 80, w: 18, h: 24, rx: 4 },
    // Thoracic Spine
    { id: 'thoracic', name: 'Thoracic Spine', view: 'back', type: 'rect', x: 92, y: 78, w: 16, h: 36, rx: 4 },
    // Upper Arms back
    { id: 'l-upper-arm-back', name: 'L. Upper Arm', view: 'back', type: 'rect', x: 38, y: 92, w: 14, h: 28, rx: 6 },
    { id: 'r-upper-arm-back', name: 'R. Upper Arm', view: 'back', type: 'rect', x: 148, y: 92, w: 14, h: 28, rx: 6 },
    // Lumbar Spine
    { id: 'lumbar', name: 'Lumbar Spine', view: 'back', type: 'rect', x: 90, y: 116, w: 20, h: 26, rx: 4 },
    // SIJ / Sacrum
    { id: 'sacrum-sij', name: 'Sacrum/SIJ', view: 'back', type: 'rect', x: 86, y: 144, w: 28, h: 16, rx: 4 },
    // Gluteals
    { id: 'l-gluteal', name: 'L. Gluteal', view: 'back', type: 'ellipse', cx: 84, cy: 172, rx: 14, ry: 10 },
    { id: 'r-gluteal', name: 'R. Gluteal', view: 'back', type: 'ellipse', cx: 116, cy: 172, rx: 14, ry: 10 },
    // Hamstrings
    { id: 'l-hamstring', name: 'L. Hamstring', view: 'back', type: 'rect', x: 72, y: 184, w: 18, h: 44, rx: 6 },
    { id: 'r-hamstring', name: 'R. Hamstring', view: 'back', type: 'rect', x: 110, y: 184, w: 18, h: 44, rx: 6 },
    // Back of Knee
    { id: 'l-popliteal', name: 'L. Popliteal', view: 'back', type: 'ellipse', cx: 82, cy: 238, rx: 10, ry: 8 },
    { id: 'r-popliteal', name: 'R. Popliteal', view: 'back', type: 'ellipse', cx: 118, cy: 238, rx: 10, ry: 8 },
    // Calves
    { id: 'l-calf', name: 'L. Calf', view: 'back', type: 'rect', x: 72, y: 252, w: 16, h: 50, rx: 6 },
    { id: 'r-calf', name: 'R. Calf', view: 'back', type: 'rect', x: 112, y: 252, w: 16, h: 50, rx: 6 },
    // Achilles
    { id: 'l-achilles', name: 'L. Achilles', view: 'back', type: 'ellipse', cx: 80, cy: 316, rx: 6, ry: 12 },
    { id: 'r-achilles', name: 'R. Achilles', view: 'back', type: 'ellipse', cx: 120, cy: 316, rx: 6, ry: 12 },
    // Heel
    { id: 'l-heel', name: 'L. Heel', view: 'back', type: 'ellipse', cx: 80, cy: 340, rx: 10, ry: 12 },
    { id: 'r-heel', name: 'R. Heel', view: 'back', type: 'ellipse', cx: 120, cy: 340, rx: 10, ry: 12 }
  ];

  var REGION_COLORS = {
    'head': '#3b82f6', 'neck-front': '#6366f1', 'neck-back': '#6366f1',
    'l-shoulder-front': '#f59e0b', 'r-shoulder-front': '#f59e0b',
    'l-shoulder-back': '#f59e0b', 'r-shoulder-back': '#f59e0b',
    'chest': '#06b6d4',
    'l-upper-arm': '#8b5cf6', 'r-upper-arm': '#8b5cf6',
    'l-upper-arm-back': '#8b5cf6', 'r-upper-arm-back': '#8b5cf6',
    'l-elbow': '#a855f7', 'r-elbow': '#a855f7',
    'l-forearm': '#7c3aed', 'r-forearm': '#7c3aed',
    'l-wrist-hand': '#ec4899', 'r-wrist-hand': '#ec4899',
    'abdomen': '#22c55e', 'groin': '#10b981',
    'l-scapula': '#14b8a6', 'r-scapula': '#14b8a6',
    'thoracic': '#0ea5e9', 'lumbar': '#ef4444', 'sacrum-sij': '#f97316',
    'l-hip': '#f97316', 'r-hip': '#f97316',
    'l-gluteal': '#d946ef', 'r-gluteal': '#d946ef',
    'l-thigh': '#0d9488', 'r-thigh': '#0d9488',
    'l-hamstring': '#0d9488', 'r-hamstring': '#0d9488',
    'l-knee': '#0891b2', 'r-knee': '#0891b2',
    'l-popliteal': '#0891b2', 'r-popliteal': '#0891b2',
    'l-shin': '#059669', 'r-shin': '#059669',
    'l-calf': '#059669', 'r-calf': '#059669',
    'l-ankle': '#64748b', 'r-ankle': '#64748b',
    'l-achilles': '#64748b', 'r-achilles': '#64748b',
    'l-foot': '#475569', 'r-foot': '#475569',
    'l-heel': '#475569', 'r-heel': '#475569'
  };

  // Label offset rules to avoid overlapping with body
  function getLabelPos(r) {
    var lx = r.cx || (r.x + r.w / 2);
    var ly = r.cy || (r.y + r.h / 2);
    // Push left-side labels further left, right-side further right
    if (r.id.indexOf('l-shoulder') === 0 || r.id.indexOf('l-scapula') === 0) lx -= 16;
    if (r.id.indexOf('r-shoulder') === 0 || r.id.indexOf('r-scapula') === 0) lx += 16;
    if (r.id.indexOf('l-upper-arm') === 0) { lx -= 18; }
    if (r.id.indexOf('r-upper-arm') === 0) { lx += 18; }
    if (r.id.indexOf('l-elbow') === 0) lx -= 14;
    if (r.id.indexOf('r-elbow') === 0) lx += 14;
    if (r.id.indexOf('l-forearm') === 0) lx -= 16;
    if (r.id.indexOf('r-forearm') === 0) lx += 16;
    if (r.id.indexOf('l-wrist') === 0) lx -= 14;
    if (r.id.indexOf('r-wrist') === 0) lx += 14;
    if (r.id.indexOf('l-hip') === 0 || r.id.indexOf('l-gluteal') === 0) lx -= 12;
    if (r.id.indexOf('r-hip') === 0 || r.id.indexOf('r-gluteal') === 0) lx += 12;
    if (r.id.indexOf('l-knee') === 0 || r.id.indexOf('l-popliteal') === 0) lx -= 14;
    if (r.id.indexOf('r-knee') === 0 || r.id.indexOf('r-popliteal') === 0) lx += 14;
    if (r.id.indexOf('l-ankle') === 0 || r.id.indexOf('l-achilles') === 0) lx -= 14;
    if (r.id.indexOf('r-ankle') === 0 || r.id.indexOf('r-achilles') === 0) lx += 14;
    if (r.id.indexOf('l-foot') === 0 || r.id.indexOf('l-heel') === 0) lx -= 16;
    if (r.id.indexOf('r-foot') === 0 || r.id.indexOf('r-heel') === 0) lx += 16;
    if (r.id.indexOf('l-shin') === 0 || r.id.indexOf('l-calf') === 0) lx -= 18;
    if (r.id.indexOf('r-shin') === 0 || r.id.indexOf('r-calf') === 0) lx += 18;
    if (r.id.indexOf('l-thigh') === 0 || r.id.indexOf('l-hamstring') === 0) lx -= 18;
    if (r.id.indexOf('r-thigh') === 0 || r.id.indexOf('r-hamstring') === 0) lx += 18;
    return { x: lx, y: ly + 2 };
  }

  function renderSingleView(viewType, selected, readOnly) {
    var bodyPath = viewType === 'front' ? FRONT_BODY : BACK_BODY;
    selected = selected || [];

    var svg = '<svg viewBox="0 0 200 360" class="body-diagram-svg" xmlns="http://www.w3.org/2000/svg">';

    // Gradient background for body
    svg += '<defs>';
    svg += '<linearGradient id="bodyGrad' + viewType + '" x1="0" y1="0" x2="0" y2="1">';
    svg += '<stop offset="0%" stop-color="#f8fafc"/>';
    svg += '<stop offset="100%" stop-color="#e2e8f0"/>';
    svg += '</linearGradient>';
    svg += '<filter id="bodyShadow' + viewType + '"><feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.08"/></filter>';
    svg += '</defs>';

    // Body silhouette with shadow
    svg += '<path d="' + bodyPath + '" fill="url(#bodyGrad' + viewType + ')" stroke="#cbd5e1" stroke-width="1" filter="url(#bodyShadow' + viewType + ')"/>';

    // Spine line for back view
    if (viewType === 'back') {
      svg += '<line x1="100" y1="64" x2="100" y2="160" stroke="#e2e8f0" stroke-width="1.5" stroke-dasharray="2,3"/>';
    }

    // Draw regions for this view
    var viewRegions = [];
    for (var i = 0; i < REGIONS.length; i++) {
      if (REGIONS[i].view === viewType) viewRegions.push(REGIONS[i]);
    }

    for (var j = 0; j < viewRegions.length; j++) {
      var r = viewRegions[j];
      var isSelected = selected.indexOf(r.id) !== -1;
      var color = REGION_COLORS[r.id] || '#6b7280';
      var cursor = readOnly ? 'default' : 'pointer';

      svg += '<g class="body-region' + (isSelected ? ' selected' : '') + '" data-region="' + r.id + '" style="cursor:' + cursor + ';">';

      if (isSelected) {
        // Selected: colored fill with glow
        if (r.type === 'ellipse') {
          svg += '<ellipse cx="' + r.cx + '" cy="' + r.cy + '" rx="' + (r.rx + 2) + '" ry="' + (r.ry + 2) + '" fill="' + color + '" fill-opacity="0.15" stroke="none"/>';
          svg += '<ellipse cx="' + r.cx + '" cy="' + r.cy + '" rx="' + r.rx + '" ry="' + r.ry + '" fill="' + color + '" fill-opacity="0.35" stroke="' + color + '" stroke-width="1.5"/>';
        } else {
          svg += '<rect x="' + (r.x - 1) + '" y="' + (r.y - 1) + '" width="' + (r.w + 2) + '" height="' + (r.h + 2) + '" rx="' + (r.rx + 1) + '" fill="' + color + '" fill-opacity="0.15" stroke="none"/>';
          svg += '<rect x="' + r.x + '" y="' + r.y + '" width="' + r.w + '" height="' + r.h + '" rx="' + r.rx + '" fill="' + color + '" fill-opacity="0.35" stroke="' + color + '" stroke-width="1.5"/>';
        }
      } else {
        // Unselected: subtle outline
        if (r.type === 'ellipse') {
          svg += '<ellipse cx="' + r.cx + '" cy="' + r.cy + '" rx="' + r.rx + '" ry="' + r.ry + '" fill="rgba(0,0,0,0.02)" stroke="rgba(0,0,0,0.1)" stroke-width="0.7" stroke-dasharray="2,2"/>';
        } else {
          svg += '<rect x="' + r.x + '" y="' + r.y + '" width="' + r.w + '" height="' + r.h + '" rx="' + r.rx + '" fill="rgba(0,0,0,0.02)" stroke="rgba(0,0,0,0.1)" stroke-width="0.7" stroke-dasharray="2,2"/>';
        }
      }

      // Label
      var pos = getLabelPos(r);
      var textColor = isSelected ? color : '#a1a1aa';
      var fontWeight = isSelected ? '700' : '400';
      svg += '<text x="' + pos.x + '" y="' + pos.y + '" text-anchor="middle" font-size="5.5" fill="' + textColor + '" font-weight="' + fontWeight + '" style="pointer-events:none;">' + r.name + '</text>';

      svg += '</g>';
    }

    svg += '</svg>';
    return svg;
  }

  function renderHtml(selected, options) {
    options = options || {};
    selected = selected || [];

    var html = '<div class="body-diagram-dual">';
    html += '<div class="body-diagram-panel">';
    html += '<div class="body-diagram-label">ANTERIOR (Front)</div>';
    html += renderSingleView('front', selected, options.readOnly);
    html += '</div>';
    html += '<div class="body-diagram-divider"></div>';
    html += '<div class="body-diagram-panel">';
    html += '<div class="body-diagram-label">POSTERIOR (Back)</div>';
    html += renderSingleView('back', selected, options.readOnly);
    html += '</div>';
    html += '</div>';

    return html;
  }

  function render(containerId, selected, options) {
    var container = document.getElementById(containerId);
    if (!container) return;
    options = options || {};
    container.innerHTML = renderHtml(selected, options);
    if (options.readOnly) return;

    // Bind click events on all regions
    var regions = container.querySelectorAll('.body-region');
    for (var i = 0; i < regions.length; i++) {
      regions[i].addEventListener('click', function() {
        var regionId = this.getAttribute('data-region');
        var idx = selected.indexOf(regionId);
        if (idx !== -1) {
          selected.splice(idx, 1);
        } else {
          selected.push(regionId);
        }
        render(containerId, selected, options);
        if (options.onToggle) options.onToggle(selected);
      });
    }
  }

  function getSelected(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return [];
    var result = [];
    var selectedEls = container.querySelectorAll('.body-region.selected');
    for (var i = 0; i < selectedEls.length; i++) {
      result.push(selectedEls[i].getAttribute('data-region'));
    }
    return result;
  }

  function getRegionName(id) {
    for (var i = 0; i < REGIONS.length; i++) {
      if (REGIONS[i].id === id) return REGIONS[i].name;
    }
    return id;
  }

  function getRegionColor(id) {
    return REGION_COLORS[id] || '#6b7280';
  }

  function renderBadges(regionIds) {
    if (!regionIds || regionIds.length === 0) return '';
    var html = '';
    for (var i = 0; i < regionIds.length; i++) {
      var name = getRegionName(regionIds[i]);
      var color = getRegionColor(regionIds[i]);
      html += '<span class="tag-badge" style="background:' + color + ';">' + name + '</span>';
    }
    return html;
  }

  return {
    render: render,
    renderHtml: renderHtml,
    getSelected: getSelected,
    getRegionName: getRegionName,
    getRegionColor: getRegionColor,
    renderBadges: renderBadges
  };
})();
