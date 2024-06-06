function defaultState() {
  return {
    contentNodeMap: {},
    exam: {},
    questionNumber: 0,
    questions: [],
  };
}

export default {
  namespaced: true,
  state: defaultState(),
  mutations: {
    SET_STATE(state, payload) {
      Object.assign(state, payload);
    },
    RESET_STATE(state) {
      Object.assign(state, defaultState());
    },
  },
  getters: {
    sections(state) {
      if (!state.exam.question_sources) return [];
      return state.exam.question_sources;
    },
    currentQuestion(state) {
      if (state.questions.length === 0) return null;
      return state.questions[state.questionNumber];
    },
    currentSection(state, { currentQuestion, sections }) {
      return sections.find(section =>
        section.questions.map(q => q.item).includes(currentQuestion.item)
      );
    },
    sectionSelectOptions(state, { sections }) {
      return (
        sections.map((section, i) => ({
          label: section.section_title,
          value: i,
        })) || []
      );
    },
    currentSectionOption(state, { currentSection, sectionSelectOptions }) {
      if (!currentSection) return {};
      return sectionSelectOptions.find(opt => opt.label === currentSection.section_title);
    },
  },
};
