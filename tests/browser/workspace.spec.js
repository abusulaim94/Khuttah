import {test, expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

const today = new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());
const dateAfter = days => { const date = new Date(today + 'T12:00:00Z'); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); };
const seed = () => ({
  records: [
    {id: 'task-1', title: 'Zeta tugasan', type: 'task', domain: 'Peribadi', date: today, done: false},
    {id: 'event-1', title: 'Acara kumpulan lain', type: 'event', domain: 'KPAZ', date: today, time: '14:00', tags: ['Kajian']},
    {id: 'reminder-1', title: 'Peringatan bayaran', type: 'reminder', domain: 'Uthmani', date: dateAfter(1), done: false},
    {id: 'event-past', title: 'Acara sudah berlalu', type: 'event', domain: 'KPAZ', date: dateAfter(-1)},
    {id: 'task-none', title: 'Alif tanpa tarikh', type: 'task', domain: 'Peribadi', date: '', done: false},
  ],
  notes: [{id: 'note-1', title: 'Nota asal', kind: 'Nota peribadi', note: 'Catatan asal', domain: 'Peribadi', tags: ['Kajian'], createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z'}],
  projects: [], domains: ['Peribadi', 'Uthmani', 'KPAZ'], tags: {Notes: ['Kajian'], Events: ['Kajian'], Knowledge: [], Works: []}, subfolders: [], groupLayoutVersion: 1, demoCleanupVersion: 1,
});

async function setup(page, state = seed(), {writeDelay = 0} = {}) {
  let remote = structuredClone(state);
  await page.route(/https:\/\/[^/]+\.supabase\.co\//, async route => {
    if (route.request().method() === 'POST' && route.request().url().includes('/rest/')) {
      remote = route.request().postDataJSON().state;
      if (writeDelay) await new Promise(resolve => setTimeout(resolve, writeDelay));
      await route.fulfill({status: 201, body: ''});
    } else await route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify([{state: remote, updated_at: new Date().toISOString()}])});
  });
  await page.addInitScript(state => {
    if (!localStorage.getItem('khuttah-prototype-v2')) localStorage.setItem('khuttah-prototype-v2', JSON.stringify(state));
    localStorage.setItem('khuttah-auth-session-v1', JSON.stringify({access_token: 'isolated-browser-test', refresh_token: 'test', expires_at: Date.now() + 86400000, user: {id: '00000000-0000-4000-8000-000000000001', email: 'qa@example.test'}}));
  }, state);
  await page.goto('/');
  await expect(page.locator('#main h1')).toHaveText('Ringkasan');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('khuttah-cloud-meta-v1') || '{}').lastSyncedAt)).toBeTruthy();
  return () => structuredClone(remote);
}

async function go(page, scope) {
  const side = page.locator('#sidebar [data-page="' + scope + '"]');
  if (await side.isVisible()) await side.click();
  else {
    const bottom = page.locator('#bottom-nav [data-page="' + scope + '"]');
    if (await bottom.count()) await bottom.click();
    else { await page.locator('#more-menu').click(); await page.locator('#modal [data-page="' + scope + '"]').click(); }
  }
}
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem('khuttah-prototype-v2')));
const errors = new WeakMap();
test.beforeEach(({page}) => { const list = []; errors.set(page, list); page.on('pageerror', error => list.push(error.message)); });
test.afterEach(({page}) => expect(errors.get(page)).toEqual([]));

test('ringkasan semua kumpulan, tiga jenis deadline dan tetapan tanpa Projek', async ({page}) => {
  await setup(page);
  const deadlines = page.locator('.deadline-preview');
  for (const title of ['Zeta tugasan', 'Acara kumpulan lain', 'Peringatan bayaran']) await expect(deadlines.getByRole('button', {name: title, exact: true})).toBeVisible();
  await expect(deadlines.getByText('Acara sudah berlalu')).toHaveCount(0);
  await page.locator('#sidebar [data-scope="1"]').click();
  await expect(page.locator('#main h1')).toHaveText('Peribadi');
  await go(page, 'Overview');
  await expect(page.locator('#domain-select')).toHaveCount(0);
  await expect(deadlines.getByText('Acara kumpulan lain', {exact: true})).toBeVisible();
  await expect(page.locator('#sidebar [data-scope][aria-pressed="true"]')).toHaveCount(0);
  await page.locator('#sidebar [data-scope="1"]').click();
  await page.locator('#domain-select').selectOption('');
  await expect(page.locator('#main h1')).toHaveText('Ringkasan');
  await go(page, 'Notes');
  await expect(page.locator('#domain-select')).toHaveValue('');
  await go(page, 'Settings');
  await expect(page.locator('[data-settings="Projects"]')).toHaveCount(0);
  await expect(page.locator('.page-head > div > .muted')).toHaveCount(0);
});

test('tugasan tanpa tarikh, pemulihan draf, sorting dan penetapan tarikh', async ({page}) => {
  await setup(page);
  await go(page, 'Tasks');
  await page.locator('#actions [data-new]').click();
  await page.locator('#item-form [name="title"]').fill('Baca kitab tanpa tarikh');
  await page.getByLabel('Tanpa tarikh', {exact: true}).check();
  await expect(page.locator('#item-form [name="date"]')).toBeDisabled();
  await page.locator('#modal [data-close]').first().click();
  await page.locator('#actions [data-new]').click();
  await expect(page.getByLabel('Tanpa tarikh', {exact: true})).toBeChecked();
  await expect(page.locator('#item-form [name="date"]')).toBeDisabled();
  await page.locator('#item-form button[type="submit"]').click();
  expect((await saved(page)).records.find(item => item.title === 'Baca kitab tanpa tarikh').date).toBe('');
  await page.locator('[data-sort-scope="Tasks"]').selectOption('title-asc');
  await expect(page.locator('#main .row-title').first()).toHaveText('Alif tanpa tarikh');
  await page.locator('#task-date-filter').selectOption('undated');
  await expect(page.locator('#main .row-title')).toHaveCount(2);
  const row = page.locator('#main .row').filter({hasText: 'Baca kitab tanpa tarikh'});
  await row.getByRole('button', {name: 'Tetapkan tarikh', exact: true}).click();
  await page.locator('#postpone-form [name="date"]').fill(dateAfter(2));
  await page.locator('#postpone-form button[type="submit"]').click();
  expect((await saved(page)).records.find(item => item.title === 'Baca kitab tanpa tarikh').date).toBe(dateAfter(2));
  await page.reload();
  await go(page, 'Tasks');
  await expect(page.locator('[data-sort-scope="Tasks"]')).toHaveValue('title-asc');
});

test('klik tarikh perancang mengisi tarikh untuk ketiga-tiga jenis rekod', async ({page}) => {
  await setup(page);
  await go(page, 'Planner');
  const chosen = await page.locator('.cell:not(.outside)').nth(12).getAttribute('data-create-day');
  for (const [type, label] of [['task', 'tugasan'], ['event', 'acara'], ['reminder', 'peringatan']]) {
    await page.locator('.calendar-add[data-create-day="' + chosen + '"]').click();
    await page.locator('#modal').getByRole('button', {name: 'Tambah ' + label, exact: true}).click();
    await expect(page.locator('#item-form [name="type"]')).toHaveValue(type);
    await expect(page.locator('#item-form [name="date"]')).toHaveValue(chosen);
    await page.locator('#item-form [name="title"]').fill('Kalendar ' + label);
    await page.locator('#item-form button[type="submit"]').click();
    expect((await saved(page)).records.find(item => item.title === 'Kalendar ' + label).date).toBe(chosen);
  }
});

test('nota berformat, checklist, tag semasa menulis, draf carian, sunting dan padam tag', async ({page}) => {
  await setup(page);
  await go(page, 'Notes');
  await page.locator('#actions [data-add-note]').click();
  await page.locator('#personal-note-form [name="title"]').fill('Nota baharu');
  await page.getByRole('textbox', {name: 'Catatan', exact: true}).fill('Isi berformat');
  await page.getByRole('textbox', {name: 'Catatan', exact: true}).press('Control+a');
  await page.getByRole('button', {name: 'Tebal', exact: true}).click();
  await expect(page.locator('.tiptap strong')).toHaveText('Isi berformat');
  await page.locator('.note-details summary').click();
  await page.locator('[data-tag-input]').fill('Penulisan');
  await page.locator('[data-inline-tag]').click();
  await expect(page.getByLabel('Penulisan', {exact: true})).toBeChecked();
  await page.locator('#personal-note-form button[type="submit"]').click();
  let note = (await saved(page)).notes.find(item => item.title === 'Nota baharu');
  expect(note.tags).toEqual(['Penulisan']);
  expect(note.noteHtml).toContain('<strong>Isi berformat</strong>');
  expect(note.createdAt).toBeTruthy();
  await page.reload();
  await go(page, 'Notes');
  await page.getByRole('button', {name: /Nota baharu/}).click();
  await expect(page.locator('.tiptap strong')).toHaveText('Isi berformat');
  await page.getByRole('textbox', {name: 'Catatan', exact: true}).press('Control+End');
  await page.getByRole('textbox', {name: 'Catatan', exact: true}).press('Enter');
  await page.getByRole('button', {name: 'Checklist', exact: true}).click();
  await page.getByRole('textbox', {name: 'Catatan', exact: true}).pressSequentially('Semak isi');
  await page.keyboard.press('Control+k');
  await expect(page.locator('#query')).toBeVisible();
  await page.locator('#modal [data-close]').click();
  await page.getByRole('button', {name: /Nota baharu/}).click();
  await expect(page.locator('.tiptap ul[data-type="taskList"]')).toContainText('Semak isi');
  await page.locator('.tiptap input[type="checkbox"]').check();
  await page.locator('#personal-note-form button[type="submit"]').click();
  expect((await saved(page)).notes.find(item => item.title === 'Nota baharu').noteHtml).toContain('data-checked="true"');
  await page.locator('[data-manage-tags="Notes"]').click();
  await page.getByRole('button', {name: 'Sunting tag Penulisan', exact: true}).click();
  await page.locator('#tag-form input').fill('Karya');
  await page.locator('#tag-form button[type="submit"]').click();
  expect((await saved(page)).notes.find(item => item.title === 'Nota baharu').tags).toEqual(['Karya']);
  await page.locator('[data-manage-tags="Notes"]').click();
  await page.getByRole('button', {name: 'Padam tag Karya', exact: true}).click();
  await page.locator('[data-confirm-delete-tag]').click();
  note = (await saved(page)).notes.find(item => item.title === 'Nota baharu');
  expect(note.tags).toEqual([]);
  expect(note.note).toContain('Semak isi');
  expect((await saved(page)).tags.Events).toEqual(['Kajian']);
});

test('sticky notes karya, warna, pin dan arkib', async ({page}) => {
  await setup(page);
  await go(page, 'Works');
  await page.getByRole('button', {name: 'Nota berformat', exact: true}).click();
  await page.locator('#personal-note-form [name="title"]').fill('Idea buku');
  await page.getByRole('textbox', {name: 'Catatan', exact: true}).fill('Rangka bab pertama');
  await page.locator('[name="color"]').selectOption('blue');
  await page.getByLabel('Pin nota', {exact: true}).check();
  await page.locator('#personal-note-form button[type="submit"]').click();
  await expect(page.locator('.sticky-blue')).toContainText('Idea buku');
  expect((await saved(page)).notes.find(item => item.title === 'Idea buku').purpose).toBe('Catatan');
  await page.locator('[data-work-archive]').click();
  await expect(page.locator('.sticky-card')).toHaveCount(0);
  await page.locator('[data-work-archive-view]').click();
  await expect(page.locator('.sticky-card')).toHaveCount(1);
  await page.locator('[data-work-archive]').click();
  await page.locator('#main [data-work-purpose="Catatan"]').click();
  await expect(page.locator('.sticky-card')).toHaveCount(1);
});

test('HTML import disanitasi sebelum dibuka dalam editor', async ({page}) => {
  const data = seed();
  data.notes[0].noteHtml = '<p onmouseover="window.injected=1">Selamat</p><img src=x onerror="window.injected=1"><script>window.injected=1</script><iframe src="javascript:alert(1)"></iframe>';
  await setup(page, data);
  await go(page, 'Notes');
  await page.locator('[data-note="0"]').click();
  await expect(page.locator('.tiptap')).toContainText('Selamat');
  await expect(page.locator('.tiptap img,.tiptap script,.tiptap iframe,.tiptap [onmouseover]')).toHaveCount(0);
  expect(await page.evaluate(() => window.injected)).toBeUndefined();
});

test('perubahan nota selepas tambah tag tetap dihantar ketika permintaan awan belum selesai', async ({page}) => {
  const remote = await setup(page, seed(), {writeDelay: 800});
  await go(page, 'Notes');
  await page.locator('#actions [data-add-note]').click();
  await page.locator('#personal-note-form [name="title"]').fill('Nota ketika awan sibuk');
  await page.getByRole('textbox', {name: 'Catatan', exact: true}).fill('Isi mesti sampai ke awan');
  await page.locator('.note-details summary').click();
  await page.locator('[data-tag-input]').fill('Segera');
  await page.locator('[data-inline-tag]').click();
  await page.locator('#personal-note-form button[type="submit"]').click();
  await expect.poll(() => remote().notes.find(item => item.title === 'Nota ketika awan sibuk')?.tags).toEqual(['Segera']);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('khuttah-cloud-meta-v1')).pendingSync)).toBe(false);
});

test('paparan desktop, tablet landscape/portrait dan telefon tanpa limpahan', async ({page}) => {
  await setup(page);
  mkdirSync('.local/qa', {recursive: true});
  for (const [width, height] of [[1440, 1000], [1180, 820], [1024, 768], [768, 1024], [390, 844], [320, 740]]) {
    await page.setViewportSize({width, height});
    if (width >= 900 && width > height) { await expect(page.locator('#sidebar')).toBeVisible(); await expect(page.locator('#bottom-nav')).toBeHidden(); }
    else await expect(page.locator('#bottom-nav')).toBeVisible();
    for (const scope of ['Overview', 'Planner', 'Tasks', 'Events', 'Reminders', 'Notes', 'Knowledge', 'Master', 'PhD', 'Works', 'Ideas', 'Settings']) {
      await go(page, scope);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${scope} at ${width}x${height}`).toBeLessThanOrEqual(1);
    }
    await go(page, 'Notes');
    await page.locator('[data-note="0"]').click();
    await expect(page.getByRole('textbox', {name: 'Catatan', exact: true})).toBeVisible();
    expect(await page.locator('#modal').evaluate(node => node.scrollWidth - node.clientWidth), `note editor at ${width}`).toBeLessThanOrEqual(1);
    if (width === 1024 || width === 390) await page.screenshot({path: '.local/qa/notes-' + width + '.png'});
    await page.locator('#modal [data-close]').first().click();
  }
});

test('tablet sentuh landscape menggunakan bar sisi dan editor nota', async ({browser}) => {
  const context = await browser.newContext({viewport: {width: 1180, height: 820}, isMobile: true, hasTouch: true});
  const page = await context.newPage();
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  try {
    await setup(page);
    expect(await page.evaluate(() => matchMedia('(pointer:coarse)').matches)).toBe(true);
    await expect(page.locator('#sidebar')).toBeVisible();
    await expect(page.locator('#bottom-nav')).toBeHidden();
    await page.locator('#sidebar [data-page="Notes"]').tap();
    await page.locator('[data-note="0"]').tap();
    await expect(page.getByRole('textbox', {name: 'Catatan', exact: true})).toBeVisible();
    expect(await page.locator('#modal').evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
    expect(failures).toEqual([]);
  } finally { await context.close(); }
});

test('Idea rambang mempunyai menu sendiri dan tidak menjadi kategori Karya', async ({page}) => {
  await setup(page);
  await go(page, 'Ideas');
  await page.getByRole('button', {name: 'Idea baharu', exact: true}).click();
  await page.getByRole('textbox', {name: 'Catatan', exact: true}).fill('Idea aktiviti hujung minggu');
  await expect(page.locator('[name="bookId"]')).toHaveCount(0);
  await page.locator('#personal-note-form button[type="submit"]').click();
  expect((await saved(page)).notes.find(note => note.note === 'Idea aktiviti hujung minggu').kind).toBe('Idea rambang');
  await expect(page.locator('.sticky-card')).toContainText('Idea aktiviti hujung minggu');
  await go(page, 'Works');
  await expect(page.locator('#main')).not.toContainText('Idea aktiviti hujung minggu');
  await expect(page.locator('#main')).not.toContainText('Idea rambang');
  await go(page, 'Ideas');
  await expect(page.locator('.sticky-card')).toContainText('Idea aktiviti hujung minggu');
});

test('empat buku diterbitkan, pembetulan dan idea cetakan seterusnya disimpan dalam buku', async ({page}) => {
  const remote = await setup(page);
  await go(page, 'Works');
  await expect(page.locator('.book-shelf').filter({hasText: 'Sudah diterbitkan'}).locator('[data-open-book]')).toHaveCount(4);
  for (const title of ['Nota Mudah Makhraj & Sifat Huruf', 'Kesimpulan Makhraj & Sifat Huruf', 'Tajwid al-Nasyr', 'Akhlaq Hamalat al-Quran']) await expect(page.locator('.book-library').getByText(title, {exact: true})).toBeVisible();
  await page.locator('[data-open-book="book-nota-mudah"]').click();
  await page.getByLabel('Catatan pantas', {exact: true}).fill('Betulkan halaman 7\nContoh huruf perlu disemak.');
  await page.getByRole('button', {name: 'Simpan catatan', exact: true}).click();
  let note = (await saved(page)).notes.find(item => item.title === 'Betulkan halaman 7');
  expect(note.note).toContain('\nContoh huruf');
  expect(note.bookId).toBe('book-nota-mudah');
  expect(note.purpose).toBe('Pembetulan');
  await page.getByRole('button', {name: 'Nota berformat', exact: true}).click();
  await expect(page.locator('#personal-note-form [name="bookId"]')).toHaveValue('book-nota-mudah');
  await page.locator('[name="purpose"]').selectOption('Idea cetakan seterusnya');
  await page.getByRole('textbox', {name: 'Catatan', exact: true}).fill('Tambah rajah lidah');
  await page.locator('#personal-note-form button[type="submit"]').click();
  await page.locator('[data-work-purpose="Idea cetakan seterusnya"]').click();
  await expect(page.locator('.sticky-card')).toHaveCount(1);
  await expect(page.locator('.sticky-card')).toContainText('Tambah rajah lidah');
  await expect.poll(() => remote().library?.books.length).toBe(4);
  await page.reload();
  await go(page, 'Works');
  await page.locator('[data-open-book="book-nota-mudah"]').click();
  await expect(page.locator('.sticky-card')).toHaveCount(2);
});

test('buku belum diterbitkan mempunyai pelbagai bidang dan boleh diterbitkan tanpa memisahkan catatan', async ({page}) => {
  await setup(page);
  await go(page, 'Works');
  await page.locator('[data-add-book="unpublished"]').click();
  await page.locator('#book-form [name="title"]').fill('Terjemahan Sirah Pilihan');
  await page.getByLabel('Terjemahan', {exact: true}).check();
  await page.getByLabel('Sirah', {exact: true}).check();
  await page.locator('#book-form [name="newSubject"]').fill('Sejarah');
  await page.locator('#book-form button[type="submit"]').click();
  let book = (await saved(page)).library.books.find(item => item.title === 'Terjemahan Sirah Pilihan');
  expect(book.status).toBe('unpublished');
  expect(book.subjects).toEqual(['Terjemahan', 'Sirah', 'Sejarah']);
  await page.getByLabel('Catatan pantas', {exact: true}).fill('Rangka pengenalan');
  await page.getByRole('button', {name: 'Simpan catatan', exact: true}).click();
  expect((await saved(page)).notes.find(item => item.title === 'Rangka pengenalan').purpose).toBe('Idea buku');
  await page.getByRole('button', {name: 'Sunting buku', exact: true}).click();
  await page.locator('#book-form [name="status"]').selectOption('published');
  await page.locator('#book-form button[type="submit"]').click();
  book = (await saved(page)).library.books.find(item => item.id === book.id);
  expect(book.status).toBe('published');
  await expect(page.locator('.sticky-card')).toContainText('Rangka pengenalan');
  await page.locator('#book-subject-filter').selectOption('Sejarah');
  await expect(page.locator('.book-library [data-open-book]:not([data-open-book=""])')).toHaveCount(1);
  await expect(page.locator('.book-library [data-open-book]:not([data-open-book=""])')).toContainText('Terjemahan Sirah Pilihan');
});

test('catatan sementara, draf pantas, drag ke buku dan pindah balik tanpa kehilangan isi', async ({page}) => {
  await setup(page);
  await go(page, 'Works');
  await page.getByLabel('Catatan pantas', {exact: true}).fill('Nota belum sempat disusun');
  await go(page, 'Ideas');
  await go(page, 'Works');
  await expect(page.getByLabel('Catatan pantas', {exact: true})).toHaveValue('Nota belum sempat disusun');
  await page.getByRole('button', {name: 'Simpan catatan', exact: true}).click();
  const note = (await saved(page)).notes.find(item => item.title === 'Nota belum sempat disusun');
  expect(note.bookId).toBe('');
  await page.screenshot({path: '.local/qa/book-workspace.png'});
  await page.locator('[data-work-drag-handle="' + note.id + '"]').dragTo(page.locator('[data-drop-book="book-tajwid-nasyr"]'));
  expect((await saved(page)).notes.find(item => item.id === note.id).bookId).toBe('book-tajwid-nasyr');
  await expect(page.locator('.sticky-card')).toHaveCount(0);
  await page.locator('[data-open-book="book-tajwid-nasyr"]').click();
  await expect(page.locator('.sticky-card')).toContainText(note.note);
  await page.locator('[data-move-work="' + note.id + '"]').selectOption('');
  await page.locator('[data-open-book=""]').click();
  await expect(page.locator('.sticky-card')).toContainText(note.note);
});

test('sunting/padam bidang dan folder buku mengekalkan catatan', async ({page}) => {
  await setup(page);
  await go(page, 'Works');
  await page.locator('[data-manage-subjects]').click();
  await page.getByRole('button', {name: 'Sunting bidang Tajwid', exact: true}).click();
  await page.locator('#subject-form input').fill('Ilmu Tajwid');
  await page.locator('#subject-form button[type="submit"]').click();
  expect((await saved(page)).library.books.filter(book => book.subjects.includes('Ilmu Tajwid'))).toHaveLength(3);
  await page.locator('[data-manage-subjects]').click();
  await page.getByRole('button', {name: 'Padam bidang Ilmu Tajwid', exact: true}).click();
  await page.locator('[data-confirm-delete-subject]').click();
  expect((await saved(page)).library.books).toHaveLength(4);
  await page.locator('[data-open-book="book-nota-mudah"]').click();
  await page.getByLabel('Catatan pantas', {exact: true}).fill('Catatan yang mesti kekal');
  await page.getByRole('button', {name: 'Simpan catatan', exact: true}).click();
  await page.getByRole('button', {name: 'Sunting buku', exact: true}).click();
  await page.locator('[data-delete-book]').click();
  await page.locator('[data-confirm-delete-book]').click();
  expect((await saved(page)).notes.find(item => item.title === 'Catatan yang mesti kekal').bookId).toBe('');
  await expect(page.locator('.sticky-card')).toContainText('Catatan yang mesti kekal');
  await page.locator('[data-undo]').click();
  expect((await saved(page)).notes.find(item => item.title === 'Catatan yang mesti kekal').bookId).toBe('book-nota-mudah');
});

test('pemegang sentuh boleh menyeret sticky note ke folder buku', async ({browser}) => {
  const context = await browser.newContext({viewport: {width: 1180, height: 1000}, isMobile: true, hasTouch: true});
  const page = await context.newPage();
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  try {
    await setup(page);
    await go(page, 'Works');
    await page.getByLabel('Catatan pantas', {exact: true}).fill('Nota untuk dipindah dengan sentuhan');
    await page.getByRole('button', {name: 'Simpan catatan', exact: true}).click();
    const note = (await saved(page)).notes.find(item => item.title === 'Nota untuk dipindah dengan sentuhan');
    const handle = page.locator('[data-work-drag-handle="' + note.id + '"]');
    await handle.scrollIntoViewIfNeeded();
    const from = await handle.boundingBox(), to = await page.locator('[data-drop-book="book-nota-mudah"]').boundingBox();
    const x = from.x + from.width / 2, y = from.y + from.height / 2, endX = to.x + to.width / 2, endY = to.y + to.height / 2;
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x, y}]});
    for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: x + (endX - x) * i / 8, y: y + (endY - y) * i / 8}]});
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
    expect((await saved(page)).notes.find(item => item.id === note.id).bookId).toBe('book-nota-mudah');
    expect(failures).toEqual([]);
  } finally { await context.close(); }
});
