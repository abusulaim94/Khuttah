import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackup, parseBackup, normaliseState, validDate } from '../src/storage.js';

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
