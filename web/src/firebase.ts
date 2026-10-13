import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const app = initializeApp({
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
});

export const auth = getAuth(app);
export const db = getFirestore(app);
export const fns = getFunctions(app, 'europe-west1');
export const storage = getStorage(app);

if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  const port = (name: string, fallback: number) => Number(import.meta.env[`VITE_${name}_EMULATOR_PORT`] ?? fallback);
  connectAuthEmulator(auth, `http://127.0.0.1:${port('AUTH', 9099)}`, { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', port('FIRESTORE', 8080));
  connectFunctionsEmulator(fns, '127.0.0.1', port('FUNCTIONS', 5001));
  connectStorageEmulator(storage, '127.0.0.1', port('STORAGE', 9199));
} else if (import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
}
