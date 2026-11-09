import {Editor} from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import DOMPurify from 'dompurify';

const escape = value => String(value).replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
export const safeNoteHtml = value => DOMPurify.sanitize(value, {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'hr', 'span', 'label', 'div', 'input'],
  ALLOWED_ATTR: ['data-type', 'data-checked', 'type', 'checked', 'start'],
  ALLOW_DATA_ATTR: false,
  ALLOW_ARIA_ATTR: false,
});

const controls = [
  ['bold', '<b>B</b>', 'Tebal'], ['italic', '<i>I</i>', 'Condong'], ['underline', '<u>U</u>', 'Garis bawah'],
  ['bulletList', '•', 'Senarai berbulet'], ['orderedList', '1.', 'Senarai bernombor'], ['taskList', '☑', 'Checklist'],
  ['blockquote', '❝', 'Petikan'], ['undo', '↶', 'Buat asal'], ['redo', '↷', 'Buat semula'],
];

export function createNoteEditor(form) {
  const host = form.querySelector('[data-note-editor]');
  const toolbar = form.querySelector('[data-editor-toolbar]');
  toolbar.innerHTML = '<select class="filter" aria-label="Gaya teks"><option value="0">Teks biasa</option><option value="1">Tajuk besar</option><option value="2">Tajuk kecil</option><option value="3">Subtajuk</option></select>' + controls.map(([action, label, title]) => `<button class="btn editor-tool" type="button" data-editor-action="${action}" aria-label="${title}" title="${title}"${['undo', 'redo'].includes(action) ? '' : ' aria-pressed="false"'}>${label}</button>`).join('');
  const content = () => form.elements.noteHtml.value ? safeNoteHtml(form.elements.noteHtml.value) : form.elements.note.value.split('\n').map(line => '<p>' + escape(line) + '</p>').join('');
  const updateFields = editor => {
    form.elements.note.value = editor.getText({blockSeparator: '\n'});
    form.elements.noteHtml.value = safeNoteHtml(editor.getHTML());
    form.elements.note.dispatchEvent(new Event('input', {bubbles: true}));
  };
  const updateToolbar = editor => {
    for (const button of toolbar.querySelectorAll('[aria-pressed]')) button.setAttribute('aria-pressed', String(editor.isActive(button.dataset.editorAction)));
    toolbar.querySelector('select').value = editor.isActive('heading') ? String(editor.getAttributes('heading').level) : '0';
    toolbar.querySelector('[data-editor-action="undo"]').disabled = !editor.can().undo();
    toolbar.querySelector('[data-editor-action="redo"]').disabled = !editor.can().redo();
  };
  const editor = new Editor({
    element: host,
    extensions: [StarterKit.configure({link: false, heading: {levels: [1, 2, 3]}}), TaskList, TaskItem.configure({nested: true})],
    content: content(),
    editorProps: {attributes: {role: 'textbox', 'aria-label': 'Catatan', 'aria-multiline': 'true', spellcheck: 'true'}, transformPastedHTML: safeNoteHtml},
    onUpdate: ({editor}) => updateFields(editor),
    onSelectionUpdate: ({editor}) => updateToolbar(editor),
    onTransaction: ({editor}) => updateToolbar(editor),
  });
  const actions = {bold: 'toggleBold', italic: 'toggleItalic', underline: 'toggleUnderline', bulletList: 'toggleBulletList', orderedList: 'toggleOrderedList', taskList: 'toggleTaskList', blockquote: 'toggleBlockquote', undo: 'undo', redo: 'redo'};
  const click = event => {
    const action = event.target.closest('[data-editor-action]')?.dataset.editorAction;
    if (action) editor.chain().focus()[actions[action]]().run();
  };
  toolbar.addEventListener('mousedown', event => { if (event.target.closest('button')) event.preventDefault(); });
  toolbar.addEventListener('click', click);
  toolbar.querySelector('select').addEventListener('change', event => {
    const level = Number(event.target.value);
    const chain = editor.chain().focus();
    if (level) chain.setHeading({level}).run(); else chain.setParagraph().run();
  });
  const restore = () => { editor.commands.setContent(content(), {emitUpdate: false}); updateToolbar(editor); };
  form.addEventListener('draftrestore', restore);
  updateToolbar(editor);
  return {focus: () => editor.commands.focus(), sync: () => updateFields(editor), destroy() { form.removeEventListener('draftrestore', restore); editor.destroy(); }};
}
