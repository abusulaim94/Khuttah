const STORAGE_KEY = 'khuttah-drafts-v1';

const fieldsOf = form => [...form.elements]
  .filter(field => field.name && !['submit', 'button', 'file'].includes(field.type))
  .map(field => ({name: field.name, value: field.value, checked: field.type === 'checkbox' ? field.checked : undefined}));

function restoreFields(form, fields) {
  const apply = () => {
    for (const field of form.elements) {
      const saved = fields.find(value => value.name === field.name && (field.type !== 'checkbox' || value.value === field.value));
      if (!saved) continue;
      if (field.type === 'checkbox') field.checked = Boolean(saved.checked);
      else if (field.tagName !== 'SELECT' || [...field.options].some(option => option.value === saved.value)) field.value = saved.value;
    }
  };
  apply();
  for (const name of ['type', 'domain']) form.elements.namedItem(name)?.dispatchEvent(new Event('change', {bubbles: true}));
  apply();
  form.elements.namedItem('undated')?.dispatchEvent(new Event('change', {bubbles: true}));
  form.dispatchEvent(new Event('draftrestore'));
}

export function createDraftController() {
  let entries = {};
  let active = null;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) entries = saved;
  } catch { /* A draft failure must not stop the workspace. */ }

  function write() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); return true; }
    catch { return false; }
  }
  function capture() {
    if (!active || active.restoring) return;
    const fields = fieldsOf(active.form);
    if (JSON.stringify(fields) === active.baseline) {
      delete entries[active.key];
      write();
      active.message.textContent = 'Draf automatik';
      active.discard.hidden = true;
      return;
    }
    entries[active.key] = {fields, savedAt: new Date().toISOString()};
    const saved = write();
    active.message.textContent = saved ? 'Draf disimpan' : 'Draf dalam sesi ini';
    active.discard.hidden = false;
  }
  function clear() {
    if (!active) return;
    delete entries[active.key];
    write();
    active = null;
  }
  function detach() { capture(); active = null; }
  function clearAll() { active = null; entries = {}; write(); }
  function attach(form, key) {
    const initial = fieldsOf(form);
    const status = document.createElement('div');
    status.className = 'draft-status small muted';
    const message = document.createElement('span');
    message.setAttribute('role', 'status');
    const discard = document.createElement('button');
    discard.type = 'button';
    discard.className = 'btn ghost';
    discard.textContent = 'Buang draf';
    discard.hidden = true;
    status.append(message, discard);
    form.prepend(status);
    active = {form, key, message, discard, baseline: JSON.stringify(initial), restoring: true};
    const saved = Object.hasOwn(entries, key) ? entries[key] : null;
    if (Array.isArray(saved?.fields)) {
      restoreFields(form, saved.fields);
      message.textContent = 'Draf sebelum ini dipulihkan.';
      discard.hidden = false;
    } else message.textContent = 'Draf automatik';
    active.restoring = false;
    discard.addEventListener('click', () => {
      if (active?.form !== form) return;
      active.restoring = true;
      restoreFields(form, initial);
      active.restoring = false;
      capture();
      form.elements.namedItem('title')?.focus();
    });
    form.addEventListener('input', () => { if (active?.form === form) capture(); });
    form.addEventListener('change', () => { if (active?.form === form) capture(); });
  }
  function changeTag(scope, previous, next) {
    for (const [key, entry] of Object.entries(entries)) {
      const matching = scope === 'Notes' ? /^note:(Notes|Master|PhD):/.test(key) : key.startsWith('note:' + scope + ':') || scope === 'Events' && key.startsWith('record:');
      if (!matching || !Array.isArray(entry.fields)) continue;
      entry.fields = entry.fields.flatMap(field => field.name === 'tags' && field.value.toLowerCase() === previous.toLowerCase() ? next === null ? [] : [{...field, value: next}] : [field]);
    }
    write();
  }
  return {attach, capture, clear, detach, clearAll, changeTag, keys: () => Object.keys(entries)};
}
