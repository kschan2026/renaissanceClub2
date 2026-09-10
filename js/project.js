import {normalizeHiddenLayoutItems} from './layout-state.js';
import {
  CONFIG
} from './config.js';
import {
  dom,
  showToast,
  showLoading,
  hideLoading,
  setSaveStatus,
  confirmAction
} from './dom.js';
import {
  apiRequest
} from './api.js';
import {
  getState,
  replaceState,
  resetState,
  isDirty,
  setDirty,
  createEmptyState,
  createDefaultBlocks
} from './store.js';
import {
  syncEditorFromState
} from './editor.js';
import {
  capturePoster,
  posterPdf,
  blobDataUrl,
  downloadCompleteFiles
} from './export.js';
import {
  fitPreviewToWindow
} from './render.js';
import {
  saveLocalDraftNow,
  clearLocalDraft
} from './local-storage.js';
import {
  normalizeCrop,
  formatDateTime
} from './utils.js';
let projects = [];
let filter = 'all';
export function initProject() {
  dom.btnNew.addEventListener(
    'click',
    newProject
  );
  dom.btnLoadCloud.addEventListener(
    'click',
    openCloud
  );
  dom.btnSaveDraft.addEventListener(
    'click',
    () => saveProject(false)
  );
  dom.btnSaveComplete.addEventListener(
    'click',
    () => saveProject(true)
  );
  dom.btnCloseCloudDialog.addEventListener(
    'click',
    () => {
      dom.cloudDialog.close();
    }
  );
  dom.filterChips.forEach(
    button => {
      button.addEventListener(
        'click',
        () => {
          filter =
            button.dataset.projectFilter;
          dom.filterChips.forEach(
            chip => {
              chip.classList.toggle(
                'is-active',
                chip === button
              );
            }
          );
          renderProjectList();
        }
      );
    }
  );
  window.addEventListener(
    'beforeunload',
    event => {
      if (
        !isDirty()
      ) {
        return;
      }
      event.preventDefault();
      event.returnValue =
        '';
    }
  );
}
async function saveProject(finalize) {
  const state =
    getState();
  if (
    !state.clubName.trim()
  ) {
    showToast(
      '동아리명을 입력해 주세요.',
      'error'
    );
    dom.previewClubName.focus();
    return;
  }
  if (
    finalize
  ) {
    const confirmed =
      await confirmAction(
        '완성본 저장',
        'Google Drive에 PNG와 PDF 완성본을 함께 저장하고 두 파일을 내려받을까요?'
      );
    if (
      !confirmed
    ) {
      return;
    }
  }
  showLoading(
    finalize
      ? '완성본을 저장하는 중입니다.'
      : '작성 중인 내용을 저장하는 중입니다.'
  );
  try {
    let preview = null;
    let pdf = null;
    /*
     * 작성 중 저장은 외부 이미지 라이브러리를
     * 사용하지 않아도 되도록 미리보기를 생략한다.
     *
     * 완성본 저장 때만 PNG를 만든다.
     */
    if (
      finalize
    ) {
      preview =
        await capturePoster(
          CONFIG.PREVIEW.COMPLETE_PIXEL_RATIO
        );
      pdf = await posterPdf(preview);
    }
    const request = {
      action:
        'saveProject',
      finalize,
      expectedUpdatedAt:
        state.updatedAt ||
        null,
      project:
        buildProjectPayload(),
      photos:
        buildPhotoPayload()
    };
    if (
      preview
    ) {
      request.preview = {
        dataUrl:
          preview
      };
      request.pdf = {dataUrl: await blobDataUrl(pdf)};
    }
    const saved =
      await apiRequest(
        request
      );
    const loaded =
      await apiRequest({
        action:
          'loadProject',
        projectId:
          saved.id
      });
    if (loaded.project?.activities?.length !== state.activities.length || loaded.project?.type !== state.type || loaded.project?.blocks?.length !== state.blocks.length || (loaded.project?.introduction || '') !== state.introduction || JSON.stringify(loaded.project?.reflections || ['', '', '']) !== JSON.stringify(state.reflections) || JSON.stringify(normalizeHiddenLayoutItems(loaded.project?.hiddenLayoutItems)) !== JSON.stringify(normalizeHiddenLayoutItems(state.hiddenLayoutItems))) {
      await saveLocalDraftNow();
      throw new Error('서버가 새 자료 형식을 보존하지 못했습니다. 현재 작업은 브라우저에 보관했습니다. Apps Script의 활동 수·자료 종류·격자 제한을 확인해 주세요.');
    }
    replaceState(
      normalizeProjectState(
        loaded.project
      ),
      {
        dirty: false
      }
    );
    syncEditorFromState();
    await saveLocalDraftNow();
    setDirty(false);
    setSaveStatus(
      finalize
        ? '완성본 저장됨'
        : '클라우드 저장됨',
      'saved'
    );
    if (
      finalize
    ) {
      showLoading(
        'PNG와 PDF 파일을 만드는 중입니다.'
      );
      try {
        await downloadCompleteFiles(preview, pdf);
      } catch (error) {
        showToast(`Drive에 완성본은 저장되었습니다. 다운로드 준비 실패: ${error.message}`, 'error');
        return;
      }
      if (!saved.finalPdfSaved) {
        showToast('PNG는 저장되었지만 서버가 PDF 저장을 확인하지 않았습니다. 최신 Apps Script로 배포를 업데이트해 주세요.', 'error');
        return;
      }
      if (saved.submissionWarning) {
        showToast(saved.submissionWarning, 'error');
        return;
      }
      showToast(
        '완성본 저장을 완료했습니다.',
        'success'
      );
    } else {
      showToast(
        '작성 중인 내용을 저장했습니다.',
        'success'
      );
    }
  } catch (error) {
    setSaveStatus(
      '저장 실패',
      'error'
    );
    showToast(
      error.message ||
      '저장에 실패했습니다.',
      'error'
    );
  } finally {
    hideLoading();
  }
}
function buildProjectPayload() {
  const state =
    getState();
  return {
    schemaVersion: 4,
    pageSize: 'a2',
    layoutVersion: 'exhibition-33-v2',
    introduction: state.introduction,
    reflections: state.reflections,
    hiddenLayoutItems: normalizeHiddenLayoutItems(state.hiddenLayoutItems),
    legacyBlocks: state.legacyBlocks || [],
    legacyRemovedActivities: state.legacyRemovedActivities || [],
    grid: {columns: 24, rows: 96},
    id:
      state.id,
    type:
      state.type,
    clubName:
      state.clubName,
    teacherName:
      state.teacherName,
    activities:
      state.activities,
    blocks:
      state.blocks.map(
        block => {
          const result = {
            id:
              block.id,
            type:
              block.type,
            x:
              block.x,
            y:
              block.y,
            w:
              block.w,
            h:
              block.h,
            z:
              block.z || 1,
            locked:
              Boolean(block.locked)
          };
          if (
            block.activityId
          ) {
            result.activityId =
              block.activityId;
          }
          if (
            block.slotId
          ) {
            result.slotId =
              block.slotId;
          }
          if (
            block.text !== undefined
          ) {
            result.text =
              block.text;
          }
          if (
            block.marker !== undefined
          ) {
            result.marker =
              block.marker;
          }
          return result;
        }
      )
  };
}
function buildPhotoPayload() {
  return getState()
    .photos
    .filter(
      photo =>
        photo.dataUrl ||
        photo.fileId
    )
    .map(
      photo => {
        const result = {
          slotId:
            photo.slotId,
          caption:
            photo.caption || '',
          crop:
            normalizeCrop(
              photo.crop
            )
        };
        if (
          photo.fileId
        ) {
          result.fileId =
            photo.fileId;
        } else {
          result.dataUrl =
            photo.dataUrl;
        }
        return result;
      }
    );
}
async function openCloud() {
  dom.cloudDialog.showModal();
  dom.cloudProjectList.innerHTML =
    '<p class="empty-state">불러오는 중입니다.</p>';
  try {
    const result =
      await apiRequest({
        action:
          'listProjects'
      });
    projects =
      result.projects ||
      [];
    renderProjectList();
  } catch (error) {
    dom.cloudProjectList.innerHTML =
      '';
    dom.cloudProjectList.textContent = error.message;
  }
}
function renderProjectList() {
  dom.cloudProjectList.innerHTML =
    '';
  const filtered =
    projects.filter(
      project =>
        filter === 'all' ||
        project.type === filter
    );
  if (
    !filtered.length
  ) {
    dom.cloudProjectList.innerHTML =
      '<p class="empty-state">저장된 프로젝트가 없습니다.</p>';
    return;
  }
  filtered.forEach(
    project => {
      dom.cloudProjectList.appendChild(
        createProjectItem(
          project
        )
      );
    }
  );
}
function createProjectItem(project) {
  const item =
    document.createElement(
      'article'
    );
  item.className =
    'project-item';
  const preview =
    document.createElement(
      'div'
    );
  preview.className =
    'project-item__preview';
  preview.style.background =
    ({creative: '#eadff7', autonomous: '#d9edf9', 'free-semester': '#ffebc5'})[project.type] || '#d9edf9';
  const info =
    document.createElement(
      'div'
    );
  const title =
    document.createElement(
      'h3'
    );
  title.className =
    'project-item__name';
  title.textContent =
    project.clubName;
  const meta =
    document.createElement(
      'p'
    );
  meta.className =
    'project-item__meta';
  meta.textContent = [
    project.typeLabel,
    project.teacherName
      ? `담당 ${project.teacherName}`
      : '',
    project.updatedAt
      ? formatDateTime(
          project.updatedAt
        )
      : ''
  ]
    .filter(Boolean)
    .join(' · ');
  info.append(
    title,
    meta
  );
  const actions =
    document.createElement(
      'div'
    );
  actions.className =
    'project-item__actions';
  const load =
    document.createElement(
      'button'
    );
  load.className =
    'mini-btn';
  load.type =
    'button';
  load.textContent =
    '불러오기';
  load.addEventListener(
    'click',
    () => {
      loadProject(
        project.id
      );
    }
  );
  const remove =
    document.createElement(
      'button'
    );
  remove.className =
    'mini-btn mini-btn--danger';
  remove.type =
    'button';
  remove.textContent =
    '삭제';
  remove.addEventListener(
    'click',
    () => {
      deleteProject(
        project
      );
    }
  );
  actions.append(
    load,
    remove
  );
  item.append(
    preview,
    info,
    actions
  );
  return item;
}
async function loadProject(id) {
  if (
    isDirty()
  ) {
    const confirmed =
      await confirmAction(
        '프로젝트 불러오기',
        '현재 수정 중인 내용을 저장하지 않고 불러올까요?'
      );
    if (
      !confirmed
    ) {
      return;
    }
  }
  showLoading(
    '프로젝트를 불러오는 중입니다.'
  );
  try {
    const result =
      await apiRequest({
        action:
          'loadProject',
        projectId:
          id
      });
    replaceState(
      normalizeProjectState(
        result.project
      ),
      {
        dirty: false
      }
    );
    syncEditorFromState();
    await saveLocalDraftNow();
    setDirty(false);
    dom.cloudDialog.close();
    requestAnimationFrame(
      fitPreviewToWindow
    );
    showToast(
      '프로젝트를 불러왔습니다.',
      'success'
    );
  } catch (error) {
    showToast(
      error.message,
      'error'
    );
  } finally {
    hideLoading();
  }
}
async function deleteProject(project) {
  const confirmed =
    await confirmAction(
      '프로젝트 삭제',
      `"${project.clubName}" 프로젝트를 삭제할까요?`
    );
  if (
    !confirmed
  ) {
    return;
  }
  showLoading(
    '프로젝트를 삭제하는 중입니다.'
  );
  try {
    await apiRequest({
      action:
        'deleteProject',
      projectId:
        project.id
    });
    projects =
      projects.filter(
        item =>
          item.id !== project.id
      );
    if (
      getState().id ===
      project.id
    ) {
      resetState();
      syncEditorFromState();
      await clearLocalDraft();
    }
    renderProjectList();
    showToast(
      '프로젝트를 삭제했습니다.',
      'success'
    );
  } catch (error) {
    showToast(
      error.message,
      'error'
    );
  } finally {
    hideLoading();
  }
}
async function newProject() {
  if (
    isDirty()
  ) {
    const confirmed =
      await confirmAction(
        '새로 만들기',
        '현재 수정 중인 내용을 저장하지 않고 새 작업을 시작할까요?'
      );
    if (
      !confirmed
    ) {
      return;
    }
  }
  resetState();
  syncEditorFromState();
  await clearLocalDraft();
  setSaveStatus(
    '새 작업'
  );
  requestAnimationFrame(
    fitPreviewToWindow
  );
}
export function normalizeProjectState(project) {
  const empty = createEmptyState();
  const activities = Array.from({length: 6}, (_, i) => ({
    id: project.activities?.[i]?.id || `activity_${i+1}`,
    title: project.activities?.[i]?.title || '', content: project.activities?.[i]?.content || ''
  }));
  const current = project.layoutVersion === 'exhibition-33-v2';
  const previous332 = project.layoutVersion === 'exhibition-332-v1';
  let photos = (Array.isArray(project.photos) ? project.photos : []).map(photo => ({...photo, crop:normalizeCrop(photo.crop)}));
  if (!current && !previous332) {
    // Keep the first photo attached to its original activity; use photos 2 in new activities 5–8.
    photos = photos.map(photo => {
      const match = /^activity_([1-4])_photo_([12])$/.exec(photo.slotId);
      return match ? {...photo, slotId:`activity_${Number(match[1])+(match[2]==='2'?4:0)}_photo`} : photo;
    });
  }
  const defaults = createDefaultBlocks();
  let blocks = current && Array.isArray(project.blocks) ? project.blocks : defaults;
  if (previous332 && Array.isArray(project.blocks)) {
    // Reflow retained defaults, without recreating boxes the user deleted.
    const removedIds = new Set((project.activities || []).slice(6).map(activity => activity.id));
    blocks = project.blocks.filter(block => !removedIds.has(block.activityId)).map(block => {
      const replacement = defaults.find(item => item.id === block.id);
      return replacement ? {...block, x:replacement.x, y:replacement.y, w:replacement.w, h:replacement.h} : block;
    });
  }
  const usedSlots = new Set(blocks.map(block => block.slotId).filter(Boolean));
  photos = photos.filter(photo => usedSlots.has(photo.slotId));
  return {
    ...empty, id:project.id || null, schemaVersion:4, pageSize:'a2', layoutVersion:'exhibition-33-v2',
    introduction: String(project.introduction || ''),
    reflections: Array.from({length:3}, (_,i)=>String(project.reflections?.[i] || '')),
    hiddenLayoutItems: normalizeHiddenLayoutItems(project.hiddenLayoutItems),
    legacyBlocks: current ? (project.legacyBlocks || []) : (project.blocks || []),
    legacyRemovedActivities: current ? (project.legacyRemovedActivities || []) : (project.activities || []).slice(6),
    type: ['creative','autonomous','free-semester'].includes(project.type) ? project.type : 'autonomous',
    clubName:project.clubName || '', teacherName:project.teacherName || '', activities,
    blocks,
    photos, status:project.status || 'draft', createdAt:project.createdAt || null, updatedAt:project.updatedAt || null
  };
}
