export function SET_LESSON_CONTENTNODES(state, contentNodes) {
  state.pageState.contentNodes = [...contentNodes];
}

export function SET_CURRENT_LESSON(state, lesson) {
  state.pageState.currentLesson = { ...lesson };
}

export function SET_LEARNER_CLASSROOMS(state, classrooms) {
  state.pageState.classrooms = [...classrooms];
}

export function SET_CURRENT_CLASSROOM(state, classroom) {
  state.pageState.currentClassroom = { ...classroom };
}

export function SET_CURRENT_AND_NEXT_LESSON_RESOURCES(state, resources) {
  state.pageState.currentLessonResource = { ...resources[0] };
  if (resources[1]) {
    state.pageState.nextLessonResource = { ...resources[1] };
  } else {
    state.pageState.nextLessonResource = null;
  }
}
