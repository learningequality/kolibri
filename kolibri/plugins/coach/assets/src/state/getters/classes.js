import { filterAndSortUsers } from '../../../../../facility_management/assets/src/userSearchUtils';

const getCurrentClassroom = state => state.classList.find(({ id }) => id === state.classId);

export function className(state) {
  return state.className;
}

export function classMemberCount(state) {
  const cls = getCurrentClassroom(state);
  if (cls) {
    return cls.learner_count;
  }
  return 0;
}

export function classCoaches(state) {
  return filterAndSortUsers(state.classCoaches, () => true, 'full_name');
}
