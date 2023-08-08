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
      // Only need this called once in this scope
      initializeQuiz();
    });

    it('Should create the first section and add it to the quiz', () => {
      expect(get(allSections)).toHaveLength(1);
    });

    it('Should set the active section to the first section', () => {
      expect(get(activeSection).section_id).toEqual(get(allSections)[0].section_id);
    });

    it('Should reset the quiz altogether if initializeQuiz is called again', () => {
      addSection();
      expect(get(allSections)).toHaveLength(2);
      initializeQuiz();
      expect(get(allSections)).toHaveLength(1);
    });
  });

  describe('Quiz management', () => {
    beforeEach(() => {
      // Let's get a fresh quiz for each test
      initializeQuiz();
    });

    describe('Quiz CRUD', () => {
      it('Can update the quiz given a subset of valid properties', () => {
        const newTitle = 'New Title';
        updateQuiz({ title: newTitle });
        expect(get(quiz).title).toEqual(newTitle);
      });

      it('Throws a TypeError if the given updates are not a valid Quiz object', () => {
        expect(() => updateQuiz({ title: 1, question_sources: 'hi' })).toThrow(TypeError);
      });

      it('Can add a new section to the quiz', () => {
        addSection();
        expect(get(allSections)).toHaveLength(2);
      });

      it('Can remove a section from the quiz', () => {
        const addedSection = addSection();
        expect(get(allSections)).toHaveLength(2);
        removeSection(addedSection.section_id);
        expect(get(allSections)).toHaveLength(1);
        expect(
          get(allSections).find(s => s.section_id === addedSection.section_id)
        ).toBeUndefined();
      });

      it('Can change the activeSection', () => {
        const addedSection = addSection();
        expect(get(activeSection).section_id).not.toEqual(addedSection.section_id);
        setActiveSection(addedSection.section_id);
        expect(get(activeSection).section_id).toEqual(addedSection.section_id);
      });

      it('Can update any section', () => {
        const addedSection = addSection();
        const newTitle = 'New Title';
        updateSection({ section_id: addedSection.section_id, title: newTitle });
        expect(get(allSections).find(s => s.section_id === addedSection.section_id).title).toEqual(
          newTitle
        );
      });

      it('Throws a TypeError if trying to update a section with a bad section shape', () => {
        expect(() => updateSection({ section_id: null, title: 1 })).toThrow(TypeError);
      });
    });
  });
});
