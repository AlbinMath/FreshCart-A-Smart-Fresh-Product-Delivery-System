import admin from 'firebase-admin';

// Initialize Firebase Admin SDK using env vars
// Preferred: set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
// Note: PRIVATE KEY must have newlines escaped in .env as \n
const hasEnvCreds = !!(
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY
);

console.log('🔥 Firebase Admin Config Debug:');
console.log('hasEnvCreds:', hasEnvCreds);
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'SET' : 'NOT SET');
console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'SET' : 'NOT SET');
console.log('FIREBASE_PRIVATE_KEY length:', process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.length : 'NOT SET');

if (!admin.apps.length) {
  if (hasEnvCreds) {
    console.log('✅ Using environment variable credentials');
    try {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      console.log('Private key starts with:', privateKey.substring(0, 50) + '...');
      console.log('Private key ends with:', privateKey.substring(privateKey.length - 50));

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        })
      });
      console.log('✅ Firebase Admin initialized successfully with env credentials');
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Admin with env credentials:', error);
      throw error;
    }
  } else {
    console.log('⚠️ Using Application Default Credentials (ADC)');
    // Fallback to ADC if service account env vars are not provided
    // Requires GOOGLE_APPLICATION_CREDENTIALS to be set or workload identity
    try {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      console.log('✅ Firebase Admin initialized successfully with ADC');
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Admin with ADC:', error);
      throw error;
    }
  }
}

export default admin;