import { nextTick } from 'vue';
import { get } from '@vueuse/core';
import ExamResource from 'kolibri-common/apiResources/ExamResource';
import { objectWithDefaults } from 'kolibri/utils/objectSpecs';
import { MAX_QUESTIONS_PER_QUIZ_SECTION } from 'kolibri/constants';
import { QuizExercise, QuizQuestion } from '../src/composables/quizCreationSpecs.js';
import useQuizCreation from '../src/composables/useQuizCreation.js';

ExamResource.saveModel = jest.fn(() => Promise.resolve({}));

const VALID_EXERCISE_ID = 'af26e1b4f3b94f3e8f4f3b4f3e8f4f3a';

/**
 * @param num {number} - The number of questions to create
 * @param overrides {object} - Any overrides to apply to the default question
 */
function generateQuestions(num = 0) {
  const qs = [];
  for (let i = 0; i < num; i++) {
    const question = objectWithDefaults(
      {
        question_id: String(i),
        counter_in_exercise: i,
        exercise_id: VALID_EXERCISE_ID,
        item: `${VALID_EXERCISE_ID}:${i}`,
      },
      QuizQuestion,
    );
    qs.push(question);
  }
  return qs;
}

/** @param numQuestions {number} - The number of questions to create within the exercise
 *  @returns {Exercise} - An exercise with the given number of questions
 *  A helper function to mock an exercise with a given number of questions (for `resource_pool`)
 */
function generateExercise(numQuestions) {
  const assessments = generateQuestions(numQuestions);
  const assessmentmetadata = { assessment_item_ids: assessments.map(q => q.question_id) };
  const exercise = objectWithDefaults(
    {
      id: VALID_EXERCISE_ID,
      content_id: VALID_EXERCISE_ID,
      assessmentmetadata,
    },
    QuizExercise,
  );
  return exercise;
}

describe('useQuizCreation', () => {
  let updateSection,
    addQuestionsToSectionFromResources,
    addSection,
    removeSection,
    initializeQuiz,
    updateQuiz,
    addQuestionToSelection,
    removeQuestionFromSelection,
    saveQuiz,
    quiz,
    allSections,
    activeSectionIndex,
    activeSection,
    activeQuestions,
    selectedActiveQuestions;
  beforeEach(() => {
    ({
      // Methods
      updateSection,
      addQuestionsToSectionFromResources,
      // replaceSelectedQuestions,
      addSection,
      removeSection,
      initializeQuiz,
      updateQuiz,
      addQuestionToSelection,
      removeQuestionFromSelection,
      saveQuiz,

      // Computed
      quiz,
      allSections,
      activeSectionIndex,
      activeSection,
      activeQuestions,
      selectedActiveQuestions,
      // replacementQuestionPool,
    } = useQuizCreation());
    initializeQuiz();
  });
  describe('Quiz initialization', () => {
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
        removeSection(1);
        expect(get(allSections)).toHaveLength(1);
        expect(
          get(allSections).find(s => s.section_id === addedSection.section_id),
        ).toBeUndefined();
      });

      it('Can update any section', () => {
        const addedSection = addSection();
        const newTitle = 'New Title';
        updateSection({ sectionIndex: 1, section_title: newTitle });
        expect(
          get(allSections).find(s => s.section_id === addedSection.section_id).section_title,
        ).toEqual(newTitle);
      });

      it('addQuestionsToSectionFromResources will add the right number of `questions` from a resource pool', async () => {
        // Setup a mock exercise w/ some questions; update the activeSection with their values
        const exercise = generateExercise(20);
        addQuestionsToSectionFromResources({
          sectionIndex: get(activeSectionIndex),
          resourcePool: [exercise],
          questionCount: 10,
        });
        await nextTick();
        expect(get(activeQuestions).length).toEqual(10);

        // Now let's change the question count and see if the questions array is updated
        const newQuestionCount = 5;
        addQuestionsToSectionFromResources({
          sectionIndex: get(activeSectionIndex),
          resourcePool: [exercise],
          questionCount: newQuestionCount,
        });
        await nextTick();
        // Now questions should only be as long as 10 + newQuestionCount
        expect(get(activeQuestions)).toHaveLength(10 + newQuestionCount);

        // Should max out at the number of questions in the exercise
        // even if we try to add more.
        const newQuestionCount2 = 10;
        addQuestionsToSectionFromResources({
          sectionIndex: get(activeSectionIndex),
          resourcePool: [exercise],
          questionCount: newQuestionCount2,
        });
        await nextTick();
        expect(get(activeQuestions)).toHaveLength(20);
      });

      it('updateSection throws a TypeError if trying to update a section with a bad section shape', () => {
        expect(() => updateSection({ sectionIndex: null, title: 1 })).toThrow(TypeError);
      });
      it('addQuestionsToSectionFromResources throws a TypeError if trying to update a section with more questions than MAX_QUESTIONS_PER_QUIZ_SECTION', () => {
        const exercise = generateExercise(MAX_QUESTIONS_PER_QUIZ_SECTION + 1);
        expect(() =>
          addQuestionsToSectionFromResources({
            sectionIndex: get(activeSectionIndex),
            resourcePool: [exercise],
            questionCount: MAX_QUESTIONS_PER_QUIZ_SECTION + 1,
          }),
        ).toThrow(TypeError);
      });
      it('updateSection throws a TypeError if questions is not an array', () => {
        expect(() =>
          updateSection({ sectionIndex: get(activeSectionIndex), questions: 1 }),
        ).toThrow(TypeError);
      });
      it('updateSection throws a TypeError if questions is not an array of QuizQuestions', () => {
        expect(() =>
          updateSection({ sectionIndex: get(activeSectionIndex), questions: [1, 2, 3] }),
        ).toThrow(TypeError);
      });
    });

    describe('Question list (de)selection', () => {
      beforeEach(() => {
        const questions = generateQuestions(3);
        updateSection({ sectionIndex: get(activeSectionIndex), questions });
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
        const questions = generateQuestions(3);
        updateSection({ sectionIndex: get(activeSectionIndex), questions });
      });
      it('Can give a list of questions in the exercise pool but not in the selected questions', () => {});
    });
  });
});
