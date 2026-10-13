import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {getAuth} from "firebase-admin/auth";
import {getStorage} from "firebase-admin/storage";

initializeApp();

export const db = getFirestore();
export const auth = getAuth();
export const bucket = () => getStorage().bucket();

// Set ENFORCE_APP_CHECK=true in functions/.env.<project> once App Check
// metrics are clean (see setup doc, section 2).
export const enforceAppCheck = process.env.ENFORCE_APP_CHECK === "true";

// Anonymous guests inactive for longer than this are purged.
export const ANON_RETENTION_DAYS = 90;
