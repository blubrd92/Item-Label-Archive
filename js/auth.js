/**
 * Bureau of Peepy Investigation
 * Authentication Module
 *
 * Handles Google Sign-In and admin authorization
 */

// Current user state
let currentUser = null;
let isAuthorizedAdmin = false;
let allowedAdmins = [];

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const deniedScreen = document.getElementById('denied-screen');
const loadingScreen = document.getElementById('loading');
const adminDashboard = document.getElementById('admin-dashboard');
const logoutBtn = document.getElementById('logout-btn');
const agentEmail = document.getElementById('agent-email');
const deniedEmail = document.getElementById('denied-email');

/**
 * Initialize authentication
 */
function initAuth() {
  // Check if Firebase is configured
  if (!isFirebaseConfigured()) {
    showAuthScreen();
    document.getElementById('login-btn').disabled = true;
    document.getElementById('login-btn').textContent = 'Firebase Not Configured';
    console.warn('Firebase is not configured. Please update firebase-config.js');
    return;
  }

  // Show loading while checking auth state
  showLoading();

  // Listen for auth state changes
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      console.log('User signed in:', user.email);

      // Check if user is an authorized admin
      await checkAdminAuthorization(user.email);
    } else {
      currentUser = null;
      isAuthorizedAdmin = false;
      showAuthScreen();
    }
  });
}

/**
 * Check if user email is in the allowed admins list
 * @param {string} email
 */
async function checkAdminAuthorization(email) {
  try {
    // Fetch allowed admins from Firestore settings
    const settingsDoc = await db.collection('settings').doc('config').get();

    if (settingsDoc.exists) {
      const settings = settingsDoc.data();
      allowedAdmins = settings.allowedAdmins || [];

      if (allowedAdmins.includes(email)) {
        isAuthorizedAdmin = true;
        showAdminDashboard();
      } else {
        isAuthorizedAdmin = false;
        showAccessDenied(email);
      }
    } else {
      // No settings document exists - create one with current user as admin
      // This allows the first user to set themselves up as admin
      console.log('No settings document found. Creating with current user as admin.');

      await db.collection('settings').doc('config').set({
        allowedAdmins: [email],
        marqueeMessage: '/// SYSTEM STATUS: OPERATIONAL /// CLASSIFIED DOCUMENTS ///',
        siteStatus: 'OPERATIONAL',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      allowedAdmins = [email];
      isAuthorizedAdmin = true;
      showAdminDashboard();
    }
  } catch (error) {
    console.error('Error checking admin authorization:', error);

    // If we can't read settings (permissions), treat as authorized for first-time setup
    // This handles the case where security rules aren't set up yet
    if (error.code === 'permission-denied') {
      console.log('Permission denied reading settings. User may need to set up security rules.');
      isAuthorizedAdmin = true;
      showAdminDashboard();
    } else {
      showAccessDenied(email);
    }
  }
}

/**
 * Handle Google Sign-In
 */
async function handleLogin() {
  if (!isFirebaseConfigured()) {
    alert('Firebase is not configured. Please update js/firebase-config.js with your Firebase project credentials.');
    return;
  }

  const provider = new firebase.auth.GoogleAuthProvider();

  try {
    showLoading();
    await auth.signInWithPopup(provider);
  } catch (error) {
    console.error('Login error:', error);
    showAuthScreen();

    if (error.code === 'auth/popup-closed-by-user') {
      // User closed popup, no need to alert
      return;
    }

    if (error.code === 'auth/unauthorized-domain') {
      alert('This domain is not authorized. Please add it to your Firebase Authentication settings.');
      return;
    }

    alert('Login failed: ' + error.message);
  }
}

/**
 * Handle logout
 */
async function handleLogout() {
  try {
    await auth.signOut();
    currentUser = null;
    isAuthorizedAdmin = false;
    showAuthScreen();
  } catch (error) {
    console.error('Logout error:', error);
    alert('Logout failed: ' + error.message);
  }
}

/**
 * Show auth screen (login prompt)
 */
function showAuthScreen() {
  authScreen.classList.remove('hidden');
  deniedScreen.classList.add('hidden');
  loadingScreen.classList.add('hidden');
  adminDashboard.classList.add('hidden');
  logoutBtn.classList.add('hidden');
}

/**
 * Show access denied screen
 * @param {string} email
 */
function showAccessDenied(email) {
  authScreen.classList.add('hidden');
  deniedScreen.classList.remove('hidden');
  loadingScreen.classList.add('hidden');
  adminDashboard.classList.add('hidden');
  logoutBtn.classList.remove('hidden');

  if (deniedEmail) {
    deniedEmail.textContent = email;
  }
}

/**
 * Show loading screen
 */
function showLoading() {
  authScreen.classList.add('hidden');
  deniedScreen.classList.add('hidden');
  loadingScreen.classList.remove('hidden');
  adminDashboard.classList.add('hidden');
}

/**
 * Show admin dashboard
 */
function showAdminDashboard() {
  authScreen.classList.add('hidden');
  deniedScreen.classList.add('hidden');
  loadingScreen.classList.add('hidden');
  adminDashboard.classList.remove('hidden');
  logoutBtn.classList.remove('hidden');

  if (agentEmail && currentUser) {
    agentEmail.textContent = currentUser.email;
  }

  // Initialize admin functionality
  if (typeof initAdmin === 'function') {
    initAdmin();
  }
}

/**
 * Get current user
 * @returns {firebase.User|null}
 */
function getCurrentUser() {
  return currentUser;
}

/**
 * Check if current user is authorized
 * @returns {boolean}
 */
function isAdmin() {
  return isAuthorizedAdmin;
}

// Initialize auth when DOM is ready
document.addEventListener('DOMContentLoaded', initAuth);
