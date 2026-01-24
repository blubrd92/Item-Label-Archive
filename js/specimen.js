/**
 * Bureau of Peepy Investigation
 * Specimen Dossier Module
 *
 * Handles individual specimen dossier display
 */

// DOM Elements
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error-message');
const dossierEl = document.getElementById('dossier');

// Current specimen data
let currentSpecimen = null;
let associatesCache = {};

/**
 * Initialize the specimen page
 */
function initSpecimen() {
  // Check if Firebase is configured
  if (!isFirebaseConfigured()) {
    showError('Database not configured. Please set up Firebase in firebase-config.js');
    return;
  }

  // Get specimen ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const specimenId = urlParams.get('id');

  if (!specimenId) {
    showError('No specimen ID provided. Please select a specimen from the gallery.');
    return;
  }

  // Load specimen data
  loadSpecimen(specimenId);
}

/**
 * Load specimen data from Firestore
 * @param {string} id
 */
async function loadSpecimen(id) {
  showLoading();

  try {
    const doc = await db.collection('specimens').doc(id).get();

    if (!doc.exists) {
      showError('SPECIMEN NOT FOUND. This file may have been redacted or does not exist.');
      return;
    }

    currentSpecimen = {
      id: doc.id,
      ...doc.data()
    };

    // Update page title
    document.title = `${currentSpecimen.name || 'Unknown'} | Bureau of Peepy Investigation`;

    // Render the dossier
    await renderDossier(currentSpecimen);

  } catch (error) {
    console.error('Error loading specimen:', error);
    showError('Failed to decrypt dossier. Access may be restricted.');
  }
}

/**
 * Render the specimen dossier
 * @param {Object} specimen
 */
async function renderDossier(specimen) {
  // Main mugshot
  const mugshotEl = document.getElementById('mugshot-main');
  if (specimen.mugshot) {
    mugshotEl.src = specimen.mugshot;
    mugshotEl.alt = `${specimen.name} Mugshot`;
    mugshotEl.onclick = () => openImageModal(specimen.mugshot);
    mugshotEl.style.cursor = 'pointer';
  } else {
    mugshotEl.src = 'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="350" height="400" viewBox="0 0 350 400">
        <rect fill="#1a1a1a" width="350" height="400"/>
        <text fill="#333" font-family="Courier New" font-size="16" x="175" y="200" text-anchor="middle">NO MUGSHOT ON FILE</text>
      </svg>
    `);
  }

  // Additional photos gallery
  const photoGallery = document.getElementById('photo-gallery');
  if (specimen.additionalPhotos && specimen.additionalPhotos.length > 0) {
    photoGallery.classList.remove('hidden');
    photoGallery.innerHTML = specimen.additionalPhotos.map((url, index) => `
      <div class="photo-gallery__item" onclick="openImageModal('${url}')">
        <img src="${url}" alt="Evidence Photo ${index + 1}">
      </div>
    `).join('');
  }

  // Basic info
  document.getElementById('specimen-name').textContent = specimen.name || 'UNKNOWN';
  document.getElementById('specimen-codename').textContent = specimen.codename || '???';

  // Status badge
  const statusEl = document.getElementById('specimen-status');
  statusEl.textContent = specimen.status || 'UNKNOWN';
  statusEl.className = 'badge ' + getStatusClass(specimen.status);

  // Threat level
  const threatContainer = document.getElementById('threat-level');
  threatContainer.className = 'threat-level ' + getThreatClass(specimen.threatLevel);
  document.getElementById('threat-text').textContent = specimen.threatLevel || 'UNKNOWN';

  // Species, date, location
  document.getElementById('specimen-species').textContent = specimen.species || 'Unknown Species';
  document.getElementById('specimen-date').textContent = specimen.acquisitionDate || 'Unknown';
  document.getElementById('specimen-location').textContent = specimen.location || 'Unknown';

  // Special abilities
  const abilitiesPanel = document.getElementById('abilities-panel');
  const abilitiesContainer = document.getElementById('specimen-abilities');
  if (specimen.specialAbilities && specimen.specialAbilities.length > 0) {
    abilitiesPanel.classList.remove('hidden');
    abilitiesContainer.innerHTML = specimen.specialAbilities.map(ability => `
      <span class="tag">${escapeHtml(ability)}</span>
    `).join('');
  }

  // Lore with redacted text parsing
  const loreEl = document.getElementById('specimen-lore');
  if (specimen.lore) {
    loreEl.innerHTML = parseRedactedText(specimen.lore);
  } else {
    loreEl.textContent = 'No classified narrative on file.';
  }

  // Known associates
  await renderAssociates(specimen);

  // Additional notes
  const notesPanel = document.getElementById('notes-panel');
  const notesEl = document.getElementById('specimen-notes');
  if (specimen.notes) {
    notesPanel.classList.remove('hidden');
    notesEl.innerHTML = parseRedactedText(specimen.notes);
  }

  // Metadata
  document.getElementById('meta-created').textContent = formatTimestamp(specimen.createdAt);
  document.getElementById('meta-updated').textContent = formatTimestamp(specimen.updatedAt);
  document.getElementById('meta-creator').textContent = specimen.createdBy || 'Unknown Agent';

  // Show the dossier
  hideLoading();
  dossierEl.classList.remove('hidden');
}

/**
 * Render known associates section
 * @param {Object} specimen
 */
async function renderAssociates(specimen) {
  const panel = document.getElementById('associates-panel');
  const container = document.getElementById('specimen-associates');

  // Get direct associates
  let associateIds = specimen.knownAssociates || [];

  // Also check for specimens that list this one as an associate (bi-directional)
  try {
    const reverseQuery = await db.collection('specimens')
      .where('knownAssociates', 'array-contains', specimen.id)
      .get();

    reverseQuery.forEach(doc => {
      if (!associateIds.includes(doc.id)) {
        associateIds.push(doc.id);
      }
    });
  } catch (error) {
    console.log('Could not fetch reverse associates:', error.message);
  }

  if (associateIds.length === 0) {
    return;
  }

  panel.classList.remove('hidden');

  // Fetch associate data
  const associateLinks = await Promise.all(associateIds.map(async (id) => {
    try {
      // Check cache first
      if (associatesCache[id]) {
        return createAssociateLink(associatesCache[id]);
      }

      const doc = await db.collection('specimens').doc(id).get();
      if (doc.exists) {
        const data = { id: doc.id, ...doc.data() };
        associatesCache[id] = data;
        return createAssociateLink(data);
      }
      return null;
    } catch (error) {
      console.log('Could not fetch associate:', id);
      return null;
    }
  }));

  container.innerHTML = associateLinks.filter(Boolean).join('');
}

/**
 * Create HTML for an associate link
 * @param {Object} associate
 * @returns {string}
 */
function createAssociateLink(associate) {
  const avatar = associate.mugshot || 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
      <rect fill="#1a1a1a" width="30" height="30"/>
      <text fill="#333" font-family="Courier New" font-size="8" x="15" y="18" text-anchor="middle">?</text>
    </svg>
  `);

  return `
    <a href="specimen.html?id=${associate.id}" class="associate-link">
      <img src="${avatar}" alt="${associate.name}" class="associate-link__avatar">
      <span>${escapeHtml(associate.codename || associate.name || 'Unknown')}</span>
    </a>
  `;
}

/**
 * Open image in modal
 * @param {string} imageUrl
 */
function openImageModal(imageUrl) {
  const modal = document.getElementById('image-modal');
  const modalImage = document.getElementById('modal-image');

  modalImage.src = imageUrl;
  modal.classList.add('active');

  // Close on overlay click
  modal.onclick = (e) => {
    if (e.target === modal) {
      closeImageModal();
    }
  };

  // Close on escape key
  document.addEventListener('keydown', handleEscapeKey);
}

/**
 * Close image modal
 */
function closeImageModal() {
  const modal = document.getElementById('image-modal');
  modal.classList.remove('active');
  document.removeEventListener('keydown', handleEscapeKey);
}

/**
 * Handle escape key press
 * @param {KeyboardEvent} e
 */
function handleEscapeKey(e) {
  if (e.key === 'Escape') {
    closeImageModal();
  }
}

/**
 * Show loading state
 */
function showLoading() {
  loadingEl.classList.remove('hidden');
  errorEl.classList.add('hidden');
  dossierEl.classList.add('hidden');
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
  dossierEl.classList.add('hidden');
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initSpecimen);
