import test from 'node:test';
import assert from 'node:assert/strict';
import {clearLegacyDemoData} from '../src/cleanup.js';

const originalRecord = () => ({id:'t1',type:'task',title:'Semak laporan kelas Oktober',domain:'Uthmani',date:'2026-11-05',detail:'Semak ringkasan kelas dan kehadiran bagi kedua-dua cawangan.',priority:'high'});
const originalNote = () => ({id:'old-note',title:'Nota sistem reka bentuk',domain:'Peribadi',kind:'Rujukan',note:'Palet Zinc, tipografi, jarak dan komponen antaramuka.'});
const state = () => ({
  records:[originalRecord()], notes:[originalNote()],
  projects:[{title:'Sistem Pengurusan Uthmani',domain:'Uthmani',progress:72,note:'Operasi kelas · Fasa 1'}],
  domains:['Peribadi','Uthmani','KPAZ'], subfolders:[{folder:'Peribadi',name:'Catatan saya'}],
  tags:{Notes:[],Knowledge:['Tajwid','Sirah','Ulum Quran','Lain-lain'],Events:['Kuliah mingguan','Kuliah jemputan','Majlis kahwin','Lain-lain']},
  groupLayoutVersion:1,
});

test('demo yang tidak diubah dibersihkan; kumpulan dan subfolder dikekalkan', () => {
  const source=state();
  const cleaned=clearLegacyDemoData(source);
  assert.deepEqual(cleaned.records,[]);
  assert.deepEqual(cleaned.notes,[]);
  assert.deepEqual(cleaned.projects,[]);
  assert.deepEqual(cleaned.tags,{Notes:[],Knowledge:[],Events:[]});
  assert.deepEqual(cleaned.domains,source.domains);
  assert.deepEqual(cleaned.subfolders,source.subfolders);
  assert.equal(cleaned.demoCleanupVersion,1);
});

test('perubahan pengguna pada rekod demo tidak dipadam', () => {
  for (const change of [{title:'Laporan sebenar saya'},{date:'2026-11-20'},{priority:'low'},{done:true},{detail:'Catatan saya'},{tags:['Penting']}]) {
    const source=state();
    Object.assign(source.records[0],change);
    assert.deepEqual(clearLegacyDemoData(source).records,source.records);
  }
});

test('nota disunting, projek dikemas kini dan rekod ciptaan pengguna dikekalkan', () => {
  const source=state();
  source.notes[0].note+='\nCatatan peribadi saya.';
  source.projects[0].progress=80;
  source.records.push({...originalRecord(),id:'user-record'});
  const cleaned=clearLegacyDemoData(source);
  assert.deepEqual(cleaned.records,[source.records[1]]);
  assert.deepEqual(cleaned.notes,source.notes);
  assert.deepEqual(cleaned.projects,source.projects);
});

test('rekod dan nota yang mempunyai draf pengguna dilindungi', () => {
  const source=state();
  const cleaned=clearLegacyDemoData(source,{draftKeys:['record:t1','note:Knowledge:old-note']});
  assert.deepEqual(cleaned.records,source.records);
  assert.deepEqual(cleaned.notes,source.notes);
});

test('tag yang digunakan pada nota sebenar dan tag baharu tidak dibuang', () => {
  const source=state();
  source.notes.push({title:'Kajian sebenar',kind:'Penyelidikan',domain:'Peribadi',note:'Isi saya',tags:['Sirah']});
  source.tags.Knowledge.push('Tag peribadi');
  assert.deepEqual(clearLegacyDemoData(source).tags.Knowledge,['Sirah','Tag peribadi']);
});

test('pembersihan dibuat sekali dan tidak mengubah data baharu selepas migrasi', () => {
  const cleaned=clearLegacyDemoData(state());
  cleaned.records.push(originalRecord());
  assert.strictEqual(clearLegacyDemoData(cleaned),cleaned);
  assert.equal(cleaned.records.length,1);
});

test('rekod demo bahasa Inggeris dari versi lama turut dibersihkan', () => {
  const source=state();
  source.records=[{...originalRecord(),priority:undefined,title:'Review October class reports',detail:'Review the class and attendance summaries for both branches.'}];
  assert.equal(clearLegacyDemoData(source).records.length,0);
});
