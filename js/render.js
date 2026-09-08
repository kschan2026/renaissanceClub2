import {FIXED_LAYOUT_ITEMS} from './layout-state.js';
import { openCropDialog, selectPhotoForSlot, removePhoto } from './photos.js';
import { checkOverflow } from './editor.js';
import {
  CONFIG
} from './config.js';
import {
  dom
} from './dom.js';
import {
  getState,
  getActivity,
  getPhoto
} from './store.js';
import {
  clamp,
  normalizeCrop
} from './utils.js';
let previewZoom = 1;
export function initPreview() {
  dom.btnZoomIn.addEventListener(
    'click',
    () => {
      setPreviewZoom(
        previewZoom +
        CONFIG.PREVIEW.ZOOM_STEP
      );
    }
  );
  dom.btnZoomOut.addEventListener(
    'click',
    () => {
      setPreviewZoom(
        previewZoom -
        CONFIG.PREVIEW.ZOOM_STEP
      );
    }
  );
  window.addEventListener(
    'resize',
    () => {
      fitPreviewToWindow();
    }
  );
}
export function renderAll() {
  renderPosterHeader();
  renderBlocks();
  renderFixedLayoutItems();
  requestAnimationFrame(checkOverflow);
}
function renderPosterHeader() {
  const state =
    getState();
  dom.poster.dataset.clubType =
    state.type;
  dom.poster.dataset.layoutEditing =
    String(
      state.layoutEditing
    );
  dom.previewClubName.textContent =
    state.clubName || '';
  dom.previewTeacher.textContent =
    state.teacherName || '';
  dom.previewClubType.textContent =
    ({creative:'창체동아리', autonomous:'자율동아리', 'free-semester':'자유학기'})[state.type] || '자율동아리';
  document.getElementById('preview-introduction').textContent = state.introduction || '';
  state.reflections.forEach((value, i) => { document.getElementById(`preview-reflection-${i}`).textContent = value; });
  dom.previewFooterMessage.textContent =
    state.layoutEditing
      ? '블록을 선택하여 이동하거나 크기를 조절할 수 있습니다.'
      : '글을 클릭하여 입력하고 사진 영역에서 이미지를 추가하세요.';
}
function renderBlocks() {
  const state =
    getState();
  dom.layoutCanvas.innerHTML =
    '';
  state.blocks.forEach(
    block => {
      dom.layoutCanvas.appendChild(
        createBlockElement(
          block
        )
      );
    }
  );
}
function createBlockElement(block) {
  const fragment =
    dom.layoutBlockTemplate
      .content
      .cloneNode(true);
  const element =
    fragment.querySelector(
      '.layout-block'
    );
  const content =
    element.querySelector(
      '.layout-block__content'
    );
  element.appendChild(makeDeleteButton(block.id, '블록'));
  element.dataset.blockId =
    block.id;
  element.dataset.blockType =
    block.type;
  element.style.setProperty(
    '--block-x',
    block.x
  );
  element.style.setProperty(
    '--block-y',
    block.y
  );
  element.style.setProperty(
    '--block-w',
    block.w
  );
  element.style.setProperty(
    '--block-h',
    block.h
  );
  element.style.setProperty(
    '--block-z',
    block.z || 1
  );
  const state =
    getState();
  if (
    state.selectedBlockId ===
    block.id
  ) {
    element.classList.add(
      'is-selected'
    );
  }
  renderBlockContent(
    block,
    content
  );
  return element;
}
function renderBlockContent(
  block,
  container
) {
  switch (
    block.type
  ) {
    case 'activityTitle':
      renderActivityTitle(
        block,
        container
      );
      break;
    case 'activityContent':
      renderActivityContent(
        block,
        container
      );
      break;
    case 'subtitle':
      renderSubtitle(
        block,
        container
      );
      break;
    case 'text':
      renderText(
        block,
        container
      );
      break;
    case 'photo':
    case 'photo-caption':
      renderPhoto(
        block,
        container
      );
      break;
  }
}
function renderActivityTitle(
  block,
  container
) {
  const activity =
    getActivity(
      block.activityId
    );
  const state =
    getState();
  const index =
    state.activities.findIndex(
      item =>
        item.id ===
        block.activityId
    );
  const wrapper =
    document.createElement(
      'div'
    );
  wrapper.className =
    'poster-activity-title';
  const number =
    document.createElement(
      'span'
    );
  number.className =
    'poster-activity-title__number';
  number.textContent =
    String(
      index + 1
    );
  const title =
    document.createElement(
      'h2'
    );
  title.className =
    'poster-activity-title__text';
  title.textContent =
    activity?.title || '';
  makeEditable(title, 'title', '활동 제목을 입력하세요', {activityId: block.activityId});
  wrapper.append(
    number,
    title
  );
  container.appendChild(
    wrapper
  );
}
function renderActivityContent(
  block,
  container
) {
  const activity =
    getActivity(
      block.activityId
    );
  const wrapper =
    document.createElement(
      'div'
    );
  wrapper.className =
    'poster-activity-content';
  const text =
    document.createElement(
      'div'
    );
  text.className =
    'poster-activity-content__text';
  text.textContent =
    activity?.content || '';
  makeEditable(text, block.type === 'activityContent' ? 'content' : 'text', '활동 내용을 약 150자로 설명해 주세요', {activityId: block.activityId, blockId: block.id});
  wrapper.appendChild(
    text
  );
  container.appendChild(
    wrapper
  );
}
function renderSubtitle(
  block,
  container
) {
  const wrapper =
    document.createElement(
      'div'
    );
  wrapper.className =
    'poster-subtitle-block';
  const marker =
    document.createElement(
      'span'
    );
  marker.className =
    'poster-subtitle-block__number';
  marker.textContent =
    block.marker ||
    '•';
  const title =
    document.createElement(
      'h2'
    );
  title.className =
    'poster-subtitle-block__title';
  title.textContent =
    block.text || '';
  makeEditable(title, 'text', '소제목을 입력하세요', {blockId: block.id});
  makeEditable(marker, 'marker', '•', {blockId: block.id});
  wrapper.append(
    marker,
    title
  );
  container.appendChild(
    wrapper
  );
}
function renderText(
  block,
  container
) {
  const wrapper =
    document.createElement(
      'div'
    );
  wrapper.className =
    'poster-text-block';
  const text =
    document.createElement(
      'div'
    );
  text.className =
    'poster-text-block__text';
  text.textContent =
    block.text || '';
  makeEditable(text, block.type === 'activityContent' ? 'content' : 'text', '활동 내용을 약 150자로 설명해 주세요', {activityId: block.activityId, blockId: block.id});
  wrapper.appendChild(
    text
  );
  container.appendChild(
    wrapper
  );
}
function renderPhoto(
  block,
  container
) {
  const photo =
    getPhoto(
      block.slotId
    );
  const figure =
    document.createElement(
      'figure'
    );
  figure.className =
    'poster-photo-block';
  const frame =
    document.createElement(
      'div'
    );
  frame.className =
    'poster-photo-block__frame';
  const image =
    document.createElement(
      'img'
    );
  image.className =
    'poster-photo-block__image';
  image.alt =
    '';
  const empty =
    document.createElement(
      'div'
    );
  empty.className =
    'poster-photo-block__empty';
  empty.innerHTML =
    '<span>+</span><span>사진</span>';
  if (
    photo?.dataUrl
  ) {
    image.src =
      photo.dataUrl;
    image.hidden =
      false;
    empty.hidden =
      true;
    applyCrop(
      image,
      photo.crop
    );
  } else {
    image.hidden =
      true;
  }
  frame.append(
    image,
    empty
  );
  figure.appendChild(
    frame
  );
  const tools = document.createElement('div'); tools.className = 'photo-inline-tools';
  const actions = [['사진 변경', () => selectPhotoForSlot(block.slotId)], ['위치 조정', () => openCropDialog(block.slotId)], ['사진 삭제', () => removePhoto(block.slotId)]];
  if (photo?.dataUrl) actions.forEach(([label, callback]) => {
    const button = document.createElement('button'); button.type='button'; button.textContent=label;
    button.addEventListener('click', event => { event.stopPropagation(); callback(); }); tools.append(button);
  });
  frame.append(tools);
  container.appendChild(figure);
}
function applyCrop(
  image,
  crop
) {
  const value =
    normalizeCrop(
      crop
    );
  image.style.objectPosition =
    `${value.x}% ${value.y}%`;
  image.style.transform =
    `scale(${value.scale})`;
}
// Resizing the workspace never shrinks the page below its actual CSS size.
export function fitPreviewToWindow() { setPreviewZoom(previewZoom); }
function makeEditable(el, field, placeholder, data={}) {
  el.contentEditable = 'plaintext-only'; el.dataset.editField = field;
  el.dataset.placeholder = placeholder; el.setAttribute('role','textbox'); el.setAttribute('aria-label',placeholder);
  el.spellcheck = false;
  for (const [key,value] of Object.entries(data)) if (value) el.dataset[key] = value;
}
function setPreviewZoom(value) {
  previewZoom =
    clamp(
      value,
      CONFIG.PREVIEW.MIN_ZOOM,
      CONFIG.PREVIEW.MAX_ZOOM
    );
  dom.poster.style.transform =
    `scale(${previewZoom})`;
  dom.posterWrapper.style.width =
    `${dom.poster.offsetWidth * previewZoom}px`;
  dom.posterWrapper.style.height =
    `${dom.poster.offsetHeight * previewZoom}px`;
  dom.btnZoomOut.disabled = previewZoom <= CONFIG.PREVIEW.MIN_ZOOM;
  dom.btnZoomIn.disabled = previewZoom >= CONFIG.PREVIEW.MAX_ZOOM;
  dom.zoomLabel.textContent =
    `${Math.round(previewZoom * 100)}%`;
}

function makeDeleteButton(id, label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'layout-delete-button';
  button.dataset.deleteLayoutItem = id;
  button.textContent = '×';
  button.title = `${label} 삭제`;
  button.setAttribute('aria-label', `${label} 삭제`);
  button.contentEditable = 'false';
  return button;
}
function renderFixedLayoutItems() {
  const state = getState();
  for (const [id, item] of Object.entries(FIXED_LAYOUT_ITEMS)) {
    const element = dom.poster.querySelector(item.selector);
    element.dataset.fixedLayoutItem = id;
    element.hidden = (state.hiddenLayoutItems || []).includes(id);
    element.classList.toggle('is-selected', state.selectedBlockId === id);
    element.querySelector(':scope > .layout-delete-button')?.remove();
    element.appendChild(makeDeleteButton(id, item.label));
  }
  const cards = [...dom.poster.querySelectorAll('.reflection-card')];
  dom.poster.querySelector('.reflection-grid').style.gridTemplateColumns = `repeat(${Math.max(1, cards.filter(card => !card.hidden).length)}, 1fr)`;
  dom.poster.querySelector('.poster-reflections').hidden = cards.every(card => card.hidden);
}
