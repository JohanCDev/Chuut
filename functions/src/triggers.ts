import {
  onDocumentCreated,
  onDocumentDeleted,
  onDocumentUpdated,
} from "firebase-functions/firestore";
import * as logger from "firebase-functions/logger";
import {FieldValue} from "firebase-admin/firestore";
import {db} from "./admin";

const TRACKED = ["title", "url", "price", "note", "imageUrl"] as const;

const adjustWishCount = async (listId: string, delta: number) => {
  const ref = db.doc(`lists/${listId}`);
  const list = await ref.get();
  if (!list.exists) return; // list is being deleted
  const batch = db.batch();
  batch.update(ref, {wishCount: FieldValue.increment(delta)});
  const slug = list.get("slug");
  if (slug) {
    batch.update(db.doc(`shareLinks/${slug}`),
      {wishCount: FieldValue.increment(delta)});
  }
  await batch.commit().catch((e) => logger.warn("wishCount sync", e));
};

export const onWishCreate = onDocumentCreated(
  "lists/{listId}/wishes/{wishId}",
  (e) => adjustWishCount(e.params.listId, 1),
);

export const onWishUpdate = onDocumentUpdated(
  "lists/{listId}/wishes/{wishId}",
  async (e) => {
    const before = e.data?.before.data();
    const after = e.data?.after.data();
    if (!before || !after) return;

    // Loop guard: our own write only touches rev and lastChange.
    const changed = TRACKED.find(
      (f) => JSON.stringify(before[f] ?? null) !==
        JSON.stringify(after[f] ?? null));
    if (!changed) return;

    const wishRef = e.data!.after.ref;
    await wishRef.update({
      rev: FieldValue.increment(1),
      lastChange: {
        field: changed,
        from: before[changed] ?? null,
        to: after[changed] ?? null,
        at: FieldValue.serverTimestamp(),
      },
    });
    const claimRef = db.doc(
      `lists/${e.params.listId}/claims/${e.params.wishId}`);
    if ((await claimRef.get()).exists) {
      await claimRef.update({flag: "changed", flagAckAt: FieldValue.delete()});
    }
  },
);

export const onWishDelete = onDocumentDeleted(
  "lists/{listId}/wishes/{wishId}",
  async (e) => {
    const {listId, wishId} = e.params;
    // Whole list deleted (deleteListCascade removes the list doc first).
    if (!(await db.doc(`lists/${listId}`).get()).exists) return;
    const claimRef = db.doc(`lists/${listId}/claims/${wishId}`);
    const claim = await claimRef.get();
    if (claim.exists) {
      const w = e.data?.data();
      await claimRef.update({
        flag: "removed",
        flagAckAt: FieldValue.delete(),
        wishSnapshot: {
          title: w?.title ?? claim.get("wishSnapshot.title") ?? "",
          imageUrl: w?.imageUrl ?? claim.get("wishSnapshot.imageUrl") ?? null,
        },
      });
    }
    await adjustWishCount(listId, -1);
  },
);

export const onListUpdate = onDocumentUpdated("lists/{listId}", async (e) => {
  const before = e.data?.before.data();
  const after = e.data?.after.data();
  if (!before || !after) return;
  const fields = ["title", "eventDate", "ownerName"] as const;
  if (fields.every((f) => (before[f] ?? null) === (after[f] ?? null))) return;

  const patch = {
    title: after.title,
    eventDate: after.eventDate ?? null,
    ownerName: after.ownerName,
  };
  const writer = db.bulkWriter();
  writer.update(db.doc(`shareLinks/${after.slug}`), patch);
  const joined = await db.collectionGroup("joined")
    .where("listId", "==", e.params.listId).get();
  joined.docs.forEach((d) => writer.update(d.ref, patch));
  await writer.close();
});
