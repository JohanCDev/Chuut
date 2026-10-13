import {DocumentSnapshot, FieldValue} from "firebase-admin/firestore";
import {auth, bucket, db} from "./admin";
import {dropPartner, ownersOf} from "./partner";

/**
 * Deletes a list and everything hanging off it: share link, guests' joined
 * docs, wish images, then the list with its wishes, members and claims.
 * The list doc goes first so wish triggers see it gone and do nothing.
 * @param {DocumentSnapshot} list The list to delete.
 */
export const deleteListCascade = async (
  list: DocumentSnapshot): Promise<void> => {
  const slug = list.get("slug");
  const {ids: ownerIds} = ownersOf(list);
  const invite = list.get("partnerInviteToken");
  await list.ref.delete();
  if (invite) await db.doc(`partnerInvites/${invite}`).delete();
  if (slug) await db.doc(`shareLinks/${slug}`).delete();
  const joined = await db.collectionGroup("joined")
    .where("listId", "==", list.id).get();
  await Promise.all(joined.docs.map((d) => d.ref.delete()));
  const wishes = await list.ref.collection("wishes").select().get();
  // Each owner uploads under their own prefix.
  await Promise.all(wishes.docs.flatMap((w) => ownerIds.map((o) =>
    bucket().deleteFiles({prefix: `users/${o}/wishes/${w.id}`})
      .catch(() => undefined))));
  await db.recursiveDelete(list.ref);
};

/**
 * Removes every trace of a user except the Auth record: owned lists,
 * share links, claims, memberships, joined docs, profile and Storage files.
 * Safe to call twice.
 * @param {string} uid The user to wipe.
 */
export const deleteUserData = async (uid: string): Promise<void> => {
  // Owned lists: share link, list and all subcollections (wishes, members,
  // claims), plus the guests' joined docs pointing at the list.
  const owned = await db.collection("lists").where("ownerId", "==", uid).get();
  for (const list of owned.docs) await deleteListCascade(list);

  // Lists shared with this user: leave them, and drop images they uploaded
  // since their Storage files are wiped below.
  const coOwned = await db.collection("lists")
    .where("ownerIds", "array-contains", uid).get();
  for (const list of coOwned.docs) {
    if (list.get("ownerId") === uid) continue;
    await db.runTransaction(async (tx) => {
      const fresh = await tx.get(list.ref);
      if (fresh.exists) dropPartner(tx, fresh, uid);
    });
    const wishes = await list.ref.collection("wishes").get();
    const mine = `users%2F${uid}%2F`;
    await Promise.all(wishes.docs
      .filter((w) => (w.get("imageUrl") ?? "").includes(mine))
      .map((w) => w.ref.update({imageUrl: null})));
  }

  // Own claims on other people's lists.
  const claims = await db.collectionGroup("claims")
    .where("claimerUid", "==", uid).get();
  await Promise.all(claims.docs.map((d) => d.ref.delete()));

  // Memberships in other people's lists.
  const joined = await db.collection(`users/${uid}/joined`).get();
  for (const j of joined.docs) {
    const member = db.doc(`lists/${j.id}/members/${uid}`);
    if ((await member.get()).exists) {
      await member.delete();
      await db.doc(`lists/${j.id}`)
        .update({guestCount: FieldValue.increment(-1)}).catch(() => undefined);
    }
  }

  await db.recursiveDelete(db.doc(`users/${uid}`));
  await bucket().deleteFiles({prefix: `users/${uid}/`}).catch(() => undefined);
};

/**
 * Wipes a user's data then deletes the Auth user.
 * @param {string} uid The user to delete.
 */
export const deleteUserCompletely = async (uid: string): Promise<void> => {
  await deleteUserData(uid);
  await auth.deleteUser(uid).catch((e) => {
    if (e.code !== "auth/user-not-found") throw e;
  });
};
