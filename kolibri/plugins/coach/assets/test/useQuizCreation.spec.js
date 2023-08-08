import { get, set } from '@vueuse/core';
import { ChannelResource } from 'kolibri.resources';
import { objectWithDefaults } from 'kolibri.utils.objectSpecs';
import { Exercise, Quiz, QuizQuestion, QuizSection } from '../src/composables/quizCreationSpecs.js';
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
  addQuestionToSelection,
  removeQuestionFromSelection,

  // Computed
  channels,
  quiz,
  allSections,
  activeSection,
  activeExercisePool,
  activeQuestions,
  selectedActiveQuestions,
  replacementQuestionPool,
} = useQuizCreation();

const _channel = { root: 'channel_1', name: 'Channel 1', kind: 'channel', is_leaf: false };
ChannelResource.fetchCollection = jest.fn(() => Promise.resolve([_channel]));

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

    it('Populates the channels list', () => {
      expect(get(channels)).toHaveLength(1);
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
        updateSection({ section_id: addedSection.section_id, section_title: newTitle });
        expect(
          get(allSections).find(s => s.section_id === addedSection.section_id).section_title
        ).toEqual(newTitle);
      });

      it('Throws a TypeError if trying to update a section with a bad section shape', () => {
        expect(() => updateSection({ section_id: null, title: 1 })).toThrow(TypeError);
      });
    });

    describe('Question list (de)selection', () => {
      beforeEach(() => {
        initializeQuiz();
        const questions = [1, 2, 3].map(i => objectWithDefaults({ question_id: i }, QuizQuestion));
        const { section_id } = get(activeSection);
        updateSection({ section_id, questions });
      });
      it('Can add a question to the selected questions', () => {
        const { question_id } = get(activeQuestions)[0];
        addQuestionToSelection(question_id);
        expect(get(selectedActiveQuestions)).toHaveLength(1);
      });
      it("Can remove a question from the active section's selected questions", () => {
        const { question_id } = get(activeQuestions)[0];
        addQuestionToSelection(question_id);
        expect(get(selectedActiveQuestions)).toHaveLength(1);
        removeQuestionFromSelection(question_id);
        expect(get(selectedActiveQuestions)).toHaveLength(0);
      });
      it('Does not hold duplicates, so adding an existing question does nothing', () => {
        const { question_id } = get(activeQuestions)[0];
        addQuestionToSelection(question_id);
        expect(get(selectedActiveQuestions)).toHaveLength(1);
        addQuestionToSelection(question_id);
        expect(get(selectedActiveQuestions)).toHaveLength(1);
      });
    });

    describe('Question replacement', () => {
      beforeEach(() => {
        initializeQuiz();
        const questions = [1, 2, 3].map(i => objectWithDefaults({ question_id: i }, QuizQuestion));
        const { section_id } = get(activeSection);
        updateSection({ section_id, questions });
      });
      it('Can give a list of questions in the exercise pool but not in the selected questions', () => {});
    });
  });
});
