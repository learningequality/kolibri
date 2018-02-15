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
