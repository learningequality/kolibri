import { displaySectionTitle } from 'kolibri-common/strings/enhancedQuizManagementStrings';

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
    currentSection(state, { sections, currentSectionIndex }) {
      return sections[currentSectionIndex];
    },
    currentSectionIndex(state, { currentQuestion, sections }) {
      return sections.findIndex(section =>
        section.questions.map(q => q.item).includes(currentQuestion.item)
      );
    },
    sectionSelectOptions(state, { sections }) {
      return (
        sections.map((section, i) => ({
          label: displaySectionTitle(section, i),
          value: i,
        })) || []
      );
    },
    currentSectionOption(state, { currentSection, sectionSelectOptions }) {
      if (!currentSection) return {};
      return sectionSelectOptions.find(
        (opt, i) => opt.label === displaySectionTitle(currentSection, i)
      );
    },
  },
};
