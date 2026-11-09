import {cleanTagNames, tagScopeOf, tagScopes, workCategories, workColors} from './workspace.js';

export const BACKUP_FORMAT = 'khuttah-backup';
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;

const fail = label => { throw new Error(`Data ${label} tidak sah.`); };
const object = (value, label) => value && typeof value === 'object' && !Array.isArray(value) ? value : fail(label);
const list = (value, label) => Array.isArray(value) ? value : fail(label);
const text = (value, label, max = Infinity) => typeof value === 'string' && value.length <= max ? value : fail(label);
const optionalText = (value, label, max) => value == null ? '' : text(value, label, max);
const id = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value) ? value : fail('ID');
const names = (value, label, max) => list(value, label).map(name => text(name, label, max));
const timestamp = value => value == null || value === '' ? '' : typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)) ? value : fail('tarikh kemas kini');

export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && value >= '1900-01-01';
}

export function normaliseState(value) {
  object(value, 'sandaran');
  const recordIds = new Set();
  const noteIds = new Set();
  const records = list(value.records, 'rekod').map(entry => {
    object(entry, 'rekod');
    id(entry.id);
    if (recordIds.has(entry.id)) fail('ID rekod berulang');
    recordIds.add(entry.id);
    if (!['task', 'event', 'reminder'].includes(entry.type)) fail('jenis rekod');
    const date = entry.type === 'task' && (entry.date == null || entry.date === '') ? '' : entry.date;
    if (date !== '' && !validDate(date) || date === '' && entry.type !== 'task') fail('tarikh rekod');
    if (entry.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(entry.time)) fail('masa acara');
    if (entry.repeat && entry.repeat !== 'weekly') fail('ulangan acara');
    if (entry.done != null && typeof entry.done !== 'boolean') fail('status rekod');
    const title = text(entry.title, 'tajuk rekod', 120);
    if (!title.trim()) fail('tajuk rekod');
    return {
      ...entry, title, date, domain: optionalText(entry.domain, 'kumpulan', 45),
      detail: optionalText(entry.detail, 'catatan rekod', 240), done: Boolean(entry.done),
      tags: cleanTagNames(names(entry.tags ?? [], 'tag rekod', 48)),
      createdAt: timestamp(entry.createdAt), updatedAt: timestamp(entry.updatedAt),
    };
  });
  const notes = list(value.notes, 'nota').map(entry => {
    object(entry, 'nota');
    const noteId = entry.id == null ? `n-${crypto.randomUUID()}` : id(entry.id);
    if (noteIds.has(noteId)) fail('ID nota berulang');
    noteIds.add(noteId);
    if (!['Rujukan', 'Penyelidikan', 'Nota peribadi', 'Nota tesis', 'Karya'].includes(entry.kind)) fail('jenis nota');
    if (entry.kind === 'Nota tesis' && (!['Master', 'PhD'].includes(entry.thesis) || !Number.isInteger(entry.chapter) || entry.chapter < 0 || entry.chapter > 5)) fail('bab tesis');
    return {
      ...entry, id: noteId, title: text(entry.title, 'tajuk nota', 120),
      note: text(entry.note, 'catatan nota'), domain: optionalText(entry.domain, 'kumpulan nota', 45),
      subfolder: optionalText(entry.subfolder, 'subfolder nota', 48), tags: cleanTagNames(names(entry.tags ?? [], 'tag nota', 48)),
      noteHtml: optionalText(entry.noteHtml, 'format nota'),
      createdAt: timestamp(entry.createdAt), updatedAt: timestamp(entry.updatedAt),
      ...(entry.kind === 'Karya' ? {
        category: workCategories.includes(entry.category) ? entry.category : 'Idea rambang',
        color: Object.hasOwn(workColors, entry.color) ? entry.color : 'yellow',
        pinned: Boolean(entry.pinned), archived: Boolean(entry.archived),
      } : {}),
    };
  });
  const projects = list(value.projects, 'projek').map(entry => {
    object(entry, 'projek');
    if (typeof entry.progress !== 'number' || !Number.isFinite(entry.progress) || entry.progress < 0 || entry.progress > 100) fail('kemajuan projek');
    return {...entry, title: text(entry.title, 'tajuk projek'), note: optionalText(entry.note, 'catatan projek'), domain: optionalText(entry.domain, 'kumpulan projek', 45)};
  });
  const inputTags = value.tags == null ? {} : object(value.tags, 'tag');
  const tags = Object.fromEntries(tagScopes.map(scope => [scope, cleanTagNames(names(inputTags[scope] ?? [], 'tag', 48))]));
  for (const entry of [...notes, ...records.filter(item => item.type === 'event')]) {
    const scope = tagScopeOf(entry);
    tags[scope] = cleanTagNames([...tags[scope], ...entry.tags]);
    entry.tags = entry.tags.map(name => tags[scope].find(tag => tag.toLocaleLowerCase('ms') === name.toLocaleLowerCase('ms')));
  }
  return {
    records, notes, projects, tags,
    domains: [...new Set(names(value.domains, 'kumpulan', 45))],
    subfolders: list(value.subfolders ?? [], 'subfolder').map(entry => {
      object(entry, 'subfolder');
      return {...entry, folder: text(entry.folder, 'kumpulan subfolder', 45), name: text(entry.name, 'nama subfolder', 48)};
    }),
    groupLayoutVersion: value.groupLayoutVersion === 1 ? 1 : 0,
    demoCleanupVersion: value.demoCleanupVersion === 1 ? 1 : 0,
  };
}

export function createBackup(state) {
  return {format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data: normaliseState(state)};
}

export function parseBackup(source) {
  let value;
  try { value = JSON.parse(source); } catch { throw new Error('Fail bukan JSON yang sah.'); }
  if (value?.format != null) {
    if (value.format !== BACKUP_FORMAT || value.version !== BACKUP_VERSION) throw new Error('Format atau versi sandaran tidak disokong.');
    value = value.data;
  }
  return normaliseState(value);
}
