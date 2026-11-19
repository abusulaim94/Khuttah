export const defaultClassFee = 19;
export const monthlyClassTarget = 3;
const collator = new Intl.Collator('ms', {sensitivity: 'base', numeric: true});

export function quranStatus(count) {
  if (count >= monthlyClassTarget) return {tier: '3', color: 'green', label: 'Selesai'};
  if (count === 2) return {tier: '2', color: 'blue', label: 'Baki 1 kelas'};
  if (count === 1) return {tier: '1', color: 'orange', label: 'Baki 2 kelas'};
  return {tier: '0', color: 'red', label: 'Baki 3 kelas'};
}

export function summariseQuranMonth(students, month) {
  const summaries = students.map(student => {
    const sessions = student.sessions.filter(session => session.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    const count = sessions.length;
    return {student, sessions, count, remaining: Math.max(0, monthlyClassTarget - count), status: quranStatus(count), earnings: Math.round(count * defaultClassFee * 100) / 100};
  }).sort((a, b) => b.remaining - a.remaining || collator.compare(a.student.name, b.student.name));
  const sessions = summaries.reduce((sum, item) => sum + item.count, 0);
  const remaining = summaries.reduce((sum, item) => sum + item.remaining, 0);
  const counts = {
    all: summaries.length,
    pending: summaries.filter(item => item.remaining > 0).length,
    '0': summaries.filter(item => item.count === 0).length,
    '1': summaries.filter(item => item.count === 1).length,
    '2': summaries.filter(item => item.count === 2).length,
    '3': summaries.filter(item => item.count >= monthlyClassTarget).length,
  };
  const badgeColor = remaining === 0 ? 'green' : counts['0'] > 0 ? 'red' : counts['1'] > 0 ? 'orange' : 'blue';
  return {
    students: summaries,
    completed: counts['3'],
    sessions,
    remaining,
    counts,
    badgeColor,
    earnings: Math.round(sessions * defaultClassFee * 100) / 100,
  };
}

export function filterQuranStudents(summaries, {filter = 'all', search = '', sort = 'remaining-desc'} = {}) {
  const term = String(search || '').trim().toLocaleLowerCase('ms');
  const filtered = summaries.filter(item => {
    if (filter === 'pending' && item.remaining === 0) return false;
    if (filter === '0' && item.count !== 0) return false;
    if (filter === '1' && item.count !== 1) return false;
    if (filter === '2' && item.count !== 2) return false;
    if (filter === '3' && item.count < monthlyClassTarget) return false;
    if (term) {
      const hay = `${item.student.code || ''} ${item.student.name || ''} ${item.student.note || ''}`.toLocaleLowerCase('ms');
      if (!hay.includes(term)) return false;
    }
    return true;
  });
  return [...filtered].sort((a, b) => {
    if (sort === 'count-desc') return b.count - a.count || collator.compare(a.student.name, b.student.name);
    if (sort === 'name-asc') return collator.compare(a.student.name, b.student.name);
    if (sort === 'code-asc') {
      const codeA = a.student.code || '', codeB = b.student.code || '';
      if (!codeA || !codeB) return Number(!codeA) - Number(!codeB) || collator.compare(a.student.name, b.student.name);
      return collator.compare(codeA, codeB) || collator.compare(a.student.name, b.student.name);
    }
    return b.remaining - a.remaining || collator.compare(a.student.name, b.student.name);
  });
}
