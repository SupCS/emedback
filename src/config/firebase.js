const admin = require("firebase-admin");
const path = require("path");

const serviceAccountPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.resolve(__dirname, "emed-video-firebase-adminsdk-fbsvc-32da974313.json");

admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath)),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

const db = admin.firestore();
const storage = admin.storage().bucket();

module.exports = { admin, db, storage };
