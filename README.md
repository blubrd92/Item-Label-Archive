# Bureau of Peepy Investigation (B.P.I.)

A retro Y2K-styled digital archive for documenting Item Label plushie specimens.

---

## What You Need Before Starting

- A Google account (for Firebase and signing into the admin portal)
- A GitHub account (for hosting the website)
- About 15-20 minutes to set everything up

---

## Step 1: Create a Firebase Project

Firebase is a free service from Google that will store all your specimen data and handle login.

### 1.1 Go to Firebase Console

1. Open your browser and go to: **https://console.firebase.google.com**
2. If you're not signed into Google, sign in with your Google account
3. You'll see the Firebase welcome page

### 1.2 Create a New Project

1. Click the big **"Create a project"** button (or "Add project" if you've used Firebase before)
2. **Step 1 of 3 - Project name:**
   - Type a name like `peepy-investigation` (no spaces, use dashes)
   - Firebase will show a project ID below it (like `peepy-investigation-12345`)
   - Check the box to accept the terms
   - Click **"Continue"**
3. **Step 2 of 3 - Google Analytics:**
   - Toggle this **OFF** (we don't need it)
   - Click **"Create project"**
4. Wait about 30 seconds while Firebase creates your project
5. Click **"Continue"** when it says "Your new project is ready"

You're now in your Firebase project dashboard!

---

## Step 2: Enable Google Sign-In

This lets you (and other admins) sign in with a Google account.

### 2.1 Navigate to Authentication

1. Look at the left sidebar
2. Click **"Build"** to expand the menu (if it's not already expanded)
3. Click **"Authentication"**

### 2.2 Set Up Authentication

1. Click the **"Get started"** button in the middle of the screen
2. You'll see a list of "Sign-in providers"
3. Click on **"Google"** (it has the Google "G" logo)

### 2.3 Enable Google Sign-In

1. Click the **toggle switch** in the top-right to enable it (it will turn blue)
2. **Project public-facing name:** This shows during sign-in. Type something like `Bureau of Peepy Investigation`
3. **Project support email:** Click the dropdown and select your email address
4. Click the blue **"Save"** button at the bottom

You should see Google now listed as "Enabled" with a green checkmark!

---

## Step 3: Create the Database

Firestore is where all your specimen data will be stored.

### 3.1 Navigate to Firestore

1. In the left sidebar, click **"Build"** (if needed to expand)
2. Click **"Firestore Database"**

### 3.2 Create the Database

1. Click the **"Create database"** button
2. **Secure rules for Cloud Firestore:**
   - Select **"Start in test mode"** (we'll add proper security later)
   - Click **"Next"**
3. **Set Cloud Firestore location:**
   - Choose a location close to you:
     - For USA: `us-central1` or `us-east1`
     - For Europe: `europe-west1`
     - For Asia: `asia-east1`
   - Click **"Enable"**
4. Wait about 30 seconds for the database to be created

You'll now see an empty database (that's normal - we'll add data through the website).

---

## Step 4: Get Your Firebase Configuration

This is the info that connects your website to Firebase.

### 4.1 Go to Project Settings

1. Look at the top of the left sidebar
2. Click the **gear icon** (⚙️) next to "Project Overview"
3. Click **"Project settings"**

### 4.2 Register Your Web App

1. Scroll down to the section called **"Your apps"**
2. You'll see icons for different platforms (iOS, Android, Web, Unity)
3. Click the **web icon** `</>` (it looks like angle brackets)
4. **Register app:**
   - **App nickname:** Type `BPI Website`
   - Leave "Firebase Hosting" unchecked
   - Click **"Register app"**

### 4.3 Copy Your Configuration

You'll see a code block that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyB1234567890abcdefghijk",
  authDomain: "peepy-investigation-12345.firebaseapp.com",
  projectId: "peepy-investigation-12345",
  storageBucket: "peepy-investigation-12345.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

**Keep this page open!** You'll need to copy these values in the next step.

Click **"Continue to console"** (you can always find this config again in Project Settings).

---

## Step 5: Set Up ImgBB (Image Hosting)

ImgBB is a free image hosting service. When you upload specimen photos, they'll be stored here.

### 5.1 Create an ImgBB Account

1. Open a new tab and go to: **https://imgbb.com**
2. Click **"Sign up"** in the top-right corner
3. You can either:
   - Sign up with email and password, OR
   - Click **"Sign in with Google"** (easier if you have a Google account)
4. Complete the sign-up process

### 5.2 Get Your API Key

1. After signing in, go to: **https://api.imgbb.com**
2. You'll see a page that says "Getting started"
3. Look for a box labeled **"Your API key"** - it will show something like:
   ```
   a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
   ```
4. Click the **"Copy"** button next to your API key

**Keep this API key!** You'll need it in the next step.

---

## Step 6: Add Your Configuration to the Code

Now we'll put your Firebase and ImgBB info into the website code.

### 6.1 Open the Configuration File

1. In your project folder, navigate to the `js` folder
2. Open the file called `firebase-config.js` in a text editor (Notepad, VS Code, etc.)

### 6.2 Replace Firebase Configuration

Find this section near the top of the file:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

Replace each `YOUR_...` value with your actual values from Firebase (Step 4.3):

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyB1234567890abcdefghijk",           // Your actual apiKey
  authDomain: "peepy-investigation-12345.firebaseapp.com",  // Your actual authDomain
  projectId: "peepy-investigation-12345",           // Your actual projectId
  storageBucket: "peepy-investigation-12345.appspot.com",   // Your actual storageBucket
  messagingSenderId: "123456789012",                // Your actual messagingSenderId
  appId: "1:123456789012:web:abcdef1234567890"      // Your actual appId
};
```

### 6.3 Replace ImgBB API Key

Find this line:

```javascript
const IMGBB_API_KEY = "YOUR_IMGBB_API_KEY";
```

Replace `YOUR_IMGBB_API_KEY` with your actual API key from Step 5.2:

```javascript
const IMGBB_API_KEY = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6";
```

### 6.4 Save the File

Save `firebase-config.js` (Ctrl+S or Cmd+S).

---

## Step 7: Upload to GitHub

Now we'll put your website on GitHub so it can be hosted for free.

### 7.1 Create a GitHub Repository

1. Go to: **https://github.com**
2. Sign in (or create an account if you don't have one)
3. Click the **"+"** button in the top-right corner
4. Click **"New repository"**
5. **Repository name:** Type `peepy-archive` (or any name you want)
6. **Description:** Optional - something like "Bureau of Peepy Investigation Archive"
7. Keep it **Public** (required for free GitHub Pages hosting)
8. **DO NOT** check "Add a README file" (we already have one)
9. Click **"Create repository"**

### 7.2 Upload Your Files

You'll see a page with setup instructions. The easiest method is:

**Option A: Upload via Website (Easiest)**

1. On your new repository page, click **"uploading an existing file"** link
2. Drag and drop ALL your project files into the upload area:
   - `index.html`
   - `specimen.html`
   - `admin.html`
   - `README.md`
   - The entire `css` folder
   - The entire `js` folder
   - The entire `assets` folder
3. Scroll down and click **"Commit changes"**

**Option B: Using Git Command Line (If you know Git)**

```bash
cd "C:\Users\JaviM\OneDrive\Desktop\Item-Label-Archive"
git remote add origin https://github.com/YOUR_USERNAME/peepy-archive.git
git branch -M main
git push -u origin main
```

---

## Step 8: Enable GitHub Pages

This makes your website live on the internet.

### 8.1 Go to Repository Settings

1. On your GitHub repository page, click **"Settings"** (tab near the top)
2. In the left sidebar, scroll down and click **"Pages"**

### 8.2 Configure GitHub Pages

1. Under **"Source"**, you'll see "Build and deployment"
2. Click the dropdown that says **"None"**
3. Select **"main"** (or "master" if that's what it shows)
4. Leave the folder as **"/ (root)"**
5. Click **"Save"**

### 8.3 Wait for Deployment

1. The page will refresh
2. You'll see a message at the top saying "GitHub Pages source saved"
3. Wait 1-2 minutes, then refresh the page
4. You should see: **"Your site is live at https://YOUR_USERNAME.github.io/peepy-archive/"**

**Copy this URL!** This is your website address.

---

## Step 9: Authorize Your Domain in Firebase

Firebase needs to know your website address so it allows sign-in from there.

### 9.1 Go to Firebase Authentication Settings

1. Go back to Firebase Console: **https://console.firebase.google.com**
2. Click on your project
3. In the left sidebar, click **"Build"** > **"Authentication"**
4. Click the **"Settings"** tab at the top

### 9.2 Add Your Domain

1. Scroll down to **"Authorized domains"**
2. You'll see some domains already listed (like `localhost`)
3. Click **"Add domain"**
4. Type your GitHub Pages domain: `YOUR_USERNAME.github.io` (just the domain, no https://)
5. Click **"Add"**

---

## Step 10: Test Your Website!

### 10.1 Visit Your Website

1. Open your GitHub Pages URL in a new tab:
   `https://YOUR_USERNAME.github.io/peepy-archive/`
2. You should see the Bureau of Peepy Investigation homepage
3. It will say "Accessing Classified Database..." and then show an empty gallery (that's correct - no specimens yet!)

### 10.2 Test Admin Login

1. Click **"Admin Portal"** in the navigation
2. You should see "ACCESS RESTRICTED" with a "Sign In with Google" button
3. Click **"Sign In with Google"**
4. Sign in with your Google account
5. The first time you sign in, you'll automatically become an admin!
6. You should now see the admin dashboard

### 10.3 Add Your First Specimen

1. Click **"+ File New Report"**
2. Fill in some test data:
   - **Name:** Test Peepy
   - **Codename:** TESTY-1
   - **Status:** Active
   - **Threat Level:** Low
3. Click the mugshot upload area and upload any image
4. Click **"Submit Report"**
5. Go back to the gallery (click "Public Gallery") - you should see your specimen!

---

## Step 11: Add Security Rules (Important!)

Right now, anyone can edit your database. Let's lock it down so only admins can make changes.

### 11.1 Go to Firestore Rules

1. Go to Firebase Console
2. Click **"Build"** > **"Firestore Database"**
3. Click the **"Rules"** tab at the top

### 11.2 Replace the Rules

Delete everything in the rules editor and paste this:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Anyone can read specimens (public gallery)
    match /specimens/{specimenId} {
      allow read: if true;
      allow write: if request.auth != null
        && request.auth.token.email in get(/databases/$(database)/documents/settings/config).data.allowedAdmins;
    }

    // Settings are public to read, admin-only to write
    match /settings/{doc} {
      allow read: if true;
      allow write: if request.auth != null
        && request.auth.token.email in resource.data.allowedAdmins;
    }
  }
}
```

### 11.3 Publish the Rules

1. Click the **"Publish"** button
2. Wait for it to say "Rules published"

---

## Adding More Admins

If you want other people to be able to add specimens:

1. Go to Firebase Console > Firestore Database
2. Click on **"settings"** collection (left side)
3. Click on **"config"** document
4. Find the **"allowedAdmins"** field (it's an array)
5. Click the **edit icon** (pencil)
6. Click **"Add element"**
7. Type the new admin's Gmail address
8. Click **"Update"**

---

## How to Use Redacted Text

When writing specimen lore, you can hide sensitive information that reveals on hover:

**What you type:**
```
The specimen was acquired from [REDACTED:Area 51] during [REDACTED:Operation Rubber Duck].
```

**What it looks like:**
- Users see black bars where the redacted text is
- When they hover over the black bars, the hidden text is revealed

---

## Troubleshooting

### "Firebase Not Configured" or blank page
- Open browser developer tools (F12) and check the Console tab for errors
- Make sure you saved `firebase-config.js` after editing
- Make sure you didn't accidentally delete any quotes or commas
- Double-check that your Firebase config values are correct

### "This domain is not authorized" when signing in
- Go to Firebase Console > Authentication > Settings > Authorized domains
- Make sure your GitHub Pages domain is listed
- The domain should be just `username.github.io` (no https:// or path)

### Images won't upload
- Check that your ImgBB API key is correct in `firebase-config.js`
- Make sure you included the quotes around the key
- Try a smaller image (under 5MB)

### "Access Denied" after signing in
- You're signed in with an email that isn't in the allowedAdmins list
- Check Firestore > settings > config > allowedAdmins array
- Add your email address to the array

### Changes not appearing
- GitHub Pages can take 1-2 minutes to update after pushing changes
- Try a hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Check that your changes were actually pushed to GitHub

---

## Quick Reference

| What | Where |
|------|-------|
| Firebase Console | https://console.firebase.google.com |
| ImgBB API | https://api.imgbb.com |
| Your Website | https://YOUR_USERNAME.github.io/peepy-archive/ |
| Configuration File | `js/firebase-config.js` |

---

## Features

- **Public Gallery** - Grid display of all specimen "mugshot cards"
- **Specimen Dossiers** - Detailed case files with photos and lore
- **Redacted Text** - Hover-to-reveal sensitive information
- **Admin Portal** - Secure Google Sign-In for managing specimens
- **Known Associates** - Link specimens to each other
- **Real-time Updates** - Changes appear instantly
- **Y2K Aesthetic** - Retro neon styling with scanlines and glitch effects
