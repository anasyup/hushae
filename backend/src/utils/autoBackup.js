/**
 * Backup daemon — snapshots the DB into the `snapshots` collection every 24h.
 * Kept in-DB so the free Vercel serverless environment can write it too.
 * Retention: last 14 snapshots (auto-prunes older ones).
 */
const mongoose = require('mongoose');

const COLLECTIONS = ['users', 'categories', 'settings', 'products', 'collections', 'discounts', 'orders', 'abandonedcarts'];
const RETENTION = 14;                       // keep last 14 snapshots
const INTERVAL_MS = 24 * 60 * 60 * 1000;    // once every 24h

async function takeSnapshot(reason = 'scheduled') {
  const db = mongoose.connection.db;
  if (!db) return null;
  const dump = {};
  for (const c of COLLECTIONS) {
    try { dump[c] = await db.collection(c).find({}).toArray(); }
    catch { dump[c] = []; }
  }
  const doc = {
    createdAt: new Date(),
    reason,
    sizes: Object.fromEntries(Object.entries(dump).map(([k, v]) => [k, v.length])),
    data: dump,
  };
  await db.collection('snapshots').insertOne(doc);

  // Prune older than RETENTION
  const excess = await db.collection('snapshots')
    .find({}, { projection: { _id: 1 } })
    .sort({ createdAt: -1 })
    .skip(RETENTION)
    .toArray();
  if (excess.length) {
    await db.collection('snapshots').deleteMany({ _id: { $in: excess.map(d => d._id) } });
  }
  return doc;
}

async function shouldRunNow() {
  const db = mongoose.connection.db;
  if (!db) return false;
  const last = await db.collection('snapshots').findOne({}, { sort: { createdAt: -1 } });
  if (!last) return true;
  return (Date.now() - new Date(last.createdAt).getTime()) > INTERVAL_MS;
}

let started = false;
function startAutoBackup() {
  if (started) return;
  started = true;

  // Check on startup, then every hour whether a 24h window has passed
  const tick = async () => {
    try {
      if (await shouldRunNow()) {
        const snap = await takeSnapshot('auto');
        if (snap) console.log('[backup] auto snapshot taken:', snap.sizes);
      }
    } catch (e) {
      console.warn('[backup] tick failed:', e.message);
    }
  };
  setTimeout(tick, 30_000);              // 30 s after boot
  setInterval(tick, 60 * 60 * 1000);     // then every hour
}

module.exports = { startAutoBackup, takeSnapshot };
