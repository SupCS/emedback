const admin = require("firebase-admin");

// Якщо GOOGLE_CREDENTIALS_JSON є в середовищі — парсимо її
if (process.env.GOOGLE_CREDENTIALS_JSON) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON)
    ),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
} else {
  const path = require("path");
  const serviceAccountPath = path.resolve(
    __dirname,
    "emed-video-firebase-adminsdk-fbsvc-32da974313.json"
  );
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath)),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

const db = admin.firestore();
const storage = admin.storage().bucket();

module.exports = { admin, db, storage };
