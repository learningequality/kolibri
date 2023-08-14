import { get } from '@vueuse/core';
import { ChannelResource, ExamResource } from 'kolibri.resources';
import { objectWithDefaults } from 'kolibri.utils.objectSpecs';
import { ExerciseResource, QuizQuestion } from '../src/composables/quizCreationSpecs.js';
import { useQuizCreation } from '../src/composables/useQuizCreation.js';

const {
  // Methods
  updateSection,
  // replaceSelectedQuestions,
  addSection,
  removeSection,
  setActiveSection,
  initializeQuiz,
  updateQuiz,
  addQuestionToSelection,
  removeQuestionFromSelection,
  saveQuiz,

  // Computed
  channels,
  quiz,
  allSections,
  activeSection,
  // activeExercisePool,
  activeQuestions,
  selectedActiveQuestions,
  // replacementQuestionPool,
} = useQuizCreation();

const _channel = { root: 'channel_1', name: 'Channel 1', kind: 'channel', is_leaf: false };
ChannelResource.fetchCollection = jest.fn(() => Promise.resolve([_channel]));
ExamResource.saveModel = jest.fn(() => Promise.resolve());

/**
 * @param num {number} - The number of questions to create
 * @param overrides {object} - Any overrides to apply to the default question
 */
function generateQuestions(num = 0) {
  const qs = [];
  for (let i = 0; i < num; i++) {
    const question = objectWithDefaults({ question_id: i, counter_in_exercise: i }, QuizQuestion);
    qs.push(question);
  }
  return qs;
}

/** @param numQuestions {number} - The number of questions to create within the exercise
 *  @returns {Exercise} - An exercise with the given number of questions
 *  A helper function to mock an exercise with a given number of questions (for `resource_pool`)
 */
function generateExercise(numQuestions) {
  const exercise = objectWithDefaults({ resource_id: 'exercise_1' }, ExerciseResource);
  exercise.questions = generateQuestions(numQuestions);
  return exercise;
}

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
      it('Can save the quiz', () => {
        expect(() => saveQuiz()).not.toThrow();
        expect(ExamResource.saveModel).toHaveBeenCalled();
      });

      it('Can update the quiz given a subset of valid properties', () => {
        const newTitle = 'New Title';
        updateQuiz({ title: newTitle });
        expect(get(quiz).title).toEqual(newTitle);
      });

      it('Throws a TypeError if the given updates are not a valid Quiz object', () => {
        expect(() => updateQuiz({ title: 1, question_sources: 'hi' })).toThrow(TypeError);
      });

      it('Can add a new section to the quiz', () => {
        expect(get(allSections)).toHaveLength(1);
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

      it('Will update `questions` to match `question_count` property when it is changed', () => {
        // Setup a mock exercise w/ some questions; update the activeSection with their values
        const exercise = generateExercise(10);
        const questions = exercise.questions;
        updateSection({
          section_id: get(activeSection).section_id,
          questions,
          resource_pool: [exercise],
        });
        expect(get(activeQuestions)).toHaveLength(questions.length);
        expect(get(activeQuestions).length).not.toEqual(0);
        expect(get(activeSection).resource_pool).toHaveLength(1);

        // Now let's change the question count and see if the questions array is updated
        const newQuestionCount = 5;
        updateSection({
          section_id: get(activeSection).section_id,
          question_count: newQuestionCount,
        });
        // Now questions should only be as long as newQuestionCount
        expect(get(activeQuestions)).toHaveLength(newQuestionCount);
        // And it should have split it into head & tail and kept the head so indexes 0 and 4 ought
        // to be the same as the first and last questions in the updated questions array
        expect(get(activeQuestions)[0].question_id).toEqual(questions[0].question_id);
        expect(get(activeQuestions)[4].question_id).toEqual(questions[4].question_id);

        const newQuestionCount2 = 10;
        updateSection({
          section_id: get(activeSection).section_id,
          question_count: newQuestionCount2,
        });
        expect(get(activeQuestions)).toHaveLength(newQuestionCount2);
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
