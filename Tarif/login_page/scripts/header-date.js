// Update the tariff page heading to include current month and year in French
// This script runs on DOM ready (loaded via <script defer>) and preserves existing UI.
(function () {
  function setTariffHeading() {
    var heading = document.getElementById('tarifHeading');
    if (!heading) return;

    // Get current month and year in French locale, e.g., "septembre 2025"
    var now = new Date();
    var formatted = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(now);

    // Set desired text: "Tarif de <mois> <année>"
    heading.textContent = 'Tarif de ' + formatted;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setTariffHeading);
  } else {
    setTariffHeading();
  }
})();
