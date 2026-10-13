import {CallableRequest, HttpsError, onCall} from "firebase-functions/https";
import {FieldValue} from "firebase-admin/firestore";
import {auth, db, enforceAppCheck} from "./admin";
import {deleteListCascade, deleteUserCompletely} from "./cleanup";
import {fetchMeta} from "./linkMeta";
import {ownersOf} from "./partner";

const opts = {enforceAppCheck};

const requireAuth = (req: CallableRequest): string => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  return req.auth.uid;
};

const isAnonymous = (req: CallableRequest): boolean =>
  req.auth?.token.firebase.sign_in_provider === "anonymous";

const str = (v: unknown, max: number): string => {
  if (typeof v !== "string" || !v.trim() || v.length > max) {
    throw new HttpsError("invalid-argument", "Invalid input.");
  }
  return v.trim();
};

export const getInvite = onCall(opts, async (req) => {
  const slug = str(req.data?.slug, 80);
  if (slug.includes("/")) throw new HttpsError("not-found", "not-found");
  const snap = await db.doc(`shareLinks/${slug}`).get();
  if (!snap.exists) throw new HttpsError("not-found", "not-found");
  const d = snap.data()!;
  return {
    ownerName: d.ownerName,
    title: d.title,
    type: d.type,
    eventDate: d.eventDate ?? null,
    wishCount: d.wishCount ?? 0,
    shared: d.shared ?? false,
  };
});

export const joinList = onCall(opts, async (req) => {
  const uid = requireAuth(req);
  const slug = str(req.data?.slug, 80);
  const displayName = str(req.data?.displayName, 40);
  if (slug.includes("/")) throw new HttpsError("not-found", "not-found");

  const link = await db.doc(`shareLinks/${slug}`).get();
  if (!link.exists) throw new HttpsError("not-found", "not-found");
  const listId: string = link.get("listId");
  const listRef = db.doc(`lists/${listId}`);
  const memberRef = db.doc(`lists/${listId}/members/${uid}`);

  await db.runTransaction(async (tx) => {
    const [list, member, user] = await Promise.all([
      tx.get(listRef), tx.get(memberRef), tx.get(db.doc(`users/${uid}`)),
    ]);
    if (!list.exists) throw new HttpsError("not-found", "not-found");
    if (ownersOf(list).ids.includes(uid)) {
      throw new HttpsError("failed-precondition", "owner-cannot-join");
    }
    if (member.exists) return; // idempotent
    const l = list.data()!;
    tx.set(memberRef, {
      displayName,
      joinedAt: FieldValue.serverTimestamp(),
      isAnonymous: isAnonymous(req),
    });
    tx.set(db.doc(`users/${uid}/joined/${listId}`), {
      listId,
      slug,
      title: l.title,
      type: l.type,
      eventDate: l.eventDate ?? null,
      ownerName: l.ownerName,
      joinedAt: FieldValue.serverTimestamp(),
    });
    tx.set(db.doc(`users/${uid}`), user.exists ?
      {} :
      {
        displayName,
        ageConfirmedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      }, {merge: true});
    if (user.exists && !user.get("ageConfirmedAt")) {
      tx.update(db.doc(`users/${uid}`),
        {ageConfirmedAt: FieldValue.serverTimestamp()});
    }
    tx.update(listRef, {guestCount: FieldValue.increment(1)});
  });
  return {listId};
});

export const fetchLinkMeta = onCall(
  {...opts, timeoutSeconds: 20}, async (req) => {
    requireAuth(req);
    if (isAnonymous(req)) {
      throw new HttpsError("permission-denied", "Owners only.");
    }
    const url = str(req.data?.url, 2048);
    try {
      return await fetchMeta(url);
    } catch (e) {
      const m = (e as Error).message;
      if (m === "private" || m === "scheme") {
        throw new HttpsError("invalid-argument", "Unsupported URL.");
      }
      throw new HttpsError("unavailable", "Could not read this link.");
    }
  });

export const mergeGuest = onCall(opts, async (req) => {
  const newUid = requireAuth(req);
  const token = str(req.data?.oldIdToken, 4096);
  let old;
  try {
    old = await auth.verifyIdToken(token);
  } catch {
    throw new HttpsError("invalid-argument", "Invalid token.");
  }
  if (old.firebase.sign_in_provider !== "anonymous") {
    throw new HttpsError("failed-precondition", "Not a guest session.");
  }
  const oldUid = old.uid;
  if (oldUid === newUid) return {merged: 0};

  // Lists the old guest joined, from joined docs and from claims.
  const joined = await db.collection(`users/${oldUid}/joined`).get();
  const claims = await db.collectionGroup("claims")
    .where("claimerUid", "==", oldUid).get();
  const listIds = new Set<string>(joined.docs.map((d) => d.id));
  claims.docs.forEach((c) => listIds.add(c.ref.parent.parent!.id));

  let merged = 0;
  for (const listId of listIds) {
    const listRef = db.doc(`lists/${listId}`);
    const list = await listRef.get();
    if (!list.exists) continue;
    const oldMember = db.doc(`lists/${listId}/members/${oldUid}`);
    const newMember = db.doc(`lists/${listId}/members/${newUid}`);
    const [om, nm] = await Promise.all([oldMember.get(), newMember.get()]);
    const isOwner = ownersOf(list).ids.includes(newUid);

    const batch = db.batch();
    if (om.exists) {
      if (!nm.exists && !isOwner) {
        batch.set(newMember, {...om.data(), isAnonymous: false});
        batch.set(db.doc(`users/${newUid}/joined/${listId}`),
          joined.docs.find((d) => d.id === listId)?.data() ?? {listId},
          {merge: true});
      } else {
        batch.update(listRef, {guestCount: FieldValue.increment(-1)});
      }
      batch.delete(oldMember);
    }
    for (const c of claims.docs) {
      if (c.ref.parent.parent!.id !== listId) continue;
      if (isOwner) batch.delete(c.ref); // owners must never hold claims
      else batch.update(c.ref, {claimerUid: newUid});
    }
    await batch.commit();
    merged++;
  }

  await db.recursiveDelete(db.doc(`users/${oldUid}`));
  await auth.deleteUser(oldUid).catch((e) => {
    if (e.code !== "auth/user-not-found") throw e;
  });
  return {merged};
});

export const exportMyData = onCall(opts, async (req) => {
  const uid = requireAuth(req);
  const [user, joined, created, coOwned, claims] = await Promise.all([
    db.doc(`users/${uid}`).get(),
    db.collection(`users/${uid}/joined`).get(),
    db.collection("lists").where("ownerId", "==", uid).get(),
    db.collection("lists").where("ownerIds", "array-contains", uid).get(),
    db.collectionGroup("claims").where("claimerUid", "==", uid).get(),
  ]);
  // Owned lists and wishes only. Claims on them are never read here.
  const owned = [...created.docs,
    ...coOwned.docs.filter((d) => !created.docs.some((c) => c.id === d.id))];
  const lists = await Promise.all(owned.map(async (l) => ({
    id: l.id,
    ...l.data(),
    wishes: (await l.ref.collection("wishes").get()).docs
      .map((w) => ({id: w.id, ...w.data()})),
  })));
  return JSON.parse(JSON.stringify({
    profile: user.data() ?? null,
    ownedLists: lists,
    joinedLists: joined.docs.map((d) => d.data()),
    myClaims: claims.docs.map((c) => ({
      listId: c.ref.parent.parent!.id, wishId: c.id, ...c.data(),
    })),
  }));
});

export const deleteAccount = onCall(
  {...opts, timeoutSeconds: 300}, async (req) => {
    const uid = requireAuth(req);
    await deleteUserCompletely(uid);
    return {deleted: true};
  });

export const deleteList = onCall(
  {...opts, timeoutSeconds: 120}, async (req) => {
    const uid = requireAuth(req);
    const listId = str(req.data?.listId, 128);
    const list = await db.doc(`lists/${listId}`).get();
    if (!list.exists || list.get("ownerId") !== uid) {
      throw new HttpsError("not-found", "not-found");
    }
    await deleteListCascade(list);
    return {deleted: true};
  });
