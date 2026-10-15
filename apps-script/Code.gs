/**
 * Daily Dials → Google Sheet
 * Paste this into Extensions → Apps Script of a blank Google Sheet.
 * Change TOKEN to a long random password, and put the same one at the end of the link in the app.
 */
const TOKEN = 'CHANGE-ME-to-a-long-random-password';
const SHEET_NAME = 'Check-ins';

// The first columns, in order: [key used by the app, column header in the sheet].
// Indicators added in the app get a column of their own, named after their key, added at the end
// the first time they have a value (weight → "weight", plus "weight_carried" for carried-forward days).
const COLUMNS = [
  ['date', 'date'],
  ['mood', 'mood'],
  ['pain', 'back_pain'],
  ['activity', 'activity'],
  ['anxiety', 'anxiety'],
  ['sleep', 'sleep'],
  ['otherpain', 'other_pain'],
  ['driving', 'driving'],
  ['note', 'note'],
  ['updatedAt', 'updated_at'],
];
const TEXT = new Set(['date', 'note', 'updatedAt']);
const HEADER_FOR = Object.fromEntries(COLUMNS);
const KEY_FOR = Object.fromEntries(COLUMNS.map(([k, h]) => [h, k]));

function sheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.getRange('A:A').setNumberFormat('@'); // keep dates as plain yyyy-mm-dd text
    sh.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS.map(c => c[1])]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** The keys of the sheet's columns, read from its header row. */
function keys_(sh) {
  const n = sh.getLastColumn();
  return n ? sh.getRange(1, 1, 1, n).getDisplayValues()[0].map(h => KEY_FOR[h] || h) : [];
}

/** The app reads every row back with ?action=all */
function doGet(e) {
  if (e.parameter.token !== TOKEN) return json_({ ok: false, error: 'wrong token' });
  if (e.parameter.action !== 'all') return json_({ ok: true });
  const sh = sheet_();
  const entries = {};
  if (sh.getLastRow() > 1) {
    const keys = keys_(sh);
    sh.getRange(2, 1, sh.getLastRow() - 1, keys.length).getDisplayValues().forEach(r => {
      if (!r[0]) return;
      const o = {};
      keys.forEach((key, i) => {
        if (!key || r[i] === "") return;
        o[key] = TEXT.has(key) ? String(r[i]) : Number(r[i]);
      });
      entries[r[0]] = o;
    });
  }
  return json_({ ok: true, entries });
}

/**
 * The app sends one day ({action: 'save', entry}) or many ({action: 'saveMany', entries: [...]}, used after an import).
 * An existing row for a date is replaced.
 */
function doPost(e) {
  if (e.parameter.token !== TOKEN) return json_({ ok: false, error: 'wrong token' });
  const body = JSON.parse(e.postData.contents) || {};
  const list = body.action === 'saveMany' ? (body.entries || []) : [body.entry || {}];
  const good = list.filter(x => x && /^\d{4}-\d{2}-\d{2}$/.test(x.date || ''));
  if (!good.length) return json_({ ok: false, error: 'missing date' });

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = sheet_();
    const keys = keys_(sh);
    // A new indicator: add its column at the end.
    for (const entry of good) for (const key of Object.keys(entry)) {
      if (keys.includes(key) || entry[key] === null || entry[key] === '' || !/^[a-z][a-z0-9_]*$/i.test(key)) continue;
      keys.push(key);
      sh.getRange(1, keys.length).setValue(HEADER_FOR[key] || key).setFontWeight('bold');
    }
    // Read every row once, replace or add the sent days, write everything back once, sorted by date.
    const n = sh.getLastRow() - 1;
    const rows = n > 0 ? sh.getRange(2, 1, n, keys.length).getValues() : [];
    const shown = n > 0 ? sh.getRange(2, 1, n, 1).getDisplayValues().map(r => r[0]) : [];
    const at = new Map(shown.map((d, i) => [d, i]));
    for (const entry of good) {
      const row = keys.map(key => (entry[key] === undefined || entry[key] === null ? '' : entry[key]));
      if (at.has(entry.date)) rows[at.get(entry.date)] = row;
      else { at.set(entry.date, rows.length); rows.push(row); shown.push(entry.date); }
    }
    const order = rows.map((r, i) => i).sort((x, y) => (shown[x] < shown[y] ? -1 : shown[x] > shown[y] ? 1 : 0));
    const sorted = order.map(i => { const r = rows[i].slice(); r[0] = shown[i]; while (r.length < keys.length) r.push(''); return r; });
    sh.getRange(2, 1, sorted.length, 1).setNumberFormat('@');
    sh.getRange(2, 1, sorted.length, keys.length).setValues(sorted);
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true, saved: good.length });
}

/** Run once from the editor to create the sheet tab and approve permissions. */
function setup() {
  sheet_();
}
