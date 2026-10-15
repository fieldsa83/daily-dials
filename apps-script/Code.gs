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

/** The app sends one day at a time; an existing row for that date is replaced. */
function doPost(e) {
  if (e.parameter.token !== TOKEN) return json_({ ok: false, error: 'wrong token' });
  const entry = (JSON.parse(e.postData.contents) || {}).entry || {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date || '')) return json_({ ok: false, error: 'missing date' });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = sheet_();
    const keys = keys_(sh);
    // A new indicator: add its column at the end.
    for (const key of Object.keys(entry)) {
      if (keys.includes(key) || entry[key] === null || entry[key] === '' || !/^[a-z][a-z0-9_]*$/i.test(key)) continue;
      keys.push(key);
      sh.getRange(1, keys.length).setValue(HEADER_FOR[key] || key).setFontWeight('bold');
    }
    const row = keys.map(key => (entry[key] === undefined || entry[key] === null ? '' : entry[key]));
    const n = sh.getLastRow() - 1;
    const dates = n > 0 ? sh.getRange(2, 1, n, 1).getDisplayValues().map(r => r[0]) : [];
    const at = dates.indexOf(entry.date);
    const target = at >= 0 ? at + 2 : sh.getLastRow() + 1;
    sh.getRange(target, 1).setNumberFormat('@');
    sh.getRange(target, 1, 1, row.length).setValues([row]);
    if (at < 0 && sh.getLastRow() > 2) sh.getRange(2, 1, sh.getLastRow() - 1, keys.length).sort(1);
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true });
}

/** Run once from the editor to create the sheet tab and approve permissions. */
function setup() {
  sheet_();
}
