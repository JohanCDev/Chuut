// One-off: give lists created before shared lists their ownerIds/ownerNames.
// Run from functions/ with Application Default Credentials:
//   GCLOUD_PROJECT=<project-id> node scripts/backfillOwners.mjs
import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();
const lists = await db.collection("lists").get();
const writer = db.bulkWriter();
let n = 0;
for (const l of lists.docs) {
  if (l.get("ownerIds")) continue;
  writer.update(l.ref, {
    ownerIds: [l.get("ownerId")],
    ownerNames: [l.get("ownerName") ?? ""],
    shared: false,
  });
  n++;
}
await writer.close();
console.log(`Backfilled ${n} of ${lists.size} lists.`);
