import test from 'node:test';
import assert from 'node:assert/strict';
import {createDraftController} from '../src/drafts.js';

test('sunting/padam subfolder mengemas kini draf berkaitan sahaja dan boleh dipulihkan', () => {
  const entry = domain => ({fields: [{name: 'domain', value: domain}, {name: 'subfolder', value: 'Lama'}, {name: 'note', value: 'Isi belum disimpan'}]});
  const entries = {'note:Notes:n1': entry('Peribadi'), 'note:Notes:n2': entry('KPAZ'), 'note:Knowledge:n3': entry('Peribadi')};
  const store = new Map([['khuttah-drafts-v1', JSON.stringify(entries)]]);
  const previous = globalThis.localStorage;
  globalThis.localStorage = {getItem: key => store.get(key), setItem: (key, value) => store.set(key, value)};
  try {
    const drafts = createDraftController(), read = () => JSON.parse(store.get('khuttah-drafts-v1'));
    drafts.changeSubfolder('Peribadi', 'Lama', 'Baharu');
    assert.equal(read()['note:Notes:n1'].fields[1].value, 'Baharu');
    assert.deepEqual(read()['note:Notes:n2'], entries['note:Notes:n2']);
    assert.deepEqual(read()['note:Knowledge:n3'], entries['note:Knowledge:n3']);
    const undo = drafts.changeSubfolder('Peribadi', 'Baharu', '');
    assert.equal(read()['note:Notes:n1'].fields[1].value, '');
    undo();
    assert.equal(read()['note:Notes:n1'].fields[1].value, 'Baharu');
    assert.equal(read()['note:Notes:n1'].fields[2].value, 'Isi belum disimpan');
  } finally { if (previous === undefined) delete globalThis.localStorage; else globalThis.localStorage = previous; }
});
