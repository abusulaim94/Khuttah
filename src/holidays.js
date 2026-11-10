// Official BKPP JPM schedules; keep dates explicit, including gazetted additions.
// https://www.kabinet.gov.my/storage/2025/08/HKA-2026.pdf
// https://www.kabinet.gov.my/storage/2026/08/HKA_2027.pdf
// https://www.kabinet.gov.my/storage/2026/03/PUB-111_2026.pdf
// Kelantan substitution rule: SUK.(S)D200/472/43(3), 27 November 2025, page 3.
// https://secure.kelantan.gov.my/images/Pekeliling/kelepasanAm/HariKelepasanAMKerajaanNegeriBagiTahun2026.pdf
export const defaultHolidayRegion = 'KTN';
export const holidayRegions = {KTN: 'Kelantan', MY: 'Persekutuan sahaja', SGR: 'Selangor', KUL: 'Kuala Lumpur'};
export const holidayYears = [2026, 2027];
const federal = {
  2026: [
    ['02-17', 'Tahun Baharu Cina'], ['02-18', 'Tahun Baharu Cina (hari kedua)'],
    ['03-20', 'Cuti tambahan Hari Raya Puasa'], ['03-21', 'Hari Raya Puasa'], ['03-22', 'Hari Raya Puasa (hari kedua)'],
    ['05-01', 'Hari Pekerja'], ['05-27', 'Hari Raya Qurban'], ['05-31', 'Hari Wesak'],
    ['06-01', 'Hari Keputeraan Yang di-Pertuan Agong'], ['06-17', 'Awal Muharam'],
    ['08-25', 'Maulidur Rasul'], ['08-31', 'Hari Kebangsaan'], ['09-16', 'Hari Malaysia'],
    ['11-08', 'Hari Deepavali'], ['12-25', 'Hari Krismas'],
  ],
  2027: [
    ['02-06', 'Tahun Baharu Cina'], ['02-07', 'Tahun Baharu Cina (hari kedua)'],
    ['03-10', 'Hari Raya Puasa'], ['03-11', 'Hari Raya Puasa (hari kedua)'],
    ['05-01', 'Hari Pekerja'], ['05-17', 'Hari Raya Qurban'], ['05-20', 'Hari Wesak'],
    ['06-06', 'Awal Muharam'], ['06-07', 'Hari Keputeraan Yang di-Pertuan Agong'],
    ['08-15', 'Maulidur Rasul'], ['08-31', 'Hari Kebangsaan'], ['09-16', 'Hari Malaysia'],
    ['10-28', 'Hari Deepavali'], ['12-25', 'Hari Krismas'],
  ],
};
const stateDates = {
  2026: [['01-01', 'Tahun Baharu'], ['02-01', 'Hari Thaipusam'], ['03-07', 'Nuzul Al-Quran']],
  2027: [['01-01', 'Tahun Baharu'], ['01-22', 'Hari Thaipusam'], ['02-24', 'Nuzul Al-Quran']],
};
const kelantanDates = {
  2026: [['03-07', 'Nuzul Al-Quran'], ['05-26', 'Hari Wukuf'], ['05-28', 'Hari Raya Qurban (hari kedua)'], ['09-29', 'Hari Keputeraan Sultan Kelantan'], ['09-30', 'Hari Keputeraan Sultan Kelantan (hari kedua)']],
  2027: [['02-24', 'Nuzul Al-Quran'], ['05-16', 'Hari Wukuf'], ['05-18', 'Hari Raya Qurban (hari kedua)'], ['09-29', 'Hari Keputeraan Sultan Kelantan'], ['09-30', 'Hari Keputeraan Sultan Kelantan (hari kedua)']],
};
const nextDay = date => {
  const value = new Date(date + 'T12:00:00Z');
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
};
const cache = new Map();
export function publicHolidays(year, region = defaultHolidayRegion) {
  if (!holidayYears.includes(Number(year))) return new Map();
  if (!Object.hasOwn(holidayRegions, region)) region = defaultHolidayRegion;
  const key = year + ':' + region;
  if (cache.has(key)) return new Map(cache.get(key));
  const entries = [...federal[year]];
  if (region === 'KTN') entries.push(...kelantanDates[year]);
  else if (region !== 'MY') entries.push(...stateDates[year], region === 'SGR'
    ? ['12-11', 'Hari Keputeraan Sultan Selangor'] : ['02-01', 'Hari Wilayah Persekutuan']);
  const result = new Map();
  const put = (date, label) => result.set(date, [...(result.get(date) || []), label]);
  for (const [date, label] of entries) put(year + '-' + date, label);
  // Kelantan's circular replaces Saturday holidays, with no separate Friday replacement.
  // Consecutive Friday/Saturday holidays therefore receive one replacement day.
  // Other supported calendars replace Sunday holidays; same-day clashes share one day.
  const replacedWeekday = region === 'KTN' ? 6 : 0;
  for (const date of [...result.keys()].sort()) {
    if (new Date(date + 'T12:00:00Z').getUTCDay() !== replacedWeekday) continue;
    let replacement = nextDay(date);
    while (result.has(replacement)) replacement = nextDay(replacement);
    put(replacement, 'Cuti gantian: ' + result.get(date).join(' / '));
  }
  const labels = new Map([...result].map(([date, names]) => [date, names.join(' / ')]));
  cache.set(key, labels);
  return new Map(labels);
}
