// CoRadix Academy: automatic push notifications
//  • Daily 8:00 AM (India time): fee reminders + pre/post-session task reminders
//  • Instant: new task, new fee, payment received, new feedback, new assessment

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// Must be the SAME location as your Firestore database.
const REGION = 'asia-south2';
setGlobalOptions({ region: REGION, maxInstances: 5 });

const TZ = 'Asia/Kolkata';

/* ───────── helpers ───────── */
const inr = n => Number(n || 0).toLocaleString('en-IN');
const todayIST = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });
const daysBetween = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
const fmtDate = s => s ? new Date(s + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '';
const studentIdOf = doc => {
  const studentRef = doc.ref.parent.parent;
  return studentRef && studentRef.parent.id === 'students' ? studentRef.id : null;
};

async function sendToStudent(uid, { title, body, tag }) {
  const devSnap = await db.collection('students').doc(uid).collection('devices').get();
  if (devSnap.empty) return 0;
  const tokens = devSnap.docs.map(d => d.data().token || d.id);
  const res = await admin.messaging().sendEachForMulticast({
    tokens,
    data: { title, body, tag: tag || '', link: 'dashboard.html' },
    webpush: { headers: { Urgency: 'high', TTL: '86400' } }
  });
  const dead = [];
  res.responses.forEach((r, i) => {
    const code = r.error && r.error.code;
    if (!r.success && (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token' || code === 'messaging/invalid-argument')) dead.push(tokens[i]);
  });
  await Promise.all(dead.map(t => db.collection('students').doc(uid).collection('devices').doc(t).delete().catch(() => {})));
  return res.successCount;
}

async function sendOnce(key, uid, msg) {
  const ref = db.collection('notificationLog').doc(key);
  if ((await ref.get()).exists) return;
  const sent = await sendToStudent(uid, msg);
  if (sent > 0) await ref.set({ uid, at: admin.firestore.FieldValue.serverTimestamp() });
}

/* ───────── daily reminders ───────── */
exports.dailyReminders = onSchedule({ schedule: '0 8 * * *', timeZone: TZ }, async () => {
  const today = todayIST();
  await feeReminders(today).catch(e => console.error('feeReminders failed', e));
  await taskReminders(today).catch(e => console.error('taskReminders failed', e));
});

async function feeReminders(today) {
  const snap = await db.collectionGroup('fees').get();
  for (const doc of snap.docs) {
    const uid = studentIdOf(doc);
    const f = doc.data();
    if (!uid || !f.dueDate) continue;
    const balance = (Number(f.amount) || 0) - (Number(f.paidAmount) || 0);
    if (balance <= 0) continue;

    const days = daysBetween(today, f.dueDate);
    const name = f.title || 'Fee';
    let bucket, title, body;
    if (days < 0) {
      const late = -days;
      bucket = 'od' + Math.floor((late - 1) / 3);
      title = '⚠️ Fee overdue';
      body = `${name}: ₹${inr(balance)} was due on ${fmtDate(f.dueDate)} (${late} day${late === 1 ? '' : 's'} ago). Please pay as soon as you can.`;
    } else if (days === 0) {
      bucket = 'd0'; title = '⏰ Fee due today';
      body = `${name}: ₹${inr(balance)} is due today.`;
    } else if (days <= 1) {
      bucket = 'd1'; title = '⏰ Fee due tomorrow';
      body = `${name}: ₹${inr(balance)} is due tomorrow (${fmtDate(f.dueDate)}).`;
    } else if (days <= 3) {
      bucket = 'd3'; title = '💰 Fee due in ' + days + ' days';
      body = `${name}: ₹${inr(balance)} is due on ${fmtDate(f.dueDate)}.`;
    } else if (days <= 7) {
      bucket = 'd7'; title = '💰 Fee due in ' + days + ' days';
      body = `${name}: ₹${inr(balance)} is due on ${fmtDate(f.dueDate)}.`;
    } else continue;

    await sendOnce(`fee_${uid}_${doc.id}_${f.dueDate}_${bucket}`, uid, { title, body, tag: 'fee_' + doc.id });
  }
}

async function taskReminders(today) {
  const snap = await db.collectionGroup('tasks').get();
  for (const doc of snap.docs) {
    const uid = studentIdOf(doc);
    const t = doc.data();
    if (!uid || t.done || !t.sessionDate) continue;
    const days = daysBetween(today, t.sessionDate);
    const name = t.title || 'Task';
    const subj = (t.subject || '').trim();
    const forSubj = subj ? ` for ${subj}` : '';

    if (t.kind === 'Post-session') {
      const late = -days;
      if (late < 1 || late > 9) continue;
      const bucket = 'p' + Math.floor((late - 1) / 3);
      await sendOnce(`task_${uid}_${doc.id}_${t.sessionDate}_${bucket}`, uid, {
        title: '📝 Post-session task pending',
        body: `${name}${forSubj} is still waiting. Session was on ${fmtDate(t.sessionDate)}.`,
        tag: 'task_' + doc.id
      });
    } else {
      if (days !== 1 && days !== 0) continue;
      await sendOnce(`task_${uid}_${doc.id}_${t.sessionDate}_pre${days}`, uid, {
        title: days === 1 ? '📚 Prep for tomorrow\'s session' : '📚 Session today: finish your prep',
        body: `${name}${forSubj}${days === 1 ? ' is due before tomorrow\'s session.' : ' should be done before today\'s session.'}`,
        tag: 'task_' + doc.id
      });
    }
  }
}

/* ───────── instant notifications ───────── */
const safe = fn => async event => { try { await fn(event); } catch (e) { console.error('notification failed', e); } };

exports.onTaskCreated = onDocumentCreated('students/{uid}/tasks/{taskId}', safe(async event => {
  const t = event.data.data();
  const kind = t.kind === 'Post-session' ? 'post-session' : 'pre-session';
  const subj = (t.subject || '').trim();
  await sendToStudent(event.params.uid, {
    title: `New ${kind} task`,
    body: `${subj ? subj + ': ' : ''}${t.title || 'Task'}${t.sessionDate ? ' (session ' + fmtDate(t.sessionDate) + ')' : ''}`,
    tag: 'task_' + event.params.taskId
  });
}));

exports.onFeeCreated = onDocumentCreated('students/{uid}/fees/{feeId}', safe(async event => {
  const f = event.data.data();
  const balance = (Number(f.amount) || 0) - (Number(f.paidAmount) || 0);
  if (balance <= 0) return;
  await sendToStudent(event.params.uid, {
    title: '💰 New fee added',
    body: `${f.title || 'Fee'}: ₹${inr(balance)}${f.dueDate ? ', pay by ' + fmtDate(f.dueDate) : ''}.`,
    tag: 'fee_' + event.params.feeId
  });
}));

exports.onFeeUpdated = onDocumentUpdated('students/{uid}/fees/{feeId}', safe(async event => {
  const before = event.data.before.data(), after = event.data.after.data();
  const paidBefore = Number(before.paidAmount) || 0, paidAfter = Number(after.paidAmount) || 0;
  if (paidAfter <= paidBefore) return;
  const balance = (Number(after.amount) || 0) - paidAfter;
  await sendToStudent(event.params.uid, {
    title: '✅ Payment received',
    body: `₹${inr(paidAfter - paidBefore)} received for ${after.title || 'your fee'}. ` + (balance <= 0 ? 'Fully paid, thank you!' : `Balance: ₹${inr(balance)}.`),
    tag: 'fee_' + event.params.feeId
  });
}));

exports.onFeedbackCreated = onDocumentCreated('students/{uid}/feedback/{id}', safe(async event => {
  const f = event.data.data();
  const subj = (f.subject || '').trim();
  // the note itself is not included, so private feedback never shows on a lock screen
  await sendToStudent(event.params.uid, {
    title: '💬 New feedback',
    body: subj ? `Your tutor added feedback for ${subj}.` : 'Your tutor added new feedback.',
    tag: 'feedback_' + event.params.id
  });
}));

exports.onAssessmentCreated = onDocumentCreated('students/{uid}/assessments/{id}', safe(async event => {
  const a = event.data.data();
  await sendToStudent(event.params.uid, {
    title: '📝 New assessment',
    body: `${a.title || 'Assessment'}${a.dueDate ? ', due ' + fmtDate(a.dueDate) : ''}.`,
    tag: 'assessment_' + event.params.id
  });
}));

/* ───────── manual send from the admin page ───────── */
exports.sendNotification = onCall(async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Log in first.');
  const adminDoc = await db.collection('admins').doc(request.auth.uid).get();
  if (!adminDoc.exists) throw new HttpsError('permission-denied', 'Admins only.');

  const { audience, uids, title, body } = request.data || {};
  if (!title || !body) throw new HttpsError('invalid-argument', 'Title and message are required.');

  let targets;
  if (audience === 'all') targets = (await db.collection('students').get()).docs.map(d => d.id);
  else if (Array.isArray(uids) && uids.length) targets = uids;
  else throw new HttpsError('invalid-argument', 'Choose who to send to.');

  let sent = 0, devices = 0;
  for (const uid of targets) {
    const n = (await db.collection('students').doc(uid).collection('devices').get()).size;
    devices += n;
    if (n) sent += await sendToStudent(uid, { title: String(title), body: String(body), tag: 'manual_' + Date.now() });
  }
  return { sent, failed: Math.max(devices - sent, 0), devices };
});
