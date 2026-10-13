// Partner (co-owner) callables against the emulators. Run via npm run test:functions.
import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { initializeApp as clientApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInAnonymously, signOut } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

const projectId = process.env.GCLOUD_PROJECT;
const db = getFirestore(initializeApp({ projectId }));
const app = clientApp({ projectId, apiKey: 'fake', appId: 'fake' });
const auth = getAuth(app);
connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
const fns = getFunctions(app, 'europe-west1');
const [fh, fp] = (process.env.FUNCTIONS_EMULATOR_HOST ?? '127.0.0.1:5011').split(':');
connectFunctionsEmulator(fns, fh, Number(fp));
const call = (name, data) => httpsCallable(fns, name)(data).then((r) => r.data);
const code = async (p) => { try { await p; return 'ok'; } catch (e) { return `${e.code}:${e.message}`; } };

let n = 0;
const emails = {};
const signUp = async (name) => {
  await signOut(auth);
  const email = `${name.toLowerCase()}${++n}@t.test`;
  const { user } = await createUserWithEmailAndPassword(auth, email, 'password1');
  await db.doc(`users/${user.uid}`).set({ displayName: name, ageConfirmedAt: Timestamp.now() });
  emails[user.uid] = email;
  return user.uid;
};
const signInAs = async (uid) => { await signOut(auth); await signInWithEmailAndPassword(auth, emails[uid], 'password1'); };

// Each test signs in fresh; the current user is the last one signed up.
let creator, list;
beforeEach(async () => {
  creator = await signUp('Anna');
  list = db.collection('lists').doc();
  const slug = `s-${list.id}`;
  await list.set({ ownerId: creator, ownerIds: [creator], ownerNames: ['Anna'], ownerName: 'Anna', shared: false, slug, type: 'other', title: 'Mariage', wishCount: 1, guestCount: 0 });
  await db.doc(`shareLinks/${slug}`).set({ listId: list.id, ownerName: 'Anna', title: 'Mariage', wishCount: 1 });
  await list.collection('wishes').doc('W1').set({ title: 'w', rev: 0, imageUrl: null });
});

const invite = async () => (await call('createPartnerInvite', { listId: list.id })).token;

test('partner accepts: becomes co-owner, names and share link update, link is single use', async () => {
  const token = await invite();
  const prev = await call('getPartnerInvite', { token });
  assert.equal(prev.ownerName, 'Anna');
  const tom = await signUp('Tom');
  assert.deepEqual(await call('acceptPartnerInvite', { token }), { listId: list.id });
  const l = (await list.get()).data();
  assert.deepEqual(l.ownerIds, [creator, tom]);
  assert.equal(l.ownerName, 'Anna et Tom');
  assert.equal(l.shared, true);
  assert.equal(l.partnerInviteToken, undefined);
  assert.equal((await db.doc(`shareLinks/${l.slug}`).get()).get('shared'), true);
  assert.match(await code(call('acceptPartnerInvite', { token })), /not-found/);
  assert.match(await code(call('getPartnerInvite', { token })), /not-found/);
});

test('new link revokes the old; expired link fails; list full blocks new links', async () => {
  const t1 = await invite();
  const t2 = await invite();
  assert.match(await code(call('getPartnerInvite', { token: t1 })), /not-found/);
  await db.doc(`partnerInvites/${t2}`).update({ expiresAt: Timestamp.fromMillis(Date.now() - 1000) });
  await signUp('Tom');
  assert.match(await code(call('acceptPartnerInvite', { token: t2 })), /not-found/);
});

test('creator cannot accept own link; list full refuses a third owner', async () => {
  const token = await invite();
  assert.match(await code(call('acceptPartnerInvite', { token })), /already-owner/);
  await signUp('Tom');
  await call('acceptPartnerInvite', { token });
  // A forged second invite still hits the 2-owner cap.
  await db.doc('partnerInvites/forged').set({ listId: list.id, createdBy: creator, expiresAt: Timestamp.fromMillis(Date.now() + 1e6), usedAt: null });
  await signUp('Zoe');
  assert.match(await code(call('acceptPartnerInvite', { token: 'forged' })), /list-full/);
});

test('guest with a claim is refused; guest without claims becomes owner', async () => {
  const token = await invite();
  const tom = await signUp('Tom');
  await list.collection('members').doc(tom).set({ displayName: 'Tom' });
  await db.doc(`users/${tom}/joined/${list.id}`).set({ listId: list.id });
  await list.update({ guestCount: 1 });
  await list.collection('claims').doc('W1').set({ claimerUid: tom, state: 'claimed' });
  assert.match(await code(call('acceptPartnerInvite', { token })), /has-claims/);
  await list.collection('claims').doc('W1').delete();
  await call('acceptPartnerInvite', { token });
  assert.equal((await list.collection('members').doc(tom).get()).exists, false);
  assert.equal((await db.doc(`users/${tom}/joined/${list.id}`).get()).exists, false);
  assert.equal((await list.get()).get('guestCount'), 0);
});

test('anonymous users cannot accept', async () => {
  const token = await invite();
  await signOut(auth);
  await signInAnonymously(auth);
  assert.match(await code(call('acceptPartnerInvite', { token })), /account-required/);
});

test('partner leaves; creator removes; only the creator creates links', async () => {
  const token = await invite();
  await signUp('Tom');
  await call('acceptPartnerInvite', { token });
  assert.match(await code(call('createPartnerInvite', { listId: list.id })), /not-found/);
  await call('removePartner', { listId: list.id });
  const l = (await list.get()).data();
  assert.deepEqual(l.ownerIds, [creator]);
  assert.equal(l.ownerName, 'Anna');
  assert.equal(l.shared, false);
  assert.match(await code(call('removePartner', { listId: list.id })), /not-found/);

  await signInAs(creator);
  const t2 = await invite();
  await signUp('Zoe');
  await call('acceptPartnerInvite', { token: t2 });
  await signInAs(creator);
  await call('removePartner', { listId: list.id });
  assert.deepEqual((await list.get()).get('ownerIds'), [creator]);
});

test('partner account deletion leaves the list; creator keeps it', async () => {
  const token = await invite();
  const tom = await signUp('Tom');
  await call('acceptPartnerInvite', { token });
  await list.collection('wishes').doc('W2').set({ title: 'x', rev: 0, imageUrl: `https://x/o/users%2F${tom}%2Fwishes%2FW2.jpg` });
  await call('deleteAccount', {});
  const l = (await list.get()).data();
  assert.deepEqual(l.ownerIds, [creator]);
  assert.equal(l.ownerName, 'Anna');
  assert.equal((await list.collection('wishes').doc('W2').get()).get('imageUrl'), null);
});
