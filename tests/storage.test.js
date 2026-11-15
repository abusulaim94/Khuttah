import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackup, parseBackup, normaliseState, validDate } from '../src/storage.js';
import { initialQuranStudents, ensureQuranRoster } from '../src/workspace.js';

const state = () => ({
  records: [{id: 't1', type: 'task', title: 'Semak laporan', domain: 'Peribadi', date: '2026-11-08', priority: 'high'}],
  notes: [{title: 'Nota saya', note: 'Baris pertama\nBaris kedua', kind: 'Nota peribadi', domain: 'Peribadi'}],
  domains: ['Peribadi'], projects: [], tags: {Notes: ['Kajian'], Knowledge: [], Events: []},
  subfolders: [{folder: 'Peribadi', name: 'Bacaan'}], groupLayoutVersion: 1,
});

test('sandaran memulihkan teks, keutamaan, kumpulan, tag, subfolder dan ID nota', () => {
  const initial = normaliseState(state());
  const restored = parseBackup(JSON.stringify(createBackup(initial)));
  assert.deepEqual(restored, initial);
});

test('format data prototaip diterima tanpa sampul sandaran', () => {
  const restored = parseBackup(JSON.stringify(state()));
  assert.equal(restored.records[0].priority, 'high');
  assert.ok(restored.notes[0].id);
});

test('sandaran tidak lengkap dan versi asing ditolak sebelum data diganti', () => {
  assert.throws(() => parseBackup('{"records":[]}'));
  assert.throws(() => parseBackup('{"format":"khuttah-backup","version":9}'));
  assert.throws(() => parseBackup('bukan json'));
});

test('tarikh mustahil dan kemajuan projek yang boleh merosakkan HTML ditolak', () => {
  assert.equal(validDate('2026-02-30'), false);
  assert.equal(validDate('2028-02-29'), true);
  assert.equal(validDate('1899-01-01'), false);
  const source = state();
  source.projects.push({title: 'Projek', domain: '', note: '', progress: '50" onmouseover="alert(1)'});
  assert.throws(() => normaliseState(source));
});

test('ID berulang dan atribut HTML dalam ID tidak diterima', () => {
  const source = state();
  source.records.push({...source.records[0]});
  assert.throws(() => normaliseState(source));
  source.records = [{...source.records[0], id: 'x" onclick="alert(1)'}];
  assert.throws(() => normaliseState(source));
});

test('nota tesis mengekalkan bab dan menolak bab di luar julat', () => {
  const source = state();
  source.notes = [{title: 'Metodologi', note: 'Isi', domain: '', kind: 'Nota tesis', thesis: 'Master', chapter: 3}];
  assert.equal(normaliseState(source).notes[0].chapter, 3);
  source.notes[0].chapter = 9;
  assert.throws(() => normaliseState(source));
});

test('pelajar Al-Quran dan sesi kelas serta nota Copywriting monokrom dipelihara dalam sandaran', () => {
  const source = state();
  source.notes.push({
    id: 'copy-1',
    title: 'Iklan Kelas Dewasa',
    note: 'Pengambilan baharu dibuka',
    kind: 'Copywriting',
    color: 'rose',
    pinned: true,
    archived: false,
    tags: ['Iklan', 'Kempen'],
  });
  source.quranStudents = [{
    id: 'qs-1',
    name: 'Ustaz Ahmad',
    note: 'Talaqqi Surah al-Baqarah',
    sessions: [
      {id: 'qses-1', date: '2026-11-03', time: '20:30', note: 'Minggu 1'},
      {id: 'qses-2', date: '2026-11-10', time: '20:30', note: 'Minggu 2'},
    ],
  }];
  const normalised = normaliseState(source);
  const copyNote = normalised.notes.find(n => n.id === 'copy-1');
  assert.equal(copyNote.color, 'white');
  assert.equal(copyNote.pinned, true);
  assert.deepEqual(normalised.tags.Copywriting, ['Iklan', 'Kempen']);
  assert.equal(normalised.quranStudents.length, 1);
  assert.equal(normalised.quranStudents[0].sessions.length, 2);
  assert.deepEqual(parseBackup(JSON.stringify(createBackup(normalised))), normalised);
});

test('senarai 13 pelajar aktif Kelas Al-Quran dimuatkan dan Che Hussin serta Norzayah dikecualikan', () => {
  const roster = initialQuranStudents();
  assert.equal(roster.length, 13);
  assert.ok(roster.some(s => s.code === '011' && s.name === 'ALI BIN MAHMOOD'));
  assert.ok(roster.some(s => s.code === '269' && s.name === 'AISYAH'));
  assert.ok(!roster.some(s => s.name.includes('CHE HUSSIN')));
  assert.ok(!roster.some(s => s.name.includes('NORZAYAH')));

  const stateWithStopped = ensureQuranRoster({
    ...state(),
    quranStudents: [
      { id: 'qs-179', code: '179', name: 'CHE HUSSIN IBRAHIM', note: '', sessions: [] },
      { id: 'qs-184', code: '184', name: 'NORZAYAH ABDULLAH', note: '', sessions: [] },
      { id: 'qs-011', code: '011', name: 'ALI BIN MAHMOOD', note: 'Aktif', sessions: [{ id: 's1', date: '2026-11-05', time: '', note: '' }] },
    ],
    quranSeedVersion: 0,
  });
  assert.equal(stateWithStopped.quranStudents.length, 13);
  assert.ok(!stateWithStopped.quranStudents.some(s => s.name.includes('CHE HUSSIN')));
  assert.ok(!stateWithStopped.quranStudents.some(s => s.name.includes('NORZAYAH')));
  const ali = stateWithStopped.quranStudents.find(s => s.code === '011');
  assert.equal(ali.sessions.length, 1);
  assert.equal(stateWithStopped.quranSeedVersion, 1);
});
