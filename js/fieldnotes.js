/**
 * Bureau of Peepy Investigation
 * Field Notes Module
 *
 * Handles the field notes display
 */

// DOM Elements
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error-message');
const emptyEl = document.getElementById('empty-state');
const gridEl = document.getElementById('fieldnotes-grid');

// Filter elements
const filterCategory = document.getElementById('filter-category');
const sortBy = document.getElementById('sort-by');

// Modal elements
const noteModal = document.getElementById('note-modal');

// Data
let allNotes = [];
let allSpecimens = {};
let unsubscribe = null;
let currentUser = null;
let isAdmin = false;

/**
 * Initialize the field notes page
 */
function initFieldNotes() {
  // Check if Firebase is configured
  if (!isFirebaseConfigured()) {
    showError('Database not configured. Please set up Firebase in firebase-config.js');
    return;
  }

  // Check auth state for admin features
  if (auth) {
    auth.onAuthStateChanged(async (user) => {
      currentUser = user;
      if (user) {
        await checkAdminStatus(user.email);
      }
    });
  }

  // Load specimens for linking
  loadSpecimens();

  // Set up real-time listener for field notes
  setupRealtimeListener();

  // Set up filter event listeners
  filterCategory.addEventListener('change', applyFilters);
  sortBy.addEventListener('change', applyFilters);
}

/**
 * Check if user is an admin
 * @param {string} email
 */
async function checkAdminStatus(email) {
  try {
    const settingsDoc = await db.collection('settings').doc('config').get();
    if (settingsDoc.exists) {
      const settings = settingsDoc.data();
      const allowedAdmins = settings.allowedAdmins || [];
      isAdmin = allowedAdmins.includes(email);
    }
  } catch (error) {
    console.log('Could not check admin status:', error.message);
  }
}

/**
 * Load all specimens for reference
 */
async function loadSpecimens() {
  try {
    const snapshot = await db.collection('specimens').get();
    snapshot.forEach((doc) => {
      allSpecimens[doc.id] = { id: doc.id, ...doc.data() };
    });
  } catch (error) {
    console.log('Could not load specimens:', error.message);
  }
}

/**
 * Set up real-time Firestore listener
 */
function setupRealtimeListener() {
  showLoading();

  unsubscribe = db.collection('fieldNotes')
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      (snapshot) => {
        allNotes = [];

        snapshot.forEach((doc) => {
          allNotes.push({
            id: doc.id,
            ...doc.data()
          });
        });

        console.log(`Loaded ${allNotes.length} field notes`);
        applyFilters();
      },
      (error) => {
        console.error('Error fetching field notes:', error);
        showError('Failed to load field notes. Please try again later.');
      }
    );
}

/**
 * Apply filters and sorting to notes
 */
function applyFilters() {
  let filtered = [...allNotes];

  // Filter by category
  const categoryFilter = filterCategory.value;
  if (categoryFilter) {
    filtered = filtered.filter(n => n.category === categoryFilter);
  }

  // Sort
  const sortValue = sortBy.value;
  filtered.sort((a, b) => {
    switch (sortValue) {
      case 'title':
        return (a.title || '').localeCompare(b.title || '');

      case 'category':
        return (a.category || '').localeCompare(b.category || '');

      case 'date':
      default:
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
    }
  });

  renderNotes(filtered);
}

/**
 * Render field note cards to the grid
 * @param {Array} notes
 */
function renderNotes(notes) {
  hideLoading();

  if (notes.length === 0) {
    showEmpty();
    return;
  }

  hideEmpty();
  gridEl.classList.remove('hidden');

  gridEl.innerHTML = notes.map(note => createNoteCard(note)).join('');
}

/**
 * Create HTML for a field note card
 * @param {Object} note
 * @returns {string}
 */
function createNoteCard(note) {
  const categoryColors = {
    'ORGANIZATION': 'var(--hot-pink)',
    'LOCATION': 'var(--electric-blue)',
    'SPECIES': 'var(--cyber-green)',
    'OTHER': 'var(--neon-yellow)'
  };

  const categoryColor = categoryColors[note.category] || 'var(--cyber-green)';

  // Truncate content for preview
  const preview = (note.content || '').replace(/\[REDACTED:.*?\]/g, '[REDACTED]').substring(0, 150);

  return `
    <article class="fieldnote-card" onclick="openNoteModal('${note.id}')" style="border-color: ${categoryColor};">
      <div class="fieldnote-card__category" style="background: ${categoryColor}; color: var(--bg-darker);">
        ${note.category || 'OTHER'}
      </div>
      <div class="fieldnote-card__body">
        <h3 class="fieldnote-card__title">${escapeHtml(note.title || 'Untitled')}</h3>
        <p class="fieldnote-card__preview">${escapeHtml(preview)}${preview.length >= 150 ? '...' : ''}</p>
        <div class="fieldnote-card__meta">
          <span style="color: #555; font-size: 0.8rem;">
            ${formatDate(note.createdAt)}
          </span>
        </div>
      </div>
    </article>
  `;
}

/**
 * Open field note detail modal
 * @param {string} id
 */
function openNoteModal(id) {
  const note = allNotes.find(n => n.id === id);
  if (!note) return;

  // Set modal content
  document.getElementById('modal-category').textContent = note.category || 'FIELD NOTE';
  document.getElementById('modal-title').textContent = note.title || 'Untitled';
  document.getElementById('modal-content').innerHTML = parseRedactedText(note.content || '');
  document.getElementById('modal-date').textContent = formatDate(note.createdAt);
  document.getElementById('modal-author').textContent = note.createdBy || 'Unknown';

  // Related specimens
  const specimensSection = document.getElementById('modal-specimens');
  const specimensList = document.getElementById('modal-specimens-list');

  if (note.relatedSpecimens && note.relatedSpecimens.length > 0) {
    specimensSection.classList.remove('hidden');
    specimensList.innerHTML = note.relatedSpecimens.map(specId => {
      const specimen = allSpecimens[specId];
      if (!specimen) return '';

      const avatar = specimen.mugshot || 'data:image/svg+xml,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
          <rect fill="#1a1a1a" width="30" height="30"/>
          <text fill="#333" font-family="Courier New" font-size="8" x="15" y="18" text-anchor="middle">?</text>
        </svg>
      `);

      return `
        <a href="specimen.html?id=${specId}" class="associate-link">
          <img src="${avatar}" alt="${specimen.name}" class="associate-link__avatar">
          <span>${escapeHtml(specimen.codename || specimen.name || 'Unknown')}</span>
        </a>
      `;
    }).join('');
  } else {
    specimensSection.classList.add('hidden');
  }

  // Edit button for admins
  const editBtnContainer = document.getElementById('modal-edit-btn');
  const editLink = document.getElementById('modal-edit-link');

  if (isAdmin) {
    editBtnContainer.classList.remove('hidden');
    editLink.href = `admin.html?editNote=${id}`;
  } else {
    editBtnContainer.classList.add('hidden');
  }

  // Show modal
  noteModal.classList.add('active');

  // Close on overlay click
  noteModal.onclick = (e) => {
    if (e.target === noteModal) {
      closeNoteModal();
    }
  };

  // Close on escape key
  document.addEventListener('keydown', handleEscapeKey);
}

/**
 * Close field note modal
 */
function closeNoteModal() {
  noteModal.classList.remove('active');
  document.removeEventListener('keydown', handleEscapeKey);
}

/**
 * Handle escape key press
 * @param {KeyboardEvent} e
 */
function handleEscapeKey(e) {
  if (e.key === 'Escape') {
    closeNoteModal();
  }
}

/**
 * Format Firestore timestamp to date string
 * @param {firebase.firestore.Timestamp} timestamp
 * @returns {string}
 */
function formatDate(timestamp) {
  if (!timestamp) return '-';

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
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
document.addEventListener('DOMContentLoaded', initFieldNotes);
