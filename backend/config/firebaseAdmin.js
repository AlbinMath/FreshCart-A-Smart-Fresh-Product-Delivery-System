import admin from 'firebase-admin';

// Initialize Firebase Admin SDK using env vars
// Preferred: set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
// Note: PRIVATE KEY must have newlines escaped in .env as \n
const hasEnvCreds = !!(
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY
);

if (!admin.apps.length) {
  if (hasEnvCreds) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      })
    });
  } else {
    // Fallback to ADC if service account env vars are not provided
    // Requires GOOGLE_APPLICATION_CREDENTIALS to be set or workload identity
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }
}

export default admin;