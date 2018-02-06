export function SET_CLASS_LESSONS(state, lessons) {
  state.pageState.lessons = lessons;
}

export function SET_CURRENT_LESSON(state, lesson) {
  state.pageState.currentLesson = { ...lesson };
}

export function SET_LEARNER_GROUPS(state, learnerGroups) {
  state.pageState.learnerGroups = learnerGroups;
}

export function SET_CONTENT_LIST(state, contentList) {
  state.pageState.contentList = [...contentList];
}
