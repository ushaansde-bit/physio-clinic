/* ============================================
   Body Diagram - Dual Mode: Body + Skeleton
   Front + Back with mode toggle
   ============================================ */
window.BodyDiagram = (function() {

  var _viewMode = 'skeleton'; // 'body' or 'skeleton'

  // Body silhouette path
  var BODY_PATH = 'M100,18 C84,18 76,28 76,40 C76,52 84,60 92,64 L90,72 ' +
    'L56,82 C46,85 40,94 42,104 L38,148 C36,156 40,162 46,160 L52,156 L54,130 L60,102 L72,86 ' +
    'L70,180 L68,216 L70,260 L66,308 C64,334 64,358 68,378 L72,388 C76,394 84,396 90,392 ' +
    'L98,392 C100,388 100,376 98,362 L92,330 L90,292 L92,254 L96,222 ' +
    'L100,204 ' +
    'L104,222 L108,254 L110,292 L108,330 L102,362 C100,376 100,388 102,392 ' +
    'L110,392 C116,396 124,394 128,388 L132,378 C136,358 136,334 134,308 ' +
    'L130,260 L132,216 L130,180 ' +
    'L128,86 L140,102 L146,130 L148,156 L154,160 C160,162 164,156 162,148 L158,104 C160,94 154,85 144,82 ' +
    'L108,72 L108,64 C116,60 124,52 124,40 C124,28 116,18 100,18 Z';

  // ==================== SKELETON SVG PATHS ====================
  var SKELETON_FRONT = {
    // Skull
    skull: 'M100,18 C86,18 78,26 78,38 C78,50 86,58 100,58 C114,58 122,50 122,38 C122,26 114,18 100,18 Z',
    skullDetail: 'M90,34 Q92,30 96,32 M104,32 Q108,30 110,34 M97,42 L100,46 L103,42 M93,50 Q100,54 107,50',
    jaw: 'M84,46 Q86,56 100,60 Q114,56 116,46',
    // Spine - Cervical
    c1: 'M96,62 L104,62 L104,66 L96,66 Z',
    c2: 'M95,66 L105,66 L105,70 L95,70 Z',
    c3: 'M95,70 L105,70 L105,74 L95,74 Z',
    // Clavicles
    clavL: 'M94,76 Q80,72 62,78',
    clavR: 'M106,76 Q120,72 138,78',
    // Ribs (simplified)
    ribs: 'M88,80 Q76,82 74,92 M112,80 Q124,82 126,92 ' +
      'M88,84 Q78,86 76,96 M112,84 Q122,86 124,96 ' +
      'M88,88 Q80,90 78,100 M112,88 Q120,90 122,100 ' +
      'M88,92 Q82,94 80,104 M112,92 Q118,94 120,104 ' +
      'M90,96 Q84,98 82,106 M110,96 Q116,98 118,106',
    sternum: 'M98,76 L102,76 L102,108 L100,112 L98,108 Z',
    // Thoracic spine
    t1: 'M96,76 L104,76 L104,80 L96,80 Z',
    t6: 'M95,80 L105,80 L105,84 L95,84 Z',
    t7: 'M95,84 L105,84 L105,88 L95,88 Z',
    t8: 'M95,88 L105,88 L105,92 L95,92 Z',
    t9: 'M95,92 L105,92 L105,96 L95,96 Z',
    t10: 'M95,96 L105,96 L105,100 L95,100 Z',
    t11: 'M95,100 L105,100 L105,104 L95,104 Z',
    t12: 'M95,104 L105,104 L105,108 L95,108 Z',
    // Lumbar spine
    l1: 'M94,110 L106,110 L106,116 L94,116 Z',
    l2: 'M94,116 L106,116 L106,122 L94,122 Z',
    l3: 'M94,122 L106,122 L106,128 L94,128 Z',
    l4: 'M94,128 L106,128 L106,134 L94,134 Z',
    l5: 'M94,134 L106,134 L106,140 L94,140 Z',
    // Sacrum
    sacrum: 'M92,140 L108,140 L106,158 L100,162 L94,158 Z',
    // Pelvis
    pelvisL: 'M92,132 Q78,130 72,148 Q70,158 76,168 Q82,174 92,168 Q94,158 92,140',
    pelvisR: 'M108,132 Q122,130 128,148 Q130,158 124,168 Q118,174 108,168 Q106,158 108,140',
    // Scapulae (front glimpse)
    scapL: 'M72,80 Q68,90 72,100',
    scapR: 'M128,80 Q132,90 128,100',
    // Humerus (upper arm bone)
    humerusL: 'M60,82 L56,86 L44,122 L48,124 L62,88',
    humerusR: 'M140,82 L144,86 L156,122 L152,124 L138,88',
    // Radius/Ulna
    radiusL: 'M44,126 L40,152 M48,126 L46,152',
    radiusR: 'M156,126 L160,152 M152,126 L154,152',
    // Hand bones
    handL: 'M40,154 L38,164 M42,154 L42,166 M44,154 L46,166 M46,154 L50,164 M44,154 L48,156',
    handR: 'M160,154 L162,164 M158,154 L158,166 M156,154 L154,166 M154,154 L150,164 M156,154 L152,156',
    // Femur
    femurL: 'M82,172 L80,176 L78,230 L82,232 L86,176',
    femurR: 'M118,172 L120,176 L122,230 L118,232 L114,176',
    // Patella
    patellaL: 'M78,232 Q80,228 84,232 Q82,238 78,232',
    patellaR: 'M116,232 Q118,228 122,232 Q120,238 116,232',
    // Tibia/Fibula
    tibiaL: 'M78,240 L76,304 M82,240 L80,304',
    tibiaR: 'M118,240 L120,304 M122,240 L124,304',
    // Foot bones
    footL: 'M74,306 L70,340 Q74,354 86,354 Q90,346 88,330 L84,306',
    footR: 'M116,306 L112,330 Q110,346 114,354 Q126,354 130,340 L126,306'
  };

  var SKELETON_BACK = {
    skull: SKELETON_FRONT.skull,
    skullBack: 'M84,30 Q100,22 116,30',
    c1: 'M96,62 L104,62 L104,66 L96,66 Z',
    c2: 'M95,66 L105,66 L105,70 L95,70 Z',
    c3: 'M95,70 L105,70 L105,74 L95,74 Z',
    // Full spine visible from back
    spineLine: 'M100,62 L100,160',
    spineProc: 'M97,64 L103,64 M97,68 L103,68 M97,72 L103,72 ' +
      'M96,78 L104,78 M96,82 L104,82 M96,86 L104,86 M96,90 L104,90 M96,94 L104,94 M96,98 L104,98 M96,102 L104,102 M96,106 L104,106 ' +
      'M95,112 L105,112 M95,118 L105,118 M95,124 L105,124 M95,130 L105,130 M95,136 L105,136',
    // Scapulae (full from back)
    scapulaL: 'M72,78 L90,82 L86,106 L72,102 Z',
    scapulaR: 'M128,78 L110,82 L114,106 L128,102 Z',
    scapSpineL: 'M72,84 L88,88',
    scapSpineR: 'M128,84 L112,88',
    // Ribs from back
    ribsBack: 'M94,80 Q80,82 76,92 M106,80 Q120,82 124,92 ' +
      'M94,86 Q82,88 78,98 M106,86 Q118,88 122,98 ' +
      'M94,92 Q84,94 80,104 M106,92 Q116,94 120,104',
    sacrum: SKELETON_FRONT.sacrum,
    pelvisL: SKELETON_FRONT.pelvisL,
    pelvisR: SKELETON_FRONT.pelvisR,
    humerusL: SKELETON_FRONT.humerusL,
    humerusR: SKELETON_FRONT.humerusR,
    radiusL: SKELETON_FRONT.radiusL,
    radiusR: SKELETON_FRONT.radiusR,
    handL: SKELETON_FRONT.handL,
    handR: SKELETON_FRONT.handR,
    femurL: SKELETON_FRONT.femurL,
    femurR: SKELETON_FRONT.femurR,
    tibiaL: SKELETON_FRONT.tibiaL,
    tibiaR: SKELETON_FRONT.tibiaR,
    footL: SKELETON_FRONT.footL,
    footR: SKELETON_FRONT.footR
  };

  // Body detail lines
  var FRONT_DETAILS = [
    'M82,82 Q90,90 100,88 Q110,90 118,82',
    'M90,110 L90,148', 'M110,110 L110,148',
    'M90,118 L110,118', 'M90,128 L110,128', 'M90,138 L110,138',
    'M72,78 Q64,82 58,90', 'M128,78 Q136,82 142,90',
    'M88,180 L86,224', 'M112,180 L114,224',
    'M78,234 Q82,228 86,234', 'M114,234 Q118,228 122,234',
    'M80,258 L80,300', 'M120,258 L120,300'
  ];

  var BACK_DETAILS = [
    'M100,64 L100,156',
    'M98,72 L102,72', 'M98,82 L102,82', 'M98,92 L102,92',
    'M98,102 L102,102', 'M98,112 L102,112', 'M98,122 L102,122',
    'M98,132 L102,132', 'M98,142 L102,142',
    'M78,82 Q86,96 78,102', 'M122,82 Q114,96 122,102',
    'M88,64 Q100,74 112,64',
    'M86,164 Q100,178 114,164',
    'M82,188 L82,230', 'M118,188 L118,230',
    'M80,256 Q78,276 80,300', 'M120,256 Q122,276 120,300'
  ];

  // Clickable regions
  var REGIONS = [
    // --- FRONT VIEW ---
    { id: 'head', name: 'Head', view: 'front', type: 'ellipse', cx: 100, cy: 38, rx: 20, ry: 18 },
    { id: 'neck-front', name: 'Neck (Ant)', view: 'front', type: 'rect', x: 89, y: 58, w: 22, h: 14, rx: 5 },
    { id: 'l-shoulder-front', name: 'L. Shoulder', view: 'front', type: 'ellipse', cx: 64, cy: 84, rx: 12, ry: 8 },
    { id: 'r-shoulder-front', name: 'R. Shoulder', view: 'front', type: 'ellipse', cx: 136, cy: 84, rx: 12, ry: 8 },
    { id: 'chest', name: 'Chest', view: 'front', type: 'rect', x: 76, y: 78, w: 48, h: 28, rx: 4 },
    { id: 'l-upper-arm', name: 'L. Upper Arm', view: 'front', type: 'rect', x: 38, y: 92, w: 14, h: 28, rx: 6 },
    { id: 'r-upper-arm', name: 'R. Upper Arm', view: 'front', type: 'rect', x: 148, y: 92, w: 14, h: 28, rx: 6 },
    { id: 'l-elbow', name: 'L. Elbow', view: 'front', type: 'ellipse', cx: 44, cy: 126, rx: 8, ry: 6 },
    { id: 'r-elbow', name: 'R. Elbow', view: 'front', type: 'ellipse', cx: 156, cy: 126, rx: 8, ry: 6 },
    { id: 'l-forearm', name: 'L. Forearm', view: 'front', type: 'rect', x: 38, y: 132, w: 12, h: 22, rx: 5 },
    { id: 'r-forearm', name: 'R. Forearm', view: 'front', type: 'rect', x: 150, y: 132, w: 12, h: 22, rx: 5 },
    { id: 'l-wrist-hand', name: 'L. Wrist/Hand', view: 'front', type: 'ellipse', cx: 46, cy: 160, rx: 8, ry: 8 },
    { id: 'r-wrist-hand', name: 'R. Wrist/Hand', view: 'front', type: 'ellipse', cx: 154, cy: 160, rx: 8, ry: 8 },
    { id: 'abdomen', name: 'Abdomen', view: 'front', type: 'rect', x: 78, y: 108, w: 44, h: 24, rx: 4 },
    { id: 'groin', name: 'Groin/Pelvis', view: 'front', type: 'rect', x: 78, y: 134, w: 44, h: 18, rx: 4 },
    { id: 'l-hip', name: 'L. Hip', view: 'front', type: 'ellipse', cx: 82, cy: 170, rx: 12, ry: 10 },
    { id: 'r-hip', name: 'R. Hip', view: 'front', type: 'ellipse', cx: 118, cy: 170, rx: 12, ry: 10 },
    { id: 'l-thigh', name: 'L. Thigh', view: 'front', type: 'rect', x: 72, y: 184, w: 18, h: 44, rx: 6 },
    { id: 'r-thigh', name: 'R. Thigh', view: 'front', type: 'rect', x: 110, y: 184, w: 18, h: 44, rx: 6 },
    { id: 'l-knee', name: 'L. Knee', view: 'front', type: 'ellipse', cx: 82, cy: 238, rx: 10, ry: 10 },
    { id: 'r-knee', name: 'R. Knee', view: 'front', type: 'ellipse', cx: 118, cy: 238, rx: 10, ry: 10 },
    { id: 'l-shin', name: 'L. Shin', view: 'front', type: 'rect', x: 72, y: 252, w: 16, h: 50, rx: 6 },
    { id: 'r-shin', name: 'R. Shin', view: 'front', type: 'rect', x: 112, y: 252, w: 16, h: 50, rx: 6 },
    { id: 'l-ankle', name: 'L. Ankle', view: 'front', type: 'ellipse', cx: 80, cy: 312, rx: 8, ry: 8 },
    { id: 'r-ankle', name: 'R. Ankle', view: 'front', type: 'ellipse', cx: 120, cy: 312, rx: 8, ry: 8 },
    { id: 'l-foot', name: 'L. Foot', view: 'front', type: 'ellipse', cx: 80, cy: 336, rx: 10, ry: 16 },
    { id: 'r-foot', name: 'R. Foot', view: 'front', type: 'ellipse', cx: 120, cy: 336, rx: 10, ry: 16 },

    // --- BACK VIEW ---
    { id: 'neck-back', name: 'Neck (Post)', view: 'back', type: 'rect', x: 89, y: 58, w: 22, h: 14, rx: 5 },
    { id: 'l-shoulder-back', name: 'L. Shoulder', view: 'back', type: 'ellipse', cx: 64, cy: 84, rx: 12, ry: 8 },
    { id: 'r-shoulder-back', name: 'R. Shoulder', view: 'back', type: 'ellipse', cx: 136, cy: 84, rx: 12, ry: 8 },
    { id: 'l-scapula', name: 'L. Scapula', view: 'back', type: 'rect', x: 72, y: 80, w: 18, h: 24, rx: 4 },
    { id: 'r-scapula', name: 'R. Scapula', view: 'back', type: 'rect', x: 110, y: 80, w: 18, h: 24, rx: 4 },
    { id: 'thoracic', name: 'Thoracic Spine', view: 'back', type: 'rect', x: 92, y: 78, w: 16, h: 36, rx: 4 },
    { id: 'l-upper-arm-back', name: 'L. Upper Arm', view: 'back', type: 'rect', x: 38, y: 92, w: 14, h: 28, rx: 6 },
    { id: 'r-upper-arm-back', name: 'R. Upper Arm', view: 'back', type: 'rect', x: 148, y: 92, w: 14, h: 28, rx: 6 },
    { id: 'lumbar', name: 'Lumbar Spine', view: 'back', type: 'rect', x: 90, y: 116, w: 20, h: 26, rx: 4 },
    { id: 'sacrum-sij', name: 'Sacrum/SIJ', view: 'back', type: 'rect', x: 86, y: 144, w: 28, h: 16, rx: 4 },
    { id: 'l-gluteal', name: 'L. Gluteal', view: 'back', type: 'ellipse', cx: 84, cy: 172, rx: 14, ry: 10 },
    { id: 'r-gluteal', name: 'R. Gluteal', view: 'back', type: 'ellipse', cx: 116, cy: 172, rx: 14, ry: 10 },
    { id: 'l-hamstring', name: 'L. Hamstring', view: 'back', type: 'rect', x: 72, y: 184, w: 18, h: 44, rx: 6 },
    { id: 'r-hamstring', name: 'R. Hamstring', view: 'back', type: 'rect', x: 110, y: 184, w: 18, h: 44, rx: 6 },
    { id: 'l-popliteal', name: 'L. Popliteal', view: 'back', type: 'ellipse', cx: 82, cy: 238, rx: 10, ry: 8 },
    { id: 'r-popliteal', name: 'R. Popliteal', view: 'back', type: 'ellipse', cx: 118, cy: 238, rx: 10, ry: 8 },
    { id: 'l-calf', name: 'L. Calf', view: 'back', type: 'rect', x: 72, y: 252, w: 16, h: 50, rx: 6 },
    { id: 'r-calf', name: 'R. Calf', view: 'back', type: 'rect', x: 112, y: 252, w: 16, h: 50, rx: 6 },
    { id: 'l-achilles', name: 'L. Achilles', view: 'back', type: 'ellipse', cx: 80, cy: 316, rx: 6, ry: 12 },
    { id: 'r-achilles', name: 'R. Achilles', view: 'back', type: 'ellipse', cx: 120, cy: 316, rx: 6, ry: 12 },
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

  function getLabelPos(r) {
    var lx = r.cx || (r.x + r.w / 2);
    var ly = r.cy || (r.y + r.h / 2);
    if (r.id.indexOf('l-shoulder') === 0 || r.id.indexOf('l-scapula') === 0) lx -= 16;
    if (r.id.indexOf('r-shoulder') === 0 || r.id.indexOf('r-scapula') === 0) lx += 16;
    if (r.id.indexOf('l-upper-arm') === 0) lx -= 18;
    if (r.id.indexOf('r-upper-arm') === 0) lx += 18;
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

  // ==================== RENDER BODY MODE ====================
  function renderBodyView(viewType, selected, readOnly) {
    var detailLines = viewType === 'front' ? FRONT_DETAILS : BACK_DETAILS;
    selected = selected || [];

    var svg = '<svg viewBox="0 0 200 400" class="body-diagram-svg" xmlns="http://www.w3.org/2000/svg">';
    svg += '<defs>';
    svg += '<linearGradient id="skinGrad' + viewType + '" x1="0.3" y1="0" x2="0.8" y2="1">';
    svg += '<stop offset="0%" stop-color="#fde8d0"/><stop offset="30%" stop-color="#f5d5b8"/>';
    svg += '<stop offset="70%" stop-color="#e8c4a0"/><stop offset="100%" stop-color="#d4a97a"/>';
    svg += '</linearGradient>';
    svg += '<filter id="bShadow' + viewType + '"><feDropShadow dx="2" dy="3" stdDeviation="4" flood-color="#000" flood-opacity="0.15"/></filter>';
    svg += '<filter id="selGlow' + viewType + '"><feGaussianBlur stdDeviation="3" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
    svg += '<radialGradient id="bodyHi' + viewType + '" cx="0.4" cy="0.3" r="0.7"><stop offset="0%" stop-color="rgba(255,255,255,0.25)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/></radialGradient>';
    svg += '</defs>';

    svg += '<path d="' + BODY_PATH + '" fill="url(#skinGrad' + viewType + ')" stroke="#c9a07a" stroke-width="1.2" filter="url(#bShadow' + viewType + ')"/>';
    svg += '<path d="' + BODY_PATH + '" fill="url(#bodyHi' + viewType + ')" stroke="none"/>';

    for (var d = 0; d < detailLines.length; d++) {
      svg += '<path d="' + detailLines[d] + '" fill="none" stroke="#c49670" stroke-width="0.6" stroke-opacity="0.5"/>';
    }

    if (viewType === 'front') {
      svg += '<ellipse cx="93" cy="36" rx="3" ry="1.5" fill="none" stroke="#a08060" stroke-width="0.6"/>';
      svg += '<ellipse cx="107" cy="36" rx="3" ry="1.5" fill="none" stroke="#a08060" stroke-width="0.6"/>';
      svg += '<path d="M99,40 L100,43 L101,40" fill="none" stroke="#a08060" stroke-width="0.5"/>';
      svg += '<path d="M95,47 Q100,50 105,47" fill="none" stroke="#a08060" stroke-width="0.5"/>';
      svg += '<circle cx="100" cy="132" r="1.5" fill="none" stroke="#b89878" stroke-width="0.6"/>';
    }

    svg += renderRegions(viewType, selected, readOnly, 'selGlow');
    svg += '</svg>';
    return svg;
  }

  // ==================== RENDER SKELETON MODE ====================
  function renderSkeletonView(viewType, selected, readOnly) {
    selected = selected || [];
    var bones = viewType === 'front' ? SKELETON_FRONT : SKELETON_BACK;

    var svg = '<svg viewBox="0 0 200 400" class="body-diagram-svg" xmlns="http://www.w3.org/2000/svg">';
    svg += '<defs>';
    svg += '<linearGradient id="skelBg' + viewType + '" x1="0" y1="0" x2="0" y2="1">';
    svg += '<stop offset="0%" stop-color="#1e293b"/><stop offset="100%" stop-color="#0f172a"/>';
    svg += '</linearGradient>';
    svg += '<filter id="boneGlow' + viewType + '"><feGaussianBlur stdDeviation="1.5" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
    svg += '<filter id="selGlow' + viewType + '"><feGaussianBlur stdDeviation="3" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
    svg += '<linearGradient id="boneGrad' + viewType + '" x1="0" y1="0" x2="1" y2="1">';
    svg += '<stop offset="0%" stop-color="#f1f5f9"/><stop offset="50%" stop-color="#e2e8f0"/><stop offset="100%" stop-color="#cbd5e1"/>';
    svg += '</linearGradient>';
    svg += '</defs>';

    // Dark background body silhouette
    svg += '<path d="' + BODY_PATH + '" fill="url(#skelBg' + viewType + ')" stroke="#334155" stroke-width="1" opacity="0.9"/>';

    // Draw all bone paths
    var boneColor = '#e2e8f0';
    var boneStroke = '#94a3b8';
    for (var key in bones) {
      if (!bones.hasOwnProperty(key)) continue;
      var path = bones[key];
      // Filled shapes (skull, vertebrae, sacrum, pelvis, patella, feet)
      if (key.indexOf('skull') === 0 || key.indexOf('c1') === 0 || key.indexOf('c2') === 0 || key.indexOf('c3') === 0 ||
          key.indexOf('t') === 0 || key.indexOf('l') === 0 || key.indexOf('sacrum') === 0 ||
          key.indexOf('sternum') === 0 || key.indexOf('patella') === 0 ||
          key.indexOf('scapula') === 0 || key.indexOf('foot') === 0) {
        svg += '<path d="' + path + '" fill="url(#boneGrad' + viewType + ')" stroke="' + boneStroke + '" stroke-width="0.6" filter="url(#boneGlow' + viewType + ')"/>';
      } else {
        // Line/stroke-only bones (ribs, long bones, hands)
        svg += '<path d="' + path + '" fill="none" stroke="' + boneColor + '" stroke-width="1.2" stroke-linecap="round" filter="url(#boneGlow' + viewType + ')"/>';
      }
    }

    // Joint dots at key articulation points
    var joints = [
      // Shoulders
      { x: 62, y: 80 }, { x: 138, y: 80 },
      // Elbows
      { x: 46, y: 124 }, { x: 154, y: 124 },
      // Wrists
      { x: 42, y: 152 }, { x: 158, y: 152 },
      // Hips
      { x: 82, y: 168 }, { x: 118, y: 168 },
      // Knees
      { x: 80, y: 234 }, { x: 120, y: 234 },
      // Ankles
      { x: 78, y: 306 }, { x: 122, y: 306 }
    ];
    for (var ji = 0; ji < joints.length; ji++) {
      svg += '<circle cx="' + joints[ji].x + '" cy="' + joints[ji].y + '" r="3" fill="#fbbf24" fill-opacity="0.6" stroke="#f59e0b" stroke-width="0.5"/>';
    }

    svg += renderRegions(viewType, selected, readOnly, 'selGlow');
    svg += '</svg>';
    return svg;
  }

  // ==================== SHARED: RENDER CLICKABLE REGIONS ====================
  function renderRegions(viewType, selected, readOnly, glowId) {
    var svg = '';
    var viewRegions = [];
    for (var i = 0; i < REGIONS.length; i++) {
      if (REGIONS[i].view === viewType) viewRegions.push(REGIONS[i]);
    }

    for (var j = 0; j < viewRegions.length; j++) {
      var r = viewRegions[j];
      var isSelected = selected.indexOf(r.id) !== -1;
      var color = REGION_COLORS[r.id] || '#6b7280';
      var cursor = readOnly ? 'default' : 'pointer';
      var isSkel = _viewMode === 'skeleton';

      svg += '<g class="body-region' + (isSelected ? ' selected' : '') + '" data-region="' + r.id + '" style="cursor:' + cursor + ';">';

      if (isSelected) {
        if (r.type === 'ellipse') {
          svg += '<ellipse cx="' + r.cx + '" cy="' + r.cy + '" rx="' + (r.rx + 4) + '" ry="' + (r.ry + 4) + '" fill="' + color + '" fill-opacity="0.12" stroke="none"/>';
          svg += '<ellipse cx="' + r.cx + '" cy="' + r.cy + '" rx="' + (r.rx + 2) + '" ry="' + (r.ry + 2) + '" fill="' + color + '" fill-opacity="0.2" stroke="none"/>';
          svg += '<ellipse cx="' + r.cx + '" cy="' + r.cy + '" rx="' + r.rx + '" ry="' + r.ry + '" fill="' + color + '" fill-opacity="0.45" stroke="' + color + '" stroke-width="2" filter="url(#' + glowId + viewType + ')"/>';
        } else {
          svg += '<rect x="' + (r.x - 3) + '" y="' + (r.y - 3) + '" width="' + (r.w + 6) + '" height="' + (r.h + 6) + '" rx="' + (r.rx + 2) + '" fill="' + color + '" fill-opacity="0.12" stroke="none"/>';
          svg += '<rect x="' + (r.x - 1) + '" y="' + (r.y - 1) + '" width="' + (r.w + 2) + '" height="' + (r.h + 2) + '" rx="' + (r.rx + 1) + '" fill="' + color + '" fill-opacity="0.2" stroke="none"/>';
          svg += '<rect x="' + r.x + '" y="' + r.y + '" width="' + r.w + '" height="' + r.h + '" rx="' + r.rx + '" fill="' + color + '" fill-opacity="0.45" stroke="' + color + '" stroke-width="2" filter="url(#' + glowId + viewType + ')"/>';
        }
      } else {
        var unselStroke = isSkel ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
        var unselFill = isSkel ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)';
        if (r.type === 'ellipse') {
          svg += '<ellipse cx="' + r.cx + '" cy="' + r.cy + '" rx="' + r.rx + '" ry="' + r.ry + '" fill="' + unselFill + '" stroke="' + unselStroke + '" stroke-width="0.5" stroke-dasharray="2,2"/>';
        } else {
          svg += '<rect x="' + r.x + '" y="' + r.y + '" width="' + r.w + '" height="' + r.h + '" rx="' + r.rx + '" fill="' + unselFill + '" stroke="' + unselStroke + '" stroke-width="0.5" stroke-dasharray="2,2"/>';
        }
      }

      // Label
      var pos = getLabelPos(r);
      if (isSelected) {
        svg += '<text x="' + pos.x + '" y="' + pos.y + '" text-anchor="middle" font-size="7" fill="#000" font-weight="800" stroke="#fff" stroke-width="2.5" paint-order="stroke" style="pointer-events:none;">' + r.name + '</text>';
      } else {
        var textColor = isSkel ? '#64748b' : '#9ca3af';
        svg += '<text x="' + pos.x + '" y="' + pos.y + '" text-anchor="middle" font-size="5" fill="' + textColor + '" font-weight="400" style="pointer-events:none;">' + r.name + '</text>';
      }

      svg += '</g>';
    }
    return svg;
  }

  // ==================== MAIN RENDER ====================
  function renderHtml(selected, options) {
    options = options || {};
    selected = selected || [];
    _viewMode = 'body';

    var html = '';
    html += '<div class="body-diagram-dual">';
    html += '<div class="body-diagram-panel">';
    html += '<div class="body-diagram-label">ANTERIOR (Front)</div>';
    html += renderBodyView('front', selected, options.readOnly);
    html += '</div>';
    html += '<div class="body-diagram-divider"></div>';
    html += '<div class="body-diagram-panel">';
    html += '<div class="body-diagram-label">POSTERIOR (Back)</div>';
    html += renderBodyView('back', selected, options.readOnly);
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

    // Region clicks — clicking on any view updates all
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

  // ==================== B&W PRINT-FRIENDLY RENDERING ====================
  function renderPrintView(viewType, selected) {
    selected = selected || [];
    var detailLines = viewType === 'front' ? FRONT_DETAILS : BACK_DETAILS;

    var svg = '<svg viewBox="0 0 200 400" class="body-diagram-print-svg" xmlns="http://www.w3.org/2000/svg">';
    svg += '<defs>';
    // Hatching pattern for selected regions
    svg += '<pattern id="hatch' + viewType + '" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">';
    svg += '<line x1="0" y1="0" x2="0" y2="4" stroke="#000" stroke-width="1"/>';
    svg += '</pattern>';
    svg += '</defs>';

    // White background body silhouette with solid black outline
    svg += '<path d="' + BODY_PATH + '" fill="#fff" stroke="#000" stroke-width="1.5"/>';

    // Draw detail lines in light gray (anatomy hints)
    for (var d = 0; d < detailLines.length; d++) {
      svg += '<path d="' + detailLines[d] + '" fill="none" stroke="#aaa" stroke-width="0.6"/>';
    }

    // Front face features
    if (viewType === 'front') {
      svg += '<ellipse cx="93" cy="36" rx="3" ry="1.5" fill="none" stroke="#999" stroke-width="0.5"/>';
      svg += '<ellipse cx="107" cy="36" rx="3" ry="1.5" fill="none" stroke="#999" stroke-width="0.5"/>';
      svg += '<path d="M99,40 L100,43 L101,40" fill="none" stroke="#999" stroke-width="0.4"/>';
      svg += '<path d="M95,47 Q100,50 105,47" fill="none" stroke="#999" stroke-width="0.4"/>';
    }

    // Draw regions - selected ones get hatched fill + thick border
    var viewRegions = [];
    for (var i = 0; i < REGIONS.length; i++) {
      if (REGIONS[i].view === viewType) viewRegions.push(REGIONS[i]);
    }

    for (var j = 0; j < viewRegions.length; j++) {
      var r = viewRegions[j];
      var isSelected = selected.indexOf(r.id) !== -1;

      if (isSelected) {
        svg += '<g class="body-region selected" data-region="' + r.id + '">';
        if (r.type === 'ellipse') {
          svg += '<ellipse cx="' + r.cx + '" cy="' + r.cy + '" rx="' + (r.rx + 2) + '" ry="' + (r.ry + 2) + '" fill="url(#hatch' + viewType + ')" fill-opacity="0.4" stroke="none"/>';
          svg += '<ellipse cx="' + r.cx + '" cy="' + r.cy + '" rx="' + r.rx + '" ry="' + r.ry + '" fill="rgba(0,0,0,0.15)" stroke="#000" stroke-width="2"/>';
        } else {
          svg += '<rect x="' + (r.x - 2) + '" y="' + (r.y - 2) + '" width="' + (r.w + 4) + '" height="' + (r.h + 4) + '" rx="' + (r.rx + 1) + '" fill="url(#hatch' + viewType + ')" fill-opacity="0.4" stroke="none"/>';
          svg += '<rect x="' + r.x + '" y="' + r.y + '" width="' + r.w + '" height="' + r.h + '" rx="' + r.rx + '" fill="rgba(0,0,0,0.15)" stroke="#000" stroke-width="2"/>';
        }
        var pos = getLabelPos(r);
        svg += '<text x="' + pos.x + '" y="' + (pos.y + 1) + '" text-anchor="middle" font-size="5.5" fill="#000" font-weight="800" stroke="#fff" stroke-width="2" paint-order="stroke">' + r.name + '</text>';
        svg += '</g>';
      }
    }

    svg += '</svg>';
    return svg;
  }

  function renderPrintHtml(selected) {
    if (!selected || selected.length === 0) return '';
    var html = '<div class="print-body-diagram">';
    html += '<div class="print-body-diagram-row">';
    html += '<div class="print-body-diagram-col">';
    html += '<div class="print-body-diagram-label">ANTERIOR (Front)</div>';
    html += renderPrintView('front', selected);
    html += '</div>';
    html += '<div class="print-body-diagram-col">';
    html += '<div class="print-body-diagram-label">POSTERIOR (Back)</div>';
    html += renderPrintView('back', selected);
    html += '</div>';
    html += '</div>';
    // Text list below diagram for clarity
    html += '<div class="print-body-list"><strong>Affected Areas:</strong> ';
    var names = [];
    for (var i = 0; i < selected.length; i++) {
      names.push(getRegionName(selected[i]));
    }
    html += names.join(', ');
    html += '</div>';
    html += '</div>';
    return html;
  }

  return {
    render: render,
    renderHtml: renderHtml,
    getSelected: getSelected,
    getRegionName: getRegionName,
    getRegionColor: getRegionColor,
    renderBadges: renderBadges,
    renderPrintHtml: renderPrintHtml
  };
})();
