// Fixed poster items share the same delete action as grid blocks.
export const FIXED_LAYOUT_ITEMS = {
  teacher: {selector: '.poster-teacher', label: '담당교사'},
  clubType: {selector: '#preview-club-type', label: '동아리 종류 표시'},
  reflectionHeading: {selector: '.poster-reflections > h2', label: '학생 소감 머리글'},
  reflection_0: {selector: '.reflection-card:nth-child(1)', label: '학생 소감 1'},
  reflection_1: {selector: '.reflection-card:nth-child(2)', label: '학생 소감 2'},
  reflection_2: {selector: '.reflection-card:nth-child(3)', label: '학생 소감 3'}
};
export function removeLayoutItem(state, id) {
  // The club name and introduction are never deletable.
  if (id === 'clubName' || id === 'introduction') return false;
  const block = state.blocks.find(item => item.id === id);
  if (block) {
    state.blocks = state.blocks.filter(item => item.id !== id);
    if (block.slotId && !state.blocks.some(item => item.slotId === block.slotId)) {
      state.photos = state.photos.filter(photo => photo.slotId !== block.slotId);
    }
  } else if (Object.hasOwn(FIXED_LAYOUT_ITEMS, id)) {
    state.hiddenLayoutItems = [...new Set([...(state.hiddenLayoutItems || []), id])];
  } else return false;
  state.selectedBlockId = null;
  return true;
}
export function normalizeHiddenLayoutItems(items) {
  return Array.isArray(items) ? [...new Set(items.filter(id => Object.hasOwn(FIXED_LAYOUT_ITEMS, id)))] : [];
}
