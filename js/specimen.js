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

  // Transcripts
  renderTranscripts(specimen);

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

  // Track all associates with direction info
  // direction: 'outgoing' = this specimen listed them, 'incoming' = they listed this specimen
  let allAssociates = [];

  // Get direct/outgoing associates (ones this specimen listed)
  const outgoingAssociates = (specimen.knownAssociates || []).map(assoc => {
    if (typeof assoc === 'string') {
      return { id: assoc, relation: null, direction: 'outgoing' };
    }
    return { ...assoc, direction: 'outgoing' };
  });
  allAssociates.push(...outgoingAssociates);

  // Get the IDs of outgoing associates for lookup
  const outgoingIds = outgoingAssociates.map(a => a.id);

  // Also check for specimens that list this one as an associate (incoming/reverse)
  try {
    const allSpecimensQuery = await db.collection('specimens').get();

    allSpecimensQuery.forEach(doc => {
      if (doc.id === specimen.id) return; // Skip self

      const theirAssociates = doc.data().knownAssociates || [];

      // Check if they list this specimen
      const theirEntry = theirAssociates.find(a =>
        (typeof a === 'string' && a === specimen.id) ||
        (a && a.id === specimen.id)
      );

      if (theirEntry) {
        const theirRelation = typeof theirEntry === 'object' ? theirEntry.relation : null;

        // Check if we already have them as outgoing
        const existingOutgoing = allAssociates.find(a => a.id === doc.id && a.direction === 'outgoing');

        if (existingOutgoing) {
          // We listed them AND they listed us - add their perspective as additional info
          existingOutgoing.incomingRelation = theirRelation;
        } else {
          // They listed us but we didn't list them - add as incoming only
          allAssociates.push({
            id: doc.id,
            relation: theirRelation,
            direction: 'incoming'
          });
        }
      }
    });
  } catch (error) {
    console.log('Could not fetch reverse associates:', error.message);
  }

  if (allAssociates.length === 0) {
    return;
  }

  panel.classList.remove('hidden');

  // Fetch associate data and create links
  const associateLinks = await Promise.all(allAssociates.map(async (assoc) => {
    try {
      let data;
      if (associatesCache[assoc.id]) {
        data = associatesCache[assoc.id];
      } else {
        const doc = await db.collection('specimens').doc(assoc.id).get();
        if (doc.exists) {
          data = { id: doc.id, ...doc.data() };
          associatesCache[assoc.id] = data;
        } else {
          return null;
        }
      }
      return createAssociateLink(data, assoc.relation, assoc.direction, assoc.incomingRelation);
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
 * Render interview transcripts section
 * @param {Object} specimen
 */
function renderTranscripts(specimen) {
  const panel = document.getElementById('transcripts-panel');
  const container = document.getElementById('specimen-transcripts');

  if (!specimen.transcripts || specimen.transcripts.length === 0) {
    return;
  }

  panel.classList.remove('hidden');

  container.innerHTML = specimen.transcripts.map((transcript, index) => {
    const dateDisplay = transcript.date
      ? `<span class="transcript__date">${transcript.date}</span>`
      : '';

    return `
      <div class="transcript">
        <div class="transcript__header" onclick="toggleTranscript(${index})">
          <span class="transcript__title">${escapeHtml(transcript.title)}</span>
          ${dateDisplay}
          <span class="transcript__toggle" id="transcript-toggle-${index}">▼</span>
        </div>
        <div class="transcript__content hidden" id="transcript-content-${index}">
          ${parseRedactedText(transcript.content)}
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Toggle transcript visibility
 * @param {number} index
 */
function toggleTranscript(index) {
  const content = document.getElementById(`transcript-content-${index}`);
  const toggle = document.getElementById(`transcript-toggle-${index}`);

  if (content.classList.contains('hidden')) {
    content.classList.remove('hidden');
    toggle.textContent = '▲';
  } else {
    content.classList.add('hidden');
    toggle.textContent = '▼';
  }
}

/**
 * Create HTML for an associate link
 * @param {Object} associate - The associate specimen data
 * @param {string|null} relation - The relation label
 * @param {string} direction - 'outgoing' (we listed them) or 'incoming' (they listed us)
 * @param {string|null} incomingRelation - If mutual, their relation label for us
 * @returns {string}
 */
function createAssociateLink(associate, relation, direction, incomingRelation) {
  const avatar = associate.mugshot || 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
      <rect fill="#1a1a1a" width="30" height="30"/>
      <text fill="#333" font-family="Courier New" font-size="8" x="15" y="18" text-anchor="middle">?</text>
    </svg>
  `);

  let relationHtml = '';

  if (direction === 'outgoing' && incomingRelation) {
    // Mutual relationship with possibly different labels
    if (relation) {
      relationHtml += `<span class="associate-link__relation associate-link__relation--outgoing" title="How this specimen views them">→ ${escapeHtml(relation)}</span>`;
    }
    relationHtml += `<span class="associate-link__relation associate-link__relation--incoming" title="How they view this specimen">← ${escapeHtml(incomingRelation)}</span>`;
  } else if (direction === 'outgoing' && relation) {
    // We listed them with a relation
    relationHtml = `<span class="associate-link__relation associate-link__relation--outgoing" title="How this specimen views them">→ ${escapeHtml(relation)}</span>`;
  } else if (direction === 'incoming' && relation) {
    // They listed us with a relation
    relationHtml = `<span class="associate-link__relation associate-link__relation--incoming" title="How they view this specimen">← ${escapeHtml(relation)}</span>`;
  }

  return `
    <a href="specimen.html?id=${associate.id}" class="associate-link">
      <img src="${avatar}" alt="${associate.name}" class="associate-link__avatar">
      <span>${escapeHtml(associate.codename || associate.name || 'Unknown')}</span>
      ${relationHtml}
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
