const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const crypto = require('crypto');
admin.initializeApp();
const db = admin.firestore();

const ADMIN_ROLES = ['admin'];

async function assertAdmin(req) {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Login zaroori hai.');
  const snap = await db.doc(`users/${req.auth.uid}`).get();
  if (!snap.exists || !ADMIN_ROLES.includes(snap.data().role)) throw new HttpsError('permission-denied', 'Ijazat nahi.');
}

function tempPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.randomBytes(8), b => chars[b % chars.length]).join('');
}

exports.requestPasswordReset = onCall(async (req) => {
  let id = String((req.data && req.data.identifier) || '').trim().toLowerCase();
  if (!id || id.length > 120) throw new HttpsError('invalid-argument', 'Invalid');
  if (/^\d{3,}$/.test(id)) id += '@teacher.mtu.local';
  try {
    const u = await admin.auth().getUserByEmail(id);
    const prof = (await db.doc(`users/${u.uid}`).get()).data() || {};
    await db.doc(`passwordResetRequests/${u.uid}`).set({
      uid: u.uid,
      name: prof.name || '',
      ajeerCode: prof.ajeerCode || prof.ajeer || '',
      contact: prof.contactNo || prof.contact || prof.phone || '',
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) { /* account na mile to bhi chup rahein */ }
  return { ok: true };
});

exports.listPasswordResetRequests = onCall(async (req) => {
  await assertAdmin(req);
  const qs = await db.collection('passwordResetRequests').where('status', '==', 'pending').limit(100).get();
  return { requests: qs.docs.map(d => { const { uid, name, ajeerCode, contact } = d.data(); return { uid, name, ajeerCode, contact }; }) };
});

exports.adminResetPassword = onCall(async (req) => {
  await assertAdmin(req);
  const uid = String((req.data && req.data.uid) || '');
  if (!uid) throw new HttpsError('invalid-argument', 'uid chahiye.');
  const password = tempPassword();
  await admin.auth().updateUser(uid, { password });
  await admin.auth().revokeRefreshTokens(uid);
  await db.doc(`passwordResetRequests/${uid}`).set({ status: 'done', resolvedBy: req.auth.uid, resolvedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  return { password };
});
