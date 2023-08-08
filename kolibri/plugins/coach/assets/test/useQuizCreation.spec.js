import { get, set } from '@vueuse/core';
import { useQuizCreation } from '../src/composables/useQuizCreation.js';

const {
  // Methods
  updateSection,
  replaceSelectedQuestions,
  addSection,
  removeSection,
  setActiveSection,
  initializeQuiz,
  updateQuiz,

  // Computed
  quiz,
  allSections,
  activeSection,
  activeExercisePool,
  activeQuestions,
  replacementQuestions,
} = useQuizCreation();

describe('useQuizCreation', () => {
  describe('Quiz initialization', () => {
    beforeAll(() => {
      initializeQuiz();
    });

    it('Should create the first section and add it to the quiz', () => {
      expect(get(allSections)).toHaveLength(1);
    });

    it('Should set the active section to the first section', () => {
      expect(get(activeSection)).toEqual(get(allSections)[0]);
    });
  });
});
