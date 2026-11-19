import test from 'node:test';
import assert from 'node:assert/strict';
import {normaliseState, createBackup, parseBackup} from '../src/storage.js';
import {summariseQuranMonth} from '../src/quran.js';

const state = () => ({records: [], notes: [], projects: [], domains: [], quranStudents: [{id: 's1', name: 'Ali', sessions: [{id: 'c1', date: '2026-11-04'}]}]});

test('data kelas lama mendapat kadar RM19 tanpa menandakan bayaran sebagai selesai', () => {
  const student = normaliseState(state()).quranStudents[0];
  assert.equal(student.monthlyFee, 19);
  assert.deepEqual(student.payments, []);
  assert.equal(student.sessions[0].date, '2026-11-04');
});

test('kadar tersuai dan bayaran bulan terdahulu kekal melalui sandaran', () => {
  const source = state();
  source.quranStudents[0].monthlyFee = 25.5;
  source.quranStudents[0].payments = [{month: '2026-10', amount: 19, date: '2026-11-01'}, {month: '2026-11', amount: 25.5, date: '2026-11-19'}];
  const restored = parseBackup(JSON.stringify(createBackup(source)));
  assert.equal(restored.quranStudents[0].monthlyFee, 25.5);
  assert.deepEqual(restored.quranStudents[0].payments, source.quranStudents[0].payments);
});

test('bayaran tidak sah, bulan berulang dan tarikh mustahil ditolak', () => {
  for (const value of [-1, Infinity, NaN, '19', 0.001, 100000]) {
    const source = state();
    source.quranStudents[0].monthlyFee = value;
    assert.throws(() => normaliseState(source), /bayaran/);
  }
  for (const payment of [{month: '2026-13', amount: 19, date: '2026-11-19'}, {month: '2026-11', amount: -1, date: '2026-11-19'}, {month: '2026-11', amount: 19, date: '2026-02-30'}]) {
    const source = state(); source.quranStudents[0].payments = [payment];
    assert.throws(() => normaliseState(source));
  }
  const source = state(), payment = {month: '2026-11', amount: 19, date: '2026-11-19'};
  source.quranStudents[0].payments = [payment, payment];
  assert.throws(() => normaliseState(source), /bulan bayaran/);
  source.quranStudents[0].monthlyFee = 0; source.quranStudents[0].payments = [];
  assert.equal(normaliseState(source).quranStudents[0].monthlyFee, 0);
});

test('ringkasan bulanan mengasingkan bulan dan kelas tambahan tidak mengurangkan baki pelajar lain', () => {
  const students = [{id: 's1', name: 'Ali', sessions: ['02','09','16','23'].map(day => ({id: day, date: '2026-11-'+day})), payments: [{month: '2026-11', amount: 19.1}, {month: '2026-10', amount: 40}]}, {id: 's2', name: 'Abu', sessions: [{id: 'old', date: '2026-10-12'}], payments: [{month: '2026-11', amount: 25.2}]}];
  const summary = summariseQuranMonth(students, '2026-11');
  assert.equal(summary.students[0].student.id, 's2');
  assert.equal(summary.completed, 1);
  assert.equal(summary.sessions, 4);
  assert.equal(summary.remaining, 3);
  assert.equal(summary.collected, 44.3);
  assert.equal(summary.paidCount, 2);
  assert.equal(summariseQuranMonth(students, '2026-12').collected, 0);
  assert.equal(summariseQuranMonth([], '2026-11').remaining, 0);
});
