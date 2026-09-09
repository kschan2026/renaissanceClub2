import { apiRequest } from './api.js';
import { dom, showLoading, hideLoading, showToast } from './dom.js';
import { getState, updateState } from './store.js';
import { clone } from './utils.js';
import { collectReviewSections, reviewEntries, validateReviewSections } from './review-data.js';
let reviewResolver = null;
export function initAi() {
  dom.btnAi.addEventListener('click', reviewAll);
  dom.btnAiUndo.addEventListener('click', undoAi);
  const dialog=document.getElementById('ai-review-dialog');
  document.getElementById('btn-review-cancel').addEventListener('click',()=>closeReview(null));
  dialog.addEventListener('cancel',event=>{event.preventDefault();closeReview(null);});
  dialog.addEventListener('input',()=>{
    const values=[...dialog.querySelectorAll('textarea')].map(el=>el.value);
    document.getElementById('review-total').textContent=`전송 원문 ${values.reduce((n,s)=>n+s.length,0).toLocaleString()} / 3,000자`;
    document.getElementById('review-error').textContent='';
  });
  document.getElementById('btn-review-send').addEventListener('click',()=>{
    if (!document.getElementById('review-privacy-check').checked) {
      document.getElementById('review-error').textContent='전송 문구에서 개인정보를 확인해 주세요.';return;
    }
    const values=[...dialog.querySelectorAll('textarea')].map(el=>el.value);
    try {
      closeReview(validateReviewSections({clubName:values[0],introduction:values[1],activities:values.slice(2,8),reflections:values.slice(8)},getState().teacherName));
    } catch(error) { document.getElementById('review-error').textContent=error.message; }
  });
}
function closeReview(value) {
  document.getElementById('ai-review-dialog').close();const resolve=reviewResolver;reviewResolver=null;if(resolve)resolve(value);
}
function previewReview(sections) {
  const dialog=document.getElementById('ai-review-dialog'),list=document.getElementById('review-fields');list.replaceChildren();
  const groups=[['동아리명',0,1],['동아리 소개',1,2],['활동 내용',2,8],['학생 소감',8,11]];
  const entries=reviewEntries(sections);
  groups.forEach(([heading,start,end])=>{
    const section=document.createElement('section'),h=document.createElement('h3');h.textContent=heading;section.append(h);
    entries.slice(start,end).forEach(([label,value])=>{
      const field=document.createElement('label'),span=document.createElement('span'),input=document.createElement('textarea');
      span.textContent=label;input.value=value;input.rows=2;input.setAttribute('aria-label',label);field.append(span,input);section.append(field);
    });list.append(section);
  });
  document.getElementById('review-error').textContent='';document.getElementById('review-privacy-check').checked=false;
  dialog.dispatchEvent(new Event('input'));dialog.showModal();
  return new Promise(resolve=>{reviewResolver=resolve;});
}
export function renderAiControls() { dom.btnAiUndo.hidden = !getState().aiUndoSnapshot; }
function applySections(state, sections) {
  state.clubName = sections.clubName; state.introduction = sections.introduction;
  sections.activities.forEach((content,i)=>{state.activities[i].content=content;});
  state.reflections = [...sections.reflections];
}
async function reviewAll() {
  const state=getState(),before=clone(collectReviewSections(state));
  const sections=await previewReview(before);
  if(!sections) return;
  if(!reviewEntries(sections).some(([,text])=>text.trim())) {showToast('검토할 문구를 입력해 주세요.','error');return;}
  showLoading('동아리명·소개·활동·소감을 구분하여 검토하는 중입니다.');
  try {
    const result=await apiRequest({action:'reviewSections',sections});
    const revised=validateReviewSections(result.sections,state.teacherName,true);
    updateState(s=>{s.aiUndoSnapshot=before;applySections(s,revised);});
    showToast(result.cached?'검토 결과를 적용했습니다. (5분 캐시 사용)':'각 영역을 150자 이내로 검토했습니다.','success');
  } catch(error) {showToast(error.message || 'AI 검토에 실패했습니다.','error');}
  finally {hideLoading();}
}
function undoAi() {
  if(!getState().aiUndoSnapshot) return;
  updateState(s=>{applySections(s,s.aiUndoSnapshot);s.aiUndoSnapshot=null;});
  showToast('AI 검토 전 문구로 되돌렸습니다.','success');
}
