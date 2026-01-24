# Bureau of Peepy Investigation (B.P.I.)

A retro Y2K-styled digital archive for documenting Item Label plushie specimens.

## Project Overview

This is a static website hosted on GitHub Pages that uses Firebase for backend services. It features a public gallery of "specimen" entries (plushie documentation), field notes for organizations/locations/species, and a secure admin portal.

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS (no build step)
- **Database**: Firebase Firestore
- **Auth**: Firebase Auth (Google Sign-In)
- **Image Hosting**: ImgBB API
- **Hosting**: GitHub Pages

## Project Structure

```
Item-Label-Archive/
├── index.html              # Public specimen gallery
├── specimen.html           # Individual specimen dossier (uses ?id= param)
├── fieldnotes.html         # Field notes listing page
├── admin.html              # Protected admin portal (Google Sign-In)
├── css/
│   └── style.css           # Y2K aesthetic styles (neon colors, scanlines, glitch effects)
├── js/
│   ├── firebase-config.js  # Firebase + ImgBB configuration (contains API keys)
│   ├── auth.js             # Authentication handling
│   ├── gallery.js          # Specimen gallery grid logic
│   ├── specimen.js         # Individual dossier page logic
│   ├── fieldnotes.js       # Field notes display logic
│   └── admin.js            # Admin CRUD operations (specimens + field notes)
├── assets/
│   ├── icons/
│   └── textures/
└── README.md               # Setup instructions for users
```

## Firebase Collections

### `specimens`
```javascript
{
  name: string,
  codename: string,
  species: string,
  status: "ACTIVE" | "MISSING" | "CLASSIFIED" | "RETIRED",
  threatLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  lore: string,              // Supports [REDACTED:hidden text] syntax
  knownAssociates: string[], // Array of specimen IDs
  mugshot: string,           // ImgBB URL
  additionalPhotos: string[],
  acquisitionDate: string,
  location: string,
  specialAbilities: string[],
  notes: string,
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: string
}
```

### `fieldNotes`
```javascript
{
  title: string,
  category: "ORGANIZATION" | "LOCATION" | "SPECIES" | "OTHER",
  content: string,           // Supports [REDACTED:hidden text] syntax
  relatedSpecimens: string[], // Array of specimen IDs
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: string
}
```

### `settings/config`
```javascript
{
  allowedAdmins: string[],   // Gmail addresses authorized for admin
  marqueeMessage: string,
  siteStatus: "OPERATIONAL" | "LOCKDOWN" | "MAINTENANCE"
}
```

## Key Features

- **Redacted Text**: Use `[REDACTED:secret text]` in lore/content fields. Displays as black bars that reveal on hover.
- **Known Associates**: Bi-directional linking between specimens.
- **Real-time Updates**: Firestore listeners for instant sync.
- **Admin Edit Button**: Floating edit button appears on specimen pages when logged in as admin.
- **Field Notes**: Categorized notes for organizations, locations, species info.

## URL Parameters

- `specimen.html?id={specimenId}` - View specific specimen
- `admin.html?edit={specimenId}` - Jump to edit specific specimen
- `admin.html?editNote={noteId}` - Jump to edit specific field note

## Common Tasks

### Adding a new page
1. Create HTML file with same structure (header, nav, footer)
2. Include Firebase SDKs and firebase-config.js
3. Create corresponding JS file in js/
4. Update navigation in all HTML files

### Modifying styles
- All styles in `css/style.css`
- CSS variables defined at top (colors, shadows)
- Y2K aesthetic: neon colors, hard shadows, monospace fonts, scanline overlay

### Adding new Firestore collection
1. Add collection queries in relevant JS file
2. Update Firestore security rules in Firebase Console
3. If admin-editable, add form and CRUD in admin.html/admin.js

## Live Site

https://blubrd92.github.io/Item-Label-Archive/

## Repository

https://github.com/blubrd92/Item-Label-Archive
