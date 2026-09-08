import {
  clone
} from './utils.js';
export function createActivities() {
  return Array.from({length: 4}, (_, i) => ({id: `activity_${i+1}`, title: '', content: ''}));
}
export function createDefaultBlocks() {
  return createActivities().flatMap((activity, i) => {
    const x = i % 2 === 0 ? 1 : 14;
    const y = i < 2 ? 1 : 49;
    const base = {activityId: activity.id, z: 1, locked: true};
    return [
      {...base, id: `${activity.id}_title`, type: 'activityTitle', x, y, w: 11, h: 5},
      {...base, id: `${activity.id}_content`, type: 'activityContent', x, y: y+6, w: 11, h: 16},
      ...[1,2].map((n) => ({...base, id: `${activity.id}_photo_${n}_block`, type: 'photo-caption',
        slotId: `${activity.id}_photo_${n}`, x: x+(n-1)*6, y: y+24, w: 5, h: 20}))
    ];
  });
}
export function createEmptyState() {
  return {
    schemaVersion: 4,
    pageSize: 'a2',
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
