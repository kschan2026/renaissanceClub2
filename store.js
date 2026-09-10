import {
  clone
} from './utils.js';
export function createActivities() {
  return Array.from({length: 6}, (_, i) => ({id: `activity_${i+1}`, title: '', content: ''}));
}
export function createDefaultBlocks() {
  return createActivities().flatMap((activity, i) => {
    const w = 8;
    const x = 1+(i%3)*8;
    const y = 1+Math.floor(i/3)*48;
    const base = {activityId: activity.id, z: 1, locked: true};
    return [
      {...base, id: `${activity.id}_title`, type: 'activityTitle', x, y, w, h: 3},
      {...base, id: `${activity.id}_photo_block`, type: 'photo', slotId: `${activity.id}_photo`,
        x, y:y+4, w, h: 25},
      {...base, id: `${activity.id}_content`, type: 'activityContent',
        x, y:y+30, w, h:17}
    ];
  });
}
export function createEmptyState() {
  return {
    schemaVersion: 4,
    pageSize: 'a2',
    layoutVersion: 'exhibition-33-v2',
    introduction: '',
    reflections: ['', '', ''],
    hiddenLayoutItems: [],
    legacyBlocks: [],
    id:
      null,
    type:
      'autonomous',
    clubName:
      '',
    teacherName:
      '',
    activities:
      createActivities(),
    blocks:
      createDefaultBlocks(),
    photos:
      [],
    status:
      'draft',
    createdAt:
      null,
    updatedAt:
      null,
    selectedBlockId:
      null,
    layoutEditing:
      false,
    aiUndoSnapshot:
      null
  };
}
let state =
  createEmptyState();
let dirty =
  false;
const listeners =
  new Set();
export function getState() {
  return state;
}
export function replaceState(
  newState,
  options = {}
) {
  state =
    newState;
  dirty =
    Boolean(
      options.dirty
    );
  notify();
}
export function resetState() {
  state =
    createEmptyState();
  dirty =
    false;
  notify();
}
export function updateState(
  callback,
  options = {}
) {
  callback(
    state
  );
  if (
    options.dirty !==
    false
  ) {
    dirty =
      true;
  }
  notify();
}
export function notify() {
  listeners.forEach(
    callback => {
      callback(
        state
      );
    }
  );
}
export function subscribe(callback) {
  listeners.add(
    callback
  );
  return () => {
    listeners.delete(
      callback
    );
  };
}
export function isDirty() {
  return dirty;
}
export function setDirty(value) {
  dirty =
    Boolean(
      value
    );
}
export function getActivity(id) {
  return (
    state.activities.find(
      activity =>
        activity.id ===
        id
    ) ||
    null
  );
}
export function getPhoto(slotId) {
  return (
    state.photos.find(
      photo =>
        photo.slotId ===
        slotId
    ) ||
    null
  );
}
export function snapshotActivities() {
  return clone(
    state.activities
  );
}
