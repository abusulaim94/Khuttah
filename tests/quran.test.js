import test from 'node:test';
import assert from 'node:assert/strict';
import {normaliseState, createBackup, parseBackup} from '../src/storage.js';
import {defaultClassFee, summariseQuranMonth} from '../src/quran.js';

const state = () => ({records: [], notes: [], projects: [], domains: [], quranStudents: [{id: 's1', name: 'Ali', sessions: [{id: 'c1', date: '2026-11-04'}]}]});

test('data kelas dan sandaran lama yang ada medan bayaran kekal serasi', () => {
  const source = state();
  source.quranStudents[0].monthlyFee = 25.5;
  source.quranStudents[0].payments = [{month: '2026-11', amount: 25.5, date: '2026-11-19'}];
  const restored = parseBackup(JSON.stringify(createBackup(normaliseState(source))));
  assert.equal(restored.quranStudents[0].sessions[0].date, '2026-11-04');
  assert.equal(defaultClassFee, 19);
});

test('ringkasan bulanan mengira jumlah RM19 bagi setiap kelas dalam bulan yang dipilih', () => {
  const students = [
    {id: 's1', name: 'Ali', sessions: ['02','09','16','23'].map(day => ({id: day, date: '2026-11-'+day}))},
    {id: 's2', name: 'Abu', sessions: [{id: 'old', date: '2026-10-12'}]},
  ];
  const summary = summariseQuranMonth(students, '2026-11');
  assert.equal(summary.students[0].student.id, 's2');
  assert.equal(summary.students[0].earnings, 0);
  assert.equal(summary.students[1].earnings, 76);
  assert.equal(summary.completed, 1);
  assert.equal(summary.sessions, 4);
  assert.equal(summary.remaining, 3);
  assert.equal(summary.earnings, 76);
  assert.equal(summariseQuranMonth(students, '2026-10').earnings, 19);
  assert.equal(summariseQuranMonth(students, '2026-12').earnings, 0);
  assert.equal(summariseQuranMonth([], '2026-11').remaining, 0);
  assert.equal(summariseQuranMonth([], '2026-11').earnings, 0);
});
