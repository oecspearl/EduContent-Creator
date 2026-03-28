import { escapeHtml } from "./common";

export function generateDragDropHTML(data: any): string {
  if (!data.items || data.items.length === 0 || !data.zones || data.zones.length === 0) {
    return "<p>No drag and drop items available.</p>";
  }

  let itemsHTML = "";
  data.items.forEach((item: any) => {
    itemsHTML += `
      <div class="drag-item" draggable="true" data-item-id="${item.id}" data-correct-zone="${item.correctZone}" id="item-${item.id}">
        ${escapeHtml(item.content)}
      </div>
    `;
  });

  let zonesHTML = "";
  data.zones.forEach((zone: any) => {
    zonesHTML += `
      <div class="drop-zone ${zone.allowMultiple ? 'allow-multiple' : ''}" data-zone-id="${zone.id}" id="zone-${zone.id}">
        <div class="zone-label">${escapeHtml(zone.label)}</div>
        <div class="zone-items" id="zone-items-${zone.id}"></div>
      </div>
    `;
  });

  return `
    <div class="drag-drop-activity">
      <div class="drag-drop-header">
        <h2>Drag and Drop Activity</h2>
        <div class="drag-drop-actions">
          <button id="check-answers-btn" class="check-btn" onclick="checkDragDropAnswers()">Check Answers</button>
          <button id="reset-btn" class="reset-btn" onclick="resetDragDrop()">Reset</button>
        </div>
      </div>
      <div class="drag-drop-container">
        <div class="drag-items-area"><h3>Items to Drag</h3><div class="drag-items-list" id="drag-items-list">${itemsHTML}</div></div>
        <div class="drop-zones-area"><h3>Drop Zones</h3><div class="drop-zones-grid">${zonesHTML}</div></div>
      </div>
      <div class="drag-drop-results" id="drag-drop-results" style="display: none;"></div>
    </div>
  `;
}

export function generateDragDropScript(data: any): string {
  const itemsData = JSON.stringify(data.items || []);
  const zonesData = JSON.stringify(data.zones || []);
  const settingsData = JSON.stringify(data.settings || {});

  return `
  <script>
    var items = ${itemsData};
    var zones = ${zonesData};
    var settings = ${settingsData};
    var placements = {};
    var feedback = {};
    var draggedItemId = null;
    var activitySubmitted = false;

    function escapeHtml(text) { var d = document.createElement('div'); d.textContent = text; return d.innerHTML; }

    function handleDragStart(e, itemId) { draggedItemId = itemId; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/html', itemId); e.currentTarget.classList.add('dragging'); }
    function handleDragEnd(e) { e.currentTarget.classList.remove('dragging'); draggedItemId = null; }
    function handleDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; return false; }
    function handleDragEnter(e) { e.currentTarget.classList.add('drag-over'); }
    function handleDragLeave(e) { e.currentTarget.classList.remove('drag-over'); }

    function handleDrop(e, zoneId) {
      e.stopPropagation(); e.preventDefault(); e.currentTarget.classList.remove('drag-over');
      if (!draggedItemId) return;
      var zone = zones.find(function(z) { return z.id === zoneId; });
      if (!zone) return;
      if (!zone.allowMultiple) {
        var existing = Object.keys(placements).find(function(k) { return placements[k] === zoneId; });
        if (existing && existing !== draggedItemId) removeItemFromZone(existing);
      }
      placeItem(draggedItemId, zoneId);
      draggedItemId = null;
      return false;
    }

    function placeItem(itemId, zoneId) {
      var itemEl = document.getElementById('item-' + itemId);
      if (itemEl) { itemEl.classList.add('placed'); itemEl.style.display = 'none'; }
      var container = document.getElementById('zone-items-' + zoneId);
      if (container) {
        var item = items.find(function(i) { return i.id === itemId; });
        if (item) {
          var zi = document.createElement('div'); zi.className = 'zone-item'; zi.id = 'placed-' + itemId; zi.textContent = item.content;
          zi.setAttribute('data-item-id', itemId); zi.setAttribute('data-zone-id', zoneId);
          zi.onclick = function() { removeItemFromZone(itemId); }; zi.style.cursor = 'pointer'; zi.title = 'Click to remove';
          container.appendChild(zi);
        }
      }
      placements[itemId] = zoneId;
      if (settings.instantFeedback) {
        var item = items.find(function(i) { return i.id === itemId; });
        if (item) { var isCorrect = item.correctZone === zoneId; feedback[itemId] = isCorrect; updateItemFeedback(itemId, zoneId, isCorrect); }
      }
    }

    function removeItemFromZone(itemId) {
      if (activitySubmitted) return;
      var zoneId = placements[itemId]; if (!zoneId) return;
      var zi = document.getElementById('placed-' + itemId); if (zi) zi.remove();
      var itemEl = document.getElementById('item-' + itemId); if (itemEl) { itemEl.classList.remove('placed'); itemEl.style.display = 'block'; }
      delete placements[itemId]; delete feedback[itemId];
      var zone = document.getElementById('zone-' + zoneId); if (zone) zone.classList.remove('correct', 'incorrect');
    }

    function updateItemFeedback(itemId, zoneId, isCorrect) {
      var zi = document.getElementById('placed-' + itemId);
      if (zi) { zi.classList.remove('correct', 'incorrect'); zi.classList.add(isCorrect ? 'correct' : 'incorrect'); }
      if (settings.instantFeedback) {
        var zone = document.getElementById('zone-' + zoneId);
        if (zone) {
          var allCorrect = items.filter(function(i) { return placements[i.id] === zoneId; }).every(function(i) { return i.correctZone === zoneId; });
          zone.classList.remove('correct', 'incorrect');
          if (allCorrect && Object.keys(placements).some(function(id) { return placements[id] === zoneId; })) zone.classList.add('correct');
        }
      }
    }

    function checkDragDropAnswers() {
      if (activitySubmitted) return;
      activitySubmitted = true;
      items.forEach(function(item) {
        var pz = placements[item.id]; var isCorrect = pz === item.correctZone; feedback[item.id] = isCorrect;
        if (pz) updateItemFeedback(item.id, pz, isCorrect);
      });
      zones.forEach(function(zone) {
        var el = document.getElementById('zone-' + zone.id);
        if (el) { var iz = items.filter(function(i) { return placements[i.id] === zone.id; }); if (iz.length > 0) el.classList.add(iz.every(function(i) { return i.correctZone === zone.id; }) ? 'correct' : 'incorrect'); }
      });
      var correctCount = Object.values(feedback).filter(Boolean).length;
      var total = items.length;
      var pct = Math.round((correctCount / total) * 100);
      function getGrade(p) {
        if (p >= 90) return { grade: 'A+', color: '#16a34a', message: 'Excellent!' };
        if (p >= 80) return { grade: 'A', color: '#16a34a', message: 'Great job!' };
        if (p >= 70) return { grade: 'B', color: '#2563eb', message: 'Good work!' };
        if (p >= 60) return { grade: 'C', color: '#ca8a04', message: 'Not bad!' };
        if (p >= 50) return { grade: 'D', color: '#ea580c', message: 'Keep practicing!' };
        return { grade: 'F', color: '#dc2626', message: "Don't give up!" };
      }
      var g = getGrade(pct);
      var fbHTML = '';
      items.forEach(function(item) {
        var ic = feedback[item.id] === true;
        var pz = placements[item.id];
        var pzLabel = (zones.find(function(z) { return z.id === pz; }) || {}).label || 'Unknown';
        var czLabel = (zones.find(function(z) { return z.id === item.correctZone; }) || {}).label || 'Unknown';
        fbHTML += '<div class="feedback-item ' + (ic ? 'feedback-correct' : 'feedback-incorrect') + '"><div class="feedback-icon">' + (ic ? '✓' : '✗') + '</div><div class="feedback-content"><div class="feedback-item-text">' + escapeHtml(item.content) + '</div><div class="feedback-detail">' +
          (ic ? '✓ Correctly placed in "' + escapeHtml(pzLabel) + '"' : '✗ Placed in "' + escapeHtml(pzLabel) + '" (should be "' + escapeHtml(czLabel) + '")') + '</div></div></div>';
      });
      var rd = document.getElementById('drag-drop-results');
      if (rd) {
        rd.style.display = 'block';
        rd.innerHTML = '<div class="results-header"><h2>Activity Results</h2><div class="score-display"><div class="score-item"><div class="score-value">' + correctCount + '/' + total + '</div><div class="score-label">Correct</div></div><div class="score-divider"></div><div class="score-item"><div class="score-value" style="color:' + g.color + '">' + pct + '%</div><div class="score-label">Score</div></div><div class="score-divider"></div><div class="score-item"><div class="score-value" style="color:' + g.color + '">' + g.grade + '</div><div class="score-label">Grade</div></div></div><div class="grade-message" style="color:' + g.color + '">' + g.message + '</div></div><div class="score-breakdown"><div class="breakdown-item breakdown-correct"><div class="breakdown-value">' + correctCount + '</div><div class="breakdown-label">Correct</div></div><div class="breakdown-item breakdown-incorrect"><div class="breakdown-value">' + (total - correctCount) + '</div><div class="breakdown-label">Incorrect</div></div></div><div class="detailed-feedback"><h3>Item Feedback:</h3><div class="feedback-list">' + fbHTML + '</div></div>';
        rd.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      var cb = document.getElementById('check-answers-btn'); if (cb) cb.disabled = true;
    }

    function resetDragDrop() {
      if (activitySubmitted) return;
      Object.keys(placements).forEach(function(id) { removeItemFromZone(id); });
      placements = {}; feedback = {};
    }

    document.addEventListener('DOMContentLoaded', function() {
      items.forEach(function(item) {
        var el = document.getElementById('item-' + item.id);
        if (el) { el.addEventListener('dragstart', function(e) { handleDragStart(e, item.id); }); el.addEventListener('dragend', handleDragEnd); }
      });
      zones.forEach(function(zone) {
        var el = document.getElementById('zone-' + zone.id);
        if (el) { el.addEventListener('drop', function(e) { handleDrop(e, zone.id); }); el.addEventListener('dragover', handleDragOver); el.addEventListener('dragenter', handleDragEnter); el.addEventListener('dragleave', handleDragLeave); }
      });
    });
  </script>
  `;
}
