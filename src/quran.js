export const defaultClassFee = 19;
export const monthlyClassTarget = 3;
export function summariseQuranMonth(students, month) {
  const summaries = students.map(student => {
    const sessions = student.sessions.filter(session => session.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    return {student, sessions, count: sessions.length, remaining: Math.max(0, monthlyClassTarget - sessions.length), earnings: Math.round(sessions.length * defaultClassFee * 100) / 100};
  }).sort((a, b) => b.remaining - a.remaining || a.student.name.localeCompare(b.student.name, 'ms'));
  const sessions = summaries.reduce((sum, item) => sum + item.count, 0);
  return {
    students: summaries,
    completed: summaries.filter(item => item.remaining === 0).length,
    sessions,
    remaining: summaries.reduce((sum, item) => sum + item.remaining, 0),
    earnings: Math.round(sessions * defaultClassFee * 100) / 100,
  };
}
