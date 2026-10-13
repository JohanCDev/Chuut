import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, collectionGroup, query, where, writeBatch } from 'firebase/firestore';

let env;
const real = (uid) => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'password' } }).firestore();
const anon = (uid) => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } }).firestore();

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'chuut-rules-test',
    firestore: { rules: readFileSync('../firestore.rules', 'utf8') },
  });
});
after(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const d = ctx.firestore();
    await setDoc(doc(d, 'users/owner'), { displayName: 'O', ageConfirmedAt: 1 });
    await setDoc(doc(d, 'lists/L1'), { ownerId: 'owner', slug: 's1', type: 'birthday', title: 'T', ownerName: 'O', wishCount: 1, guestCount: 2 });
    await setDoc(doc(d, 'shareLinks/s1'), { listId: 'L1', title: 'T' });
    await setDoc(doc(d, 'lists/L1/wishes/W1'), { title: 'w', rev: 0 });
    await setDoc(doc(d, 'lists/L1/wishes/W2'), { title: 'w2', rev: 0 });
    await setDoc(doc(d, 'lists/L1/members/g1'), { displayName: 'G1' });
    await setDoc(doc(d, 'lists/L1/members/g2'), { displayName: 'G2' });
    await setDoc(doc(d, 'lists/L1/claims/W1'), { claimerUid: 'g1', claimerName: 'G1', state: 'claimed', wishSnapshot: { title: 'w' } });
    await setDoc(doc(d, 'users/g1/joined/L1'), { listId: 'L1' });
    // Shared list: owner created it, partner joined as co-owner.
    await setDoc(doc(d, 'lists/LS'), { ownerId: 'owner', ownerIds: ['owner', 'partner'], ownerNames: ['O', 'P'], shared: true, slug: 'ss', type: 'other', title: 'S', ownerName: 'O et P', wishCount: 1, guestCount: 1 });
    await setDoc(doc(d, 'lists/LS/wishes/W1'), { title: 'w', rev: 0 });
    await setDoc(doc(d, 'lists/LS/members/g1'), { displayName: 'G1' });
    await setDoc(doc(d, 'lists/LS/claims/W1'), { claimerUid: 'g1', claimerName: 'G1', state: 'claimed', wishSnapshot: { title: 'w' } });
    await setDoc(doc(d, 'partnerInvites/tok'), { listId: 'L1', createdBy: 'owner' });
  });
});

test('owner cannot get/list/collectionGroup claims', async () => {
  const o = real('owner');
  await assertFails(getDoc(doc(o, 'lists/L1/claims/W1')));
  await assertFails(getDocs(collection(o, 'lists/L1/claims')));
  // Own-claims query is allowed but returns nothing: an owner holds no claims on their list.
  const own = await assertSucceeds(getDocs(query(collectionGroup(o, 'claims'), where('claimerUid', '==', 'owner'))));
  assert.equal(own.size, 0);
  await assertFails(getDocs(query(collectionGroup(o, 'claims'), where('claimerUid', '==', 'g1'))));
  await assertFails(getDocs(collectionGroup(o, 'claims')));
});

test('members read claims, non-members do not', async () => {
  await assertSucceeds(getDoc(doc(real('g2'), 'lists/L1/claims/W1')));
  await assertFails(getDoc(doc(real('stranger'), 'lists/L1/claims/W1')));
});

test('second claim on same wish fails, other wish ok, reclaim after unclaim', async () => {
  const claim = (id) => ({ claimerUid: id, claimerName: id, state: 'claimed', wishSnapshot: { title: 'w' } });
  await assertFails(setDoc(doc(real('g2'), 'lists/L1/claims/W1'), claim('g2')));
  await assertSucceeds(setDoc(doc(real('g2'), 'lists/L1/claims/W2'), claim('g2')));
  await assertSucceeds(deleteDoc(doc(real('g1'), 'lists/L1/claims/W1')));
  await assertSucceeds(setDoc(doc(real('g2'), 'lists/L1/claims/W1'), claim('g2')));
});

test('claimer cannot forge flag, claimerUid or wishSnapshot', async () => {
  const ref = doc(real('g1'), 'lists/L1/claims/W1');
  await assertFails(updateDoc(ref, { flag: 'removed' }));
  await assertFails(updateDoc(ref, { claimerUid: 'g2' }));
  await assertFails(updateDoc(ref, { wishSnapshot: { title: 'x' } }));
  await assertSucceeds(updateDoc(ref, { state: 'purchased' }));
  await assertFails(updateDoc(doc(real('g2'), 'lists/L1/claims/W1'), { state: 'purchased' }));
});

test('non-member cannot read wishes; anonymous cannot create a list', async () => {
  await assertFails(getDoc(doc(real('stranger'), 'lists/L1/wishes/W1')));
  await assertSucceeds(getDoc(doc(real('g1'), 'lists/L1/wishes/W1')));
  await assertFails(setDoc(doc(anon('a1'), 'lists/L2'), { ownerId: 'a1', slug: 's2', type: 'other', wishCount: 0, guestCount: 0 }));
});

test('owner creates list + shareLink only with ageConfirmedAt', async () => {
  const mk = (db, uid) => {
    const b = writeBatch(db);
    b.set(doc(db, 'lists/L2'), { ownerId: uid, ownerIds: [uid], ownerNames: ['n'], shared: false, slug: 's2', type: 'other', title: 'x', ownerName: 'n', wishCount: 0, guestCount: 0 });
    b.set(doc(db, 'shareLinks/s2'), { listId: 'L2', title: 'x' });
    return b.commit();
  };
  await assertFails(mk(real('noage'), 'noage'));
  await assertSucceeds(mk(real('owner'), 'owner'));
});

test('owner cannot edit counts or slug', async () => {
  const ref = doc(real('owner'), 'lists/L1');
  await assertFails(updateDoc(ref, { guestCount: 0 }));
  await assertFails(updateDoc(ref, { slug: 'x' }));
  await assertSucceeds(updateDoc(ref, { title: 'New' }));
});

test('owner cannot set rev; can edit wish', async () => {
  const ref = doc(real('owner'), 'lists/L1/wishes/W1');
  await assertFails(updateDoc(ref, { rev: 9 }));
  await assertSucceeds(updateDoc(ref, { note: 'n' }));
  await assertFails(updateDoc(doc(real('g1'), 'lists/L1/wishes/W1'), { note: 'n' }));
});

test('joined and members readable only by own uid; members write denied', async () => {
  await assertSucceeds(getDoc(doc(real('g1'), 'users/g1/joined/L1')));
  await assertFails(getDoc(doc(real('g2'), 'users/g1/joined/L1')));
  await assertFails(setDoc(doc(real('g2'), 'users/g2/joined/L1'), { listId: 'L1' }));
  await assertFails(getDoc(doc(real('g1'), 'lists/L1/members/g2')));
  await assertSucceeds(getDoc(doc(real('owner'), 'lists/L1/members/g2')));
  await assertFails(setDoc(doc(real('g3'), 'lists/L1/members/g3'), { displayName: 'x' }));
});

test('collection group: own claims only', async () => {
  await assertSucceeds(getDocs(query(collectionGroup(real('g1'), 'claims'), where('claimerUid', '==', 'g1'))));
  await assertFails(getDocs(query(collectionGroup(real('g2'), 'claims'), where('claimerUid', '==', 'g1'))));
});

test('shareLinks public read, no client update', async () => {
  await assertSucceeds(getDoc(doc(env.unauthenticatedContext().firestore(), 'shareLinks/s1')));
  await assertFails(updateDoc(doc(real('owner'), 'shareLinks/s1'), { title: 'x' }));
});

test('list create rejects forged co-owners', async () => {
  await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'users/u'), { ageConfirmedAt: 1 }));
  const base = { ownerId: 'u', ownerIds: ['u'], ownerNames: ['u'], shared: false, slug: 's3', type: 'other', title: 'x', ownerName: 'u', wishCount: 0, guestCount: 0 };
  const db = real('u');
  await assertFails(setDoc(doc(db, 'lists/L3'), { ...base, ownerIds: ['u', 'x'] }));
  await assertFails(setDoc(doc(db, 'lists/L3'), { ...base, shared: true }));
  await assertFails(setDoc(doc(db, 'lists/L3'), { ...base, partnerInviteToken: 't' }));
  const { ownerIds, ...noOwners } = base;
  await assertFails(setDoc(doc(db, 'lists/L3'), noOwners));
  await assertSucceeds(setDoc(doc(db, 'lists/L3'), base));
});

test('partner reads and edits the shared list and its wishes', async () => {
  const p = real('partner');
  await assertSucceeds(getDoc(doc(p, 'lists/LS')));
  await assertSucceeds(updateDoc(doc(p, 'lists/LS'), { title: 'New' }));
  await assertSucceeds(getDoc(doc(p, 'lists/LS/wishes/W1')));
  await assertSucceeds(updateDoc(doc(p, 'lists/LS/wishes/W1'), { note: 'n' }));
  await assertSucceeds(setDoc(doc(p, 'lists/LS/wishes/W9'), { title: 'x', rev: 0 }));
  await assertSucceeds(deleteDoc(doc(p, 'lists/LS/wishes/W9')));
  await assertSucceeds(getDoc(doc(p, 'lists/LS/members/g1')));
  await assertFails(getDoc(doc(p, 'lists/L1')));
});

test('dashboard query on ownerIds works for both owners', async () => {
  for (const uid of ['owner', 'partner']) {
    const r = await assertSucceeds(getDocs(query(collection(real(uid), 'lists'), where('ownerIds', 'array-contains', uid))));
    assert.ok(r.docs.some((d) => d.id === 'LS'));
  }
  await assertFails(getDocs(query(collection(real('g1'), 'lists'), where('ownerIds', 'array-contains', 'owner'))));
});

test('neither owner of a shared list sees claims', async () => {
  for (const uid of ['owner', 'partner']) {
    await assertFails(getDoc(doc(real(uid), 'lists/LS/claims/W1')));
    await assertFails(getDocs(collection(real(uid), 'lists/LS/claims')));
  }
  await assertSucceeds(getDoc(doc(real('g1'), 'lists/LS/claims/W1')));
});

test('owners cannot change owners, display name, shared flag or invite token', async () => {
  for (const uid of ['owner', 'partner']) {
    const ref = doc(real(uid), 'lists/LS');
    await assertFails(updateDoc(ref, { ownerIds: ['owner', 'partner', 'x'] }));
    await assertFails(updateDoc(ref, { ownerNames: ['a', 'b'] }));
    await assertFails(updateDoc(ref, { ownerName: 'x' }));
    await assertFails(updateDoc(ref, { shared: false }));
    await assertFails(updateDoc(ref, { partnerInviteToken: 'x' }));
    await assertFails(updateDoc(ref, { ownerId: 'partner' }));
  }
});

test('only the creator deletes a shared list', async () => {
  await assertFails(deleteDoc(doc(real('partner'), 'lists/LS')));
  await assertSucceeds(deleteDoc(doc(real('owner'), 'lists/LS')));
});

test('partner invites are never client-readable or writable', async () => {
  await assertFails(getDoc(doc(real('owner'), 'partnerInvites/tok')));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'partnerInvites/tok')));
  await assertFails(setDoc(doc(real('owner'), 'partnerInvites/x'), { listId: 'L1' }));
});
