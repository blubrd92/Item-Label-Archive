/**
 * Bureau of Peepy Investigation
 * Admin Module
 *
 * Handles CRUD operations for specimens and field notes
 */

// DOM Elements - Specimens
const specimenList = document.getElementById('specimen-list');
const noSpecimens = document.getElementById('no-specimens');
const sidebarLoading = document.getElementById('sidebar-loading');
const welcomeMessage = document.getElementById('welcome-message');
const formContainer = document.getElementById('specimen-form-container');
const specimenForm = document.getElementById('specimen-form');
const formTitle = document.getElementById('form-title');
const deleteBtn = document.getElementById('delete-btn');
const submitBtn = document.getElementById('submit-btn');

// DOM Elements - Field Notes
const fieldnotesList = document.getElementById('fieldnotes-list');
const noFieldnotes = document.getElementById('no-fieldnotes');
const notesSidebarLoading = document.getElementById('notes-sidebar-loading');
const noteFormContainer = document.getElementById('fieldnote-form-container');
const fieldnoteForm = document.getElementById('fieldnote-form');
const noteFormTitle = document.getElementById('note-form-title');
const noteDeleteBtn = document.getElementById('note-delete-btn');
const noteSubmitBtn = document.getElementById('note-submit-btn');

// DOM Elements - Tabs and Sidebars
const tabSpecimens = document.getElementById('tab-specimens');
const tabFieldnotes = document.getElementById('tab-fieldnotes');
const tabTranscripts = document.getElementById('tab-transcripts');
const specimensSidebar = document.getElementById('specimens-sidebar');
const fieldnotesSidebar = document.getElementById('fieldnotes-sidebar');
const transcriptsSidebar = document.getElementById('transcripts-sidebar');

// DOM Elements - Transcripts
const transcriptsList = document.getElementById('transcripts-list');
const noTranscripts = document.getElementById('no-transcripts');
const transcriptsSidebarLoading = document.getElementById('transcripts-sidebar-loading');
const transcriptFormContainer = document.getElementById('transcript-form-container');
const transcriptForm = document.getElementById('transcript-form');
const transcriptFormTitle = document.getElementById('transcript-form-title');
const transcriptDeleteBtn = document.getElementById('transcript-delete-btn');
const transcriptSubmitBtn = document.getElementById('transcript-submit-btn');
const deleteTranscriptModal = document.getElementById('delete-transcript-modal');

// Modal elements
const deleteModal = document.getElementById('delete-modal');
const deleteNoteModal = document.getElementById('delete-note-modal');
const uploadModal = document.getElementById('upload-modal');
const uploadStatus = document.getElementById('upload-status');

// Data
let allSpecimens = [];
let allFieldNotes = [];
let allTranscripts = [];
let currentEditId = null;
let currentNoteEditId = null;
let currentTranscriptEditId = null;
let abilities = [];
let associates = [];
let linkedFieldNotes = [];
let transcriptSpecimens = [];
let relatedSpecimens = [];
let unsubscribeSpecimens = null;
let unsubscribeNotes = null;
let unsubscribeTranscripts = null;
let currentTab = 'specimens';

/**
 * Initialize admin dashboard
 */
function initAdmin() {
  console.log('Initializing admin dashboard...');

  // Check if ImgBB is configured
  if (!isImgBBConfigured()) {
    console.warn('ImgBB is not configured. Image uploads will not work.');
  }

  // Set up real-time listeners
  setupSpecimenListener();
  setupFieldNotesListener();
  setupTranscriptsListener();

  // Set up form handlers
  setupFormHandlers();

  // Check URL parameters for direct edit
  checkUrlParameters();
}

/**
 * Check URL parameters for edit links
 */
function checkUrlParameters() {
  const urlParams = new URLSearchParams(window.location.search);

  // Check for specimen edit
  const editSpecimenId = urlParams.get('edit');
  if (editSpecimenId) {
    // Wait for specimens to load, then edit
    const checkSpecimens = setInterval(() => {
      if (allSpecimens.length > 0 || sidebarLoading.classList.contains('hidden')) {
        clearInterval(checkSpecimens);
        switchTab('specimens');
        editSpecimen(editSpecimenId);
      }
    }, 100);
  }

  // Check for field note edit
  const editNoteId = urlParams.get('editNote');
  if (editNoteId) {
    // Wait for notes to load, then edit
    const checkNotes = setInterval(() => {
      if (allFieldNotes.length > 0 || (notesSidebarLoading && notesSidebarLoading.classList.contains('hidden'))) {
        clearInterval(checkNotes);
        switchTab('fieldnotes');
        editFieldNote(editNoteId);
      }
    }, 100);
  }

  // Check for transcript edit
  const editTranscriptId = urlParams.get('editTranscript');
  if (editTranscriptId) {
    // Wait for transcripts to load, then edit
    const checkTranscripts = setInterval(() => {
      if (allTranscripts.length > 0 || (transcriptsSidebarLoading && transcriptsSidebarLoading.classList.contains('hidden'))) {
        clearInterval(checkTranscripts);
        switchTab('transcripts');
        editTranscript(editTranscriptId);
      }
    }, 100);
  }

  // Check for creating transcript for specific specimen
  const forSpecimen = urlParams.get('newTranscriptFor');
  if (forSpecimen) {
    const checkReady = setInterval(() => {
      if (allSpecimens.length > 0) {
        clearInterval(checkReady);
        switchTab('transcripts');
        showNewTranscriptForm(forSpecimen);
      }
    }, 100);
  }
}

/**
 * Switch between tabs
 * @param {string} tab - 'specimens', 'fieldnotes', or 'transcripts'
 */
function switchTab(tab) {
  currentTab = tab;

  // Update tab styles
  tabSpecimens.classList.toggle('admin-tab--active', tab === 'specimens');
  tabFieldnotes.classList.toggle('admin-tab--active', tab === 'fieldnotes');
  if (tabTranscripts) tabTranscripts.classList.toggle('admin-tab--active', tab === 'transcripts');

  // Show/hide sidebars
  specimensSidebar.classList.toggle('hidden', tab !== 'specimens');
  fieldnotesSidebar.classList.toggle('hidden', tab !== 'fieldnotes');
  if (transcriptsSidebar) transcriptsSidebar.classList.toggle('hidden', tab !== 'transcripts');

  // Hide all forms, show welcome
  formContainer.classList.add('hidden');
  noteFormContainer.classList.add('hidden');
  if (transcriptFormContainer) transcriptFormContainer.classList.add('hidden');
  welcomeMessage.classList.remove('hidden');

  // Reset edit states
  currentEditId = null;
  currentNoteEditId = null;
  currentTranscriptEditId = null;

  // Re-render lists to clear active states
  renderSpecimenList();
  renderFieldNotesList();
  renderTranscriptsList();
}

/**
 * Set up real-time Firestore listener for specimens
 */
function setupSpecimenListener() {
  sidebarLoading.classList.remove('hidden');

  unsubscribeSpecimens = db.collection('specimens')
    .orderBy('name')
    .onSnapshot(
      (snapshot) => {
        allSpecimens = [];
        snapshot.forEach((doc) => {
          allSpecimens.push({
            id: doc.id,
            ...doc.data()
          });
        });

        renderSpecimenList();
        populateAssociatesDropdown();
        populateNoteSpecimensDropdown();
        sidebarLoading.classList.add('hidden');
      },
      (error) => {
        console.error('Error fetching specimens:', error);
        sidebarLoading.classList.add('hidden');
      }
    );
}

/**
 * Set up real-time Firestore listener for field notes
 */
function setupFieldNotesListener() {
  if (notesSidebarLoading) {
    notesSidebarLoading.classList.remove('hidden');
  }

  unsubscribeNotes = db.collection('fieldNotes')
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      (snapshot) => {
        allFieldNotes = [];
        snapshot.forEach((doc) => {
          allFieldNotes.push({
            id: doc.id,
            ...doc.data()
          });
        });

        renderFieldNotesList();
        populateFieldNotesDropdown();
        if (notesSidebarLoading) {
          notesSidebarLoading.classList.add('hidden');
        }
      },
      (error) => {
        console.error('Error fetching field notes:', error);
        if (notesSidebarLoading) {
          notesSidebarLoading.classList.add('hidden');
        }
      }
    );
}

/**
 * Set up real-time Firestore listener for transcripts
 */
function setupTranscriptsListener() {
  if (transcriptsSidebarLoading) {
    transcriptsSidebarLoading.classList.remove('hidden');
  }

  unsubscribeTranscripts = db.collection('transcripts')
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      (snapshot) => {
        allTranscripts = [];
        snapshot.forEach((doc) => {
          allTranscripts.push({
            id: doc.id,
            ...doc.data()
          });
        });

        renderTranscriptsList();
        if (transcriptsSidebarLoading) {
          transcriptsSidebarLoading.classList.add('hidden');
        }
      },
      (error) => {
        console.error('Error fetching transcripts:', error);
        if (transcriptsSidebarLoading) {
          transcriptsSidebarLoading.classList.add('hidden');
        }
      }
    );
}

/**
 * Render specimen list in sidebar
 */
function renderSpecimenList() {
  if (allSpecimens.length === 0) {
    specimenList.innerHTML = '';
    noSpecimens.classList.remove('hidden');
    return;
  }

  noSpecimens.classList.add('hidden');

  specimenList.innerHTML = allSpecimens.map(specimen => `
    <li class="admin-list__item ${currentEditId === specimen.id ? 'admin-list__item--active' : ''}"
        onclick="editSpecimen('${specimen.id}')">
      <span>${escapeHtml(specimen.name || 'Unnamed')}</span>
      <span class="badge ${getStatusClass(specimen.status)}" style="font-size: 0.7rem;">
        ${specimen.status || '?'}
      </span>
    </li>
  `).join('');
}

/**
 * Render field notes list in sidebar
 */
function renderFieldNotesList() {
  if (!fieldnotesList) return;

  if (allFieldNotes.length === 0) {
    fieldnotesList.innerHTML = '';
    if (noFieldnotes) noFieldnotes.classList.remove('hidden');
    return;
  }

  if (noFieldnotes) noFieldnotes.classList.add('hidden');

  const categoryColors = {
    'ORGANIZATION': '#FF00FF',
    'LOCATION': '#00FFFF',
    'SPECIES': '#00FF00',
    'OTHER': '#FFFF00'
  };

  fieldnotesList.innerHTML = allFieldNotes.map(note => `
    <li class="admin-list__item ${currentNoteEditId === note.id ? 'admin-list__item--active' : ''}"
        onclick="editFieldNote('${note.id}')">
      <span>${escapeHtml(note.title || 'Untitled')}</span>
      <span style="font-size: 0.7rem; color: ${categoryColors[note.category] || '#00FF00'};">
        ${note.category || '?'}
      </span>
    </li>
  `).join('');
}

/**
 * Render transcripts list in sidebar
 */
function renderTranscriptsList() {
  if (!transcriptsList) return;

  if (allTranscripts.length === 0) {
    transcriptsList.innerHTML = '';
    if (noTranscripts) noTranscripts.classList.remove('hidden');
    return;
  }

  if (noTranscripts) noTranscripts.classList.add('hidden');

  transcriptsList.innerHTML = allTranscripts.map(transcript => {
    const specimenCount = (transcript.relatedSpecimens || []).length;
    const countLabel = specimenCount === 1 ? '1 specimen' : `${specimenCount} specimens`;

    return `
      <li class="admin-list__item ${currentTranscriptEditId === transcript.id ? 'admin-list__item--active' : ''}"
          onclick="editTranscript('${transcript.id}')">
        <span>${escapeHtml(transcript.title || 'Untitled')}</span>
        <span style="font-size: 0.7rem; color: var(--electric-blue);">
          ${countLabel}
        </span>
      </li>
    `;
  }).join('');
}

/**
 * Populate transcript specimens dropdown
 */
function populateTranscriptSpecimensDropdown() {
  const select = document.getElementById('transcript-specimens-select');
  if (!select) return;

  select.innerHTML = '<option value="">-- Select a specimen --</option>' +
    allSpecimens
      .map(s => `<option value="${s.id}">${escapeHtml(s.name || s.codename || s.id)}</option>`)
      .join('');
}

/**
 * Populate associates dropdown with existing specimens
 */
function populateAssociatesDropdown() {
  const select = document.getElementById('associates-select');
  if (!select) return;

  const currentId = currentEditId;

  select.innerHTML = '<option value="">-- Select a specimen --</option>' +
    allSpecimens
      .filter(s => s.id !== currentId)
      .map(s => `<option value="${s.id}">${escapeHtml(s.name || s.codename || s.id)}</option>`)
      .join('');
}

/**
 * Populate note specimens dropdown
 */
function populateNoteSpecimensDropdown() {
  const select = document.getElementById('note-specimens-select');
  if (!select) return;

  select.innerHTML = '<option value="">-- Select a specimen --</option>' +
    allSpecimens
      .map(s => `<option value="${s.id}">${escapeHtml(s.name || s.codename || s.id)}</option>`)
      .join('');
}

/**
 * Populate field notes dropdown for specimen form
 */
function populateFieldNotesDropdown() {
  const select = document.getElementById('fieldnotes-select');
  if (!select) return;

  const categoryLabels = {
    'ORGANIZATION': '[ORG]',
    'LOCATION': '[LOC]',
    'SPECIES': '[SPE]',
    'OTHER': '[OTH]'
  };

  select.innerHTML = '<option value="">-- Select a field note --</option>' +
    allFieldNotes
      .map(n => `<option value="${n.id}">${categoryLabels[n.category] || ''} ${escapeHtml(n.title || n.id)}</option>`)
      .join('');
}

/**
 * Set up form event handlers
 */
function setupFormHandlers() {
  // Specimen form submission
  specimenForm.addEventListener('submit', handleFormSubmit);

  // Field note form submission
  if (fieldnoteForm) {
    fieldnoteForm.addEventListener('submit', handleNoteFormSubmit);
  }

  // Transcript form submission
  if (transcriptForm) {
    transcriptForm.addEventListener('submit', handleTranscriptFormSubmit);
  }

  // Mugshot file upload
  const mugshotFile = document.getElementById('mugshot-file');
  mugshotFile.addEventListener('change', (e) => handleFileSelect(e, 'mugshot'));

  // Additional files upload
  const additionalFiles = document.getElementById('additional-files');
  additionalFiles.addEventListener('change', (e) => handleFileSelect(e, 'additional'));

  // Ability input enter key
  const abilityInput = document.getElementById('ability-input');
  abilityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addAbility();
    }
  });

  // Field note image upload
  const noteImageFile = document.getElementById('note-image-file');
  if (noteImageFile) {
    noteImageFile.addEventListener('change', (e) => handleFileSelect(e, 'note-image'));
  }
}

/**
 * Handle file selection for upload
 * @param {Event} e
 * @param {string} type - 'mugshot' or 'additional'
 */
async function handleFileSelect(e, type) {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  if (!isImgBBConfigured()) {
    alert('ImgBB is not configured. Please add your API key to firebase-config.js');
    return;
  }

  showUploadModal();

  try {
    if (type === 'mugshot') {
      uploadStatus.textContent = 'Uploading mugshot...';
      const url = await uploadImageToImgBB(files[0]);

      document.getElementById('mugshot-url').value = url;

      const preview = document.getElementById('mugshot-preview');
      preview.innerHTML = `<img src="${url}" alt="Mugshot preview">`;
      preview.classList.remove('hidden');

      document.querySelector('#mugshot-upload .file-upload__text').textContent = 'Image uploaded! Click to replace.';

    } else if (type === 'additional') {
      const urlsContainer = document.getElementById('additional-urls');
      const previewContainer = document.getElementById('additional-previews');

      for (let i = 0; i < files.length; i++) {
        uploadStatus.textContent = `Uploading photo ${i + 1} of ${files.length}...`;
        const url = await uploadImageToImgBB(files[i]);

        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'additionalPhoto';
        input.value = url;
        urlsContainer.appendChild(input);

        const previewDiv = document.createElement('div');
        previewDiv.className = 'photo-gallery__item';
        previewDiv.innerHTML = `
          <img src="${url}" alt="Additional photo">
          <button type="button" class="tag__remove" style="position:absolute;top:5px;right:5px;"
                  onclick="removeAdditionalPhoto(this, '${url}')">&times;</button>
        `;
        previewDiv.style.position = 'relative';
        previewContainer.appendChild(previewDiv);
      }
    } else if (type === 'note-image') {
      uploadStatus.textContent = 'Uploading image...';
      const url = await uploadImageToImgBB(files[0]);

      document.getElementById('note-image-url').value = url;

      const preview = document.getElementById('note-image-preview');
      preview.innerHTML = `<img src="${url}" alt="Note image preview">`;
      preview.classList.remove('hidden');

      document.querySelector('#note-image-upload .file-upload__text').textContent = 'Image uploaded! Click to replace.';
    }

    hideUploadModal();

  } catch (error) {
    console.error('Upload error:', error);
    hideUploadModal();
    alert('Failed to upload image: ' + error.message);
  }

  e.target.value = '';
}

/**
 * Remove an additional photo
 */
function removeAdditionalPhoto(btn, url) {
  btn.parentElement.remove();

  const inputs = document.querySelectorAll('#additional-urls input');
  inputs.forEach(input => {
    if (input.value === url) {
      input.remove();
    }
  });
}

// ============================================
// SPECIMEN CRUD
// ============================================

/**
 * Show new specimen form
 */
function showNewForm() {
  currentEditId = null;
  abilities = [];
  associates = [];
  linkedFieldNotes = [];

  formTitle.textContent = 'FILE NEW REPORT';
  deleteBtn.classList.add('hidden');
  submitBtn.textContent = 'Submit Report';

  specimenForm.reset();
  clearFormPreviews();
  renderAbilities();
  renderAssociates();
  renderLinkedFieldNotes();
  populateAssociatesDropdown();
  populateFieldNotesDropdown();

  // Reset linked transcripts display
  const linkedContainer = document.getElementById('specimen-linked-transcripts');
  const addBtn = document.getElementById('add-transcript-btn');
  if (linkedContainer) {
    linkedContainer.innerHTML = '<p style="color: #555; font-style: italic;">Save specimen first to link transcripts.</p>';
  }
  if (addBtn) addBtn.classList.add('hidden');

  welcomeMessage.classList.add('hidden');
  noteFormContainer.classList.add('hidden');
  if (transcriptFormContainer) transcriptFormContainer.classList.add('hidden');
  formContainer.classList.remove('hidden');

  renderSpecimenList();
}

/**
 * Edit existing specimen
 */
async function editSpecimen(id) {
  const specimen = allSpecimens.find(s => s.id === id);
  if (!specimen) return;

  currentEditId = id;
  abilities = specimen.specialAbilities || [];

  // Handle both old format (array of strings) and new format (array of objects)
  const rawAssociates = specimen.knownAssociates || [];
  associates = rawAssociates.map(assoc => {
    if (typeof assoc === 'string') {
      return { id: assoc, relation: null };
    }
    return assoc;
  });

  formTitle.textContent = 'EDIT SPECIMEN';
  deleteBtn.classList.remove('hidden');
  submitBtn.textContent = 'Update Report';

  document.getElementById('specimen-id').value = id;
  document.getElementById('name').value = specimen.name || '';
  document.getElementById('codename').value = specimen.codename || '';
  document.getElementById('species').value = specimen.species || '';
  document.getElementById('status').value = specimen.status || 'ACTIVE';
  document.getElementById('threatLevel').value = specimen.threatLevel || 'LOW';
  document.getElementById('acquisitionDate').value = specimen.acquisitionDate || '';
  document.getElementById('location').value = specimen.location || '';
  document.getElementById('lore').value = specimen.lore || '';
  document.getElementById('notes').value = specimen.notes || '';

  clearFormPreviews();
  if (specimen.mugshot) {
    document.getElementById('mugshot-url').value = specimen.mugshot;
    const preview = document.getElementById('mugshot-preview');
    preview.innerHTML = `<img src="${specimen.mugshot}" alt="Mugshot preview">`;
    preview.classList.remove('hidden');
  }

  if (specimen.additionalPhotos && specimen.additionalPhotos.length > 0) {
    const urlsContainer = document.getElementById('additional-urls');
    const previewContainer = document.getElementById('additional-previews');

    specimen.additionalPhotos.forEach(url => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'additionalPhoto';
      input.value = url;
      urlsContainer.appendChild(input);

      const previewDiv = document.createElement('div');
      previewDiv.className = 'photo-gallery__item';
      previewDiv.innerHTML = `
        <img src="${url}" alt="Additional photo">
        <button type="button" class="tag__remove" style="position:absolute;top:5px;right:5px;"
                onclick="removeAdditionalPhoto(this, '${url}')">&times;</button>
      `;
      previewDiv.style.position = 'relative';
      previewContainer.appendChild(previewDiv);
    });
  }

  renderAbilities();
  renderAssociates();
  populateAssociatesDropdown();

  // Load linked field notes (field notes that have this specimen in their relatedSpecimens)
  linkedFieldNotes = allFieldNotes
    .filter(note => (note.relatedSpecimens || []).includes(id))
    .map(note => note.id);
  renderLinkedFieldNotes();
  populateFieldNotesDropdown();

  // Load linked transcripts from the shared collection
  loadLinkedTranscripts(id);

  welcomeMessage.classList.add('hidden');
  noteFormContainer.classList.add('hidden');
  if (transcriptFormContainer) transcriptFormContainer.classList.add('hidden');
  formContainer.classList.remove('hidden');

  renderSpecimenList();
}

/**
 * Clear form previews
 */
function clearFormPreviews() {
  document.getElementById('mugshot-url').value = '';
  document.getElementById('mugshot-preview').innerHTML = '';
  document.getElementById('mugshot-preview').classList.add('hidden');
  document.getElementById('additional-urls').innerHTML = '';
  document.getElementById('additional-previews').innerHTML = '';
  document.querySelector('#mugshot-upload .file-upload__text').textContent = 'Click or drag to upload mugshot';
}

/**
 * Add ability to list
 */
function addAbility() {
  const input = document.getElementById('ability-input');
  const value = input.value.trim();

  if (value && !abilities.includes(value)) {
    abilities.push(value);
    renderAbilities();
  }

  input.value = '';
  input.focus();
}

/**
 * Remove ability from list
 */
function removeAbility(index) {
  abilities.splice(index, 1);
  renderAbilities();
}

/**
 * Render abilities tags
 */
function renderAbilities() {
  const container = document.getElementById('abilities-container');
  container.innerHTML = abilities.map((ability, index) => `
    <span class="tag">
      ${escapeHtml(ability)}
      <span class="tag__remove" onclick="removeAbility(${index})">&times;</span>
    </span>
  `).join('');
}

/**
 * Add associate to list
 */
function addAssociate() {
  const select = document.getElementById('associates-select');
  const relationInput = document.getElementById('associate-relation');
  const id = select.value;
  const relation = relationInput.value.trim();

  if (id) {
    // Check if this specimen is already in the list
    const existingIndex = associates.findIndex(a =>
      (typeof a === 'string' && a === id) || (a && a.id === id)
    );

    if (existingIndex === -1) {
      associates.push({ id: id, relation: relation || null });
      renderAssociates();
    }
  }

  select.value = '';
  relationInput.value = '';
}

/**
 * Remove associate from list
 */
function removeAssociate(index) {
  associates.splice(index, 1);
  renderAssociates();
}

/**
 * Render associates tags
 */
function renderAssociates() {
  const container = document.getElementById('associates-container');
  container.innerHTML = associates.map((assoc, index) => {
    // Handle both old format (string) and new format (object)
    const id = typeof assoc === 'string' ? assoc : assoc.id;
    const relation = typeof assoc === 'object' ? assoc.relation : null;

    const specimen = allSpecimens.find(s => s.id === id);
    const name = specimen ? (specimen.name || specimen.codename || id) : id;
    const relationDisplay = relation ? ` <span style="color: var(--electric-blue); font-size: 0.75rem;">(${escapeHtml(relation)})</span>` : '';

    return `
      <span class="tag">
        ${escapeHtml(name)}${relationDisplay}
        <span class="tag__remove" onclick="removeAssociate(${index})">&times;</span>
      </span>
    `;
  }).join('');
}

/**
 * Add linked field note to list
 */
function addLinkedFieldNote() {
  const select = document.getElementById('fieldnotes-select');
  const id = select.value;

  if (id && !linkedFieldNotes.includes(id)) {
    linkedFieldNotes.push(id);
    renderLinkedFieldNotes();
  }

  select.value = '';
}

/**
 * Remove linked field note from list
 */
function removeLinkedFieldNote(index) {
  linkedFieldNotes.splice(index, 1);
  renderLinkedFieldNotes();
}

/**
 * Render linked field notes tags
 */
function renderLinkedFieldNotes() {
  const container = document.getElementById('linked-fieldnotes-container');
  if (!container) return;

  const categoryColors = {
    'ORGANIZATION': '#FF00FF',
    'LOCATION': '#00FFFF',
    'SPECIES': '#00FF00',
    'OTHER': '#FFFF00'
  };

  container.innerHTML = linkedFieldNotes.map((id, index) => {
    const note = allFieldNotes.find(n => n.id === id);
    const title = note ? (note.title || id) : id;
    const category = note ? note.category : 'OTHER';
    const color = categoryColors[category] || '#00FF00';

    return `
      <span class="tag" style="border-color: ${color};">
        ${escapeHtml(title)}
        <span class="tag__remove" onclick="removeLinkedFieldNote(${index})">&times;</span>
      </span>
    `;
  }).join('');
}

// ============================================
// TRANSCRIPT CRUD (Shared Collection)
// ============================================

/**
 * Show new transcript form
 * @param {string} preselectedSpecimenId - Optional specimen to pre-select
 */
function showNewTranscriptForm(preselectedSpecimenId) {
  currentTranscriptEditId = null;
  transcriptSpecimens = preselectedSpecimenId ? [preselectedSpecimenId] : [];

  transcriptFormTitle.textContent = 'ADD TRANSCRIPT';
  transcriptDeleteBtn.classList.add('hidden');
  transcriptSubmitBtn.textContent = 'Save Transcript';

  transcriptForm.reset();
  renderTranscriptSpecimens();
  populateTranscriptSpecimensDropdown();

  welcomeMessage.classList.add('hidden');
  formContainer.classList.add('hidden');
  noteFormContainer.classList.add('hidden');
  transcriptFormContainer.classList.remove('hidden');

  renderTranscriptsList();
}

/**
 * Edit existing transcript
 */
async function editTranscript(id) {
  const transcript = allTranscripts.find(t => t.id === id);
  if (!transcript) return;

  currentTranscriptEditId = id;
  transcriptSpecimens = transcript.relatedSpecimens || [];

  transcriptFormTitle.textContent = 'EDIT TRANSCRIPT';
  transcriptDeleteBtn.classList.remove('hidden');
  transcriptSubmitBtn.textContent = 'Update Transcript';

  document.getElementById('transcript-id').value = id;
  document.getElementById('transcript-title').value = transcript.title || '';
  document.getElementById('transcript-date').value = transcript.date || '';
  document.getElementById('transcript-content').value = transcript.content || '';

  renderTranscriptSpecimens();
  populateTranscriptSpecimensDropdown();

  welcomeMessage.classList.add('hidden');
  formContainer.classList.add('hidden');
  noteFormContainer.classList.add('hidden');
  transcriptFormContainer.classList.remove('hidden');

  renderTranscriptsList();
}

/**
 * Add specimen to transcript
 */
function addTranscriptSpecimen() {
  const select = document.getElementById('transcript-specimens-select');
  const id = select.value;

  if (id && !transcriptSpecimens.includes(id)) {
    transcriptSpecimens.push(id);
    renderTranscriptSpecimens();
  }

  select.value = '';
}

/**
 * Remove specimen from transcript
 */
function removeTranscriptSpecimen(index) {
  transcriptSpecimens.splice(index, 1);
  renderTranscriptSpecimens();
}

/**
 * Render transcript specimens tags
 */
function renderTranscriptSpecimens() {
  const container = document.getElementById('transcript-specimens-container');
  if (!container) return;

  container.innerHTML = transcriptSpecimens.map((id, index) => {
    const specimen = allSpecimens.find(s => s.id === id);
    const name = specimen ? (specimen.name || specimen.codename || id) : id;

    return `
      <span class="tag">
        ${escapeHtml(name)}
        <span class="tag__remove" onclick="removeTranscriptSpecimen(${index})">&times;</span>
      </span>
    `;
  }).join('');
}

/**
 * Handle transcript form submission
 */
async function handleTranscriptFormSubmit(e) {
  e.preventDefault();

  if (transcriptSpecimens.length === 0) {
    alert('Please add at least one specimen to this transcript.');
    return;
  }

  const transcriptData = {
    title: document.getElementById('transcript-title').value.trim(),
    date: document.getElementById('transcript-date').value || null,
    content: document.getElementById('transcript-content').value.trim(),
    relatedSpecimens: transcriptSpecimens,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  transcriptSubmitBtn.disabled = true;
  transcriptSubmitBtn.textContent = 'Saving...';

  try {
    if (currentTranscriptEditId) {
      await db.collection('transcripts').doc(currentTranscriptEditId).update(transcriptData);
      console.log('Transcript updated:', currentTranscriptEditId);
    } else {
      transcriptData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      transcriptData.agentNumber = generateAgentNumber();

      const docRef = await db.collection('transcripts').add(transcriptData);
      console.log('New transcript created:', docRef.id);
      currentTranscriptEditId = docRef.id;
    }

    alert('Transcript saved successfully!');
    cancelTranscriptForm();

  } catch (error) {
    console.error('Error saving transcript:', error);
    alert('Failed to save transcript: ' + error.message);
  } finally {
    transcriptSubmitBtn.disabled = false;
    transcriptSubmitBtn.textContent = currentTranscriptEditId ? 'Update Transcript' : 'Save Transcript';
  }
}

/**
 * Cancel transcript form
 */
function cancelTranscriptForm() {
  currentTranscriptEditId = null;
  transcriptSpecimens = [];

  transcriptForm.reset();

  transcriptFormContainer.classList.add('hidden');
  welcomeMessage.classList.remove('hidden');

  renderTranscriptsList();
}

/**
 * Open delete transcript modal
 */
function deleteTranscript() {
  if (!currentTranscriptEditId) return;

  const transcript = allTranscripts.find(t => t.id === currentTranscriptEditId);
  document.getElementById('delete-transcript-name').textContent = transcript?.title || currentTranscriptEditId;

  deleteTranscriptModal.classList.add('active');
}

/**
 * Close delete transcript modal
 */
function closeDeleteTranscriptModal() {
  deleteTranscriptModal.classList.remove('active');
}

/**
 * Confirm transcript deletion
 */
async function confirmDeleteTranscript() {
  if (!currentTranscriptEditId) return;

  closeDeleteTranscriptModal();

  try {
    await db.collection('transcripts').doc(currentTranscriptEditId).delete();
    console.log('Transcript deleted:', currentTranscriptEditId);
    alert('Transcript has been permanently deleted.');
    cancelTranscriptForm();
  } catch (error) {
    console.error('Error deleting transcript:', error);
    alert('Failed to delete transcript: ' + error.message);
  }
}

/**
 * Create transcript for specimen (from specimen edit form)
 */
function createTranscriptForSpecimen() {
  if (!currentEditId) return;
  window.location.href = `admin.html?newTranscriptFor=${currentEditId}`;
}

/**
 * Load and display linked transcripts in specimen form
 */
async function loadLinkedTranscripts(specimenId) {
  const container = document.getElementById('specimen-linked-transcripts');
  const addBtn = document.getElementById('add-transcript-btn');
  if (!container) return;

  // Find transcripts that include this specimen
  const linkedTranscripts = allTranscripts.filter(t =>
    (t.relatedSpecimens || []).includes(specimenId)
  );

  if (linkedTranscripts.length === 0) {
    container.innerHTML = '<p style="color: #555; font-style: italic;">No transcripts linked to this specimen.</p>';
  } else {
    container.innerHTML = linkedTranscripts.map(t => {
      const specimenCount = (t.relatedSpecimens || []).length;
      const countLabel = specimenCount > 1 ? ` (+${specimenCount - 1} other${specimenCount > 2 ? 's' : ''})` : '';

      return `
        <div style="background: rgba(0,255,255,0.1); border: 2px solid var(--electric-blue); padding: 10px; margin-bottom: 8px;">
          <a href="admin.html?editTranscript=${t.id}" style="color: var(--neon-yellow); font-weight: bold;">
            ${escapeHtml(t.title)}
          </a>
          <span style="color: #555; font-size: 0.8rem;">${countLabel}</span>
          ${t.date ? `<span style="color: var(--hot-pink); font-size: 0.8rem; margin-left: 10px;">${t.date}</span>` : ''}
        </div>
      `;
    }).join('');
  }

  if (addBtn) addBtn.classList.remove('hidden');
}

/**
 * Update field notes' relatedSpecimens arrays based on current linkedFieldNotes
 * @param {string} specimenId - The specimen ID to add/remove from field notes
 */
async function updateFieldNoteLinks(specimenId) {
  // Find field notes that previously had this specimen
  const previouslyLinked = allFieldNotes
    .filter(note => (note.relatedSpecimens || []).includes(specimenId))
    .map(note => note.id);

  // Find notes to add specimen to (in linkedFieldNotes but not previously linked)
  const toAdd = linkedFieldNotes.filter(id => !previouslyLinked.includes(id));

  // Find notes to remove specimen from (previously linked but not in linkedFieldNotes)
  const toRemove = previouslyLinked.filter(id => !linkedFieldNotes.includes(id));

  // Add specimen to newly linked field notes
  for (const noteId of toAdd) {
    const note = allFieldNotes.find(n => n.id === noteId);
    if (note) {
      const updatedSpecimens = [...(note.relatedSpecimens || []), specimenId];
      await db.collection('fieldNotes').doc(noteId).update({
        relatedSpecimens: updatedSpecimens,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log('Added specimen to field note:', noteId);
    }
  }

  // Remove specimen from unlinked field notes
  for (const noteId of toRemove) {
    const note = allFieldNotes.find(n => n.id === noteId);
    if (note) {
      const updatedSpecimens = (note.relatedSpecimens || []).filter(id => id !== specimenId);
      await db.collection('fieldNotes').doc(noteId).update({
        relatedSpecimens: updatedSpecimens,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log('Removed specimen from field note:', noteId);
    }
  }
}

/**
 * Handle specimen form submission
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  const mugshotUrl = document.getElementById('mugshot-url').value;

  if (!currentEditId && !mugshotUrl) {
    alert('Please upload a mugshot image.');
    return;
  }

  const additionalUrls = [];
  document.querySelectorAll('#additional-urls input').forEach(input => {
    if (input.value) additionalUrls.push(input.value);
  });

  const specimenData = {
    name: document.getElementById('name').value.trim(),
    codename: document.getElementById('codename').value.trim(),
    species: document.getElementById('species').value.trim(),
    status: document.getElementById('status').value,
    threatLevel: document.getElementById('threatLevel').value,
    acquisitionDate: document.getElementById('acquisitionDate').value,
    location: document.getElementById('location').value.trim(),
    lore: document.getElementById('lore').value.trim(),
    notes: document.getElementById('notes').value.trim(),
    mugshot: mugshotUrl,
    additionalPhotos: additionalUrls,
    specialAbilities: abilities,
    knownAssociates: associates,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';

  try {
    let specimenId = currentEditId;

    if (currentEditId) {
      await db.collection('specimens').doc(currentEditId).update(specimenData);
      console.log('Specimen updated:', currentEditId);
    } else {
      specimenData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      specimenData.agentNumber = generateAgentNumber();

      const docRef = await db.collection('specimens').add(specimenData);
      console.log('New specimen created:', docRef.id);
      specimenId = docRef.id;
      currentEditId = docRef.id;
    }

    // Update field notes' relatedSpecimens arrays
    await updateFieldNoteLinks(specimenId);

    alert('Specimen report saved successfully!');
    cancelForm();

  } catch (error) {
    console.error('Error saving specimen:', error);
    alert('Failed to save specimen: ' + error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = currentEditId ? 'Update Report' : 'Submit Report';
  }
}

/**
 * Cancel specimen form
 */
function cancelForm() {
  currentEditId = null;
  abilities = [];
  associates = [];
  linkedFieldNotes = [];

  specimenForm.reset();
  clearFormPreviews();

  formContainer.classList.add('hidden');
  welcomeMessage.classList.remove('hidden');

  renderSpecimenList();
}

/**
 * Open delete specimen modal
 */
function deleteSpecimen() {
  if (!currentEditId) return;

  const specimen = allSpecimens.find(s => s.id === currentEditId);
  document.getElementById('delete-specimen-name').textContent = specimen?.name || currentEditId;

  deleteModal.classList.add('active');
}

/**
 * Close delete specimen modal
 */
function closeDeleteModal() {
  deleteModal.classList.remove('active');
}

/**
 * Confirm specimen deletion
 */
async function confirmDelete() {
  if (!currentEditId) return;

  closeDeleteModal();

  try {
    await db.collection('specimens').doc(currentEditId).delete();
    console.log('Specimen deleted:', currentEditId);
    alert('Specimen has been permanently deleted.');
    cancelForm();
  } catch (error) {
    console.error('Error deleting specimen:', error);
    alert('Failed to delete specimen: ' + error.message);
  }
}

// ============================================
// FIELD NOTES CRUD
// ============================================

/**
 * Show new field note form
 */
function showNewNoteForm() {
  currentNoteEditId = null;
  relatedSpecimens = [];

  noteFormTitle.textContent = 'ADD FIELD NOTE';
  noteDeleteBtn.classList.add('hidden');
  noteSubmitBtn.textContent = 'Save Note';

  fieldnoteForm.reset();
  clearNoteImagePreview();
  renderRelatedSpecimens();
  populateNoteSpecimensDropdown();

  welcomeMessage.classList.add('hidden');
  formContainer.classList.add('hidden');
  noteFormContainer.classList.remove('hidden');

  renderFieldNotesList();
}

/**
 * Clear note image preview
 */
function clearNoteImagePreview() {
  const urlInput = document.getElementById('note-image-url');
  const preview = document.getElementById('note-image-preview');
  const uploadText = document.querySelector('#note-image-upload .file-upload__text');

  if (urlInput) urlInput.value = '';
  if (preview) {
    preview.innerHTML = '';
    preview.classList.add('hidden');
  }
  if (uploadText) uploadText.textContent = 'Click or drag to upload image (optional)';
}

/**
 * Edit existing field note
 */
async function editFieldNote(id) {
  const note = allFieldNotes.find(n => n.id === id);
  if (!note) return;

  currentNoteEditId = id;
  relatedSpecimens = note.relatedSpecimens || [];

  noteFormTitle.textContent = 'EDIT FIELD NOTE';
  noteDeleteBtn.classList.remove('hidden');
  noteSubmitBtn.textContent = 'Update Note';

  document.getElementById('note-id').value = id;
  document.getElementById('note-title').value = note.title || '';
  document.getElementById('note-category').value = note.category || 'OTHER';
  document.getElementById('note-content').value = note.content || '';

  // Handle existing image
  clearNoteImagePreview();
  if (note.image) {
    document.getElementById('note-image-url').value = note.image;
    const preview = document.getElementById('note-image-preview');
    preview.innerHTML = `<img src="${note.image}" alt="Note image preview">`;
    preview.classList.remove('hidden');
    document.querySelector('#note-image-upload .file-upload__text').textContent = 'Image uploaded! Click to replace.';
  }

  renderRelatedSpecimens();
  populateNoteSpecimensDropdown();

  welcomeMessage.classList.add('hidden');
  formContainer.classList.add('hidden');
  noteFormContainer.classList.remove('hidden');

  renderFieldNotesList();
}

/**
 * Add related specimen to field note
 */
function addRelatedSpecimen() {
  const select = document.getElementById('note-specimens-select');
  const id = select.value;

  if (id && !relatedSpecimens.includes(id)) {
    relatedSpecimens.push(id);
    renderRelatedSpecimens();
  }

  select.value = '';
}

/**
 * Remove related specimen
 */
function removeRelatedSpecimen(index) {
  relatedSpecimens.splice(index, 1);
  renderRelatedSpecimens();
}

/**
 * Render related specimens tags
 */
function renderRelatedSpecimens() {
  const container = document.getElementById('related-specimens-container');
  if (!container) return;

  container.innerHTML = relatedSpecimens.map((id, index) => {
    const specimen = allSpecimens.find(s => s.id === id);
    const name = specimen ? (specimen.name || specimen.codename || id) : id;

    return `
      <span class="tag">
        ${escapeHtml(name)}
        <span class="tag__remove" onclick="removeRelatedSpecimen(${index})">&times;</span>
      </span>
    `;
  }).join('');
}

/**
 * Generate a random agent number (1-99)
 */
function generateAgentNumber() {
  return Math.floor(Math.random() * 99) + 1;
}

/**
 * Handle field note form submission
 */
async function handleNoteFormSubmit(e) {
  e.preventDefault();

  const imageUrl = document.getElementById('note-image-url').value || null;

  const noteData = {
    title: document.getElementById('note-title').value.trim(),
    category: document.getElementById('note-category').value,
    content: document.getElementById('note-content').value.trim(),
    image: imageUrl,
    relatedSpecimens: relatedSpecimens,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  noteSubmitBtn.disabled = true;
  noteSubmitBtn.textContent = 'Saving...';

  try {
    if (currentNoteEditId) {
      await db.collection('fieldNotes').doc(currentNoteEditId).update(noteData);
      console.log('Field note updated:', currentNoteEditId);
    } else {
      noteData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      noteData.agentNumber = generateAgentNumber();

      const docRef = await db.collection('fieldNotes').add(noteData);
      console.log('New field note created:', docRef.id);
      currentNoteEditId = docRef.id;
    }

    alert('Field note saved successfully!');
    cancelNoteForm();

  } catch (error) {
    console.error('Error saving field note:', error);
    alert('Failed to save field note: ' + error.message);
  } finally {
    noteSubmitBtn.disabled = false;
    noteSubmitBtn.textContent = currentNoteEditId ? 'Update Note' : 'Save Note';
  }
}

/**
 * Cancel field note form
 */
function cancelNoteForm() {
  currentNoteEditId = null;
  relatedSpecimens = [];

  fieldnoteForm.reset();
  clearNoteImagePreview();

  noteFormContainer.classList.add('hidden');
  welcomeMessage.classList.remove('hidden');

  renderFieldNotesList();
}

/**
 * Open delete field note modal
 */
function deleteFieldNote() {
  if (!currentNoteEditId) return;

  const note = allFieldNotes.find(n => n.id === currentNoteEditId);
  document.getElementById('delete-note-name').textContent = note?.title || currentNoteEditId;

  deleteNoteModal.classList.add('active');
}

/**
 * Close delete field note modal
 */
function closeDeleteNoteModal() {
  deleteNoteModal.classList.remove('active');
}

/**
 * Confirm field note deletion
 */
async function confirmDeleteNote() {
  if (!currentNoteEditId) return;

  closeDeleteNoteModal();

  try {
    await db.collection('fieldNotes').doc(currentNoteEditId).delete();
    console.log('Field note deleted:', currentNoteEditId);
    alert('Field note has been permanently deleted.');
    cancelNoteForm();
  } catch (error) {
    console.error('Error deleting field note:', error);
    alert('Failed to delete field note: ' + error.message);
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Show upload progress modal
 */
function showUploadModal() {
  uploadModal.classList.add('active');
}

/**
 * Hide upload progress modal
 */
function hideUploadModal() {
  uploadModal.classList.remove('active');
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Clean up listeners when page unloads
window.addEventListener('beforeunload', () => {
  if (unsubscribeSpecimens) {
    unsubscribeSpecimens();
  }
  if (unsubscribeNotes) {
    unsubscribeNotes();
  }
  if (unsubscribeTranscripts) {
    unsubscribeTranscripts();
  }
});
