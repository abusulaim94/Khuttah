import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanTagNames, changeTag, sortItems, upcomingDeadlines} from '../src/workspace.js';
import {normaliseState, createBackup, parseBackup} from '../src/storage.js';

const state = () => ({records: [], notes: [], projects: [], domains: ['Peribadi'], tags: {Notes: ['Kajian'], Events: ['Kajian'], Knowledge: [], Works: []}, subfolders: []});

test('tugasan tanpa tarikh boleh disandar tetapi acara dan peringatan tetap memerlukan tarikh sah', () => {
  const data = state();
  data.records = [{id: 'task-1', type: 'task', title: 'Baca', date: ''}];
  assert.equal(parseBackup(JSON.stringify(createBackup(data))).records[0].date, '');
  delete data.records[0].date;
  assert.equal(normaliseState(data).records[0].date, '');
  for (const type of ['event', 'reminder']) {
    data.records[0].type = type;
    assert.throws(() => normaliseState(data));
  }
  data.records[0] = {...data.records[0], type: 'task', date: '2026-02-30'};
  assert.throws(() => normaliseState(data));
});

test('format nota, sticky notes, tag dan tarikh kekal selepas eksport/import', () => {
  const data = state();
  data.notes = [{id: 'n-work', title: 'Idea buku', note: 'Isi', noteHtml: '<p><strong>Isi</strong></p>', kind: 'Karya', category: 'Idea rambang', color: 'blue', pinned: true, archived: false, tags: ['Buku'], createdAt: '2026-11-10T01:00:00.000Z', updatedAt: '2026-11-10T02:00:00.000Z'}];
  const normalised = normaliseState(data);
  assert.deepEqual(parseBackup(JSON.stringify(createBackup(normalised))), normalised);
  assert.deepEqual(normalised.tags.Works, ['Buku']);
  assert.equal(normalised.notes[0].pinned, true);
  assert.equal(normalised.notes[0].noteHtml, data.notes[0].noteHtml);
});

test('tag tanpa definisi dipulihkan dan variasi huruf/ruang disatukan', () => {
  const data = state();
  data.notes = [{title: 'Nota', note: 'Isi', kind: 'Nota peribadi', tags: [' kajian ', 'KAJIAN', 'Baharu']}];
  const result = normaliseState(data);
  assert.deepEqual(result.tags.Notes, ['Kajian', 'Baharu']);
  assert.deepEqual(result.notes[0].tags, ['Kajian', 'Baharu']);
  assert.deepEqual(cleanTagNames(['', '  ', 'Buku', 'buku']), ['Buku']);
});

test('sunting dan padam tag mengemas kini nota/tesis tanpa menjejaskan tag acara yang sama', () => {
  const data = state();
  data.notes = [{kind: 'Nota peribadi', tags: ['Kajian']}, {kind: 'Nota tesis', tags: ['KAJIAN']}];
  data.records = [{type: 'event', tags: ['Kajian']}];
  assert.equal(changeTag(data, 'Notes', 'Kajian', 'Penulisan'), 2);
  assert.deepEqual(data.notes.map(item => item.tags), [['Penulisan'], ['Penulisan']]);
  assert.deepEqual(data.records[0].tags, ['Kajian']);
  changeTag(data, 'Notes', 'Penulisan', null);
  assert.deepEqual(data.notes.map(item => item.tags), [[], []]);
  assert.equal(data.notes.length, 2);
});

test('nama tag bertindan ditolak sebelum mengubah catatan', () => {
  const data = state();
  data.tags.Notes.push('Buku');
  const before = structuredClone(data);
  assert.throws(() => changeTag(data, 'Notes', 'Kajian', ' buku '));
  assert.deepEqual(data, before);
});

test('sorting tidak mengubah senarai asal dan rekod tanpa tarikh sentiasa di hujung', () => {
  const items = [{title: 'Zeta', date: ''}, {title: 'beta', date: '2026-11-12'}, {title: 'Alif', date: '2026-11-10'}];
  assert.deepEqual(sortItems(items, 'title-asc').map(item => item.title), ['Alif', 'beta', 'Zeta']);
  assert.deepEqual(sortItems(items, 'date-desc').map(item => item.title), ['beta', 'Alif', 'Zeta']);
  assert.equal(items[0].title, 'Zeta');
  assert.deepEqual(sortItems([{title: 'Lama'}, {title: 'Baharu', updatedAt: '2026-11-10T02:00:00.000Z'}], 'date-desc', true).map(item => item.title), ['Baharu', 'Lama']);
});

test('deadline merangkumi tiga jenis, acara berulang akan datang dan tugasan lewat', () => {
  const records = [
    {id: 'late', title: 'Lewat', type: 'task', date: '2026-11-01'},
    {id: 'none', title: 'Tanpa tarikh', type: 'task', date: ''},
    {id: 'reminder', title: 'Bayar', type: 'reminder', date: '2026-11-11'},
    {id: 'past', title: 'Lepas', type: 'event', date: '2026-11-09'},
    {id: 'weekly', title: 'Kuliah', type: 'event', date: '2026-10-28', repeat: 'weekly'},
    {id: 'event', title: 'Acara', type: 'event', date: '2026-11-12'},
    {id: 'done', title: 'Selesai', type: 'task', date: '2026-11-10', done: true},
    {id: 'future', title: 'Jauh', type: 'reminder', date: '2026-12-01'},
  ];
  const result = upcomingDeadlines(records, '2026-11-10', '2026-11-17');
  assert.deepEqual(result.map(item => item.id).sort(), ['event', 'late', 'reminder', 'weekly']);
  assert.equal(result.find(item => item.id === 'weekly').date, '2026-11-11');
  assert.equal(records.find(item => item.id === 'weekly').date, '2026-10-28');
});
