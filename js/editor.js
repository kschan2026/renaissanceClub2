import { dom, setSaveStatus, showToast, showLoading, hideLoading } from './dom.js';
import { getState, updateState } from './store.js';
import { downloadCompleteFiles } from './export.js';
export function initEditor() {
  dom.clubTypeInputs.forEach(input => input.addEventListener('change', () => {
    updateState(s => { s.type = input.value; });
    setSaveStatus('저장하지 않은 변경 사항');
  }));
  dom.poster.addEventListener('input', event => {
    if (event.isComposing) return;
    const el = event.target.closest('[data-edit-field]');
    if (!el) return;
    const value = el.innerText.replace(/\r/g, '').replace(/\n$/, '');
    updateState(state => {
      const field = el.dataset.editField;
      if (field === 'clubName' || field === 'teacherName' || field === 'introduction') state[field] = value;
      else if (field === 'reflection') state.reflections[Number(el.dataset.reflectionIndex)] = value;
      else if (field === 'title' || field === 'content') {
        const activity = state.activities.find(a => a.id === el.dataset.activityId);
        if (activity) activity[field] = value;
      } else if (field === 'text' || field === 'marker') {
        const block = state.blocks.find(b => b.id === el.dataset.blockId);
        if (block) block[field] = value;
      }
    });
    setSaveStatus('저장하지 않은 변경 사항');
    checkOverflow();
  });
  dom.poster.addEventListener('compositionend', event => { event.target.dispatchEvent(new Event('input', {bubbles:true})); });
  dom.poster.addEventListener('keydown', event => {
    const el = event.target.closest('[data-edit-field]');
    if (el && ['clubName','teacherName','title','marker'].includes(el.dataset.editField) && event.key === 'Enter') {
      event.preventDefault(); el.blur();
    }
  });
  document.getElementById('btn-download').addEventListener('click', async () => {
    showLoading('PNG와 A2 PDF를 만드는 중입니다.');
    try { await downloadCompleteFiles(); showToast('PNG와 PDF를 내려받았습니다.', 'success'); }
    catch (error) { showToast(error.message, 'error'); }
    finally { hideLoading(); }
  });
}
export function syncEditorFromState() {
  dom.clubTypeInputs.forEach(input => { input.checked = input.value === getState().type; });
}
export function checkOverflow() {
  const overflowing = [...dom.poster.querySelectorAll('[data-edit-field]')].filter(el => el.scrollHeight > el.clientHeight+3 || el.scrollWidth > el.clientWidth+3);
  document.getElementById('overflow-status').textContent = overflowing.length ? ` · 글이 넘치는 영역 ${overflowing.length}개: 내용을 줄이거나 블록을 늘려 주세요.` : '';
}
