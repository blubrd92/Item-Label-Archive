/**
 * Bureau of Peepy Investigation
 * Gallery Module
 *
 * Handles the public specimen gallery display
 */

// DOM Elements
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error-message');
const emptyEl = document.getElementById('empty-state');
const gridEl = document.getElementById('specimen-grid');
const marqueeBanner = document.getElementById('marquee-banner');
const marqueeText = document.getElementById('marquee-text');

// Filter elements
const filterStatus = document.getElementById('filter-status');
const filterThreat = document.getElementById('filter-threat');
const sortBy = document.getElementById('sort-by');

// Specimen data
let allSpecimens = [];
let unsubscribe = null;

/**
 * Initialize the gallery
 */
function initGallery() {
  // Check if Firebase is configured
  if (!isFirebaseConfigured()) {
    showError('Database not configured. Please set up Firebase in firebase-config.js');
    return;
  }

  // Load settings (marquee message)
  loadSettings();

  // Set up real-time listener for specimens
  setupRealtimeListener();

  // Set up filter event listeners
  filterStatus.addEventListener('change', applyFilters);
  filterThreat.addEventListener('change', applyFilters);
  sortBy.addEventListener('change', applyFilters);
}

/**
 * Load site settings from Firestore
 */
async function loadSettings() {
  try {
    const doc = await db.collection('settings').doc('config').get();

    if (doc.exists) {
      const settings = doc.data();

      if (settings.marqueeMessage && marqueeText) {
        marqueeText.textContent = settings.marqueeMessage;
      }

      // Update banner color based on site status
      if (settings.siteStatus === 'LOCKDOWN' && marqueeBanner) {
        marqueeBanner.style.background = '#990000';
      } else if (settings.siteStatus === 'MAINTENANCE' && marqueeBanner) {
        marqueeBanner.style.background = '#996600';
      }
    }
  } catch (error) {
    console.log('Could not load settings:', error.message);
  }
}

/**
 * Set up real-time Firestore listener
 */
function setupRealtimeListener() {
  showLoading();

  // Real-time listener for specimens collection
  unsubscribe = db.collection('specimens')
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      (snapshot) => {
        allSpecimens = [];

        snapshot.forEach((doc) => {
          allSpecimens.push({
            id: doc.id,
            ...doc.data()
          });
        });

        console.log(`Loaded ${allSpecimens.length} specimens`);
        applyFilters();
      },
      (error) => {
        console.error('Error fetching specimens:', error);
        showError('Failed to load specimens. Please try again later.');
      }
    );
}

/**
 * Apply filters and sorting to specimens
 */
function applyFilters() {
  let filtered = [...allSpecimens];

  // Filter by status
  const statusFilter = filterStatus.value;
  if (statusFilter) {
    filtered = filtered.filter(s => s.status === statusFilter);
  }

  // Filter by threat level
  const threatFilter = filterThreat.value;
  if (threatFilter) {
    filtered = filtered.filter(s => s.threatLevel === threatFilter);
  }

  // Sort
  const sortValue = sortBy.value;
  filtered.sort((a, b) => {
    switch (sortValue) {
      case 'name':
        return (a.name || '').localeCompare(b.name || '');

      case 'date':
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;

      case 'threat':
        const threatOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
        return (threatOrder[a.threatLevel] || 4) - (threatOrder[b.threatLevel] || 4);

      default:
        return 0;
    }
  });

  renderSpecimens(filtered);
}

/**
 * Render specimen cards to the grid
 * @param {Array} specimens
 */
function renderSpecimens(specimens) {
  hideLoading();

  if (specimens.length === 0) {
    showEmpty();
    return;
  }

  hideEmpty();
  gridEl.classList.remove('hidden');

  gridEl.innerHTML = specimens.map(specimen => createSpecimenCard(specimen)).join('');
}

/**
 * Create HTML for a specimen card
 * @param {Object} specimen
 * @returns {string}
 */
function createSpecimenCard(specimen) {
  const statusClass = getStatusClass(specimen.status);
  const threatClass = getThreatClass(specimen.threatLevel);

  // Default placeholder image if no mugshot
  const imageUrl = specimen.mugshot || 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="280" height="200" viewBox="0 0 280 200">
      <rect fill="#1a1a1a" width="280" height="200"/>
      <text fill="#333" font-family="Courier New" font-size="14" x="140" y="100" text-anchor="middle">NO IMAGE</text>
    </svg>
  `);

  return `
    <article class="specimen-card" onclick="viewSpecimen('${specimen.id}')">
      <img
        src="${imageUrl}"
        alt="${specimen.name || 'Unknown Specimen'}"
        class="specimen-card__image"
        onerror="this.src='data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="280" height="200"><rect fill="#1a1a1a" width="280" height="200"/><text fill="#333" font-family="Courier New" font-size="14" x="140" y="100" text-anchor="middle">IMAGE ERROR</text></svg>')}'">
      <div class="specimen-card__body">
        <h3 class="specimen-card__name">${escapeHtml(specimen.name || 'UNKNOWN')}</h3>
        <p class="specimen-card__codename">${escapeHtml(specimen.codename || '???')}</p>
        <div class="specimen-card__meta">
          <span class="badge ${statusClass}">${specimen.status || 'UNKNOWN'}</span>
          <div class="threat-level ${threatClass}">
            <div class="threat-level__bar"></div>
            <div class="threat-level__bar"></div>
            <div class="threat-level__bar"></div>
            <div class="threat-level__bar"></div>
          </div>
        </div>
      </div>
    </article>
  `;
}

/**
 * Navigate to specimen dossier page
 * @param {string} id
 */
function viewSpecimen(id) {
  window.location.href = `specimen.html?id=${id}`;
}

/**
 * Show loading state
 */
function showLoading() {
  loadingEl.classList.remove('hidden');
  errorEl.classList.add('hidden');
  emptyEl.classList.add('hidden');
  gridEl.classList.add('hidden');
}

/**
 * Hide loading state
 */
function hideLoading() {
  loadingEl.classList.add('hidden');
}

/**
 * Show error message
 * @param {string} message
 */
function showError(message) {
  loadingEl.classList.add('hidden');
  emptyEl.classList.add('hidden');
  gridEl.classList.add('hidden');
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
}

/**
 * Show empty state
 */
function showEmpty() {
  gridEl.classList.add('hidden');
  emptyEl.classList.remove('hidden');
}

/**
 * Hide empty state
 */
function hideEmpty() {
  emptyEl.classList.add('hidden');
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Clean up listener when page unloads
window.addEventListener('beforeunload', () => {
  if (unsubscribe) {
    unsubscribe();
  }
});

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initGallery);
