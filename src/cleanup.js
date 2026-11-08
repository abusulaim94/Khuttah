// Migration only: these signatures identify unchanged entries from the old prototype.
// They are never used to populate a workspace.
export function clearLegacyDemoData(state, {draftKeys = []} = {}) {
  if (state.demoCleanupVersion === 1) return state;
  const group = name => name === "Az-Zahra'" ? 'KPAZ' : name || '';
  const sortedTags = entry => [...(entry.tags || [])].sort();
  const recordSignature = entry => JSON.stringify([
    entry.id, entry.type, entry.title, group(entry.domain), entry.date, entry.time || '',
    entry.repeat || '', entry.detail || '', Boolean(entry.done), entry.priority || '', sortedTags(entry),
  ]);
  const noteSignature = entry => JSON.stringify([
    entry.title, group(entry.domain), entry.kind, entry.note, entry.subfolder || '',
    entry.thesis || '', entry.chapter ?? null, sortedTags(entry),
  ]);
  const projectSignature = entry => JSON.stringify([entry.title, group(entry.domain), entry.progress, entry.note || '']);
  const oldRecords = [
    ['t1','task','Semak laporan kelas Oktober','Uthmani','2026-11-05','','','Semak ringkasan kelas dan kehadiran bagi kedua-dua cawangan.',false,'high',[]],
    ['t2','task','Semak ringkasan hasil cawangan','KPAZ','2026-11-05','','','Semak ringkasan gabungan Pasir Tumboh dan Ketereh.',false,'low',[]],
    ['t3','task','Rangka nota bacaan sirah','Peribadi','2026-11-05','','','',false,'',[]],
    ['t4','task','Semak navigasi KHUTTAH','Peribadi','2026-11-06','','','',false,'',[]],
    ['t5','task','Rancang keutamaan minggu hadapan','Peribadi','2026-11-08','','','',true,'',[]],
    ['t6','task','Sediakan ringkasan sumbangan Kuliah Dhuha','Uthmani','2026-11-10','','','',false,'',[]],
    ['e1','event','Semakan operasi','Uthmani','2026-11-05','09:00','weekly','',false,'',[]],
    ['e2','event','Semak papan pemuka klinik','KPAZ','2026-11-05','14:00','','',false,'',[]],
    ['e3','event','Sesi bacaan','Peribadi','2026-11-05','20:30','','',false,'',[]],
    ['e4','event','Semakan reka bentuk','Peribadi','2026-11-09','10:00','','',false,'',[]],
    ['e5','event','Perancangan mingguan','Peribadi','2026-11-08','21:00','weekly','',false,'',[]],
    ['r1','reminder','Semak invois November','Uthmani','2026-11-08','','','',false,'',[]],
    ['r2','reminder','Kemas kini log bacaan','Peribadi','2026-11-10','','','',false,'',[]],
  ];
  const oldNotes = [
    ['Panduan pengurusan kelas','Uthmani','Rujukan','Jadual kelas, kehadiran dan rekod sumbangan.','','',null,[]],
    ['Nota sistem reka bentuk','Peribadi','Rujukan','Palet Zinc, tipografi, jarak dan komponen antaramuka.','','',null,[]],
    ['Senarai semak mingguan','Peribadi','Rujukan','Semak tugasan, janji temu dan keutamaan minggu hadapan.','','',null,[]],
    ['Garis masa pembelajaran sirah','Peribadi','Penyelidikan','Susun urutan peristiwa untuk silibus interaktif.','','',null,['Sirah']],
    ['Nota rujukan kurikulum','Peribadi','Penyelidikan','Kumpulkan nota bacaan mengikut topik dan catat sumber berkaitan.','','',null,[]],
  ];
  const oldProjects = [
    ['Sistem Pengurusan Uthmani','Uthmani',72,'Operasi kelas · Fasa 1'],
    ['Ruang Kerja Klinik Az-Zahra’','KPAZ',48,'Papan pemuka pengurusan · Prototaip'],
    ['Silibus Sirah Interaktif','Peribadi',34,'Kandungan pembelajaran · Draf'],
    ['Reka Bentuk KHUTTAH','Peribadi',24,'Sistem reka bentuk · Semakan'],
  ];
  const englishTitles = ['Review October class reports','Check branch revenue summary','Outline Sirah reading notes','Review KHUTTAH navigation','Plan next week’s priorities','Prepare Dhuha contribution summary','Operations check-in','Review clinic dashboard','Focused reading','Design review','Weekly planning','Check November invoices','Update reading log'];
  const englishRecords = oldRecords.map((entry, index) => {
    const copy = [...entry];
    copy[2] = englishTitles[index];
    copy[7] = index === 0 ? 'Review the class and attendance summaries for both branches.' : index === 1 ? 'Review the combined summary for Pasir Tumboh and Ketereh.' : '';
    copy[9] = '';
    return copy;
  });
  const recordSamples = new Set([...oldRecords, ...englishRecords].map(entry => JSON.stringify(entry)));
  const noteSamples = new Set(oldNotes.map(entry => JSON.stringify(entry)));
  const projectSamples = new Set(oldProjects.map(entry => JSON.stringify(entry)));
  const drafts = new Set(draftKeys);
  const records = state.records.filter(entry => drafts.has('record:' + entry.id) || !recordSamples.has(recordSignature(entry)));
  const notes = state.notes.filter(entry => {
    const scope = entry.thesis || (entry.kind === 'Nota peribadi' ? 'Notes' : 'Knowledge');
    return drafts.has('note:' + scope + ':' + entry.id) || !noteSamples.has(noteSignature(entry));
  });
  const projects = state.projects.filter(entry => !projectSamples.has(projectSignature(entry)));
  const legacyTags = {Notes: [], Knowledge: ['Tajwid','Sirah','Ulum Quran','Lain-lain'], Events: ['Kuliah mingguan','Kuliah jemputan','Majlis kahwin','Lain-lain']};
  const tags = Object.fromEntries(Object.entries(state.tags).map(([scope, names]) => {
    const entries = scope === 'Events' ? records.filter(entry => entry.type === 'event') : notes.filter(entry => scope === 'Notes' ? entry.kind === 'Nota peribadi' : ['Rujukan','Penyelidikan'].includes(entry.kind));
    return [scope, names.filter(name => !legacyTags[scope]?.includes(name) || entries.some(entry => entry.tags?.includes(name)))];
  }));
  return {...state, records, notes, projects, tags, demoCleanupVersion: 1};
}
