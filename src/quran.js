export const defaultMonthlyFee = 19;
export const monthlyClassTarget = 3;
export const monthlyPayment = (student, month) => (student.payments || []).find(payment => payment.month === month);
export function summariseQuranMonth(students, month) {
  const summaries = students.map(student => {
    const sessions = student.sessions.filter(session => session.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    return {student, sessions, count: sessions.length, remaining: Math.max(0, monthlyClassTarget - sessions.length), payment: monthlyPayment(student, month)};
  }).sort((a, b) => b.remaining - a.remaining || a.student.name.localeCompare(b.student.name, 'ms'));
  return {
    students: summaries,
    completed: summaries.filter(item => item.remaining === 0).length,
    sessions: summaries.reduce((sum, item) => sum + item.count, 0),
    remaining: summaries.reduce((sum, item) => sum + item.remaining, 0),
    paidCount: summaries.filter(item => item.payment).length,
    collected: summaries.reduce((sum, item) => sum + Math.round((item.payment?.amount || 0) * 100), 0) / 100,
  };
}
