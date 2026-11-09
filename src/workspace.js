export const workCategories = ['Pembetulan', 'Idea cetakan seterusnya', 'Idea buku', 'Catatan'];
export const workColors = {yellow: 'Kuning', rose: 'Merah jambu', blue: 'Biru', green: 'Hijau', purple: 'Ungu', white: 'Putih'};
export const tagScopes = ['Notes', 'Knowledge', 'Events', 'Works', 'Ideas'];
export const tagScopeOf = item => item.type ? item.type === 'event' ? 'Events' : null : item.kind === 'Karya' ? 'Works' : item.kind === 'Idea rambang' ? 'Ideas' : ['Rujukan', 'Penyelidikan'].includes(item.kind) ? 'Knowledge' : 'Notes';
export function initialLibrary() {
  return {version: 1, subjects: ['Tajwid', 'Akhlak', 'Terjemahan', 'Sirah'], books: [
    {id: 'book-nota-mudah', title: 'Nota Mudah Makhraj & Sifat Huruf', status: 'published', subjects: ['Tajwid']},
    {id: 'book-kesimpulan', title: 'Kesimpulan Makhraj & Sifat Huruf', status: 'published', subjects: ['Tajwid']},
    {id: 'book-tajwid-nasyr', title: 'Tajwid al-Nasyr', status: 'published', subjects: ['Tajwid']},
    {id: 'book-akhlaq-hamalat', title: 'Akhlaq Hamalat al-Quran', status: 'published', subjects: ['Akhlak']},
  ]};
}

export function moveWorkNote(notes, books, noteId, bookId) {
  const note = notes.find(item => item.id === noteId && item.kind === 'Karya');
  if (!note || bookId && !books.some(book => book.id === bookId)) return false;
  if ((note.bookId || '') === bookId) return false;
  note.bookId = bookId;
  note.updatedAt = new Date().toISOString();
  return true;
}

export function changeBookSubject(library, previous, next) {
  const index = library.subjects.indexOf(previous);
  if (index < 0) throw new Error('Bidang tidak ditemui.');
  const name = next === null ? null : next.trim();
  if (name !== null && (!name || name.length > 48 || library.subjects.some((value, i) => i !== index && value.toLowerCase() === name.toLowerCase()))) throw new Error('Nama bidang kosong atau sudah digunakan.');
  if (name === null) library.subjects.splice(index, 1); else library.subjects[index] = name;
  for (const book of library.books) book.subjects = cleanTagNames(book.subjects.flatMap(subject => subject === previous ? name === null ? [] : [name] : [subject]));
}
const collator = new Intl.Collator('ms', {sensitivity: 'base', numeric: true});

export function cleanTagNames(values) {
  const seen = new Set();
  return values.map(value => value.trim()).filter(value => {
    const key = value.toLocaleLowerCase('ms');
    if (!value || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function sortItems(items, mode = 'date-asc', notes = false) {
  const direction = mode.endsWith('desc') ? -1 : 1;
  return [...items].sort((a, b) => {
    if (mode.startsWith('title')) return direction * collator.compare(a.title, b.title);
    const dateA = notes ? a.updatedAt || a.createdAt || '' : a.date || '';
    const dateB = notes ? b.updatedAt || b.createdAt || '' : b.date || '';
    if (!dateA || !dateB) return Number(!dateA) - Number(!dateB) || collator.compare(a.title, b.title);
    return direction * dateA.localeCompare(dateB) || collator.compare(a.title, b.title);
  });
}

export function changeTag(state, scope, previous, next) {
  if (!tagScopes.includes(scope)) throw new Error('Bahagian tag tidak sah.');
  const names = state.tags[scope];
  const match = value => value.toLocaleLowerCase('ms') === previous.toLocaleLowerCase('ms');
  const index = names.findIndex(match);
  if (index < 0) throw new Error('Tag tidak ditemui.');
  const name = next == null ? null : next.trim();
  if (name !== null && (!name || name.length > 48 || names.some((value, i) => i !== index && value.toLocaleLowerCase('ms') === name.toLocaleLowerCase('ms')))) throw new Error('Nama tag kosong atau sudah digunakan.');
  if (name === null) names.splice(index, 1); else names[index] = name;
  let affected = 0;
  for (const item of [...state.notes, ...state.records]) {
    if (tagScopeOf(item) !== scope || !item.tags?.some(match)) continue;
    item.tags = cleanTagNames(item.tags.flatMap(value => match(value) ? name === null ? [] : [name] : [value]));
    affected++;
  }
  return affected;
}

export function upcomingDeadlines(records, today, end) {
  const result = [];
  const dateOf = date => new Date(date + 'T12:00:00Z');
  for (const item of records) {
    if (!item.date || item.done) continue;
    let date = item.date;
    if (item.type === 'event' && item.repeat === 'weekly' && date < today) {
      const elapsed = Math.ceil((dateOf(today) - dateOf(date)) / 86400000 / 7);
      const next = dateOf(date);
      next.setUTCDate(next.getUTCDate() + elapsed * 7);
      date = next.toISOString().slice(0, 10);
    }
    if (date > end || (item.type === 'event' && date < today)) continue;
    result.push({...item, date});
  }
  return sortItems(result);
}
