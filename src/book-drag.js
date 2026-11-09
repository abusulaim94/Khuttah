// Desktop drag-and-drop and a dedicated touch handle share the same move action.
export function installBookDragging(move) {
  let draggedId = null;
  let pointer = null;
  let ghost = null;
  const clearTargets = () => document.querySelectorAll('[data-drop-book].drop-ready').forEach(node => node.classList.remove('drop-ready'));
  const clear = () => { clearTargets(); ghost?.remove(); ghost = null; pointer = null; draggedId = null; document.querySelectorAll('.sticky-dragging').forEach(node => node.classList.remove('sticky-dragging')); };
  document.addEventListener('dragstart', event => {
    const card = event.target.closest('[data-drag-work]');
    if (!card || !event.dataTransfer) return;
    if (event.target.closest('select,input,textarea')) { event.preventDefault(); return; }
    draggedId = card.dataset.dragWork;
    event.dataTransfer.setData('application/x-khuttah-work-note', draggedId);
    event.dataTransfer.effectAllowed = 'move';
    card.classList.add('sticky-dragging');
  });
  document.addEventListener('dragover', event => {
    const target = event.target.closest('[data-drop-book]');
    if (!draggedId || !target) return;
    event.preventDefault(); clearTargets(); target.classList.add('drop-ready');
    event.dataTransfer.dropEffect = 'move';
  });
  document.addEventListener('dragleave', event => {
    const target = event.target.closest('[data-drop-book]');
    if (target && !target.contains(event.relatedTarget)) target.classList.remove('drop-ready');
  });
  document.addEventListener('drop', event => {
    const target = event.target.closest('[data-drop-book]');
    if (!draggedId || !target) return;
    event.preventDefault();
    const noteId = draggedId, bookId = target.dataset.dropBook;
    clear(); move(noteId, bookId);
  });
  document.addEventListener('dragend', clear);
  document.addEventListener('pointerdown', event => {
    const handle = event.target.closest('[data-work-drag-handle]');
    if (!handle || event.pointerType === 'mouse') return;
    event.preventDefault();
    handle.setPointerCapture(event.pointerId);
    pointer = {id: event.pointerId, noteId: handle.dataset.workDragHandle, x: event.clientX, y: event.clientY, moved: false};
  });
  document.addEventListener('pointermove', event => {
    if (!pointer || pointer.id !== event.pointerId) return;
    if (!pointer.moved && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) < 8) return;
    event.preventDefault();
    pointer.moved = true;
    if (!ghost) { ghost = document.createElement('div'); ghost.className = 'note-drag-preview'; ghost.textContent = 'Pindahkan nota'; document.body.append(ghost); }
    ghost.style.left = event.clientX + 14 + 'px'; ghost.style.top = event.clientY + 14 + 'px';
    clearTargets();
    document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-drop-book]')?.classList.add('drop-ready');
    if (event.clientY < 50) window.scrollBy(0, -20);
    else if (event.clientY > window.innerHeight - 50) window.scrollBy(0, 20);
  }, {passive: false});
  document.addEventListener('pointerup', event => {
    if (!pointer || pointer.id !== event.pointerId) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-drop-book]');
    const noteId = pointer.noteId, moved = pointer.moved;
    clear();
    if (moved && target) move(noteId, target.dataset.dropBook);
  });
  document.addEventListener('pointercancel', event => { if (pointer?.id === event.pointerId) clear(); });
}
