/*
 * Bulk download enhancer for download pages
 * - Injects selection checkboxes next to existing download items
 * - Adds Select All / None controls and a bulk download button
 * - Uses existing downloadFile() helper to preserve behavior
 */

(function() {
  'use strict';

  function init() {
    const cards = Array.from(document.querySelectorAll('.download-cards .download-card'));
    if (!cards.length) return;

    // Build model of downloadable items and inject checkboxes
    const items = cards.map((card, index) => {
      const link = card.querySelector('a.download-btn');
      if (!link) return null;

      // Create checkbox and place it at the bottom-right of the card (styled via CSS)
      const info = card.querySelector('.download-info');
      const title = info ? info.querySelector('.download-title') : null;
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'select-download';
      checkbox.setAttribute('aria-label', 'Sélectionner');

      // Append to the card to allow absolute positioning bottom-right
      card.appendChild(checkbox);

      return {
        card,
        checkbox,
        link,
        url: link.getAttribute('href'),
        filename: link.getAttribute('download') || ''
      };
    }).filter(Boolean);

    if (!items.length) return;

    // Inject actions toolbar above cards
    const cardsContainer = document.querySelector('.download-cards');
    const actions = document.createElement('div');
    actions.className = 'download-actions';

    const btnSelectAll = document.createElement('button');
    btnSelectAll.type = 'button';
    btnSelectAll.className = 'download-btn action';
    btnSelectAll.textContent = 'Tout sélectionner';

    const btnSelectNone = document.createElement('button');
    btnSelectNone.type = 'button';
    btnSelectNone.className = 'download-btn action';
    btnSelectNone.textContent = 'Tout désélectionner';

    const btnDownloadSel = document.createElement('button');
    btnDownloadSel.type = 'button';
    btnDownloadSel.className = 'download-btn primary';
    btnDownloadSel.disabled = true;

    actions.appendChild(btnSelectAll);
    actions.appendChild(btnSelectNone);
    actions.appendChild(btnDownloadSel);

    if (cardsContainer && cardsContainer.parentNode) {
      // Insert toolbar after the cards container to appear at the bottom
      if (cardsContainer.nextSibling) {
        cardsContainer.parentNode.insertBefore(actions, cardsContainer.nextSibling);
      } else {
        cardsContainer.parentNode.appendChild(actions);
      }
    }

    function updateBulkButton() {
      const count = items.filter(it => it.checkbox.checked).length;
      btnDownloadSel.textContent = count > 0 ? `Télécharger la sélection (${count})` : 'Télécharger la sélection';
      btnDownloadSel.disabled = count === 0;
    }

    // Wire events
    btnSelectAll.addEventListener('click', () => {
      items.forEach(it => { it.checkbox.checked = true; });
      updateBulkButton();
    });

    btnSelectNone.addEventListener('click', () => {
      items.forEach(it => { it.checkbox.checked = false; });
      updateBulkButton();
    });

    items.forEach(it => {
      it.checkbox.addEventListener('change', updateBulkButton);
    });

    // Sequentially trigger downloads using existing helper to keep behavior
    function downloadSequential(selected) {
      let i = 0;
      function next() {
        if (i >= selected.length) return;
        const it = selected[i++];
        try {
          if (typeof downloadFile === 'function') {
            downloadFile(it.url, it.filename || 'download');
          } else {
            // Fallback to native click if helper not present
            it.link.click();
          }
        } catch (e) {
          console.error('Bulk download error:', e);
        }
        // Space out to avoid popup blockers and allow browser processing
        setTimeout(next, 250);
      }
      next();
    }

    btnDownloadSel.addEventListener('click', () => {
      const selected = items.filter(it => it.checkbox.checked);
      if (!selected.length) return;
      downloadSequential(selected);
    });

    // Initialize state
    updateBulkButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
