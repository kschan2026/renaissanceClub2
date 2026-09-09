export const REVIEW_LIMIT = 150;
export function containsPersonalInfo(text, teacherName = '') {
  const value = String(text || '');
  const email = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  const phone = /(?:01[016789]|0[2-6][1-5]?)\s*[-.)]?\s*\d{3,4}\s*[-.]?\s*\d{4}/;
  const resident = /\b\d{6}\s*-\s*[1-4]\d{6}\b/;
  const labeledName = /(?:이름|성명|작성자|학생명|담당교사)\s*[:：]\s*[가-힣A-Za-z]{2,}/;
  const schoolId = /(?:학번\s*[:：]?\s*\d{3,}|\d{1,2}학년\s*\d{1,2}반\s*\d{1,2}번)/;
  const teacher = teacherName.trim();
  return email.test(value) || phone.test(value) || resident.test(value) || labeledName.test(value) || schoolId.test(value) || (teacher.length >= 2 && value.includes(teacher));
}
export function collectReviewSections(state) {
  return {clubName: state.clubName || '', introduction:state.introduction || '',
    activities: Array.from({length:6},(_,i)=>state.activities[i]?.content || ''),
    reflections:Array.from({length:3},(_,i)=>state.reflections[i] || '')};
}
export function reviewEntries(sections) {
  return [['동아리명',sections.clubName],['동아리 소개',sections.introduction],...sections.activities.map((v,i)=>[`${i+1}번 활동 내용`,v]),...sections.reflections.map((v,i)=>[`${i+1}번 학생 소감`,v])];
}
export function validateReviewSections(sections, teacherName = '', output = false) {
  if (!sections || !Array.isArray(sections.activities) || sections.activities.length!==6 || !Array.isArray(sections.reflections) || sections.reflections.length!==3) throw new Error('AI 검토 영역 구성이 올바르지 않습니다.');
  const clean = {clubName:sections.clubName,introduction:sections.introduction,activities:[...sections.activities],reflections:[...sections.reflections]};
  const entries=reviewEntries(clean);
  for (const [label,value] of entries) {
    if(typeof value!=='string') throw new Error(`${label}의 형식이 올바르지 않습니다.`);
    if((output || label==='동아리명') && value.length>150) throw new Error(`${label}은 최대 150자여야 합니다. 결과를 적용하지 않았습니다.`);
    if(containsPersonalInfo(value,teacherName)) throw new Error(`${label}에 개인정보로 보이는 내용이 있습니다. 이름·학번·연락처를 지운 뒤 다시 검토해 주세요.`);
  }
  if(entries.reduce((sum,[,value])=>sum+value.length,0)>3000) throw new Error('검토 원문 합계는 공백 포함 3,000자 이하여야 합니다.');
  return clean;
}
