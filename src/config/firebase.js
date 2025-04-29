const admin = require("firebase-admin");

if (process.env.FIREBASE_PRIVATE_KEY) {
  console.log("Перевірка FIREBASE_PRIVATE_KEY:", {
    startsWith: process.env.FIREBASE_PRIVATE_KEY.substring(0, 30),
    endsWith: process.env.FIREBASE_PRIVATE_KEY.slice(-30),
    length: process.env.FIREBASE_PRIVATE_KEY.length,
  });
} else {
  console.error("FIREBASE_PRIVATE_KEY не знайдено в ENV!");
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

const db = admin.firestore();
const storage = admin.storage().bucket();

module.exports = { admin, db, storage };
