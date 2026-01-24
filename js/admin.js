/**
 * Bureau of Peepy Investigation
 * Admin Module
 *
 * Handles CRUD operations for specimens
 */

// DOM Elements
const specimenList = document.getElementById('specimen-list');
const noSpecimens = document.getElementById('no-specimens');
const sidebarLoading = document.getElementById('sidebar-loading');
const welcomeMessage = document.getElementById('welcome-message');
const formContainer = document.getElementById('specimen-form-container');
const specimenForm = document.getElementById('specimen-form');
const formTitle = document.getElementById('form-title');
const deleteBtn = document.getElementById('delete-btn');
const submitBtn = document.getElementById('submit-btn');

// Modal elements
const deleteModal = document.getElementById('delete-modal');
const uploadModal = document.getElementById('upload-modal');
const uploadStatus = document.getElementById('upload-status');

// Data
let allSpecimens = [];
let currentEditId = null;
let abilities = [];
let associates = [];
let unsubscribe = null;

/**
 * Initialize admin dashboard
 */
function initAdmin() {
  console.log('Initializing admin dashboard...');

  // Check if ImgBB is configured
  if (!isImgBBConfigured()) {
    console.warn('ImgBB is not configured. Image uploads will not work.');
  }

  // Set up real-time listener for specimens
  setupSpecimenListener();

  // Set up form handlers
  setupFormHandlers();
}

/**
 * Set up real-time Firestore listener for specimens
 */
function setupSpecimenListener() {
  sidebarLoading.classList.remove('hidden');

  unsubscribe = db.collection('specimens')
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
        sidebarLoading.classList.add('hidden');
      },
      (error) => {
        console.error('Error fetching specimens:', error);
        sidebarLoading.classList.add('hidden');
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
 * Populate associates dropdown with existing specimens
 */
function populateAssociatesDropdown() {
  const select = document.getElementById('associates-select');
  const currentId = currentEditId;

  select.innerHTML = '<option value="">-- Select a specimen --</option>' +
    allSpecimens
      .filter(s => s.id !== currentId) // Don't show self
      .map(s => `<option value="${s.id}">${escapeHtml(s.name || s.codename || s.id)}</option>`)
      .join('');
}

/**
 * Set up form event handlers
 */
function setupFormHandlers() {
  // Form submission
  specimenForm.addEventListener('submit', handleFormSubmit);

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

      // Store URL
      document.getElementById('mugshot-url').value = url;

      // Show preview
      const preview = document.getElementById('mugshot-preview');
      preview.innerHTML = `<img src="${url}" alt="Mugshot preview">`;
      preview.classList.remove('hidden');

      // Update upload text
      document.querySelector('#mugshot-upload .file-upload__text').textContent = 'Image uploaded! Click to replace.';

    } else if (type === 'additional') {
      const urlsContainer = document.getElementById('additional-urls');
      const previewContainer = document.getElementById('additional-previews');

      for (let i = 0; i < files.length; i++) {
        uploadStatus.textContent = `Uploading photo ${i + 1} of ${files.length}...`;
        const url = await uploadImageToImgBB(files[i]);

        // Add hidden input for URL
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'additionalPhoto';
        input.value = url;
        urlsContainer.appendChild(input);

        // Add preview
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
    }

    hideUploadModal();

  } catch (error) {
    console.error('Upload error:', error);
    hideUploadModal();
    alert('Failed to upload image: ' + error.message);
  }

  // Clear file input
  e.target.value = '';
}

/**
 * Remove an additional photo
 * @param {HTMLElement} btn
 * @param {string} url
 */
function removeAdditionalPhoto(btn, url) {
  // Remove preview
  btn.parentElement.remove();

  // Remove hidden input
  const inputs = document.querySelectorAll('#additional-urls input');
  inputs.forEach(input => {
    if (input.value === url) {
      input.remove();
    }
  });
}

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
  formContainer.classList.remove('hidden');

  renderSpecimenList(); // Clear active state
}

/**
 * Edit existing specimen
 * @param {string} id
 */
async function editSpecimen(id) {
  const specimen = allSpecimens.find(s => s.id === id);
  if (!specimen) return;

  currentEditId = id;
  abilities = specimen.specialAbilities || [];
  associates = specimen.knownAssociates || [];

  formTitle.textContent = 'EDIT SPECIMEN';
  deleteBtn.classList.remove('hidden');
  submitBtn.textContent = 'Update Report';

  // Populate form fields
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

  // Mugshot preview
  clearFormPreviews();
  if (specimen.mugshot) {
    document.getElementById('mugshot-url').value = specimen.mugshot;
    const preview = document.getElementById('mugshot-preview');
    preview.innerHTML = `<img src="${specimen.mugshot}" alt="Mugshot preview">`;
    preview.classList.remove('hidden');
  }

  // Additional photos
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
 * @param {number} index
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
  const id = select.value;

  if (id && !associates.includes(id)) {
    associates.push(id);
    renderAssociates();
  }

  select.value = '';
}

/**
 * Remove associate from list
 * @param {number} index
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
  container.innerHTML = associates.map((id, index) => {
    const specimen = allSpecimens.find(s => s.id === id);
    const name = specimen ? (specimen.name || specimen.codename || id) : id;

    return `
      <span class="tag">
        ${escapeHtml(name)}
        <span class="tag__remove" onclick="removeAssociate(${index})">&times;</span>
      </span>
    `;
  }).join('');
}

/**
 * Handle form submission
 * @param {Event} e
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  const mugshotUrl = document.getElementById('mugshot-url').value;

  // Validate mugshot for new specimens
  if (!currentEditId && !mugshotUrl) {
    alert('Please upload a mugshot image.');
    return;
  }

  // Gather additional photo URLs
  const additionalUrls = [];
  document.querySelectorAll('#additional-urls input').forEach(input => {
    if (input.value) additionalUrls.push(input.value);
  });

  // Build specimen data
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
      // Update existing
      await db.collection('specimens').doc(currentEditId).update(specimenData);
      console.log('Specimen updated:', currentEditId);
    } else {
      // Create new
      specimenData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      specimenData.createdBy = getCurrentUser()?.email || 'Unknown';

      const docRef = await db.collection('specimens').add(specimenData);
      console.log('New specimen created:', docRef.id);
      currentEditId = docRef.id;
    }

    // Show success and reset
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
 * Cancel form and return to welcome
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
 * Open delete confirmation modal
 */
function deleteSpecimen() {
  if (!currentEditId) return;

  const specimen = allSpecimens.find(s => s.id === currentEditId);
  document.getElementById('delete-specimen-name').textContent = specimen?.name || currentEditId;

  deleteModal.classList.add('active');
}

/**
 * Close delete modal
 */
function closeDeleteModal() {
  deleteModal.classList.remove('active');
}

/**
 * Confirm and execute deletion
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
