/* ============================================
   Exercise Library - Pre-built physio exercises
   with elegant body silhouette animations
   ============================================ */
window.ExerciseLibrary = (function() {

  // Current gender for rendering (male/female)
  var _gender = 'neutral';

  function setGender(g) { _gender = g || 'neutral'; }
  function getGender() { return _gender; }

  // ===== ELEGANT BODY SILHOUETTE RENDERER =====
  // Draws a filled body silhouette from joint positions
  // Same input format as before: pose = { headX, headY, hipX, hipY, lElbow, lHand, rElbow, rHand, lKnee, lFoot, rKnee, rFoot }
  // All coordinates in a 100x120 viewBox

  function drawLimb(x1, y1, x2, y2, w1, w2, fill) {
    // Draw a tapered rounded limb segment between two joints
    var dx = x2 - x1, dy = y2 - y1;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / len, ny = dx / len;
    var p1x = x1 + nx * w1, p1y = y1 + ny * w1;
    var p2x = x1 - nx * w1, p2y = y1 - ny * w1;
    var p3x = x2 - nx * w2, p3y = y2 - ny * w2;
    var p4x = x2 + nx * w2, p4y = y2 + ny * w2;
    // Midpoints for curve
    var mx1 = (p1x + p4x) / 2, my1 = (p1y + p4y) / 2;
    var mx2 = (p2x + p3x) / 2, my2 = (p2y + p3y) / 2;
    return '<path d="M' + r(p1x) + ',' + r(p1y) +
      ' Q' + r(mx1 + nx * 0.5) + ',' + r(my1 + ny * 0.5) + ' ' + r(p4x) + ',' + r(p4y) +
      ' Q' + r(x2 + nx * w2 * 0.3) + ',' + r(y2 + ny * w2 * 0.3) + ' ' + r(p3x) + ',' + r(p3y) +
      ' Q' + r(mx2 - nx * 0.5) + ',' + r(my2 - ny * 0.5) + ' ' + r(p2x) + ',' + r(p2y) +
      ' Q' + r(x1 - nx * w1 * 0.3) + ',' + r(y1 - ny * w1 * 0.3) + ' ' + r(p1x) + ',' + r(p1y) +
      'Z" fill="' + fill + '"/>';
  }

  function r(n) { return Math.round(n * 10) / 10; }

  function drawFigure(pose, highlight, props, markerId) {
    var hl = highlight || [];
    var p = props || {};
    var isFemale = _gender === 'female';
    var isMale = _gender === 'male';
    var bodyFill = isFemale ? '#475569' : (isMale ? '#334155' : '#64748b');
    var bodyFillLight = isFemale ? '#64748b' : (isMale ? '#475569' : '#94a3b8');
    var hlFill = '#059669';
    var hlFillLight = '#34d399';
    var mid = markerId || 'arrowhead';
    var gradId = mid + '_g';
    var hlGradId = mid + '_hg';
    var bgGradId = mid + '_bg';
    var shadowGradId = mid + '_sg';

    function isHl(part) {
      for (var i = 0; i < hl.length; i++) { if (hl[i] === part) return true; }
      return false;
    }
    function fc(part) { return isHl(part) ? 'url(#' + hlGradId + ')' : 'url(#' + gradId + ')'; }

    var neckX = pose.headX, neckY = pose.headY + 6;
    var svg = '';

    // Gradient defs
    svg += '<defs>';
    svg += '<linearGradient id="' + gradId + '" x1="0" y1="0" x2="0" y2="1">';
    svg += '<stop offset="0%" stop-color="' + bodyFillLight + '"/>';
    svg += '<stop offset="100%" stop-color="' + bodyFill + '"/>';
    svg += '</linearGradient>';
    svg += '<linearGradient id="' + hlGradId + '" x1="0" y1="0" x2="0" y2="1">';
    svg += '<stop offset="0%" stop-color="#34d399"/>';
    svg += '<stop offset="100%" stop-color="#059669"/>';
    svg += '</linearGradient>';
    svg += '<radialGradient id="' + bgGradId + '">';
    svg += '<stop offset="0%" stop-color="#ccfbf1" stop-opacity="0.5"/>';
    svg += '<stop offset="100%" stop-color="#ccfbf1" stop-opacity="0"/>';
    svg += '</radialGradient>';
    svg += '<radialGradient id="' + shadowGradId + '">';
    svg += '<stop offset="0%" stop-color="rgba(0,0,0,0.12)"/>';
    svg += '<stop offset="100%" stop-color="rgba(0,0,0,0)"/>';
    svg += '</radialGradient>';
    svg += '</defs>';

    // Gender-based proportions
    var shoulderW = isFemale ? 4.2 : (isMale ? 7.2 : 5.8);
    var hipW = isFemale ? 5 : (isMale ? 3.8 : 4.2);
    var headRx = isFemale ? 5.2 : (isMale ? 6.2 : 5.7);
    var headRy = isFemale ? 6 : (isMale ? 5.4 : 5.7);
    var armW1 = isFemale ? 2 : (isMale ? 3.8 : 3);
    var armW2 = isFemale ? 1.4 : (isMale ? 2.8 : 2.2);
    var legW1 = isFemale ? 3 : (isMale ? 4.2 : 3.5);
    var legW2 = isFemale ? 2 : (isMale ? 3 : 2.4);
    var calfW1 = isFemale ? 2.2 : (isMale ? 3.4 : 2.7);
    var calfW2 = isFemale ? 1.5 : (isMale ? 2.4 : 2);
    var neckW = isFemale ? 1.6 : (isMale ? 3.2 : 2.2);
    var jointR = isFemale ? 1.2 : (isMale ? 2 : 1.6);

    // Background glow
    var cx = r((pose.headX + pose.hipX) / 2);
    var cy = r((pose.headY + pose.hipY) / 2);
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="45" fill="url(#' + bgGradId + ')"/>';

    // Props first (behind body)
    if (p.mat) {
      svg += '<rect x="' + p.mat[0] + '" y="' + p.mat[1] + '" width="' + p.mat[2] + '" height="' + p.mat[3] + '" rx="2" fill="#e2e8f0"/>';
    }
    if (p.surface) {
      svg += '<rect x="' + p.surface[0] + '" y="' + (p.surface[1] - 1) + '" width="' + (p.surface[2] - p.surface[0]) + '" height="3" rx="1.5" fill="#e2e8f0"/>';
    }
    if (p.wall) {
      svg += '<rect x="' + p.wall[0] + '" y="' + p.wall[1] + '" width="4" height="' + (p.wall[3] - p.wall[1]) + '" rx="1.5" fill="#cbd5e1"/>';
    }
    if (p.chair) {
      svg += '<polyline points="' + p.chair + '" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
    }

    // Shadow under figure (radial gradient)
    var shadowY = p.surface ? p.surface[1] : (p.mat ? p.mat[1] : 115);
    svg += '<ellipse cx="' + r((pose.headX + pose.hipX) / 2) + '" cy="' + r(shadowY) + '" rx="20" ry="3" fill="url(#' + shadowGradId + ')"/>';

    // === BODY PARTS (back to front layering) ===

    // Left leg
    svg += drawLimb(pose.hipX - 1, pose.hipY, pose.lKnee[0], pose.lKnee[1], legW1, calfW1, fc('lLeg'));
    svg += drawLimb(pose.lKnee[0], pose.lKnee[1], pose.lFoot[0], pose.lFoot[1], calfW1, calfW2, fc('lLeg'));
    svg += '<ellipse cx="' + r(pose.lFoot[0]) + '" cy="' + r(pose.lFoot[1]) + '" rx="' + (calfW2 + 0.5) + '" ry="' + (calfW2) + '" fill="' + fc('lLeg') + '"/>';
    // Left knee joint
    svg += '<circle cx="' + r(pose.lKnee[0]) + '" cy="' + r(pose.lKnee[1]) + '" r="' + jointR + '" fill="' + fc('lLeg') + '" stroke="rgba(255,255,255,0.3)" stroke-width="0.5"/>';

    // Right leg
    svg += drawLimb(pose.hipX + 1, pose.hipY, pose.rKnee[0], pose.rKnee[1], legW1, calfW1, fc('rLeg'));
    svg += drawLimb(pose.rKnee[0], pose.rKnee[1], pose.rFoot[0], pose.rFoot[1], calfW1, calfW2, fc('rLeg'));
    svg += '<ellipse cx="' + r(pose.rFoot[0]) + '" cy="' + r(pose.rFoot[1]) + '" rx="' + (calfW2 + 0.5) + '" ry="' + (calfW2) + '" fill="' + fc('rLeg') + '"/>';
    svg += '<circle cx="' + r(pose.rKnee[0]) + '" cy="' + r(pose.rKnee[1]) + '" r="' + jointR + '" fill="' + fc('rLeg') + '" stroke="rgba(255,255,255,0.3)" stroke-width="0.5"/>';

    // Left arm (behind torso)
    svg += drawLimb(neckX - 2, neckY + 2, pose.lElbow[0], pose.lElbow[1], armW1, armW2, fc('lArm'));
    svg += drawLimb(pose.lElbow[0], pose.lElbow[1], pose.lHand[0], pose.lHand[1], armW2, armW2 * 0.7, fc('lArm'));
    svg += '<circle cx="' + r(pose.lHand[0]) + '" cy="' + r(pose.lHand[1]) + '" r="' + (armW2 * 0.8) + '" fill="' + fc('lArm') + '"/>';
    // Left elbow joint
    svg += '<circle cx="' + r(pose.lElbow[0]) + '" cy="' + r(pose.lElbow[1]) + '" r="' + (jointR * 0.8) + '" fill="' + fc('lArm') + '" stroke="rgba(255,255,255,0.3)" stroke-width="0.5"/>';

    // Torso
    var tDx = pose.hipX - neckX, tDy = pose.hipY - neckY;
    var tLen = Math.sqrt(tDx * tDx + tDy * tDy) || 1;
    var tNx = -tDy / tLen, tNy = tDx / tLen;
    svg += '<path d="M' + r(neckX + tNx * shoulderW) + ',' + r(neckY + tNy * shoulderW) +
      ' Q' + r(neckX + tNx * (shoulderW + 1)) + ',' + r(neckY + (pose.hipY - neckY) * 0.3) +
      ' ' + r(pose.hipX + tNx * hipW) + ',' + r(pose.hipY + tNy * hipW) +
      ' Q' + r(pose.hipX) + ',' + r(pose.hipY + hipW * 0.5) +
      ' ' + r(pose.hipX - tNx * hipW) + ',' + r(pose.hipY - tNy * hipW) +
      ' Q' + r(neckX - tNx * (shoulderW + 1)) + ',' + r(neckY + (pose.hipY - neckY) * 0.3) +
      ' ' + r(neckX - tNx * shoulderW) + ',' + r(neckY - tNy * shoulderW) +
      'Z" fill="url(#' + gradId + ')"/>';

    // Right arm (in front of torso)
    svg += drawLimb(neckX + 2, neckY + 2, pose.rElbow[0], pose.rElbow[1], armW1, armW2, fc('rArm'));
    svg += drawLimb(pose.rElbow[0], pose.rElbow[1], pose.rHand[0], pose.rHand[1], armW2, armW2 * 0.7, fc('rArm'));
    svg += '<circle cx="' + r(pose.rHand[0]) + '" cy="' + r(pose.rHand[1]) + '" r="' + (armW2 * 0.8) + '" fill="' + fc('rArm') + '"/>';
    svg += '<circle cx="' + r(pose.rElbow[0]) + '" cy="' + r(pose.rElbow[1]) + '" r="' + (jointR * 0.8) + '" fill="' + fc('rArm') + '" stroke="rgba(255,255,255,0.3)" stroke-width="0.5"/>';

    // Neck
    svg += '<rect x="' + r(neckX - neckW) + '" y="' + r(neckY - 1) + '" width="' + r(neckW * 2) + '" height="4" rx="' + r(neckW) + '" fill="url(#' + gradId + ')"/>';

    // Head
    svg += '<ellipse cx="' + pose.headX + '" cy="' + pose.headY + '" rx="' + headRx + '" ry="' + headRy + '" fill="url(#' + gradId + ')"/>';
    // Eyes (two small dots)
    svg += '<circle cx="' + r(pose.headX - 2) + '" cy="' + r(pose.headY - 0.5) + '" r="0.7" fill="rgba(255,255,255,0.6)"/>';
    svg += '<circle cx="' + r(pose.headX + 2) + '" cy="' + r(pose.headY - 0.5) + '" r="0.7" fill="rgba(255,255,255,0.6)"/>';
    // Slight smile
    svg += '<path d="M' + r(pose.headX - 1.5) + ',' + r(pose.headY + 1.5) + ' Q' + r(pose.headX) + ',' + r(pose.headY + 2.8) + ' ' + r(pose.headX + 1.5) + ',' + r(pose.headY + 1.5) + '" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="0.5" stroke-linecap="round"/>';
    // Male: side part hair
    if (isMale) {
      var _ht = pose.headY - headRy;
      svg += '<path d="M' + r(pose.headX + headRx) + ',' + r(pose.headY - 1) + ' Q' + r(pose.headX + headRx + 1) + ',' + r(_ht - 1) + ' ' + r(pose.headX - 1) + ',' + r(_ht - 3) + ' Q' + r(pose.headX - headRx - 1) + ',' + r(_ht - 1) + ' ' + r(pose.headX - headRx) + ',' + r(pose.headY - 2) + '" fill="' + bodyFill + '"/>';
    }
    // Female: bob cut hair
    if (isFemale) {
      svg += '<path d="M' + r(pose.headX - headRx - 1) + ',' + r(pose.headY + 1) + ' Q' + r(pose.headX - headRx - 2) + ',' + r(pose.headY - headRy) + ' ' + r(pose.headX) + ',' + r(pose.headY - headRy - 2) + ' Q' + r(pose.headX + headRx + 2) + ',' + r(pose.headY - headRy) + ' ' + r(pose.headX + headRx + 1) + ',' + r(pose.headY + 1) + '" fill="' + bodyFill + '"/>';
      svg += '<path d="M' + r(pose.headX - headRx - 1) + ',' + r(pose.headY + 1) + ' L' + r(pose.headX - headRx) + ',' + r(pose.headY + headRy - 1) + '" stroke="' + bodyFill + '" stroke-width="2" stroke-linecap="round" fill="none"/>';
      svg += '<path d="M' + r(pose.headX + headRx + 1) + ',' + r(pose.headY + 1) + ' L' + r(pose.headX + headRx) + ',' + r(pose.headY + headRy - 1) + '" stroke="' + bodyFill + '" stroke-width="2" stroke-linecap="round" fill="none"/>';
    }

    // Direction arrow
    if (p.arrow) {
      svg += '<polyline points="' + p.arrow + '" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#' + mid + ')"/>';
    }

    return svg;
  }

  // Generate full SVG string for a frame
  function frameSVG(pose, highlight, props) {
    var svg = '<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">';
    svg += '<defs><marker id="arrowhead" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto"><polygon points="0 0, 7 2.5, 0 5" fill="#059669"/></marker></defs>';
    svg += drawFigure(pose, highlight, props);
    svg += '</svg>';
    return svg;
  }

  // ===== EXERCISE DATABASE =====
  var exercises = [

    // ==================== KNEE ====================
    {
      id: 'straight_leg_raise',
      name: 'Straight Leg Raise',
      bodyPart: 'knee',
      defaultSets: 3, defaultReps: 10, holdSeconds: 5,
      frame1: {
        headX: 25, headY: 30, hipX: 50, hipY: 35,
        lElbow: [35, 25], lHand: [40, 18],
        rElbow: [60, 28], rHand: [68, 22],
        lKnee: [60, 55], lFoot: [70, 75],
        rKnee: [60, 55], rFoot: [70, 75],
        hl: ['rLeg'], props: { mat: [10, 38, 80, 4] }
      },
      frame2: {
        headX: 25, headY: 30, hipX: 50, hipY: 35,
        lElbow: [35, 25], lHand: [40, 18],
        rElbow: [60, 28], rHand: [68, 22],
        lKnee: [60, 55], lFoot: [70, 75],
        rKnee: [68, 25], rFoot: [85, 18],
        hl: ['rLeg'], props: { mat: [10, 38, 80, 4], arrow: '80,30 85,20' }
      }
    },
    {
      id: 'knee_bend_sitting',
      name: 'Knee Bend (Sitting)',
      bodyPart: 'knee',
      defaultSets: 3, defaultReps: 15, holdSeconds: 0,
      frame1: {
        headX: 40, headY: 15, hipX: 40, hipY: 55,
        lElbow: [30, 45], lHand: [25, 55],
        rElbow: [50, 45], rHand: [55, 55],
        lKnee: [30, 75], lFoot: [30, 95],
        rKnee: [50, 75], rFoot: [50, 95],
        hl: ['rLeg'], props: { chair: '25,50 25,95 60,95 60,50', surface: [10, 100, 90, 100] }
      },
      frame2: {
        headX: 40, headY: 15, hipX: 40, hipY: 55,
        lElbow: [30, 45], lHand: [25, 55],
        rElbow: [50, 45], rHand: [55, 55],
        lKnee: [30, 75], lFoot: [30, 95],
        rKnee: [55, 70], rFoot: [68, 72],
        hl: ['rLeg'], props: { chair: '25,50 25,95 60,95 60,50', surface: [10, 100, 90, 100], arrow: '62,78 68,72' }
      }
    },
    {
      id: 'wall_squat',
      name: 'Wall Slide Squat',
      bodyPart: 'knee',
      defaultSets: 2, defaultReps: 10, holdSeconds: 5,
      frame1: {
        headX: 55, headY: 12, hipX: 55, hipY: 48,
        lElbow: [45, 35], lHand: [40, 45],
        rElbow: [65, 35], rHand: [70, 45],
        lKnee: [45, 72], lFoot: [42, 95],
        rKnee: [65, 72], rFoot: [68, 95],
        hl: ['lLeg', 'rLeg'], props: { wall: [75, 0, 75, 100], surface: [10, 100, 90, 100] }
      },
      frame2: {
        headX: 55, headY: 28, hipX: 55, hipY: 62,
        lElbow: [45, 48], lHand: [40, 58],
        rElbow: [65, 48], rHand: [70, 58],
        lKnee: [40, 78], lFoot: [38, 95],
        rKnee: [70, 78], rFoot: [72, 95],
        hl: ['lLeg', 'rLeg'], props: { wall: [75, 0, 75, 100], surface: [10, 100, 90, 100], arrow: '55,45 55,58' }
      }
    },
    {
      id: 'quad_stretch_standing',
      name: 'Quad Stretch (Standing)',
      bodyPart: 'knee',
      defaultSets: 3, defaultReps: 1, holdSeconds: 30,
      frame1: {
        headX: 45, headY: 10, hipX: 45, hipY: 48,
        lElbow: [35, 35], lHand: [30, 45],
        rElbow: [55, 35], rHand: [60, 45],
        lKnee: [40, 72], lFoot: [38, 95],
        rKnee: [50, 72], rFoot: [52, 95],
        hl: ['rLeg'], props: { surface: [10, 100, 90, 100] }
      },
      frame2: {
        headX: 45, headY: 10, hipX: 45, hipY: 48,
        lElbow: [35, 35], lHand: [30, 45],
        rElbow: [55, 50], rHand: [58, 62],
        lKnee: [40, 72], lFoot: [38, 95],
        rKnee: [55, 62], rFoot: [58, 50],
        hl: ['rLeg'], props: { surface: [10, 100, 90, 100], arrow: '56,58 58,50' }
      }
    },
    {
      id: 'hamstring_stretch',
      name: 'Hamstring Stretch (Sitting)',
      bodyPart: 'knee',
      defaultSets: 3, defaultReps: 1, holdSeconds: 30,
      frame1: {
        headX: 30, headY: 25, hipX: 42, hipY: 50,
        lElbow: [25, 40], lHand: [20, 50],
        rElbow: [45, 38], rHand: [50, 45],
        lKnee: [55, 55], lFoot: [75, 52],
        rKnee: [35, 70], rFoot: [30, 90],
        hl: ['lLeg'], props: { mat: [10, 55, 80, 4] }
      },
      frame2: {
        headX: 38, headY: 22, hipX: 42, hipY: 50,
        lElbow: [50, 35], lHand: [60, 40],
        rElbow: [52, 38], rHand: [58, 42],
        lKnee: [55, 55], lFoot: [75, 52],
        rKnee: [35, 70], rFoot: [30, 90],
        hl: ['lLeg'], props: { mat: [10, 55, 80, 4], arrow: '55,38 62,40' }
      }
    },
    {
      id: 'heel_slide',
      name: 'Heel Slide',
      bodyPart: 'knee',
      defaultSets: 3, defaultReps: 10, holdSeconds: 0,
      frame1: {
        headX: 20, headY: 30, hipX: 42, hipY: 38,
        lElbow: [28, 28], lHand: [30, 22],
        rElbow: [50, 30], rHand: [55, 24],
        lKnee: [55, 50], lFoot: [72, 40],
        rKnee: [55, 50], rFoot: [72, 40],
        hl: ['rLeg'], props: { mat: [5, 42, 90, 4] }
      },
      frame2: {
        headX: 20, headY: 30, hipX: 42, hipY: 38,
        lElbow: [28, 28], lHand: [30, 22],
        rElbow: [50, 30], rHand: [55, 24],
        lKnee: [55, 50], lFoot: [72, 40],
        rKnee: [50, 28], rFoot: [52, 38],
        hl: ['rLeg'], props: { mat: [5, 42, 90, 4], arrow: '60,42 52,38' }
      }
    },
    {
      id: 'step_up',
      name: 'Step Up',
      bodyPart: 'knee',
      defaultSets: 3, defaultReps: 10, holdSeconds: 0,
      frame1: {
        headX: 45, headY: 8, hipX: 45, hipY: 45,
        lElbow: [35, 30], lHand: [30, 40],
        rElbow: [55, 30], rHand: [60, 40],
        lKnee: [38, 68], lFoot: [35, 90],
        rKnee: [52, 58], rFoot: [55, 68],
        hl: ['rLeg'], props: { surface: [20, 72, 80, 72] }
      },
      frame2: {
        headX: 55, headY: 2, hipX: 55, hipY: 38,
        lElbow: [45, 25], lHand: [40, 35],
        rElbow: [65, 25], rHand: [70, 35],
        lKnee: [48, 55], lFoot: [45, 68],
        rKnee: [62, 55], rFoot: [65, 68],
        hl: ['rLeg'], props: { surface: [20, 72, 80, 72], arrow: '55,48 55,38' }
      }
    },
    {
      id: 'calf_raise',
      name: 'Calf Raise',
      bodyPart: 'knee',
      defaultSets: 3, defaultReps: 15, holdSeconds: 2,
      frame1: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [40, 35], lHand: [35, 45],
        rElbow: [60, 35], rHand: [65, 45],
        lKnee: [45, 72], lFoot: [43, 95],
        rKnee: [55, 72], rFoot: [57, 95],
        hl: ['lLeg', 'rLeg'], props: { surface: [15, 100, 85, 100] }
      },
      frame2: {
        headX: 50, headY: 5, hipX: 50, hipY: 43,
        lElbow: [40, 30], lHand: [35, 40],
        rElbow: [60, 30], rHand: [65, 40],
        lKnee: [45, 66], lFoot: [43, 85],
        rKnee: [55, 66], rFoot: [57, 85],
        hl: ['lLeg', 'rLeg'], props: { surface: [15, 100, 85, 100], arrow: '50,50 50,40' }
      }
    },
    {
      id: 'terminal_knee_ext',
      name: 'Terminal Knee Extension',
      bodyPart: 'knee',
      defaultSets: 3, defaultReps: 10, holdSeconds: 5,
      frame1: {
        headX: 25, headY: 28, hipX: 45, hipY: 36,
        lElbow: [30, 25], lHand: [32, 18],
        rElbow: [52, 28], rHand: [58, 22],
        lKnee: [58, 48], lFoot: [72, 60],
        rKnee: [55, 50], rFoot: [68, 62],
        hl: ['rLeg'], props: { mat: [8, 40, 85, 4] }
      },
      frame2: {
        headX: 25, headY: 28, hipX: 45, hipY: 36,
        lElbow: [30, 25], lHand: [32, 18],
        rElbow: [52, 28], rHand: [58, 22],
        lKnee: [58, 48], lFoot: [72, 60],
        rKnee: [62, 38], rFoot: [80, 36],
        hl: ['rLeg'], props: { mat: [8, 40, 85, 4], arrow: '72,42 80,36' }
      }
    },
    {
      id: 'knee_to_chest',
      name: 'Knee to Chest',
      bodyPart: 'knee',
      defaultSets: 3, defaultReps: 10, holdSeconds: 10,
      frame1: {
        headX: 20, headY: 30, hipX: 42, hipY: 38,
        lElbow: [30, 28], lHand: [35, 22],
        rElbow: [50, 30], rHand: [55, 24],
        lKnee: [55, 50], lFoot: [72, 42],
        rKnee: [55, 50], rFoot: [72, 42],
        hl: ['rLeg'], props: { mat: [5, 42, 90, 4] }
      },
      frame2: {
        headX: 20, headY: 30, hipX: 42, hipY: 38,
        lElbow: [38, 22], lHand: [42, 28],
        rElbow: [50, 24], rHand: [48, 30],
        lKnee: [55, 50], lFoot: [72, 42],
        rKnee: [42, 22], rFoot: [35, 28],
        hl: ['rLeg'], props: { mat: [5, 42, 90, 4], arrow: '48,28 42,22' }
      }
    },

    // ==================== SHOULDER ====================
    {
      id: 'pendulum_swing',
      name: 'Pendulum Swing',
      bodyPart: 'shoulder',
      defaultSets: 3, defaultReps: 20, holdSeconds: 0,
      frame1: {
        headX: 45, headY: 10, hipX: 48, hipY: 48,
        lElbow: [30, 45], lHand: [20, 60],
        rElbow: [58, 35], rHand: [65, 25],
        lKnee: [42, 72], lFoot: [38, 95],
        rKnee: [55, 72], rFoot: [58, 95],
        hl: ['lArm'], props: { surface: [10, 100, 90, 100] }
      },
      frame2: {
        headX: 45, headY: 10, hipX: 48, hipY: 48,
        lElbow: [32, 50], lHand: [30, 70],
        rElbow: [58, 35], rHand: [65, 25],
        lKnee: [42, 72], lFoot: [38, 95],
        rKnee: [55, 72], rFoot: [58, 95],
        hl: ['lArm'], props: { surface: [10, 100, 90, 100], arrow: '22,55 30,68' }
      }
    },
    {
      id: 'wall_crawl',
      name: 'Wall Crawl (Finger Walk)',
      bodyPart: 'shoulder',
      defaultSets: 3, defaultReps: 10, holdSeconds: 5,
      frame1: {
        headX: 40, headY: 10, hipX: 40, hipY: 48,
        lElbow: [30, 35], lHand: [25, 45],
        rElbow: [55, 25], rHand: [68, 30],
        lKnee: [35, 72], lFoot: [32, 95],
        rKnee: [48, 72], rFoot: [50, 95],
        hl: ['rArm'], props: { wall: [72, 0, 72, 100], surface: [10, 100, 90, 100] }
      },
      frame2: {
        headX: 40, headY: 10, hipX: 40, hipY: 48,
        lElbow: [30, 35], lHand: [25, 45],
        rElbow: [60, 10], rHand: [68, 5],
        lKnee: [35, 72], lFoot: [32, 95],
        rKnee: [48, 72], rFoot: [50, 95],
        hl: ['rArm'], props: { wall: [72, 0, 72, 100], surface: [10, 100, 90, 100], arrow: '68,25 68,8' }
      }
    },
    {
      id: 'shoulder_ext_rotation',
      name: 'External Rotation',
      bodyPart: 'shoulder',
      defaultSets: 3, defaultReps: 10, holdSeconds: 3,
      frame1: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 35], lHand: [30, 45],
        rElbow: [62, 35], rHand: [62, 48],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['rArm'], props: { surface: [15, 100, 85, 100] }
      },
      frame2: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 35], lHand: [30, 45],
        rElbow: [62, 35], rHand: [78, 35],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['rArm'], props: { surface: [15, 100, 85, 100], arrow: '68,42 78,35' }
      }
    },
    {
      id: 'shoulder_int_rotation',
      name: 'Internal Rotation',
      bodyPart: 'shoulder',
      defaultSets: 3, defaultReps: 10, holdSeconds: 3,
      frame1: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 35], lHand: [30, 45],
        rElbow: [62, 35], rHand: [78, 35],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['rArm'], props: { surface: [15, 100, 85, 100] }
      },
      frame2: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 35], lHand: [30, 45],
        rElbow: [62, 35], rHand: [62, 48],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['rArm'], props: { surface: [15, 100, 85, 100], arrow: '75,35 65,46' }
      }
    },
    {
      id: 'shoulder_shrug',
      name: 'Shoulder Shrug',
      bodyPart: 'shoulder',
      defaultSets: 3, defaultReps: 15, holdSeconds: 3,
      frame1: {
        headX: 50, headY: 12, hipX: 50, hipY: 50,
        lElbow: [38, 38], lHand: [32, 52],
        rElbow: [62, 38], rHand: [68, 52],
        lKnee: [44, 74], lFoot: [42, 95],
        rKnee: [56, 74], rFoot: [58, 95],
        hl: ['lArm', 'rArm'], props: { surface: [15, 100, 85, 100] }
      },
      frame2: {
        headX: 50, headY: 12, hipX: 50, hipY: 50,
        lElbow: [36, 32], lHand: [30, 45],
        rElbow: [64, 32], rHand: [70, 45],
        lKnee: [44, 74], lFoot: [42, 95],
        rKnee: [56, 74], rFoot: [58, 95],
        hl: ['lArm', 'rArm'], props: { surface: [15, 100, 85, 100], arrow: '38,40 36,32' }
      }
    },
    {
      id: 'cross_body_stretch',
      name: 'Cross Body Stretch',
      bodyPart: 'shoulder',
      defaultSets: 3, defaultReps: 1, holdSeconds: 30,
      frame1: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 35], lHand: [30, 45],
        rElbow: [60, 32], rHand: [65, 35],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['rArm'], props: { surface: [15, 100, 85, 100] }
      },
      frame2: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 30], lHand: [42, 35],
        rElbow: [45, 32], rHand: [30, 32],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['rArm'], props: { surface: [15, 100, 85, 100], arrow: '38,32 30,32' }
      }
    },
    {
      id: 'arm_raise_front',
      name: 'Front Arm Raise',
      bodyPart: 'shoulder',
      defaultSets: 3, defaultReps: 10, holdSeconds: 3,
      frame1: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 35], lHand: [30, 48],
        rElbow: [62, 35], rHand: [70, 48],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['rArm'], props: { surface: [15, 100, 85, 100] }
      },
      frame2: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 35], lHand: [30, 48],
        rElbow: [62, 15], rHand: [68, 2],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['rArm'], props: { surface: [15, 100, 85, 100], arrow: '68,12 68,4' }
      }
    },
    {
      id: 'arm_raise_side',
      name: 'Side Arm Raise',
      bodyPart: 'shoulder',
      defaultSets: 3, defaultReps: 10, holdSeconds: 3,
      frame1: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 35], lHand: [30, 48],
        rElbow: [62, 35], rHand: [70, 48],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['rArm'], props: { surface: [15, 100, 85, 100] }
      },
      frame2: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 35], lHand: [30, 48],
        rElbow: [75, 15], rHand: [88, 8],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['rArm'], props: { surface: [15, 100, 85, 100], arrow: '82,12 88,8' }
      }
    },
    {
      id: 'towel_stretch_shoulder',
      name: 'Towel Stretch (Behind Back)',
      bodyPart: 'shoulder',
      defaultSets: 3, defaultReps: 10, holdSeconds: 5,
      frame1: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [35, 25], lHand: [30, 12],
        rElbow: [60, 55], rHand: [58, 65],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['lArm', 'rArm'], props: { surface: [15, 100, 85, 100] }
      },
      frame2: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [33, 20], lHand: [28, 8],
        rElbow: [58, 52], rHand: [55, 58],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['lArm', 'rArm'], props: { surface: [15, 100, 85, 100], arrow: '30, 15 28,8' }
      }
    },
    {
      id: 'wall_pushup',
      name: 'Wall Push-Up',
      bodyPart: 'shoulder',
      defaultSets: 3, defaultReps: 10, holdSeconds: 0,
      frame1: {
        headX: 40, headY: 12, hipX: 48, hipY: 50,
        lElbow: [28, 25], lHand: [20, 20],
        rElbow: [48, 22], rHand: [20, 18],
        lKnee: [52, 75], lFoot: [58, 95],
        rKnee: [58, 75], rFoot: [64, 95],
        hl: ['lArm', 'rArm'], props: { wall: [18, 0, 18, 100], surface: [15, 100, 85, 100] }
      },
      frame2: {
        headX: 30, headY: 12, hipX: 42, hipY: 50,
        lElbow: [22, 28], lHand: [18, 20],
        rElbow: [35, 25], rHand: [18, 18],
        lKnee: [50, 75], lFoot: [58, 95],
        rKnee: [55, 75], rFoot: [64, 95],
        hl: ['lArm', 'rArm'], props: { wall: [18, 0, 18, 100], surface: [15, 100, 85, 100], arrow: '34,14 28,14' }
      }
    },

    // ==================== BACK ====================
    {
      id: 'cat_cow',
      name: 'Cat-Cow Stretch',
      bodyPart: 'back',
      defaultSets: 3, defaultReps: 10, holdSeconds: 3,
      frame1: {
        headX: 22, headY: 30, hipX: 65, hipY: 32,
        lElbow: [18, 55], lHand: [18, 72],
        rElbow: [30, 55], rHand: [30, 72],
        lKnee: [58, 55], lFoot: [58, 72],
        rKnee: [72, 55], rFoot: [72, 72],
        hl: [], props: { mat: [5, 75, 80, 4] }
      },
      frame2: {
        headX: 22, headY: 38, hipX: 65, hipY: 38,
        lElbow: [18, 58], lHand: [18, 72],
        rElbow: [30, 58], rHand: [30, 72],
        lKnee: [58, 58], lFoot: [58, 72],
        rKnee: [72, 58], rFoot: [72, 72],
        hl: [], props: { mat: [5, 75, 80, 4], arrow: '44,28 44,38' }
      }
    },
    {
      id: 'bird_dog',
      name: 'Bird Dog',
      bodyPart: 'back',
      defaultSets: 3, defaultReps: 10, holdSeconds: 5,
      frame1: {
        headX: 22, headY: 32, hipX: 65, hipY: 35,
        lElbow: [18, 55], lHand: [18, 72],
        rElbow: [30, 55], rHand: [30, 72],
        lKnee: [58, 55], lFoot: [58, 72],
        rKnee: [72, 55], rFoot: [72, 72],
        hl: [], props: { mat: [5, 75, 80, 4] }
      },
      frame2: {
        headX: 18, headY: 30, hipX: 65, hipY: 35,
        lElbow: [10, 32], lHand: [2, 30],
        rElbow: [30, 55], rHand: [30, 72],
        lKnee: [58, 55], lFoot: [58, 72],
        rKnee: [78, 30], rFoot: [90, 28],
        hl: ['lArm', 'rLeg'], props: { mat: [5, 75, 80, 4], arrow: '5,32 2,30' }
      }
    },
    {
      id: 'pelvic_tilt',
      name: 'Pelvic Tilt',
      bodyPart: 'back',
      defaultSets: 3, defaultReps: 10, holdSeconds: 5,
      frame1: {
        headX: 18, headY: 35, hipX: 45, hipY: 40,
        lElbow: [25, 32], lHand: [30, 28],
        rElbow: [52, 35], rHand: [58, 30],
        lKnee: [55, 22], lFoot: [62, 40],
        rKnee: [58, 24], rFoot: [65, 42],
        hl: [], props: { mat: [5, 45, 85, 4] }
      },
      frame2: {
        headX: 18, headY: 35, hipX: 45, hipY: 38,
        lElbow: [25, 32], lHand: [30, 28],
        rElbow: [52, 33], rHand: [58, 28],
        lKnee: [55, 22], lFoot: [62, 40],
        rKnee: [58, 24], rFoot: [65, 42],
        hl: [], props: { mat: [5, 45, 85, 4], arrow: '45,44 45,38' }
      }
    },
    {
      id: 'bridge',
      name: 'Glute Bridge',
      bodyPart: 'back',
      defaultSets: 3, defaultReps: 10, holdSeconds: 5,
      frame1: {
        headX: 15, headY: 40, hipX: 42, hipY: 42,
        lElbow: [22, 38], lHand: [28, 35],
        rElbow: [50, 38], rHand: [56, 35],
        lKnee: [55, 24], lFoot: [62, 42],
        rKnee: [58, 26], rFoot: [65, 44],
        hl: ['lLeg', 'rLeg'], props: { mat: [5, 48, 85, 4] }
      },
      frame2: {
        headX: 15, headY: 40, hipX: 42, hipY: 28,
        lElbow: [22, 38], lHand: [28, 35],
        rElbow: [50, 32], rHand: [56, 28],
        lKnee: [55, 22], lFoot: [62, 42],
        rKnee: [58, 24], rFoot: [65, 44],
        hl: ['lLeg', 'rLeg'], props: { mat: [5, 48, 85, 4], arrow: '42,40 42,28' }
      }
    },
    {
      id: 'child_pose',
      name: 'Child\'s Pose',
      bodyPart: 'back',
      defaultSets: 3, defaultReps: 1, holdSeconds: 30,
      frame1: {
        headX: 25, headY: 35, hipX: 60, hipY: 38,
        lElbow: [20, 55], lHand: [18, 68],
        rElbow: [35, 55], rHand: [32, 68],
        lKnee: [55, 55], lFoot: [55, 68],
        rKnee: [68, 55], rFoot: [68, 68],
        hl: [], props: { mat: [5, 72, 80, 4] }
      },
      frame2: {
        headX: 18, headY: 42, hipX: 60, hipY: 42,
        lElbow: [12, 55], lHand: [5, 50],
        rElbow: [22, 55], rHand: [10, 48],
        lKnee: [55, 58], lFoot: [55, 68],
        rKnee: [68, 58], rFoot: [68, 68],
        hl: [], props: { mat: [5, 72, 80, 4], arrow: '12,48 5,50' }
      }
    },
    {
      id: 'trunk_rotation',
      name: 'Trunk Rotation (Lying)',
      bodyPart: 'back',
      defaultSets: 3, defaultReps: 10, holdSeconds: 5,
      frame1: {
        headX: 18, headY: 32, hipX: 45, hipY: 38,
        lElbow: [28, 22], lHand: [35, 15],
        rElbow: [52, 25], rHand: [60, 18],
        lKnee: [55, 22], lFoot: [60, 38],
        rKnee: [58, 24], rFoot: [62, 40],
        hl: ['lLeg', 'rLeg'], props: { mat: [5, 42, 85, 4] }
      },
      frame2: {
        headX: 18, headY: 32, hipX: 45, hipY: 38,
        lElbow: [28, 22], lHand: [35, 15],
        rElbow: [52, 25], rHand: [60, 18],
        lKnee: [50, 18], lFoot: [40, 20],
        rKnee: [52, 20], rFoot: [42, 22],
        hl: ['lLeg', 'rLeg'], props: { mat: [5, 42, 85, 4], arrow: '48,22 42,22' }
      }
    },
    {
      id: 'prone_extension',
      name: 'Prone Back Extension',
      bodyPart: 'back',
      defaultSets: 3, defaultReps: 10, holdSeconds: 5,
      frame1: {
        headX: 25, headY: 38, hipX: 65, hipY: 42,
        lElbow: [20, 48], lHand: [20, 58],
        rElbow: [35, 48], rHand: [35, 58],
        lKnee: [75, 48], lFoot: [88, 42],
        rKnee: [78, 50], rFoot: [90, 44],
        hl: [], props: { mat: [5, 52, 90, 4] }
      },
      frame2: {
        headX: 22, headY: 25, hipX: 65, hipY: 42,
        lElbow: [18, 38], lHand: [18, 48],
        rElbow: [32, 38], rHand: [32, 48],
        lKnee: [75, 48], lFoot: [88, 42],
        rKnee: [78, 50], rFoot: [90, 44],
        hl: [], props: { mat: [5, 52, 90, 4], arrow: '25,32 22,25' }
      }
    },
    {
      id: 'dead_bug',
      name: 'Dead Bug',
      bodyPart: 'back',
      defaultSets: 3, defaultReps: 10, holdSeconds: 3,
      frame1: {
        headX: 18, headY: 40, hipX: 45, hipY: 38,
        lElbow: [28, 28], lHand: [22, 20],
        rElbow: [52, 28], rHand: [48, 18],
        lKnee: [52, 22], lFoot: [48, 15],
        rKnee: [58, 22], rFoot: [55, 14],
        hl: ['rArm', 'lLeg'], props: { mat: [5, 45, 85, 4] }
      },
      frame2: {
        headX: 18, headY: 40, hipX: 45, hipY: 38,
        lElbow: [28, 28], lHand: [22, 20],
        rElbow: [55, 22], rHand: [62, 15],
        lKnee: [58, 30], lFoot: [68, 38],
        rKnee: [58, 22], rFoot: [55, 14],
        hl: ['rArm', 'lLeg'], props: { mat: [5, 45, 85, 4], arrow: '58,18 62,15' }
      }
    },
    {
      id: 'seated_rotation',
      name: 'Seated Trunk Rotation',
      bodyPart: 'back',
      defaultSets: 3, defaultReps: 10, holdSeconds: 5,
      frame1: {
        headX: 45, headY: 12, hipX: 45, hipY: 52,
        lElbow: [35, 35], lHand: [30, 45],
        rElbow: [55, 35], rHand: [60, 45],
        lKnee: [38, 72], lFoot: [35, 92],
        rKnee: [52, 72], rFoot: [55, 92],
        hl: [], props: { chair: '28,48 28,95 62,95 62,48', surface: [10, 98, 90, 98] }
      },
      frame2: {
        headX: 48, headY: 12, hipX: 45, hipY: 52,
        lElbow: [40, 35], lHand: [50, 42],
        rElbow: [58, 32], rHand: [68, 38],
        lKnee: [38, 72], lFoot: [35, 92],
        rKnee: [52, 72], rFoot: [55, 92],
        hl: [], props: { chair: '28,48 28,95 62,95 62,48', surface: [10, 98, 90, 98], arrow: '62,38 68,38' }
      }
    },

    // ==================== NECK ====================
    {
      id: 'chin_tuck',
      name: 'Chin Tuck',
      bodyPart: 'neck',
      defaultSets: 3, defaultReps: 15, holdSeconds: 5,
      frame1: {
        headX: 52, headY: 15, hipX: 50, hipY: 52,
        lElbow: [40, 40], lHand: [35, 52],
        rElbow: [60, 40], rHand: [65, 52],
        lKnee: [44, 76], lFoot: [42, 98],
        rKnee: [56, 76], rFoot: [58, 98],
        hl: [], props: { surface: [15, 102, 85, 102] }
      },
      frame2: {
        headX: 48, headY: 15, hipX: 50, hipY: 52,
        lElbow: [40, 40], lHand: [35, 52],
        rElbow: [60, 40], rHand: [65, 52],
        lKnee: [44, 76], lFoot: [42, 98],
        rKnee: [56, 76], rFoot: [58, 98],
        hl: [], props: { surface: [15, 102, 85, 102], arrow: '52,18 48,18' }
      }
    },
    {
      id: 'neck_side_bend',
      name: 'Neck Side Bend',
      bodyPart: 'neck',
      defaultSets: 3, defaultReps: 10, holdSeconds: 10,
      frame1: {
        headX: 50, headY: 12, hipX: 50, hipY: 52,
        lElbow: [40, 40], lHand: [35, 52],
        rElbow: [60, 40], rHand: [65, 52],
        lKnee: [44, 76], lFoot: [42, 98],
        rKnee: [56, 76], rFoot: [58, 98],
        hl: [], props: { surface: [15, 102, 85, 102] }
      },
      frame2: {
        headX: 42, headY: 14, hipX: 50, hipY: 52,
        lElbow: [40, 40], lHand: [35, 52],
        rElbow: [60, 40], rHand: [65, 52],
        lKnee: [44, 76], lFoot: [42, 98],
        rKnee: [56, 76], rFoot: [58, 98],
        hl: [], props: { surface: [15, 102, 85, 102], arrow: '48,12 42,14' }
      }
    },
    {
      id: 'neck_rotation',
      name: 'Neck Rotation',
      bodyPart: 'neck',
      defaultSets: 3, defaultReps: 10, holdSeconds: 10,
      frame1: {
        headX: 50, headY: 12, hipX: 50, hipY: 52,
        lElbow: [40, 40], lHand: [35, 52],
        rElbow: [60, 40], rHand: [65, 52],
        lKnee: [44, 76], lFoot: [42, 98],
        rKnee: [56, 76], rFoot: [58, 98],
        hl: [], props: { surface: [15, 102, 85, 102] }
      },
      frame2: {
        headX: 46, headY: 12, hipX: 50, hipY: 52,
        lElbow: [40, 40], lHand: [35, 52],
        rElbow: [60, 40], rHand: [65, 52],
        lKnee: [44, 76], lFoot: [42, 98],
        rKnee: [56, 76], rFoot: [58, 98],
        hl: [], props: { surface: [15, 102, 85, 102], arrow: '50,10 46,10' }
      }
    },
    {
      id: 'neck_isometric_forward',
      name: 'Isometric Neck (Forward)',
      bodyPart: 'neck',
      defaultSets: 3, defaultReps: 10, holdSeconds: 5,
      frame1: {
        headX: 50, headY: 12, hipX: 50, hipY: 52,
        lElbow: [40, 35], lHand: [44, 18],
        rElbow: [60, 35], rHand: [56, 18],
        lKnee: [44, 76], lFoot: [42, 98],
        rKnee: [56, 76], rFoot: [58, 98],
        hl: [], props: { surface: [15, 102, 85, 102] }
      },
      frame2: {
        headX: 50, headY: 12, hipX: 50, hipY: 52,
        lElbow: [40, 35], lHand: [44, 12],
        rElbow: [60, 35], rHand: [56, 12],
        lKnee: [44, 76], lFoot: [42, 98],
        rKnee: [56, 76], rFoot: [58, 98],
        hl: ['lArm', 'rArm'], props: { surface: [15, 102, 85, 102] }
      }
    },
    {
      id: 'neck_isometric_side',
      name: 'Isometric Neck (Side)',
      bodyPart: 'neck',
      defaultSets: 3, defaultReps: 10, holdSeconds: 5,
      frame1: {
        headX: 50, headY: 12, hipX: 50, hipY: 52,
        lElbow: [40, 40], lHand: [35, 52],
        rElbow: [62, 25], rHand: [60, 12],
        lKnee: [44, 76], lFoot: [42, 98],
        rKnee: [56, 76], rFoot: [58, 98],
        hl: ['rArm'], props: { surface: [15, 102, 85, 102] }
      },
      frame2: {
        headX: 50, headY: 12, hipX: 50, hipY: 52,
        lElbow: [40, 40], lHand: [35, 52],
        rElbow: [62, 22], rHand: [58, 10],
        lKnee: [44, 76], lFoot: [42, 98],
        rKnee: [56, 76], rFoot: [58, 98],
        hl: ['rArm'], props: { surface: [15, 102, 85, 102] }
      }
    },
    {
      id: 'upper_trap_stretch',
      name: 'Upper Trap Stretch',
      bodyPart: 'neck',
      defaultSets: 3, defaultReps: 1, holdSeconds: 30,
      frame1: {
        headX: 50, headY: 12, hipX: 50, hipY: 52,
        lElbow: [40, 40], lHand: [35, 52],
        rElbow: [60, 40], rHand: [65, 52],
        lKnee: [44, 76], lFoot: [42, 98],
        rKnee: [56, 76], rFoot: [58, 98],
        hl: [], props: { surface: [15, 102, 85, 102] }
      },
      frame2: {
        headX: 42, headY: 14, hipX: 50, hipY: 52,
        lElbow: [40, 40], lHand: [35, 52],
        rElbow: [60, 25], rHand: [55, 12],
        lKnee: [44, 76], lFoot: [42, 98],
        rKnee: [56, 76], rFoot: [58, 98],
        hl: ['rArm'], props: { surface: [15, 102, 85, 102], arrow: '48, 12 42,14' }
      }
    },
    {
      id: 'neck_flexion',
      name: 'Neck Flexion Stretch',
      bodyPart: 'neck',
      defaultSets: 3, defaultReps: 1, holdSeconds: 15,
      frame1: {
        headX: 50, headY: 12, hipX: 50, hipY: 52,
        lElbow: [40, 40], lHand: [35, 52],
        rElbow: [60, 40], rHand: [65, 52],
        lKnee: [44, 76], lFoot: [42, 98],
        rKnee: [56, 76], rFoot: [58, 98],
        hl: [], props: { surface: [15, 102, 85, 102] }
      },
      frame2: {
        headX: 50, headY: 18, hipX: 50, hipY: 52,
        lElbow: [40, 40], lHand: [35, 52],
        rElbow: [60, 40], rHand: [65, 52],
        lKnee: [44, 76], lFoot: [42, 98],
        rKnee: [56, 76], rFoot: [58, 98],
        hl: [], props: { surface: [15, 102, 85, 102], arrow: '50,14 50,18' }
      }
    },

    // ==================== ANKLE ====================
    {
      id: 'ankle_circle',
      name: 'Ankle Circle',
      bodyPart: 'ankle',
      defaultSets: 3, defaultReps: 10, holdSeconds: 0,
      frame1: {
        headX: 40, headY: 15, hipX: 40, hipY: 55,
        lElbow: [30, 45], lHand: [25, 55],
        rElbow: [50, 45], rHand: [55, 55],
        lKnee: [35, 75], lFoot: [35, 95],
        rKnee: [48, 72], rFoot: [55, 88],
        hl: ['rLeg'], props: { chair: '25,50 25,98 55,98 55,50', surface: [10, 102, 90, 102] }
      },
      frame2: {
        headX: 40, headY: 15, hipX: 40, hipY: 55,
        lElbow: [30, 45], lHand: [25, 55],
        rElbow: [50, 45], rHand: [55, 55],
        lKnee: [35, 75], lFoot: [35, 95],
        rKnee: [48, 72], rFoot: [48, 85],
        hl: ['rLeg'], props: { chair: '25,50 25,98 55,98 55,50', surface: [10, 102, 90, 102], arrow: '52,90 48,85' }
      }
    },
    {
      id: 'toe_raise',
      name: 'Toe Raise (Dorsiflexion)',
      bodyPart: 'ankle',
      defaultSets: 3, defaultReps: 15, holdSeconds: 2,
      frame1: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [40, 35], lHand: [35, 45],
        rElbow: [60, 35], rHand: [65, 45],
        lKnee: [45, 72], lFoot: [43, 95],
        rKnee: [55, 72], rFoot: [57, 95],
        hl: ['lLeg', 'rLeg'], props: { surface: [15, 100, 85, 100] }
      },
      frame2: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [40, 35], lHand: [35, 45],
        rElbow: [60, 35], rHand: [65, 45],
        lKnee: [45, 72], lFoot: [40, 92],
        rKnee: [55, 72], rFoot: [53, 92],
        hl: ['lLeg', 'rLeg'], props: { surface: [15, 100, 85, 100], arrow: '47,96 44,92' }
      }
    },
    {
      id: 'towel_scrunch',
      name: 'Towel Scrunch (Toe Curl)',
      bodyPart: 'ankle',
      defaultSets: 3, defaultReps: 15, holdSeconds: 0,
      frame1: {
        headX: 42, headY: 15, hipX: 42, hipY: 55,
        lElbow: [32, 45], lHand: [28, 55],
        rElbow: [52, 45], rHand: [58, 55],
        lKnee: [36, 75], lFoot: [34, 95],
        rKnee: [50, 75], rFoot: [50, 95],
        hl: ['rLeg'], props: { chair: '25,50 25,98 58,98 58,50', surface: [10, 100, 90, 100] }
      },
      frame2: {
        headX: 42, headY: 15, hipX: 42, hipY: 55,
        lElbow: [32, 45], lHand: [28, 55],
        rElbow: [52, 45], rHand: [58, 55],
        lKnee: [36, 75], lFoot: [34, 95],
        rKnee: [50, 75], rFoot: [48, 94],
        hl: ['rLeg'], props: { chair: '25,50 25,98 58,98 58,50', surface: [10, 100, 90, 100] }
      }
    },
    {
      id: 'single_leg_balance',
      name: 'Single Leg Balance',
      bodyPart: 'ankle',
      defaultSets: 3, defaultReps: 1, holdSeconds: 30,
      frame1: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 35], lHand: [30, 45],
        rElbow: [62, 35], rHand: [70, 45],
        lKnee: [45, 72], lFoot: [43, 95],
        rKnee: [55, 72], rFoot: [57, 95],
        hl: ['lLeg'], props: { surface: [15, 100, 85, 100] }
      },
      frame2: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [35, 30], lHand: [25, 35],
        rElbow: [65, 30], rHand: [75, 35],
        lKnee: [45, 72], lFoot: [43, 95],
        rKnee: [58, 60], rFoot: [55, 65],
        hl: ['lLeg'], props: { surface: [15, 100, 85, 100] }
      }
    },
    {
      id: 'ankle_dorsiflexion_band',
      name: 'Resistance Band Dorsiflexion',
      bodyPart: 'ankle',
      defaultSets: 3, defaultReps: 15, holdSeconds: 0,
      frame1: {
        headX: 25, headY: 25, hipX: 42, hipY: 40,
        lElbow: [30, 28], lHand: [35, 22],
        rElbow: [50, 30], rHand: [56, 24],
        lKnee: [55, 42], lFoot: [70, 45],
        rKnee: [55, 42], rFoot: [70, 45],
        hl: ['rLeg'], props: { mat: [10, 48, 80, 4] }
      },
      frame2: {
        headX: 25, headY: 25, hipX: 42, hipY: 40,
        lElbow: [30, 28], lHand: [35, 22],
        rElbow: [50, 30], rHand: [56, 24],
        lKnee: [55, 42], lFoot: [70, 38],
        rKnee: [55, 42], rFoot: [70, 45],
        hl: ['rLeg'], props: { mat: [10, 48, 80, 4], arrow: '70,44 70,38' }
      }
    },
    {
      id: 'heel_toe_walk',
      name: 'Heel-Toe Walk',
      bodyPart: 'ankle',
      defaultSets: 3, defaultReps: 1, holdSeconds: 0,
      frame1: {
        headX: 45, headY: 8, hipX: 45, hipY: 45,
        lElbow: [35, 30], lHand: [30, 40],
        rElbow: [55, 30], rHand: [60, 40],
        lKnee: [38, 68], lFoot: [32, 92],
        rKnee: [52, 68], rFoot: [58, 92],
        hl: ['lLeg', 'rLeg'], props: { surface: [10, 98, 90, 98] }
      },
      frame2: {
        headX: 48, headY: 8, hipX: 48, hipY: 45,
        lElbow: [38, 30], lHand: [33, 40],
        rElbow: [58, 30], rHand: [63, 40],
        lKnee: [42, 65], lFoot: [38, 85],
        rKnee: [55, 70], rFoot: [58, 92],
        hl: ['lLeg', 'rLeg'], props: { surface: [10, 98, 90, 98], arrow: '38,90 38,85' }
      }
    },

    // ==================== HIP ====================
    {
      id: 'clamshell',
      name: 'Clamshell',
      bodyPart: 'hip',
      defaultSets: 3, defaultReps: 15, holdSeconds: 2,
      frame1: {
        headX: 18, headY: 35, hipX: 48, hipY: 42,
        lElbow: [25, 28], lHand: [28, 22],
        rElbow: [38, 32], rHand: [42, 28],
        lKnee: [55, 28], lFoot: [48, 22],
        rKnee: [55, 55], rFoot: [48, 62],
        hl: ['lLeg'], props: { mat: [5, 48, 85, 4] }
      },
      frame2: {
        headX: 18, headY: 35, hipX: 48, hipY: 42,
        lElbow: [25, 28], lHand: [28, 22],
        rElbow: [38, 32], rHand: [42, 28],
        lKnee: [58, 18], lFoot: [50, 12],
        rKnee: [55, 55], rFoot: [48, 62],
        hl: ['lLeg'], props: { mat: [5, 48, 85, 4], arrow: '56,25 58,18' }
      }
    },
    {
      id: 'hip_flexor_stretch',
      name: 'Hip Flexor Stretch (Lunge)',
      bodyPart: 'hip',
      defaultSets: 3, defaultReps: 1, holdSeconds: 30,
      frame1: {
        headX: 45, headY: 8, hipX: 45, hipY: 45,
        lElbow: [35, 30], lHand: [30, 40],
        rElbow: [55, 30], rHand: [60, 40],
        lKnee: [38, 68], lFoot: [35, 92],
        rKnee: [55, 68], rFoot: [58, 92],
        hl: ['rLeg'], props: { surface: [10, 98, 90, 98] }
      },
      frame2: {
        headX: 45, headY: 8, hipX: 45, hipY: 48,
        lElbow: [35, 32], lHand: [30, 42],
        rElbow: [55, 32], rHand: [60, 42],
        lKnee: [30, 68], lFoot: [25, 92],
        rKnee: [62, 72], rFoot: [72, 92],
        hl: ['rLeg'], props: { surface: [10, 98, 90, 98], arrow: '60,75 65,80' }
      }
    },
    {
      id: 'glute_bridge_hip',
      name: 'Glute Bridge',
      bodyPart: 'hip',
      defaultSets: 3, defaultReps: 10, holdSeconds: 5,
      frame1: {
        headX: 15, headY: 40, hipX: 42, hipY: 42,
        lElbow: [22, 38], lHand: [28, 35],
        rElbow: [50, 38], rHand: [56, 35],
        lKnee: [55, 24], lFoot: [62, 42],
        rKnee: [58, 26], rFoot: [65, 44],
        hl: ['lLeg', 'rLeg'], props: { mat: [5, 48, 85, 4] }
      },
      frame2: {
        headX: 15, headY: 40, hipX: 42, hipY: 28,
        lElbow: [22, 38], lHand: [28, 35],
        rElbow: [50, 32], rHand: [56, 28],
        lKnee: [55, 22], lFoot: [62, 42],
        rKnee: [58, 24], rFoot: [65, 44],
        hl: ['lLeg', 'rLeg'], props: { mat: [5, 48, 85, 4], arrow: '42,40 42,28' }
      }
    },
    {
      id: 'side_lying_leg_raise',
      name: 'Side-Lying Leg Raise',
      bodyPart: 'hip',
      defaultSets: 3, defaultReps: 15, holdSeconds: 2,
      frame1: {
        headX: 15, headY: 38, hipX: 50, hipY: 42,
        lElbow: [22, 30], lHand: [20, 22],
        rElbow: [38, 35], rHand: [40, 28],
        lKnee: [60, 48], lFoot: [75, 45],
        rKnee: [60, 50], rFoot: [75, 48],
        hl: ['lLeg'], props: { mat: [5, 52, 85, 4] }
      },
      frame2: {
        headX: 15, headY: 38, hipX: 50, hipY: 42,
        lElbow: [22, 30], lHand: [20, 22],
        rElbow: [38, 35], rHand: [40, 28],
        lKnee: [60, 30], lFoot: [75, 25],
        rKnee: [60, 50], rFoot: [75, 48],
        hl: ['lLeg'], props: { mat: [5, 52, 85, 4], arrow: '68,38 72,28' }
      }
    },
    {
      id: 'figure_4_stretch',
      name: 'Figure-4 Stretch',
      bodyPart: 'hip',
      defaultSets: 3, defaultReps: 1, holdSeconds: 30,
      frame1: {
        headX: 18, headY: 35, hipX: 42, hipY: 40,
        lElbow: [25, 30], lHand: [30, 24],
        rElbow: [50, 32], rHand: [55, 26],
        lKnee: [52, 24], lFoot: [58, 38],
        rKnee: [56, 26], rFoot: [62, 40],
        hl: ['lLeg'], props: { mat: [5, 45, 85, 4] }
      },
      frame2: {
        headX: 18, headY: 35, hipX: 42, hipY: 40,
        lElbow: [30, 26], lHand: [38, 22],
        rElbow: [50, 28], rHand: [55, 22],
        lKnee: [50, 20], lFoot: [55, 28],
        rKnee: [55, 22], rFoot: [62, 38],
        hl: ['lLeg'], props: { mat: [5, 45, 85, 4], arrow: '52,26 50,20' }
      }
    },
    {
      id: 'standing_hip_abduction',
      name: 'Standing Hip Abduction',
      bodyPart: 'hip',
      defaultSets: 3, defaultReps: 15, holdSeconds: 2,
      frame1: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [40, 35], lHand: [35, 45],
        rElbow: [60, 35], rHand: [65, 45],
        lKnee: [45, 72], lFoot: [43, 95],
        rKnee: [55, 72], rFoot: [57, 95],
        hl: ['rLeg'], props: { surface: [15, 100, 85, 100] }
      },
      frame2: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [40, 35], lHand: [35, 45],
        rElbow: [60, 35], rHand: [65, 45],
        lKnee: [45, 72], lFoot: [43, 95],
        rKnee: [68, 65], rFoot: [78, 80],
        hl: ['rLeg'], props: { surface: [15, 100, 85, 100], arrow: '68,78 78,80' }
      }
    },
    {
      id: 'fire_hydrant',
      name: 'Fire Hydrant',
      bodyPart: 'hip',
      defaultSets: 3, defaultReps: 15, holdSeconds: 2,
      frame1: {
        headX: 22, headY: 32, hipX: 65, hipY: 35,
        lElbow: [18, 55], lHand: [18, 72],
        rElbow: [30, 55], rHand: [30, 72],
        lKnee: [58, 55], lFoot: [58, 72],
        rKnee: [72, 55], rFoot: [72, 72],
        hl: ['rLeg'], props: { mat: [5, 75, 80, 4] }
      },
      frame2: {
        headX: 22, headY: 32, hipX: 65, hipY: 35,
        lElbow: [18, 55], lHand: [18, 72],
        rElbow: [30, 55], rHand: [30, 72],
        lKnee: [58, 55], lFoot: [58, 72],
        rKnee: [82, 40], rFoot: [85, 55],
        hl: ['rLeg'], props: { mat: [5, 75, 80, 4], arrow: '78,48 82,40' }
      }
    },
    {
      id: 'hip_circle',
      name: 'Standing Hip Circle',
      bodyPart: 'hip',
      defaultSets: 3, defaultReps: 10, holdSeconds: 0,
      frame1: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [40, 35], lHand: [35, 45],
        rElbow: [60, 35], rHand: [65, 45],
        lKnee: [45, 72], lFoot: [43, 95],
        rKnee: [58, 62], rFoot: [62, 75],
        hl: ['rLeg'], props: { surface: [15, 100, 85, 100] }
      },
      frame2: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [40, 35], lHand: [35, 45],
        rElbow: [60, 35], rHand: [65, 45],
        lKnee: [45, 72], lFoot: [43, 95],
        rKnee: [55, 58], rFoot: [50, 68],
        hl: ['rLeg'], props: { surface: [15, 100, 85, 100], arrow: '58,68 55,62' }
      }
    },

    // ==================== WRIST ====================
    {
      id: 'wrist_curl',
      name: 'Wrist Curl (Flexion)',
      bodyPart: 'wrist',
      defaultSets: 3, defaultReps: 15, holdSeconds: 0,
      frame1: {
        headX: 42, headY: 15, hipX: 42, hipY: 55,
        lElbow: [32, 45], lHand: [28, 55],
        rElbow: [55, 42], rHand: [62, 52],
        lKnee: [36, 75], lFoot: [34, 95],
        rKnee: [50, 75], rFoot: [52, 95],
        hl: ['rArm'], props: { chair: '25,50 25,98 58,98 58,50', surface: [10, 100, 90, 100] }
      },
      frame2: {
        headX: 42, headY: 15, hipX: 42, hipY: 55,
        lElbow: [32, 45], lHand: [28, 55],
        rElbow: [55, 42], rHand: [62, 42],
        lKnee: [36, 75], lFoot: [34, 95],
        rKnee: [50, 75], rFoot: [52, 95],
        hl: ['rArm'], props: { chair: '25,50 25,98 58,98 58,50', surface: [10, 100, 90, 100], arrow: '62,50 62,42' }
      }
    },
    {
      id: 'wrist_extension',
      name: 'Wrist Extension',
      bodyPart: 'wrist',
      defaultSets: 3, defaultReps: 15, holdSeconds: 0,
      frame1: {
        headX: 42, headY: 15, hipX: 42, hipY: 55,
        lElbow: [32, 45], lHand: [28, 55],
        rElbow: [55, 42], rHand: [62, 42],
        lKnee: [36, 75], lFoot: [34, 95],
        rKnee: [50, 75], rFoot: [52, 95],
        hl: ['rArm'], props: { chair: '25,50 25,98 58,98 58,50', surface: [10, 100, 90, 100] }
      },
      frame2: {
        headX: 42, headY: 15, hipX: 42, hipY: 55,
        lElbow: [32, 45], lHand: [28, 55],
        rElbow: [55, 42], rHand: [62, 52],
        lKnee: [36, 75], lFoot: [34, 95],
        rKnee: [50, 75], rFoot: [52, 95],
        hl: ['rArm'], props: { chair: '25,50 25,98 58,98 58,50', surface: [10, 100, 90, 100], arrow: '62, 44 62,52' }
      }
    },
    {
      id: 'finger_spread',
      name: 'Finger Spread',
      bodyPart: 'wrist',
      defaultSets: 3, defaultReps: 15, holdSeconds: 5,
      frame1: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 35], lHand: [30, 45],
        rElbow: [62, 35], rHand: [70, 45],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['rArm'], props: { surface: [15, 100, 85, 100] }
      },
      frame2: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 35], lHand: [30, 45],
        rElbow: [62, 30], rHand: [72, 32],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['rArm'], props: { surface: [15, 100, 85, 100] }
      }
    },
    {
      id: 'grip_squeeze',
      name: 'Grip Squeeze (Ball)',
      bodyPart: 'wrist',
      defaultSets: 3, defaultReps: 15, holdSeconds: 5,
      frame1: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 35], lHand: [30, 45],
        rElbow: [62, 35], rHand: [70, 42],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['rArm'], props: { surface: [15, 100, 85, 100] }
      },
      frame2: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 35], lHand: [30, 45],
        rElbow: [62, 32], rHand: [70, 38],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['rArm'], props: { surface: [15, 100, 85, 100] }
      }
    },
    {
      id: 'wrist_circle',
      name: 'Wrist Circle',
      bodyPart: 'wrist',
      defaultSets: 3, defaultReps: 10, holdSeconds: 0,
      frame1: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 35], lHand: [30, 45],
        rElbow: [62, 32], rHand: [72, 35],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['rArm'], props: { surface: [15, 100, 85, 100] }
      },
      frame2: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 35], lHand: [30, 45],
        rElbow: [62, 32], rHand: [72, 28],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['rArm'], props: { surface: [15, 100, 85, 100], arrow: '72,34 72,28' }
      }
    },
    {
      id: 'prayer_stretch',
      name: 'Prayer Stretch',
      bodyPart: 'wrist',
      defaultSets: 3, defaultReps: 1, holdSeconds: 30,
      frame1: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 35], lHand: [48, 28],
        rElbow: [62, 35], rHand: [52, 28],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['lArm', 'rArm'], props: { surface: [15, 100, 85, 100] }
      },
      frame2: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 40], lHand: [48, 35],
        rElbow: [62, 40], rHand: [52, 35],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['lArm', 'rArm'], props: { surface: [15, 100, 85, 100], arrow: '50,30 50,35' }
      }
    },

    // ==================== KNEE (additional) ====================
    {
      id: 'short_arc_quad',
      name: 'Short Arc Quad (VMO)',
      bodyPart: 'knee',
      defaultSets: 3, defaultReps: 15, holdSeconds: 5,
      frame1: {
        headX: 25, headY: 30, hipX: 50, hipY: 35,
        lElbow: [35, 25], lHand: [40, 18],
        rElbow: [60, 28], rHand: [68, 22],
        lKnee: [60, 50], lFoot: [68, 68],
        rKnee: [60, 50], rFoot: [68, 68],
        hl: ['rLeg'], props: { mat: [10, 38, 80, 4] }
      },
      frame2: {
        headX: 25, headY: 30, hipX: 50, hipY: 35,
        lElbow: [35, 25], lHand: [40, 18],
        rElbow: [60, 28], rHand: [68, 22],
        lKnee: [60, 50], lFoot: [68, 68],
        rKnee: [62, 45], rFoot: [75, 38],
        hl: ['rLeg'], props: { mat: [10, 38, 80, 4], arrow: '72,42 75,38' }
      }
    },
    {
      id: 'static_quad_hold',
      name: 'Static Quad Contraction',
      bodyPart: 'knee',
      defaultSets: 3, defaultReps: 10, holdSeconds: 10,
      frame1: {
        headX: 25, headY: 30, hipX: 50, hipY: 35,
        lElbow: [35, 25], lHand: [40, 18],
        rElbow: [60, 28], rHand: [68, 22],
        lKnee: [62, 48], lFoot: [72, 65],
        rKnee: [62, 48], rFoot: [72, 65],
        hl: ['lLeg', 'rLeg'], props: { mat: [10, 38, 80, 4] }
      },
      frame2: {
        headX: 25, headY: 30, hipX: 50, hipY: 35,
        lElbow: [35, 25], lHand: [40, 18],
        rElbow: [60, 28], rHand: [68, 22],
        lKnee: [64, 42], lFoot: [78, 36],
        rKnee: [64, 42], rFoot: [78, 36],
        hl: ['lLeg', 'rLeg'], props: { mat: [10, 38, 80, 4] }
      }
    },
    {
      id: 'seated_knee_extension',
      name: 'Seated Knee Extension',
      bodyPart: 'knee',
      defaultSets: 3, defaultReps: 12, holdSeconds: 3,
      frame1: {
        headX: 30, headY: 10, hipX: 35, hipY: 48,
        lElbow: [22, 35], lHand: [18, 45],
        rElbow: [45, 35], rHand: [50, 45],
        lKnee: [42, 72], lFoot: [45, 95],
        rKnee: [50, 72], rFoot: [52, 95],
        hl: ['rLeg'], props: { chair: '15,42 15,98 55,98 55,42', surface: [10, 100, 90, 100] }
      },
      frame2: {
        headX: 30, headY: 10, hipX: 35, hipY: 48,
        lElbow: [22, 35], lHand: [18, 45],
        rElbow: [45, 35], rHand: [50, 45],
        lKnee: [42, 72], lFoot: [45, 95],
        rKnee: [50, 68], rFoot: [68, 65],
        hl: ['rLeg'], props: { chair: '15,42 15,98 55,98 55,42', surface: [10, 100, 90, 100], arrow: '60,70 68,65' }
      }
    },
    {
      id: 'standing_hamstring_curl',
      name: 'Standing Hamstring Curl',
      bodyPart: 'knee',
      defaultSets: 3, defaultReps: 12, holdSeconds: 2,
      frame1: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 35], lHand: [32, 45],
        rElbow: [62, 35], rHand: [68, 45],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['rLeg'], props: { surface: [15, 100, 85, 100] }
      },
      frame2: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 35], lHand: [32, 45],
        rElbow: [62, 35], rHand: [68, 45],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 55],
        hl: ['rLeg'], props: { surface: [15, 100, 85, 100], arrow: '58,65 58,55' }
      }
    },
    {
      id: 'pillow_squeeze',
      name: 'Pillow Squeeze (Adductor)',
      bodyPart: 'knee',
      defaultSets: 3, defaultReps: 15, holdSeconds: 5,
      frame1: {
        headX: 25, headY: 30, hipX: 50, hipY: 35,
        lElbow: [35, 25], lHand: [40, 18],
        rElbow: [60, 28], rHand: [68, 22],
        lKnee: [55, 55], lFoot: [50, 75],
        rKnee: [65, 55], rFoot: [70, 75],
        hl: ['lLeg', 'rLeg'], props: { mat: [10, 38, 80, 4] }
      },
      frame2: {
        headX: 25, headY: 30, hipX: 50, hipY: 35,
        lElbow: [35, 25], lHand: [40, 18],
        rElbow: [60, 28], rHand: [68, 22],
        lKnee: [58, 55], lFoot: [52, 75],
        rKnee: [62, 55], rFoot: [68, 75],
        hl: ['lLeg', 'rLeg'], props: { mat: [10, 38, 80, 4] }
      }
    },

    // ==================== SHOULDER (additional) ====================
    {
      id: 'sleeper_stretch',
      name: 'Sleeper Stretch',
      bodyPart: 'shoulder',
      defaultSets: 3, defaultReps: 1, holdSeconds: 30,
      frame1: {
        headX: 20, headY: 80, hipX: 55, hipY: 82,
        lElbow: [30, 72], lHand: [35, 60],
        rElbow: [42, 72], rHand: [42, 60],
        lKnee: [65, 75], lFoot: [75, 90],
        rKnee: [68, 78], rFoot: [78, 92],
        hl: ['lArm'], props: { mat: [8, 85, 82, 4] }
      },
      frame2: {
        headX: 20, headY: 80, hipX: 55, hipY: 82,
        lElbow: [30, 72], lHand: [30, 90],
        rElbow: [42, 72], rHand: [38, 88],
        lKnee: [65, 75], lFoot: [75, 90],
        rKnee: [68, 78], rFoot: [78, 92],
        hl: ['lArm'], props: { mat: [8, 85, 82, 4], arrow: '34,65 32,85' }
      }
    },
    {
      id: 'doorway_pec_stretch',
      name: 'Doorway Pec Stretch',
      bodyPart: 'shoulder',
      defaultSets: 3, defaultReps: 1, holdSeconds: 30,
      frame1: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [30, 22], lHand: [20, 10],
        rElbow: [70, 22], rHand: [80, 10],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['lArm', 'rArm'], props: { wall: [18, 2, 18, 98], surface: [15, 100, 85, 100] }
      },
      frame2: {
        headX: 55, headY: 10, hipX: 55, hipY: 48,
        lElbow: [30, 22], lHand: [20, 10],
        rElbow: [72, 22], rHand: [82, 10],
        lKnee: [49, 72], lFoot: [47, 95],
        rKnee: [61, 72], rFoot: [63, 95],
        hl: ['lArm', 'rArm'], props: { wall: [18, 2, 18, 98], surface: [15, 100, 85, 100], arrow: '50,30 55,30' }
      }
    },
    {
      id: 'band_pull_apart',
      name: 'Band Pull Apart',
      bodyPart: 'shoulder',
      defaultSets: 3, defaultReps: 15, holdSeconds: 2,
      frame1: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 28], lHand: [38, 32],
        rElbow: [62, 28], rHand: [62, 32],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['lArm', 'rArm'], props: { surface: [15, 100, 85, 100] }
      },
      frame2: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [30, 28], lHand: [18, 32],
        rElbow: [70, 28], rHand: [82, 32],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['lArm', 'rArm'], props: { surface: [15, 100, 85, 100] }
      }
    },
    {
      id: 'prone_y_raise',
      name: 'Prone Y Raise',
      bodyPart: 'shoulder',
      defaultSets: 3, defaultReps: 10, holdSeconds: 3,
      frame1: {
        headX: 25, headY: 78, hipX: 55, hipY: 80,
        lElbow: [18, 70], lHand: [12, 65],
        rElbow: [18, 85], rHand: [12, 90],
        lKnee: [68, 80], lFoot: [82, 82],
        rKnee: [72, 82], rFoot: [86, 84],
        hl: ['lArm', 'rArm'], props: { mat: [5, 83, 85, 4] }
      },
      frame2: {
        headX: 25, headY: 75, hipX: 55, hipY: 80,
        lElbow: [15, 62], lHand: [8, 50],
        rElbow: [15, 88], rHand: [8, 95],
        lKnee: [68, 80], lFoot: [82, 82],
        rKnee: [72, 82], rFoot: [86, 84],
        hl: ['lArm', 'rArm'], props: { mat: [5, 83, 85, 4], arrow: '10,60 8,50' }
      }
    },
    {
      id: 'shoulder_flexion_wand',
      name: 'Shoulder Flexion with Wand',
      bodyPart: 'shoulder',
      defaultSets: 3, defaultReps: 10, holdSeconds: 5,
      frame1: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [36, 35], lHand: [30, 42],
        rElbow: [64, 35], rHand: [70, 42],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['lArm', 'rArm'], props: { surface: [15, 100, 85, 100] }
      },
      frame2: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [36, 15], lHand: [32, 2],
        rElbow: [64, 15], rHand: [68, 2],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['lArm', 'rArm'], props: { surface: [15, 100, 85, 100], arrow: '50,15 50,5' }
      }
    },

    // ==================== BACK (additional) ====================
    {
      id: 'superman',
      name: 'Superman',
      bodyPart: 'back',
      defaultSets: 3, defaultReps: 10, holdSeconds: 5,
      frame1: {
        headX: 22, headY: 78, hipX: 50, hipY: 80,
        lElbow: [15, 72], lHand: [8, 78],
        rElbow: [15, 85], rHand: [8, 88],
        lKnee: [65, 80], lFoot: [80, 82],
        rKnee: [70, 82], rFoot: [85, 84],
        hl: ['lArm', 'rArm', 'lLeg', 'rLeg'], props: { mat: [3, 84, 90, 4] }
      },
      frame2: {
        headX: 18, headY: 70, hipX: 50, hipY: 80,
        lElbow: [10, 62], lHand: [4, 55],
        rElbow: [10, 75], rHand: [4, 68],
        lKnee: [68, 74], lFoot: [85, 68],
        rKnee: [72, 76], rFoot: [88, 70],
        hl: ['lArm', 'rArm', 'lLeg', 'rLeg'], props: { mat: [3, 84, 90, 4] }
      }
    },
    {
      id: 'mckenzie_press_up',
      name: 'McKenzie Press-Up',
      bodyPart: 'back',
      defaultSets: 3, defaultReps: 10, holdSeconds: 5,
      frame1: {
        headX: 22, headY: 78, hipX: 55, hipY: 82,
        lElbow: [28, 80], lHand: [25, 85],
        rElbow: [38, 82], rHand: [35, 87],
        lKnee: [68, 82], lFoot: [82, 84],
        rKnee: [72, 84], rFoot: [86, 86],
        hl: ['back'], props: { mat: [5, 86, 85, 4] }
      },
      frame2: {
        headX: 25, headY: 58, hipX: 55, hipY: 82,
        lElbow: [32, 72], lHand: [30, 82],
        rElbow: [42, 74], rHand: [40, 84],
        lKnee: [68, 82], lFoot: [82, 84],
        rKnee: [72, 84], rFoot: [86, 86],
        hl: ['back'], props: { mat: [5, 86, 85, 4], arrow: '28,68 25,60' }
      }
    },
    {
      id: 'knee_rolls',
      name: 'Knee Rolls (Windshield Wipers)',
      bodyPart: 'back',
      defaultSets: 3, defaultReps: 10, holdSeconds: 0,
      frame1: {
        headX: 20, headY: 84, hipX: 45, hipY: 80,
        lElbow: [10, 78], lHand: [5, 72],
        rElbow: [30, 78], rHand: [35, 72],
        lKnee: [55, 60], lFoot: [55, 78],
        rKnee: [58, 62], rFoot: [58, 80],
        hl: ['lLeg', 'rLeg'], props: { mat: [5, 86, 80, 4] }
      },
      frame2: {
        headX: 20, headY: 84, hipX: 45, hipY: 80,
        lElbow: [10, 78], lHand: [5, 72],
        rElbow: [30, 78], rHand: [35, 72],
        lKnee: [65, 68], lFoot: [72, 82],
        rKnee: [68, 70], rFoot: [75, 84],
        hl: ['lLeg', 'rLeg'], props: { mat: [5, 86, 80, 4] }
      }
    },
    {
      id: 'plank',
      name: 'Plank Hold',
      bodyPart: 'back',
      defaultSets: 3, defaultReps: 1, holdSeconds: 30,
      frame1: {
        headX: 18, headY: 68, hipX: 50, hipY: 72,
        lElbow: [22, 78], lHand: [18, 82],
        rElbow: [28, 80], rHand: [24, 84],
        lKnee: [65, 72], lFoot: [82, 74],
        rKnee: [68, 74], rFoot: [85, 76],
        hl: [], props: { mat: [5, 82, 85, 4] }
      },
      frame2: {
        headX: 18, headY: 66, hipX: 50, hipY: 70,
        lElbow: [22, 76], lHand: [18, 80],
        rElbow: [28, 78], rHand: [24, 82],
        lKnee: [65, 70], lFoot: [82, 72],
        rKnee: [68, 72], rFoot: [85, 74],
        hl: [], props: { mat: [5, 82, 85, 4] }
      }
    },
    {
      id: 'side_plank',
      name: 'Side Plank',
      bodyPart: 'back',
      defaultSets: 3, defaultReps: 1, holdSeconds: 20,
      frame1: {
        headX: 22, headY: 30, hipX: 50, hipY: 60,
        lElbow: [25, 55], lHand: [22, 75],
        rElbow: [35, 20], rHand: [38, 8],
        lKnee: [62, 72], lFoot: [78, 82],
        rKnee: [65, 75], rFoot: [80, 85],
        hl: [], props: { surface: [10, 88, 90, 88] }
      },
      frame2: {
        headX: 22, headY: 28, hipX: 50, hipY: 56,
        lElbow: [25, 52], lHand: [22, 72],
        rElbow: [35, 18], rHand: [38, 5],
        lKnee: [62, 68], lFoot: [78, 78],
        rKnee: [65, 71], rFoot: [80, 81],
        hl: [], props: { surface: [10, 88, 90, 88] }
      }
    },

    // ==================== NECK (additional) ====================
    {
      id: 'levator_scap_stretch',
      name: 'Levator Scapulae Stretch',
      bodyPart: 'neck',
      defaultSets: 3, defaultReps: 1, holdSeconds: 30,
      frame1: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 35], lHand: [32, 45],
        rElbow: [62, 35], rHand: [68, 45],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['neck'], props: { surface: [15, 100, 85, 100] }
      },
      frame2: {
        headX: 44, headY: 12, hipX: 50, hipY: 48,
        lElbow: [38, 35], lHand: [42, 8],
        rElbow: [62, 35], rHand: [68, 45],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['neck'], props: { surface: [15, 100, 85, 100], arrow: '48,8 44,12' }
      }
    },
    {
      id: 'scm_stretch',
      name: 'SCM Stretch',
      bodyPart: 'neck',
      defaultSets: 3, defaultReps: 1, holdSeconds: 20,
      frame1: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 35], lHand: [32, 45],
        rElbow: [62, 35], rHand: [68, 45],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['neck'], props: { surface: [15, 100, 85, 100] }
      },
      frame2: {
        headX: 55, headY: 8, hipX: 50, hipY: 48,
        lElbow: [38, 35], lHand: [32, 45],
        rElbow: [62, 35], rHand: [68, 45],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['neck'], props: { surface: [15, 100, 85, 100] }
      }
    },
    {
      id: 'neck_retraction_overpressure',
      name: 'Neck Retraction + Overpressure',
      bodyPart: 'neck',
      defaultSets: 3, defaultReps: 10, holdSeconds: 5,
      frame1: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 35], lHand: [32, 45],
        rElbow: [62, 35], rHand: [68, 45],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['neck'], props: { surface: [15, 100, 85, 100] }
      },
      frame2: {
        headX: 48, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 35], lHand: [32, 45],
        rElbow: [55, 18], rHand: [50, 6],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['neck', 'rArm'], props: { surface: [15, 100, 85, 100], arrow: '50,8 48,10' }
      }
    },

    // ==================== ANKLE (additional) ====================
    {
      id: 'calf_stretch_wall',
      name: 'Wall Calf Stretch',
      bodyPart: 'ankle',
      defaultSets: 3, defaultReps: 1, holdSeconds: 30,
      frame1: {
        headX: 40, headY: 10, hipX: 45, hipY: 48,
        lElbow: [30, 22], lHand: [22, 12],
        rElbow: [52, 22], rHand: [22, 14],
        lKnee: [38, 68], lFoot: [35, 95],
        rKnee: [55, 72], rFoot: [62, 95],
        hl: ['rLeg'], props: { wall: [18, 2, 18, 98], surface: [15, 100, 85, 100] }
      },
      frame2: {
        headX: 38, headY: 10, hipX: 42, hipY: 48,
        lElbow: [28, 22], lHand: [22, 12],
        rElbow: [50, 22], rHand: [22, 14],
        lKnee: [36, 68], lFoot: [33, 95],
        rKnee: [52, 72], rFoot: [65, 95],
        hl: ['rLeg'], props: { wall: [18, 2, 18, 98], surface: [15, 100, 85, 100] }
      }
    },
    {
      id: 'ankle_pump',
      name: 'Ankle Pump',
      bodyPart: 'ankle',
      defaultSets: 3, defaultReps: 20, holdSeconds: 0,
      frame1: {
        headX: 25, headY: 30, hipX: 50, hipY: 35,
        lElbow: [35, 25], lHand: [40, 18],
        rElbow: [60, 28], rHand: [68, 22],
        lKnee: [62, 42], lFoot: [78, 38],
        rKnee: [62, 42], rFoot: [78, 38],
        hl: ['lLeg', 'rLeg'], props: { mat: [10, 38, 80, 4] }
      },
      frame2: {
        headX: 25, headY: 30, hipX: 50, hipY: 35,
        lElbow: [35, 25], lHand: [40, 18],
        rElbow: [60, 28], rHand: [68, 22],
        lKnee: [62, 42], lFoot: [78, 44],
        rKnee: [62, 42], rFoot: [78, 44],
        hl: ['lLeg', 'rLeg'], props: { mat: [10, 38, 80, 4], arrow: '78,40 78,44' }
      }
    },
    {
      id: 'band_eversion',
      name: 'Resistance Band Eversion',
      bodyPart: 'ankle',
      defaultSets: 3, defaultReps: 15, holdSeconds: 2,
      frame1: {
        headX: 30, headY: 10, hipX: 35, hipY: 48,
        lElbow: [22, 35], lHand: [18, 45],
        rElbow: [45, 35], rHand: [50, 45],
        lKnee: [40, 72], lFoot: [40, 95],
        rKnee: [50, 72], rFoot: [50, 95],
        hl: ['rLeg'], props: { chair: '15,42 15,98 55,98 55,42', surface: [10, 100, 90, 100] }
      },
      frame2: {
        headX: 30, headY: 10, hipX: 35, hipY: 48,
        lElbow: [22, 35], lHand: [18, 45],
        rElbow: [45, 35], rHand: [50, 45],
        lKnee: [40, 72], lFoot: [40, 95],
        rKnee: [50, 72], rFoot: [56, 95],
        hl: ['rLeg'], props: { chair: '15,42 15,98 55,98 55,42', surface: [10, 100, 90, 100], arrow: '52,95 56,95' }
      }
    },
    {
      id: 'band_inversion',
      name: 'Resistance Band Inversion',
      bodyPart: 'ankle',
      defaultSets: 3, defaultReps: 15, holdSeconds: 2,
      frame1: {
        headX: 30, headY: 10, hipX: 35, hipY: 48,
        lElbow: [22, 35], lHand: [18, 45],
        rElbow: [45, 35], rHand: [50, 45],
        lKnee: [40, 72], lFoot: [42, 95],
        rKnee: [50, 72], rFoot: [52, 95],
        hl: ['rLeg'], props: { chair: '15,42 15,98 55,98 55,42', surface: [10, 100, 90, 100] }
      },
      frame2: {
        headX: 30, headY: 10, hipX: 35, hipY: 48,
        lElbow: [22, 35], lHand: [18, 45],
        rElbow: [45, 35], rHand: [50, 45],
        lKnee: [40, 72], lFoot: [42, 95],
        rKnee: [50, 72], rFoot: [46, 95],
        hl: ['rLeg'], props: { chair: '15,42 15,98 55,98 55,42', surface: [10, 100, 90, 100], arrow: '50,95 46,95' }
      }
    },

    // ==================== HIP (additional) ====================
    {
      id: 'piriformis_stretch',
      name: 'Piriformis Stretch (Figure 4 Seated)',
      bodyPart: 'hip',
      defaultSets: 3, defaultReps: 1, holdSeconds: 30,
      frame1: {
        headX: 30, headY: 10, hipX: 35, hipY: 48,
        lElbow: [22, 35], lHand: [18, 45],
        rElbow: [45, 35], rHand: [50, 45],
        lKnee: [42, 72], lFoot: [45, 95],
        rKnee: [55, 62], rFoot: [42, 65],
        hl: ['rLeg'], props: { chair: '15,42 15,98 55,98 55,42', surface: [10, 100, 90, 100] }
      },
      frame2: {
        headX: 32, headY: 14, hipX: 35, hipY: 48,
        lElbow: [22, 35], lHand: [18, 45],
        rElbow: [45, 35], rHand: [50, 45],
        lKnee: [42, 72], lFoot: [45, 95],
        rKnee: [55, 62], rFoot: [42, 65],
        hl: ['rLeg'], props: { chair: '15,42 15,98 55,98 55,42', surface: [10, 100, 90, 100], arrow: '32,20 32,14' }
      }
    },
    {
      id: 'butterfly_stretch',
      name: 'Butterfly Stretch (Groin)',
      bodyPart: 'hip',
      defaultSets: 3, defaultReps: 1, holdSeconds: 30,
      frame1: {
        headX: 50, headY: 20, hipX: 50, hipY: 55,
        lElbow: [38, 50], lHand: [42, 65],
        rElbow: [62, 50], rHand: [58, 65],
        lKnee: [30, 65], lFoot: [45, 72],
        rKnee: [70, 65], rFoot: [55, 72],
        hl: ['lLeg', 'rLeg'], props: { mat: [15, 75, 70, 4] }
      },
      frame2: {
        headX: 50, headY: 20, hipX: 50, hipY: 55,
        lElbow: [36, 50], lHand: [35, 62],
        rElbow: [64, 50], rHand: [65, 62],
        lKnee: [25, 62], lFoot: [45, 72],
        rKnee: [75, 62], rFoot: [55, 72],
        hl: ['lLeg', 'rLeg'], props: { mat: [15, 75, 70, 4] }
      }
    },
    {
      id: 'it_band_stretch',
      name: 'IT Band Stretch (Standing)',
      bodyPart: 'hip',
      defaultSets: 3, defaultReps: 1, holdSeconds: 30,
      frame1: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 35], lHand: [32, 45],
        rElbow: [62, 35], rHand: [68, 45],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['rLeg'], props: { surface: [15, 100, 85, 100] }
      },
      frame2: {
        headX: 45, headY: 10, hipX: 48, hipY: 48,
        lElbow: [33, 22], lHand: [28, 8],
        rElbow: [60, 35], rHand: [65, 45],
        lKnee: [40, 72], lFoot: [38, 95],
        rKnee: [52, 72], rFoot: [35, 95],
        hl: ['rLeg'], props: { surface: [15, 100, 85, 100] }
      }
    },
    {
      id: 'monster_walk',
      name: 'Monster Walk (Band)',
      bodyPart: 'hip',
      defaultSets: 3, defaultReps: 20, holdSeconds: 0,
      frame1: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 32], lHand: [35, 40],
        rElbow: [62, 32], rHand: [65, 40],
        lKnee: [38, 72], lFoot: [34, 95],
        rKnee: [62, 72], rFoot: [66, 95],
        hl: ['lLeg', 'rLeg'], props: { surface: [10, 100, 90, 100] }
      },
      frame2: {
        headX: 52, headY: 10, hipX: 52, hipY: 48,
        lElbow: [40, 32], lHand: [37, 40],
        rElbow: [64, 32], rHand: [67, 40],
        lKnee: [34, 68], lFoot: [28, 90],
        rKnee: [64, 75], rFoot: [70, 95],
        hl: ['lLeg', 'rLeg'], props: { surface: [10, 100, 90, 100] }
      }
    },

    // ==================== WRIST (additional) ====================
    {
      id: 'thumb_opposition',
      name: 'Thumb Opposition',
      bodyPart: 'wrist',
      defaultSets: 3, defaultReps: 10, holdSeconds: 2,
      frame1: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 35], lHand: [30, 45],
        rElbow: [62, 32], rHand: [70, 38],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['rArm'], props: { surface: [15, 100, 85, 100] }
      },
      frame2: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 35], lHand: [30, 45],
        rElbow: [62, 30], rHand: [72, 32],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['rArm'], props: { surface: [15, 100, 85, 100] }
      }
    },
    {
      id: 'radial_ulnar_deviation',
      name: 'Radial/Ulnar Deviation',
      bodyPart: 'wrist',
      defaultSets: 3, defaultReps: 12, holdSeconds: 0,
      frame1: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 35], lHand: [30, 45],
        rElbow: [62, 32], rHand: [72, 28],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['rArm'], props: { surface: [15, 100, 85, 100] }
      },
      frame2: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 35], lHand: [30, 45],
        rElbow: [62, 32], rHand: [72, 38],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['rArm'], props: { surface: [15, 100, 85, 100] }
      }
    },

    // ==================== ELBOW (new body part) ====================
    {
      id: 'bicep_curl',
      name: 'Bicep Curl',
      bodyPart: 'elbow',
      defaultSets: 3, defaultReps: 12, holdSeconds: 2,
      frame1: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 35], lHand: [32, 45],
        rElbow: [62, 35], rHand: [68, 45],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['rArm'], props: { surface: [15, 100, 85, 100] }
      },
      frame2: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 35], lHand: [32, 45],
        rElbow: [62, 35], rHand: [65, 22],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['rArm'], props: { surface: [15, 100, 85, 100], arrow: '66,30 65,22' }
      }
    },
    {
      id: 'tricep_extension',
      name: 'Tricep Extension (Overhead)',
      bodyPart: 'elbow',
      defaultSets: 3, defaultReps: 12, holdSeconds: 2,
      frame1: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 35], lHand: [32, 45],
        rElbow: [58, 5], rHand: [52, 18],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['rArm'], props: { surface: [15, 100, 85, 100] }
      },
      frame2: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 35], lHand: [32, 45],
        rElbow: [58, 5], rHand: [62, 2],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['rArm'], props: { surface: [15, 100, 85, 100], arrow: '58,10 62,2' }
      }
    },
    {
      id: 'forearm_pronation_supination',
      name: 'Forearm Pronation/Supination',
      bodyPart: 'elbow',
      defaultSets: 3, defaultReps: 15, holdSeconds: 0,
      frame1: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 35], lHand: [30, 45],
        rElbow: [62, 32], rHand: [72, 30],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['rArm'], props: { surface: [15, 100, 85, 100] }
      },
      frame2: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 35], lHand: [30, 45],
        rElbow: [62, 32], rHand: [72, 36],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['rArm'], props: { surface: [15, 100, 85, 100] }
      }
    },
    {
      id: 'tennis_elbow_stretch',
      name: 'Tennis Elbow Stretch (Wrist Extensor)',
      bodyPart: 'elbow',
      defaultSets: 3, defaultReps: 1, holdSeconds: 30,
      frame1: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 28], lHand: [35, 38],
        rElbow: [55, 28], rHand: [48, 35],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['lArm', 'rArm'], props: { surface: [15, 100, 85, 100] }
      },
      frame2: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 28], lHand: [35, 42],
        rElbow: [48, 28], rHand: [40, 38],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['lArm', 'rArm'], props: { surface: [15, 100, 85, 100], arrow: '42,36 40,38' }
      }
    },
    {
      id: 'golfer_elbow_stretch',
      name: "Golfer's Elbow Stretch (Wrist Flexor)",
      bodyPart: 'elbow',
      defaultSets: 3, defaultReps: 1, holdSeconds: 30,
      frame1: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 28], lHand: [35, 35],
        rElbow: [52, 28], rHand: [42, 30],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['lArm', 'rArm'], props: { surface: [15, 100, 85, 100] }
      },
      frame2: {
        headX: 50, headY: 10, hipX: 50, hipY: 48,
        lElbow: [38, 28], lHand: [35, 30],
        rElbow: [52, 28], rHand: [42, 25],
        lKnee: [44, 72], lFoot: [42, 95],
        rKnee: [56, 72], rFoot: [58, 95],
        hl: ['lArm', 'rArm'], props: { surface: [15, 100, 85, 100], arrow: '42,28 42,25' }
      }
    }
  ];

  // ===== PUBLIC API =====
  function getAll() {
    return exercises;
  }

  function getByBodyPart(part) {
    var result = [];
    for (var i = 0; i < exercises.length; i++) {
      if (exercises[i].bodyPart === part) result.push(exercises[i]);
    }
    return result;
  }

  function getById(id) {
    for (var i = 0; i < exercises.length; i++) {
      if (exercises[i].id === id) return exercises[i];
    }
    return null;
  }

  function getBodyParts() {
    return [
      { id: 'knee', name: 'Knee' },
      { id: 'shoulder', name: 'Shoulder' },
      { id: 'back', name: 'Back' },
      { id: 'neck', name: 'Neck' },
      { id: 'ankle', name: 'Ankle' },
      { id: 'hip', name: 'Hip' },
      { id: 'wrist', name: 'Wrist/Hand' },
      { id: 'elbow', name: 'Elbow' }
    ];
  }

  // ===== SMOOTH ANIMATION SYSTEM =====
  // Interpolates between frame1 and frame2 joint positions for fluid motion

  function lerp(a, b, t) { return a + (b - a) * t; }

  function lerpPose(f1, f2, t) {
    return {
      headX: lerp(f1.headX, f2.headX, t),
      headY: lerp(f1.headY, f2.headY, t),
      hipX: lerp(f1.hipX, f2.hipX, t),
      hipY: lerp(f1.hipY, f2.hipY, t),
      lElbow: [lerp(f1.lElbow[0], f2.lElbow[0], t), lerp(f1.lElbow[1], f2.lElbow[1], t)],
      lHand: [lerp(f1.lHand[0], f2.lHand[0], t), lerp(f1.lHand[1], f2.lHand[1], t)],
      rElbow: [lerp(f1.rElbow[0], f2.rElbow[0], t), lerp(f1.rElbow[1], f2.rElbow[1], t)],
      rHand: [lerp(f1.rHand[0], f2.rHand[0], t), lerp(f1.rHand[1], f2.rHand[1], t)],
      lKnee: [lerp(f1.lKnee[0], f2.lKnee[0], t), lerp(f1.lKnee[1], f2.lKnee[1], t)],
      lFoot: [lerp(f1.lFoot[0], f2.lFoot[0], t), lerp(f1.lFoot[1], f2.lFoot[1], t)],
      rKnee: [lerp(f1.rKnee[0], f2.rKnee[0], t), lerp(f1.rKnee[1], f2.rKnee[1], t)],
      rFoot: [lerp(f1.rFoot[0], f2.rFoot[0], t), lerp(f1.rFoot[1], f2.rFoot[1], t)]
    };
  }

  // Render animated exercise SVG (single SVG, redrawn by animation loop)
  function renderExerciseSVG(exerciseId, size) {
    var ex = getById(exerciseId);
    if (!ex) return '';
    var s = size || 120;
    var uid = 'exanim_' + exerciseId + '_' + Math.random().toString(36).substr(2, 4);
    var mkId = 'ah_' + uid;

    // Render initial frame (frame1)
    var svgContent = '<defs><marker id="' + mkId + '" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto"><polygon points="0 0, 7 2.5, 0 5" fill="#059669"/></marker></defs>';
    svgContent += drawFigure({
      headX: ex.frame1.headX, headY: ex.frame1.headY, hipX: ex.frame1.hipX, hipY: ex.frame1.hipY,
      lElbow: ex.frame1.lElbow, lHand: ex.frame1.lHand, rElbow: ex.frame1.rElbow, rHand: ex.frame1.rHand,
      lKnee: ex.frame1.lKnee, lFoot: ex.frame1.lFoot, rKnee: ex.frame1.rKnee, rFoot: ex.frame1.rFoot
    }, ex.frame1.hl, ex.frame1.props, mkId);

    var html = '<div class="exercise-anim" data-exid="' + exerciseId + '" data-uid="' + uid + '">';
    html += '<svg id="' + uid + '" viewBox="0 0 100 120" width="' + s + '" height="' + s + '" xmlns="http://www.w3.org/2000/svg">';
    html += svgContent;
    html += '</svg></div>';
    return html;
  }

  var _animFrame = null;
  var _animStart = 0;
  var _lastRedraw = 0;

  // Start smooth animation loop for all exercise-anim elements on page
  function startAnimations() {
    stopAnimations();
    _animStart = Date.now();
    _lastRedraw = 0;

    function tick() {
      var now = Date.now();
      // Throttle to ~30fps for performance
      if (now - _lastRedraw < 33) {
        _animFrame = requestAnimationFrame(tick);
        return;
      }
      _lastRedraw = now;

      var anims = document.querySelectorAll('.exercise-anim');
      if (anims.length === 0) { _animFrame = requestAnimationFrame(tick); return; }

      // Calculate interpolation progress (smooth ping-pong with ease-in-out)
      var cycle = 2200; // ms for full cycle (forward + back)
      var elapsed = (now - _animStart) % cycle;
      var t = elapsed / (cycle / 2); // 0 to 2
      if (t > 1) t = 2 - t; // ping-pong: 0 → 1 → 0
      t = (1 - Math.cos(t * Math.PI)) / 2; // ease in-out

      for (var i = 0; i < anims.length; i++) {
        var el = anims[i];
        var exId = el.getAttribute('data-exid');
        var uid = el.getAttribute('data-uid');
        var ex = getById(exId);
        if (!ex) continue;

        var svgEl = document.getElementById(uid);
        if (!svgEl) continue;

        var f1 = ex.frame1, f2 = ex.frame2;
        var pose = lerpPose(f1, f2, t);

        // Merge highlights from both frames
        var hl = f1.hl || f2.hl || [];

        // Use base props from frame1; show arrow from frame2 near peak
        var props = {};
        var f1p = f1.props || {}, f2p = f2.props || {};
        if (f1p.mat) props.mat = f1p.mat;
        if (f1p.surface || f2p.surface) props.surface = f1p.surface || f2p.surface;
        if (f1p.wall || f2p.wall) props.wall = f1p.wall || f2p.wall;
        if (f1p.chair || f2p.chair) props.chair = f1p.chair || f2p.chair;
        if (f2p.mat) props.mat = f2p.mat;
        // Show arrow near movement peak (t > 0.75)
        if (t > 0.75 && f2p.arrow) props.arrow = f2p.arrow;

        var mkId = 'ah_' + uid;
        var content = '<defs><marker id="' + mkId + '" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto"><polygon points="0 0, 7 2.5, 0 5" fill="#059669"/></marker></defs>';
        content += drawFigure(pose, hl, props, mkId);
        svgEl.innerHTML = content;
      }

      _animFrame = requestAnimationFrame(tick);
    }

    _animFrame = requestAnimationFrame(tick);
  }

  // Stop all animations
  function stopAnimations() {
    if (_animFrame) {
      cancelAnimationFrame(_animFrame);
      _animFrame = null;
    }
  }

  return {
    getAll: getAll,
    getByBodyPart: getByBodyPart,
    getById: getById,
    getBodyParts: getBodyParts,
    drawFigure: drawFigure,
    renderExerciseSVG: renderExerciseSVG,
    startAnimations: startAnimations,
    stopAnimations: stopAnimations,
    setGender: setGender,
    getGender: getGender
  };

})();
