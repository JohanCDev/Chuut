import {randomBytes} from "node:crypto";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/https";
import {
  DocumentSnapshot,
  FieldValue,
  Timestamp,
  Transaction,
} from "firebase-admin/firestore";
import {db, enforceAppCheck} from "./admin";

const opts = {enforceAppCheck};

export const PARTNER_INVITE_DAYS = 7;
export const MAX_OWNERS = 2;

const requireRealUser = (req: CallableRequest): string => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  if (req.auth.token.firebase.sign_in_provider === "anonymous") {
    throw new HttpsError("permission-denied", "account-required");
  }
  return req.auth.uid;
};

const id = (v: unknown, max: number): string => {
  if (typeof v !== "string" || !v || v.length > max || v.includes("/")) {
    throw new HttpsError("invalid-argument", "Invalid input.");
  }
  return v;
};

/**
 * Owners of a list, tolerating lists created before ownerIds existed.
 * @param {DocumentSnapshot} list The list.
 * @return {{ids: string[], names: string[]}} Owner uids and display names.
 */
export const ownersOf = (list: DocumentSnapshot) => {
  const ids: string[] = list.get("ownerIds") ?? [list.get("ownerId")];
  const names: string[] = list.get("ownerNames") ?? [list.get("ownerName")];
  return {ids, names};
};

/**
 * Display string for the owners: "Anna" or "Anna et Tom".
 * @param {string[]} names Owner display names.
 * @return {string} The joined names.
 */
export const joinNames = (names: string[]): string => names.join(" et ");

/**
 * List fields describing the owners.
 * @param {string[]} ids Owner uids, creator first.
 * @param {string[]} names Display names, same order.
 * @return {object} Fields to write on the list.
 */
const ownerFields = (ids: string[], names: string[]) => ({
  ownerIds: ids,
  ownerNames: names,
  ownerName: joinNames(names),
  shared: ids.length > 1,
});

const loadInvite = async (tx: Transaction | null, token: string) => {
  const ref = db.doc(`partnerInvites/${token}`);
  const snap = tx ? await tx.get(ref) : await ref.get();
  const expired = !snap.exists || snap.get("usedAt") ||
    (snap.get("expiresAt") as Timestamp).toMillis() < Date.now();
  if (expired) throw new HttpsError("not-found", "not-found");
  return snap;
};

export const createPartnerInvite = onCall(opts, async (req) => {
  const uid = requireRealUser(req);
  const listId = id(req.data?.listId, 128);
  const listRef = db.doc(`lists/${listId}`);
  return db.runTransaction(async (tx) => {
    const list = await tx.get(listRef);
    if (!list.exists || list.get("ownerId") !== uid) {
      throw new HttpsError("not-found", "not-found");
    }
    if (ownersOf(list).ids.length >= MAX_OWNERS) {
      throw new HttpsError("resource-exhausted", "list-full");
    }
    const previous = list.get("partnerInviteToken");
    if (previous) tx.delete(db.doc(`partnerInvites/${previous}`));
    const token = randomBytes(24).toString("base64url");
    const expiresAt = Timestamp.fromMillis(
      Date.now() + PARTNER_INVITE_DAYS * 24 * 3600 * 1000);
    tx.set(db.doc(`partnerInvites/${token}`), {
      listId,
      createdBy: uid,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
      usedAt: null,
    });
    tx.update(listRef, {
      partnerInviteToken: token,
      partnerInviteExpiresAt: expiresAt,
    });
    return {token, expiresAt: expiresAt.toMillis()};
  });
});

export const revokePartnerInvite = onCall(opts, async (req) => {
  const uid = requireRealUser(req);
  const listId = id(req.data?.listId, 128);
  const listRef = db.doc(`lists/${listId}`);
  await db.runTransaction(async (tx) => {
    const list = await tx.get(listRef);
    if (!list.exists || list.get("ownerId") !== uid) {
      throw new HttpsError("not-found", "not-found");
    }
    const token = list.get("partnerInviteToken");
    if (token) tx.delete(db.doc(`partnerInvites/${token}`));
    tx.update(listRef, {
      partnerInviteToken: FieldValue.delete(),
      partnerInviteExpiresAt: FieldValue.delete(),
    });
  });
  return {revoked: true};
});

export const getPartnerInvite = onCall(opts, async (req) => {
  const token = id(req.data?.token, 64);
  const invite = await loadInvite(null, token);
  const list = await db.doc(`lists/${invite.get("listId")}`).get();
  if (!list.exists) throw new HttpsError("not-found", "not-found");
  return {
    listId: list.id,
    ownerName: list.get("ownerName"),
    title: list.get("title"),
    type: list.get("type"),
    eventDate: list.get("eventDate") ?? null,
    wishCount: list.get("wishCount") ?? 0,
    // Lets the page show "already yours" before the visitor tries to accept.
    isOwner: !!req.auth && ownersOf(list).ids.includes(req.auth.uid),
  };
});

export const acceptPartnerInvite = onCall(opts, async (req) => {
  const uid = requireRealUser(req);
  const token = id(req.data?.token, 64);

  return db.runTransaction(async (tx) => {
    const invite = await loadInvite(tx, token);
    const listId: string = invite.get("listId");
    const listRef = db.doc(`lists/${listId}`);
    const memberRef = db.doc(`lists/${listId}/members/${uid}`);
    const [list, member, user, claims] = await Promise.all([
      tx.get(listRef),
      tx.get(memberRef),
      tx.get(db.doc(`users/${uid}`)),
      tx.get(db.collection(`lists/${listId}/claims`)
        .where("claimerUid", "==", uid).limit(1)),
    ]);
    if (!list.exists) throw new HttpsError("not-found", "not-found");
    const {ids, names} = ownersOf(list);
    if (ids.includes(uid)) {
      throw new HttpsError("already-exists", "already-owner");
    }
    if (ids.length >= MAX_OWNERS) {
      throw new HttpsError("resource-exhausted", "list-full");
    }
    // A partner who reserved gifts knows what guests bought: refuse.
    if (!claims.empty) {
      throw new HttpsError("failed-precondition", "has-claims");
    }
    if (!user.get("ageConfirmedAt")) {
      throw new HttpsError("failed-precondition", "onboarding-required");
    }

    const name = (user.get("displayName") as string | undefined)?.trim() ||
      req.auth?.token.name || "?";
    const fields = ownerFields([...ids, uid], [...names, name]);
    tx.update(listRef, {
      ...fields,
      ...(member.exists ? {guestCount: FieldValue.increment(-1)} : {}),
      partnerInviteToken: FieldValue.delete(),
      partnerInviteExpiresAt: FieldValue.delete(),
    });
    if (member.exists) tx.delete(memberRef);
    tx.delete(db.doc(`users/${uid}/joined/${listId}`));
    const slug = list.get("slug");
    if (slug) tx.update(db.doc(`shareLinks/${slug}`), {shared: true});
    tx.update(invite.ref, {usedAt: FieldValue.serverTimestamp(), usedBy: uid});
    return {listId};
  });
});

/**
 * Drops the partner from a list inside a transaction. The list goes back to
 * the creator alone.
 * @param {Transaction} tx The running transaction.
 * @param {DocumentSnapshot} list The list, read in that transaction.
 * @param {string} partnerUid The partner to remove.
 */
export const dropPartner = (
  tx: Transaction, list: DocumentSnapshot, partnerUid: string): void => {
  const {ids, names} = ownersOf(list);
  const keep = ids.map((u, i) => ({u, n: names[i]}))
    .filter((o) => o.u !== partnerUid);
  const fields = ownerFields(keep.map((o) => o.u), keep.map((o) => o.n));
  tx.update(list.ref, fields);
  const slug = list.get("slug");
  if (slug) {
    tx.update(db.doc(`shareLinks/${slug}`), {shared: fields.shared});
  }
};

export const removePartner = onCall(opts, async (req) => {
  const uid = requireRealUser(req);
  const listId = id(req.data?.listId, 128);
  const listRef = db.doc(`lists/${listId}`);
  await db.runTransaction(async (tx) => {
    const list = await tx.get(listRef);
    if (!list.exists) throw new HttpsError("not-found", "not-found");
    const creator = list.get("ownerId");
    const {ids} = ownersOf(list);
    // The creator removes the partner, or the partner leaves.
    const partner = uid === creator ?
      ids.find((u) => u !== creator) :
      (ids.includes(uid) ? uid : undefined);
    if (!partner) throw new HttpsError("not-found", "not-found");
    dropPartner(tx, list, partner);
  });
  return {removed: true};
});
