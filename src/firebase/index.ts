'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

export function initializeFirebase() {
  if (!getApps().length) {
    const app = initializeApp(firebaseConfig);
    return getSdks(app);
  }
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    database: getDatabase(firebaseApp),
  };
}

export * from './provider';
export * from './client-provider';
export * from './errors';
export * from './error-emitter';
export * from './firestore/use-doc';
export * from './firestore/use-collection';
