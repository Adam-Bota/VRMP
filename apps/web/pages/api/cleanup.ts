import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { NextApiRequest, NextApiResponse } from 'next';

const serviceAccount = require('@/path/to/serviceAccountKey.json');

if (!initializeApp.length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const collections = ['sessions', 'metadata', 'video'];

    for (const collectionName of collections) {
      const snapshot = await db.collection(collectionName).get();
      const deletePromises = snapshot.docs.map((doc) => doc.ref.delete());
      await Promise.all(deletePromises);
    }

    res.status(200).json({ message: 'Cleanup successful' });
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({ error: 'Failed to clean up collections' });
  }
}