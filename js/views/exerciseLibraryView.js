/* ============================================
   Exercise Library View - Browse all exercises
   with gender toggle and body part filters
   ============================================ */
window.ExerciseLibraryView = (function() {

  var currentFilter = 'all';
  var currentGender = 'neutral';

  function render(container) {
    if (typeof ExerciseLibrary === 'undefined') {
      container.innerHTML = '<div style="padding:2rem;color:var(--text-muted);">Exercise library not available.</div>';
      return;
    }

    ExerciseLibrary.stopAnimations();
    currentGender = ExerciseLibrary.getGender() || 'neutral';

    var parts = ExerciseLibrary.getBodyParts();
    var html = '';

    // Controls bar
    html += '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:1rem;">';
    html += '<span style="font-weight:600;font-size:0.85rem;color:var(--gray-600);">Gender:</span>';
    html += '<button class="ex-gender-btn' + (currentGender === 'neutral' ? ' active' : '') + '" data-gender="neutral">Neutral</button>';
    html += '<button class="ex-gender-btn' + (currentGender === 'male' ? ' active' : '') + '" data-gender="male">Male</button>';
    html += '<button class="ex-gender-btn' + (currentGender === 'female' ? ' active' : '') + '" data-gender="female">Female</button>';
    html += '<span style="margin-left:12px;"></span>';
    html += '<span style="font-weight:600;font-size:0.85rem;color:var(--gray-600);">Body Part:</span>';
    html += '<button class="ex-filter-btn' + (currentFilter === 'all' ? ' active' : '') + '" data-bp="all">All</button>';
    for (var i = 0; i < parts.length; i++) {
      html += '<button class="ex-filter-btn' + (currentFilter === parts[i].id ? ' active' : '') + '" data-bp="' + parts[i].id + '">' + parts[i].name + '</button>';
    }
    html += '</div>';

    // Count
    var exs = currentFilter === 'all' ? ExerciseLibrary.getAll() : ExerciseLibrary.getByBodyPart(currentFilter);
    html += '<p style="font-size:0.85rem;color:var(--gray-500);margin-bottom:1rem;">Showing ' + exs.length + ' exercises' + (currentGender !== 'neutral' ? ' (' + currentGender + ')' : '') + '</p>';

    // Grid
    html += '<div class="ex-lib-grid">';
    for (var j = 0; j < exs.length; j++) {
      var ex = exs[j];
      html += '<div class="ex-lib-card">';
      html += '<div class="ex-lib-anim">' + ExerciseLibrary.renderExerciseSVG(ex.id, 130) + '</div>';
      html += '<div class="ex-lib-name">' + Utils.escapeHtml(ex.name) + '</div>';
      html += '<div class="ex-lib-info">' + ex.defaultSets + ' sets &times; ' + ex.defaultReps + ' reps';
      if (ex.holdSeconds) html += ' &bull; ' + ex.holdSeconds + 's hold';
      html += '</div>';
      html += '<span class="ex-lib-tag">' + ex.bodyPart.charAt(0).toUpperCase() + ex.bodyPart.slice(1) + '</span>';
      if (ex.holdSeconds > 0 || ex.defaultSets > 1) {
        html += '<button class="ex-lib-preview-btn" data-ex-id="' + ex.id + '" title="Preview Timer">&#9654; Preview</button>';
      }
      html += '</div>';
    }
    html += '</div>';

    // Styles (injected once)
    if (!document.getElementById('ex-lib-styles')) {
      var style = document.createElement('style');
      style.id = 'ex-lib-styles';
      style.textContent = [
        '.ex-gender-btn, .ex-filter-btn { padding:5px 14px; border-radius:18px; font-size:0.8rem; cursor:pointer; transition:all 0.2s; }',
        '.ex-gender-btn { border:2px solid var(--gray-200); background:white; font-weight:600; }',
        '.ex-gender-btn.active { border-color:var(--primary); background:var(--green-50,#ecfdf5); color:var(--primary); }',
        '.ex-filter-btn { border:1px solid var(--gray-200); background:white; }',
        '.ex-filter-btn.active { border-color:#10b981; background:var(--green-50,#ecfdf5); color:#065f46; font-weight:600; }',
        '.ex-lib-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(190px,1fr)); gap:14px; }',
        '.ex-lib-card { background:white; border-radius:14px; padding:14px; box-shadow:0 1px 3px rgba(0,0,0,0.08); text-align:center; transition:transform 0.2s,box-shadow 0.2s; }',
        '.ex-lib-card:hover { transform:translateY(-2px); box-shadow:0 4px 12px rgba(0,0,0,0.1); }',
        '.ex-lib-anim { width:130px; height:130px; margin:0 auto 8px; }',
        '.ex-lib-name { font-weight:700; font-size:0.85rem; color:var(--gray-800); margin-bottom:2px; }',
        '.ex-lib-info { font-size:0.75rem; color:var(--gray-500); }',
        '.ex-lib-tag { display:inline-block; font-size:0.65rem; font-weight:600; color:var(--primary); background:var(--green-50,#ecfdf5); padding:2px 8px; border-radius:10px; margin-top:4px; }',
        '.ex-lib-preview-btn { display:inline-block; margin-top:6px; padding:4px 12px; border:1px solid var(--primary); background:white; color:var(--primary); border-radius:14px; font-size:0.72rem; font-weight:600; cursor:pointer; transition:all 0.2s; }',
        '.ex-lib-preview-btn:hover { background:var(--primary); color:white; }'
      ].join('\n');
      document.head.appendChild(style);
    }

    container.innerHTML = html;

    // Bind events
    var genderBtns = container.querySelectorAll('.ex-gender-btn');
    for (var g = 0; g < genderBtns.length; g++) {
      genderBtns[g].addEventListener('click', function() {
        currentGender = this.getAttribute('data-gender');
        ExerciseLibrary.setGender(currentGender);
        render(container);
      });
    }

    var filterBtns = container.querySelectorAll('.ex-filter-btn');
    for (var f = 0; f < filterBtns.length; f++) {
      filterBtns[f].addEventListener('click', function() {
        currentFilter = this.getAttribute('data-bp');
        render(container);
      });
    }

    // Preview timer buttons
    var previewBtns = container.querySelectorAll('.ex-lib-preview-btn');
    for (var p = 0; p < previewBtns.length; p++) {
      previewBtns[p].addEventListener('click', function(e) {
        e.stopPropagation();
        var exId = this.getAttribute('data-ex-id');
        var ex = ExerciseLibrary.getById(exId);
        if (ex && window.showTimerPreview) {
          window.showTimerPreview({
            name: ex.name,
            sets: ex.defaultSets + '',
            reps: ex.defaultReps + '',
            hold: ex.holdSeconds ? ex.holdSeconds + ' sec' : ''
          });
        }
      });
    }

    // Start animations
    setTimeout(function() { ExerciseLibrary.startAnimations(); }, 50);
  }

  return { render: render };
})();
