import test from 'node:test';
import assert from 'node:assert/strict';
import {normaliseState, createBackup, parseBackup} from '../src/storage.js';
import {defaultClassFee, quranStatus, summariseQuranMonth, filterQuranStudents} from '../src/quran.js';

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

test('empat warna status kelas dan tapis dinamik mengikut kelas, carian dan susunan berfungsi', () => {
  assert.equal(quranStatus(0).color, 'red');
  assert.equal(quranStatus(1).color, 'orange');
  assert.equal(quranStatus(2).color, 'blue');
  assert.equal(quranStatus(3).color, 'green');
  assert.equal(quranStatus(4).color, 'green');
  const students = [
    {id: 's0', code: '010', name: 'Zainab', sessions: []},
    {id: 's1', code: '002', name: 'Ali', sessions: [{id: 'a1', date: '2026-11-01'}]},
    {id: 's2', code: '005', name: 'Bakar', sessions: [{id: 'b1', date: '2026-11-01'}, {id: 'b2', date: '2026-11-08'}]},
    {id: 's3', code: '001', name: 'Siti', sessions: ['01', '08', '15'].map(d => ({id: 'c' + d, date: '2026-11-' + d}))},
  ];
  const summary = summariseQuranMonth(students, '2026-11');
  assert.equal(summary.remaining, 6);
  assert.equal(summary.badgeColor, 'red');
  assert.deepEqual(summary.counts, {all: 4, pending: 3, '0': 1, '1': 1, '2': 1, '3': 1});
  assert.deepEqual(filterQuranStudents(summary.students, {filter: '0'}).map(x => x.student.id), ['s0']);
  assert.deepEqual(filterQuranStudents(summary.students, {filter: '1'}).map(x => x.student.id), ['s1']);
  assert.deepEqual(filterQuranStudents(summary.students, {filter: '2'}).map(x => x.student.id), ['s2']);
  assert.deepEqual(filterQuranStudents(summary.students, {filter: '3'}).map(x => x.student.id), ['s3']);
  assert.deepEqual(filterQuranStudents(summary.students, {search: '005'}).map(x => x.student.id), ['s2']);
  assert.deepEqual(filterQuranStudents(summary.students, {sort: 'name-asc'}).map(x => x.student.id), ['s1', 's2', 's3', 's0']);
  assert.deepEqual(filterQuranStudents(summary.students, {sort: 'code-asc'}).map(x => x.student.id), ['s3', 's1', 's2', 's0']);
  assert.deepEqual(filterQuranStudents(summary.students, {sort: 'count-desc'}).map(x => x.student.id), ['s3', 's2', 's1', 's0']);
});
