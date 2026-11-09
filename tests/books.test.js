import test from 'node:test';
import assert from 'node:assert/strict';
import {initialLibrary, moveWorkNote, changeBookSubject} from '../src/workspace.js';
import {normaliseState, createBackup, parseBackup} from '../src/storage.js';

const state = () => ({records: [], notes: [], projects: [], domains: [], tags: {}, subfolders: []});

test('migrasi mewujudkan empat buku diterbitkan tanpa memindahkan nota Karya lama ke Idea rambang', () => {
  const original = state();
  original.notes = [{id: 'legacy-work', kind: 'Karya', title: 'Catatan lama', note: 'Isi lama', noteHtml: '<p><strong>Isi lama</strong></p>', category: 'Idea rambang', pinned: true, color: 'blue', tags: ['Buku']}];
  const result = normaliseState(original);
  assert.deepEqual(result.library.books.map(book => book.title), ['Nota Mudah Makhraj & Sifat Huruf', 'Kesimpulan Makhraj & Sifat Huruf', 'Tajwid al-Nasyr', 'Akhlaq Hamalat al-Quran']);
  assert.ok(result.library.books.every(book => book.status === 'published'));
  assert.equal(result.notes[0].kind, 'Karya');
  assert.equal(result.notes[0].bookId, '');
  assert.equal(result.notes[0].purpose, 'Catatan');
  assert.equal(result.notes[0].noteHtml, original.notes[0].noteHtml);
  assert.equal(result.notes[0].pinned, true);
  assert.equal(result.notes.filter(note => note.kind === 'Idea rambang').length, 0);
  assert.deepEqual(normaliseState(result), result);
});

test('koleksi yang dikosongkan secara sengaja tidak diisi semula', () => {
  const result = normaliseState({...state(), library: {version: 1, books: [], subjects: []}});
  assert.deepEqual(result.library.books, []);
  assert.deepEqual(normaliseState(result).library.books, []);
});

test('buku baharu, pelbagai bidang, pembetulan, idea cetakan dan Idea rambang kekal selepas sandaran', () => {
  const data = state();
  data.library = initialLibrary();
  data.library.books.push({id: 'book-new', title: 'Terjemahan Sirah', status: 'unpublished', subjects: ['Terjemahan', 'Sirah']});
  data.notes = [
    {id: 'correction', kind: 'Karya', title: 'Betulkan halaman 7', note: 'Pembetulan', bookId: 'book-nota-mudah', purpose: 'Pembetulan'},
    {id: 'edition', kind: 'Karya', title: 'Tambah contoh', note: 'Contoh', bookId: 'book-nota-mudah', purpose: 'Idea cetakan seterusnya'},
    {id: 'new-book-note', kind: 'Karya', title: 'Rangka', note: 'Isi buku baharu', bookId: 'book-new', purpose: 'Idea buku'},
    {id: 'random-idea', kind: 'Idea rambang', title: 'Perkara lain', note: 'Bukan karya', tags: ['Peribadi'], color: 'rose'},
  ];
  const original = normaliseState(data);
  assert.deepEqual(parseBackup(JSON.stringify(createBackup(original))), original);
  assert.deepEqual(original.tags.Ideas, ['Peribadi']);
  assert.equal(original.notes[2].bookId, 'book-new');
});

test('pindah nota mengubah kaitan buku tanpa mengubah teks, format, tag atau arkib', () => {
  const books = initialLibrary().books;
  const note = {id: 'note', kind: 'Karya', title: 'Catatan', note: 'Isi', noteHtml: '<p><em>Isi</em></p>', tags: ['Kajian'], pinned: true, archived: false, bookId: ''};
  const notes = [note];
  assert.equal(moveWorkNote(notes, books, 'note', books[0].id), true);
  const {bookId, updatedAt, ...preserved} = note;
  assert.equal(bookId, books[0].id);
  assert.deepEqual(preserved, {id: 'note', kind: 'Karya', title: 'Catatan', note: 'Isi', noteHtml: '<p><em>Isi</em></p>', tags: ['Kajian'], pinned: true, archived: false});
  const before = structuredClone(notes);
  assert.equal(moveWorkNote(notes, books, 'note', 'missing-book'), false);
  assert.deepEqual(notes, before);
  assert.equal(moveWorkNote(notes, books, 'note', ''), true);
  assert.equal(note.bookId, '');
});

test('bidang boleh dinamakan semula/dipadam pada semua buku dan nama bertindan ditolak', () => {
  const library = initialLibrary();
  changeBookSubject(library, 'Tajwid', 'Ilmu Tajwid');
  assert.ok(library.books.slice(0, 3).every(book => book.subjects.includes('Ilmu Tajwid')));
  const before = structuredClone(library);
  assert.throws(() => changeBookSubject(library, 'Ilmu Tajwid', 'akhlak'));
  assert.deepEqual(library, before);
  changeBookSubject(library, 'Ilmu Tajwid', null);
  assert.ok(library.books.slice(0, 3).every(book => book.subjects.length === 0));
  assert.equal(library.books.length, 4);
});

test('buku tidak sah ditolak dan nota tanpa folder sah kekal boleh dicapai', () => {
  const data = state();
  data.library = initialLibrary();
  data.library.books.push({...data.library.books[0]});
  assert.throws(() => normaliseState(data));
  data.library.books.pop();
  data.notes = [{id: 'orphan', kind: 'Karya', title: 'Nota', note: 'Isi', bookId: 'book-missing'}];
  assert.equal(normaliseState(data).notes[0].bookId, '');
  data.library.books[0].status = 'unknown';
  assert.throws(() => normaliseState(data));
});
