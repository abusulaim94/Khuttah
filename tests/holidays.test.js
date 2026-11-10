import test from 'node:test';
import assert from 'node:assert/strict';
import {publicHolidays} from '../src/holidays.js';

test('cuti rasmi dan cuti gantian mengelakkan pertindihan dengan cuti sedia ada', () => {
  const dates=publicHolidays(2026,'MY');
  assert.match(dates.get('2026-03-20'),/tambahan/);
  assert.match(dates.get('2026-03-23'),/gantian.*Puasa/);
  assert.match(dates.get('2026-06-02'),/gantian.*Wesak/);
  assert.match(dates.get('2026-11-09'),/gantian.*Deepavali/);
  assert.equal(dates.has('2026-11-10'),false);
  const next=publicHolidays(2027,'MY');
  assert.match(next.get('2027-06-08'),/gantian.*Muharam/);
  assert.match(next.get('2027-08-16'),/gantian.*Rasul/);
});

test('cuti negeri ditapis dan pertindihan Ahad tidak menghasilkan cuti gantian berganda', () => {
  const federal=publicHolidays(2026,'MY'),selangor=publicHolidays(2026,'SGR'),kl=publicHolidays(2026,'KUL');
  assert.equal(federal.has('2026-12-11'),false);
  assert.match(selangor.get('2026-12-11'),/Sultan Selangor/);
  assert.equal(kl.has('2026-12-11'),false);
  assert.match(kl.get('2026-02-01'),/Thaipusam.*Wilayah/);
  assert.match(kl.get('2026-02-02'),/gantian/);
  assert.equal(kl.has('2026-02-03'),false);
  selangor.clear();
  assert.ok(publicHolidays(2026,'SGR').size>0);
  assert.deepEqual(publicHolidays(2026,'invalid'),publicHolidays(2026,'KTN'));
  assert.equal(publicHolidays(2028).size,0);
});

test('Kelantan lalai menggunakan cuti negeri dan kaedah gantian Sabtu dalam pekeliling SUK', () => {
  const dates=publicHolidays(2026);
  assert.deepEqual(dates,publicHolidays(2026,'KTN'));
  assert.match(dates.get('2026-05-26'),/Wukuf/);
  assert.match(dates.get('2026-05-28'),/Qurban/);
  assert.match(dates.get('2026-09-29'),/Sultan Kelantan/);
  assert.match(dates.get('2026-09-30'),/Sultan Kelantan/);
  assert.match(dates.get('2026-03-08'),/gantian.*Nuzul/);
  assert.match(dates.get('2026-03-23'),/gantian.*Puasa/);
  for(const date of ['2026-01-01','2026-02-01','2026-05-03','2026-06-02','2026-11-09','2026-12-27'])assert.equal(dates.has(date),false,date);
  const next=publicHolidays(2027);
  assert.match(next.get('2027-02-08'),/gantian.*Cina/);
  assert.match(next.get('2027-05-02'),/gantian.*Pekerja/);
  assert.match(next.get('2027-12-26'),/gantian.*Krismas/);
  assert.equal(next.has('2027-08-16'),false);
});
