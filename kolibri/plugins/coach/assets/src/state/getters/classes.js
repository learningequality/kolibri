export function className(state) {
  const cls = state.classList.find(thisClass => thisClass.id === state.classId);
  if (cls) {
    return cls.name;
  }
  return '';
}

export function classMemberCount(state) {
  const cls = state.classList.find(thisClass => thisClass.id === state.classId);
  if (cls) {
    return cls.memberCount;
  }
  return 0;
}

export function classCoaches(state) {
  if (state.currentClassroom) {
    return state.currentClassroom.coaches;
  }
  return [];
}
