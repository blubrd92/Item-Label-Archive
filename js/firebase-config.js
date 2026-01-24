/**
 * Bureau of Peepy Investigation
 * Firebase Configuration
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://console.firebase.google.com
 * 2. Create a new project (e.g., "bureau-of-peepy-investigation")
 * 3. Enable Authentication > Sign-in method > Google
 * 4. Create Firestore Database (start in test mode)
 * 5. Go to Project Settings > General > Your apps > Add web app
 * 6. Copy your config values below
 * 7. Add your GitHub Pages URL to authorized domains in Authentication settings
 */

// ==========================================
// FIREBASE CONFIGURATION - REPLACE WITH YOUR VALUES
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyC4o_ODH0EvogRNKUmLZEEdJSo3b_pOUls",
  authDomain: "itemlabelarchive.firebaseapp.com",
  projectId: "itemlabelarchive",
  storageBucket: "itemlabelarchive.firebasestorage.app",
  messagingSenderId: "487091327404",
  appId: "1:487091327404:web:e043ba64c3103bac2daa09"
};

// ==========================================
// IMGBB CONFIGURATION - REPLACE WITH YOUR API KEY
// ==========================================
// Get your free API key at: https://api.imgbb.com
const IMGBB_API_KEY = "9eaa7a28330fec02ec790b8e6af7bb66";

// ==========================================
// INITIALIZATION
// ==========================================

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();

// Initialize Auth (only on pages that need it)
let auth = null;
if (typeof firebase.auth === 'function') {
  auth = firebase.auth();
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Upload image to ImgBB
 * @param {File} file - The image file to upload
 * @returns {Promise<string>} - The URL of the uploaded image
 */
async function uploadImageToImgBB(file) {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('key', IMGBB_API_KEY);

  const response = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error('Failed to upload image');
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error?.message || 'Image upload failed');
  }

  return data.data.url;
}

/**
 * Check if Firebase is configured
 * @returns {boolean}
 */
function isFirebaseConfigured() {
  return firebaseConfig.apiKey !== "YOUR_API_KEY" &&
         firebaseConfig.projectId !== "YOUR_PROJECT_ID";
}

/**
 * Check if ImgBB is configured
 * @returns {boolean}
 */
function isImgBBConfigured() {
  return IMGBB_API_KEY !== "YOUR_IMGBB_API_KEY";
}

/**
 * Format Firestore timestamp to readable date
 * @param {firebase.firestore.Timestamp} timestamp
 * @returns {string}
 */
function formatTimestamp(timestamp) {
  if (!timestamp) return '-';

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Parse redacted text syntax
 * Converts [REDACTED:hidden text] to hoverable spans
 * @param {string} text
 * @returns {string} HTML string
 */
function parseRedactedText(text) {
  if (!text) return '';

  // Escape HTML first
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // Replace [REDACTED:text] with hoverable spans
  const parsed = escaped.replace(
    /\[REDACTED:(.*?)\]/g,
    '<span class="redacted" title="Hover to reveal">$1</span>'
  );

  // Convert newlines to <br> tags
  return parsed.replace(/\n/g, '<br>');
}

/**
 * Get status badge class
 * @param {string} status
 * @returns {string}
 */
function getStatusClass(status) {
  const statusMap = {
    'ACTIVE': 'badge--active',
    'MISSING': 'badge--missing',
    'CLASSIFIED': 'badge--classified',
    'RETIRED': 'badge--retired'
  };
  return statusMap[status] || 'badge--active';
}

/**
 * Get threat level class
 * @param {string} level
 * @returns {string}
 */
function getThreatClass(level) {
  const threatMap = {
    'LOW': 'threat-level--low',
    'MEDIUM': 'threat-level--medium',
    'HIGH': 'threat-level--high',
    'CRITICAL': 'threat-level--critical'
  };
  return threatMap[level] || 'threat-level--low';
}

// Log configuration status on load
console.log('BPI Database Status:', isFirebaseConfigured() ? 'CONNECTED' : 'NOT CONFIGURED');
console.log('Image Upload Status:', isImgBBConfigured() ? 'READY' : 'NOT CONFIGURED');
