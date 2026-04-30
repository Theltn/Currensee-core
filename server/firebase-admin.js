const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

if (!admin.apps.length) {
  const saPath = path.join(__dirname, 'serviceAccountKey.json');

  if (fs.existsSync(saPath)) {
    // Explicit service account file (recommended for local dev)
    const serviceAccount = require(saPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    // No JSON file — try Application Default Credentials (ADC).
    // Works if you've run: gcloud auth application-default login
    // or if GOOGLE_APPLICATION_CREDENTIALS env var is set.
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "an-investor-dev",
    });
    console.warn('⚠️  No serviceAccountKey.json found — falling back to Application Default Credentials.');
  }
}

module.exports = admin;
