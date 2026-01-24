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
const specimensSidebar = document.getElementById('specimens-sidebar');
const fieldnotesSidebar = document.getElementById('fieldnotes-sidebar');

// Modal elements
const deleteModal = document.getElementById('delete-modal');
const deleteNoteModal = document.getElementById('delete-note-modal');
const uploadModal = document.getElementById('upload-modal');
const uploadStatus = document.getElementById('upload-status');

// Data
let allSpecimens = [];
let allFieldNotes = [];
let currentEditId = null;
let currentNoteEditId = null;
let abilities = [];
let associates = [];
let relatedSpecimens = [];
let unsubscribeSpecimens = null;
let unsubscribeNotes = null;
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
}

/**
 * Switch between tabs
 * @param {string} tab - 'specimens' or 'fieldnotes'
 */
function switchTab(tab) {
  currentTab = tab;

  // Update tab styles
  tabSpecimens.classList.toggle('admin-tab--active', tab === 'specimens');
  tabFieldnotes.classList.toggle('admin-tab--active', tab === 'fieldnotes');

  // Show/hide sidebars
  specimensSidebar.classList.toggle('hidden', tab !== 'specimens');
  fieldnotesSidebar.classList.toggle('hidden', tab !== 'fieldnotes');

  // Hide all forms, show welcome
  formContainer.classList.add('hidden');
  noteFormContainer.classList.add('hidden');
  welcomeMessage.classList.remove('hidden');

  // Reset edit states
  currentEditId = null;
  currentNoteEditId = null;

  // Re-render lists to clear active states
  renderSpecimenList();
  renderFieldNotesList();
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
 * Set up form event handlers
 */
function setupFormHandlers() {
  // Specimen form submission
  specimenForm.addEventListener('submit', handleFormSubmit);

  // Field note form submission
  if (fieldnoteForm) {
    fieldnoteForm.addEventListener('submit', handleNoteFormSubmit);
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

  formTitle.textContent = 'FILE NEW REPORT';
  deleteBtn.classList.add('hidden');
  submitBtn.textContent = 'Submit Report';

  specimenForm.reset();
  clearFormPreviews();
  renderAbilities();
  renderAssociates();
  populateAssociatesDropdown();

  welcomeMessage.classList.add('hidden');
  noteFormContainer.classList.add('hidden');
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

  welcomeMessage.classList.add('hidden');
  noteFormContainer.classList.add('hidden');
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
    if (currentEditId) {
      await db.collection('specimens').doc(currentEditId).update(specimenData);
      console.log('Specimen updated:', currentEditId);
    } else {
      specimenData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      specimenData.agentNumber = generateAgentNumber();

      const docRef = await db.collection('specimens').add(specimenData);
      console.log('New specimen created:', docRef.id);
      currentEditId = docRef.id;
    }

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
});
