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
let isAdmin = false;

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

  // Check auth state for admin edit button
  if (auth) {
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        await checkAdminStatus(user.email, specimenId);
      }
    });
  }

  // Load specimen data
  loadSpecimen(specimenId);
}

/**
 * Check if user is an admin and show edit button
 * @param {string} email
 * @param {string} specimenId
 */
async function checkAdminStatus(email, specimenId) {
  try {
    const settingsDoc = await db.collection('settings').doc('config').get();
    if (settingsDoc.exists) {
      const settings = settingsDoc.data();
      const allowedAdmins = settings.allowedAdmins || [];
      isAdmin = allowedAdmins.includes(email);

      if (isAdmin) {
        showEditButton(specimenId);
      }
    }
  } catch (error) {
    console.log('Could not check admin status:', error.message);
  }
}

/**
 * Show the edit button for admins
 * @param {string} specimenId
 */
function showEditButton(specimenId) {
  const editBtnContainer = document.getElementById('admin-edit-btn');
  const editLink = document.getElementById('edit-specimen-link');

  if (editBtnContainer && editLink) {
    editLink.href = `admin.html?edit=${specimenId}`;
    editBtnContainer.classList.remove('hidden');
  }
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

  // Related field notes
  await renderFieldNotes(specimen);

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
  // Show Field Agent number instead of email
  const agentNumber = specimen.agentNumber || Math.floor(Math.random() * 99) + 1;
  document.getElementById('meta-creator').textContent = `Field Agent ${agentNumber}`;

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

  // Get direct associates (supports both old format [id] and new format [{id, relation}])
  let directAssociates = (specimen.knownAssociates || []).map(assoc => {
    if (typeof assoc === 'string') {
      return { id: assoc, relation: null };
    }
    return assoc;
  });

  // Also check for specimens that list this one as an associate (bi-directional)
  try {
    // Query all specimens and check client-side (supports both old and new formats)
    const allSpecimensQuery = await db.collection('specimens').get();

    allSpecimensQuery.forEach(doc => {
      if (doc.id === specimen.id) return; // Skip self

      const theirAssociates = doc.data().knownAssociates || [];

      // Check if they list this specimen (handle both formats)
      const theirEntry = theirAssociates.find(a =>
        (typeof a === 'string' && a === specimen.id) ||
        (a && a.id === specimen.id)
      );

      if (theirEntry) {
        const existingIds = directAssociates.map(a => a.id);
        if (!existingIds.includes(doc.id)) {
          const relation = typeof theirEntry === 'object' ? theirEntry.relation : null;
          directAssociates.push({ id: doc.id, relation: relation });
        }
      }
    });
  } catch (error) {
    console.log('Could not fetch reverse associates:', error.message);
  }

  if (directAssociates.length === 0) {
    return;
  }

  panel.classList.remove('hidden');

  // Fetch associate data
  const associateLinks = await Promise.all(directAssociates.map(async (assoc) => {
    try {
      // Check cache first
      if (associatesCache[assoc.id]) {
        return createAssociateLink(associatesCache[assoc.id], assoc.relation);
      }

      const doc = await db.collection('specimens').doc(assoc.id).get();
      if (doc.exists) {
        const data = { id: doc.id, ...doc.data() };
        associatesCache[assoc.id] = data;
        return createAssociateLink(data, assoc.relation);
      }
      return null;
    } catch (error) {
      console.log('Could not fetch associate:', assoc.id);
      return null;
    }
  }));

  container.innerHTML = associateLinks.filter(Boolean).join('');
}

/**
 * Render related field notes section
 * @param {Object} specimen
 */
async function renderFieldNotes(specimen) {
  const panel = document.getElementById('fieldnotes-panel');
  const container = document.getElementById('specimen-fieldnotes');

  try {
    // Query field notes that reference this specimen
    const notesQuery = await db.collection('fieldNotes')
      .where('relatedSpecimens', 'array-contains', specimen.id)
      .get();

    if (notesQuery.empty) {
      return;
    }

    panel.classList.remove('hidden');

    const noteLinks = [];
    notesQuery.forEach(doc => {
      const note = { id: doc.id, ...doc.data() };
      noteLinks.push(createFieldNoteLink(note));
    });

    container.innerHTML = noteLinks.join('');
  } catch (error) {
    console.log('Could not fetch related field notes:', error.message);
  }
}

/**
 * Create HTML for a field note link
 * @param {Object} note
 * @returns {string}
 */
function createFieldNoteLink(note) {
  const categoryColors = {
    'ORGANIZATION': 'var(--hot-pink)',
    'LOCATION': 'var(--electric-blue)',
    'SPECIES': 'var(--cyber-green)',
    'OTHER': 'var(--neon-yellow)'
  };
  const color = categoryColors[note.category] || 'var(--cyber-green)';

  return `
    <a href="fieldnotes.html" class="fieldnote-link" onclick="sessionStorage.setItem('openNote', '${note.id}')">
      <span class="fieldnote-link__category" style="background: ${color};">${note.category || 'NOTE'}</span>
      <span class="fieldnote-link__title">${escapeHtml(note.title || 'Untitled')}</span>
    </a>
  `;
}

/**
 * Create HTML for an associate link
 * @param {Object} associate
 * @param {string|null} relation
 * @returns {string}
 */
function createAssociateLink(associate, relation) {
  const avatar = associate.mugshot || 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
      <rect fill="#1a1a1a" width="30" height="30"/>
      <text fill="#333" font-family="Courier New" font-size="8" x="15" y="18" text-anchor="middle">?</text>
    </svg>
  `);

  const relationBadge = relation ? `<span class="associate-link__relation">${escapeHtml(relation)}</span>` : '';

  return `
    <a href="specimen.html?id=${associate.id}" class="associate-link">
      <img src="${avatar}" alt="${associate.name}" class="associate-link__avatar">
      <span>${escapeHtml(associate.codename || associate.name || 'Unknown')}</span>
      ${relationBadge}
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
