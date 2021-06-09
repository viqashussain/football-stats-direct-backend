import * as admin from 'firebase-admin';

// Initialize Firebase Admin
// admin.initializeApp();

const serviceAccount = require('../footballstatsdirect-3c9df9c05c15.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

export const db = admin.firestore();