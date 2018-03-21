const getCurrentClassroom = state => state.classList.find(({ id }) => id === state.classId);

export function className(state) {
  const cls = getCurrentClassroom(state);
  if (cls) {
    return cls.name;
  }
  return '';
}

export function classMemberCount(state) {
  const cls = getCurrentClassroom(state);
  if (cls) {
    return cls.learner_count;
  }
  return 0;
}

export function classCoaches(state) {
  if (state.currentClassroom) {
    return state.currentClassroom.coaches;
  }
  return [];
}
