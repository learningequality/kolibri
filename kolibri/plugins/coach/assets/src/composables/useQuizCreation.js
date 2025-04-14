import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
import uniq from 'lodash/uniq';
import shuffled from 'kolibri-common/utils/shuffled.js';
import { MAX_QUESTIONS_PER_QUIZ_SECTION } from 'kolibri/constants';
import ExamResource from 'kolibri-common/apiResources/ExamResource';
import { validateObject, objectWithDefaults } from 'kolibri/utils/objectSpecs';
import { get, set } from '@vueuse/core';
import { computed, ref, provide, inject, getCurrentInstance, watch } from 'vue';
import { fetchExamWithContent } from 'kolibri-common/quizzes/utils';
// TODO: Probably move this to this file's local dir
import selectQuestions, { exerciseToQuestionArray } from '../utils/selectQuestions.js';
import { Quiz, QuizSection, QuizQuestion } from './quizCreationSpecs.js';

/** Validators **/
/* objectSpecs expects every property to be available -- but we don't want to have to make an
 * object with every property just to validate it. So we use these functions to validate subsets
 * of the properties. */

function validateQuiz(quiz) {
  return validateObject(quiz, Quiz);
}

const fieldsToSave = [
  'title',
  'assignments',
  'learner_ids',
  'collection',
  'learners_see_fixed_order',
  'instant_report_visibility',
  'draft',
  'active',
  'archive',
];

/**
 * Composable function presenting primary interface for Quiz Creation
 */
export default function useQuizCreation() {
  const store = getCurrentInstance()?.proxy?.$store;
  // -----------
  // Local state
  // -----------

  const quizHasChanged = ref(false);

  /** @type {ref<Quiz>}
   * The "source of truth" quiz object from which all reactive properties should derive
   * This will be validated and sent to the API when the user saves the quiz */
  const _quiz = ref(objectWithDefaults({}, Quiz));

  /** @type {ref<QuizSection>}
   * The section that is currently selected for editing */
  const activeSectionIndex = computed(() => Number(store?.state?.route?.params?.sectionIndex || 0));

  /** @type {ref<String[]>}
   * The QuizQuestion.items that are currently selected for action in the active section */
  const _selectedQuestionIds = ref([]);

  // An internal map for exercises
  // used to cache state for exercises so we can avoid fetching them multiple times
  // and have them available for quick access in active section resource pools and the like.
  const _exerciseMap = {};

  /**
   * Question item to be replaced in the next save operation
   */
  const _questionItemsToReplace = ref(null);

  function setQuestionItemsToReplace(item) {
    set(_questionItemsToReplace, item);
  }

  const questionItemsToReplace = computed(() => get(_questionItemsToReplace));

  // ------------------
  // Section Management
  // ------------------

  /**
   * @param   {QuizSection} section
   * @returns {QuizSection}
   * @affects _quiz - Updates the section with the given sectionIndex with the given param
   * @throws {TypeError} if section is not a valid QuizSection
   **/
  function updateSection({ sectionIndex, ...updates }) {
    set(quizHasChanged, true);
    const targetSection = get(allSections)[sectionIndex];
    if (!targetSection) {
      throw new TypeError(`Section with id ${sectionIndex} not found; cannot be updated.`);
    }

    const { questions, resourcePool } = updates;

    if (questions) {
      if (!Array.isArray(questions)) {
        throw new TypeError('Questions must be an array');
      }
      if (questions.length > MAX_QUESTIONS_PER_QUIZ_SECTION) {
        throw new TypeError(
          `Questions array must not exceed ${MAX_QUESTIONS_PER_QUIZ_SECTION} items`,
        );
      }
      if (questions.some(q => !validateObject(q, QuizQuestion))) {
        throw new TypeError('Questions must be valid QuizQuestion objects');
      }
    }

    if (resourcePool) {
      // Update the exercise map with the new resource pool
      // Add these resources to our cache
      for (const exercise of resourcePool) {
        _exerciseMap[exercise.id] = exercise;
      }
      delete updates.resourcePool;
    }

    const _allSections = get(allSections);

    set(_quiz, {
      ...get(quiz),
      // Update matching QuizSections with the updates object
      question_sources: [
        ..._allSections.slice(0, sectionIndex),
        { ...targetSection, ...updates },
        ..._allSections.slice(sectionIndex + 1),
      ],
    });
  }

  function addQuestionsToSectionFromResources({ sectionIndex, resourcePool, questionCount }) {
    const targetSection = get(allSections)[sectionIndex];
    if (!targetSection) {
      throw new TypeError(`Section with id ${sectionIndex} not found; cannot be updated.`);
    }

    if (!resourcePool || resourcePool.length === 0) {
      throw new TypeError('Resource pool must be a non-empty array of resources');
    }

    if (!questionCount || questionCount < 1) {
      throw new TypeError('Question count must be a positive integer');
    }

    const newQuestions = selectQuestions(
      questionCount,
      resourcePool,
      // Seed the random number generator with a random number
      Math.floor(Math.random() * 1000),
      // Exclude the questions that are already in the entire quiz
      get(allQuestionsInQuiz).map(q => q.item),
    );

    const questions = [...targetSection.questions, ...newQuestions];

    updateSection({ sectionIndex, questions, resourcePool });
  }

  /**
   * Replace `questionItemsToReplace` questions in the `baseQuestions` array with the
   * `replacements` questions
   * @param {Array<Question>} baseQuestions base questions array
   * @param {Array<string>} questionItemsToReplace question items to replace
   * @param {Array<Question>} replacements array of questions to replace the question items
   * @returns
   */
  function _replaceQuestions(baseQuestions, questionItemsToReplace, replacements) {
    if (questionItemsToReplace.length !== replacements.length) {
      throw new TypeError(
        'The number of question items to replace must match the number of replacements',
      );
    }
    const newQuestions = baseQuestions.map(question => {
      if (questionItemsToReplace.includes(question.item)) {
        return replacements.shift();
      }
      return question;
    });
    return newQuestions;
  }

  /**
   * Add an array of questions to a section
   * @param {Object} options
   * @param {number} options.sectionIndex - The index of the section to add the questions to
   * @param {QuizQuestion[]} options.questions - The questions array to add
   * @param {QuizExercise[]} options.resources - The resources to add to the exercise map
   */
  function addQuestionsToSection({ sectionIndex, questions, resources, questionItemsToReplace }) {
    const targetSection = get(allSections)[sectionIndex];
    if (!targetSection) {
      throw new TypeError(`Section with id ${sectionIndex} not found; cannot be updated.`);
    }

    if (!questions || questions.length === 0) {
      throw new TypeError('Questions must be a non-empty array of questions');
    }

    const newQuestions = questions.filter(
      q => !targetSection.questions.map(q => q.item).includes(q.item),
    );

    let questionsToAdd;
    if (questionItemsToReplace?.length) {
      questionsToAdd = _replaceQuestions(
        targetSection.questions,
        questionItemsToReplace,
        newQuestions,
      );
    } else {
      questionsToAdd = [...targetSection.questions, ...newQuestions];
    }

    updateSection({ sectionIndex, questions: questionsToAdd, resourcePool: resources });
  }

  /** @returns {QuizSection}
   * Adds a section to the quiz and returns it */
  function addSection() {
    const newSection = objectWithDefaults({}, QuizSection);
    updateQuiz({ question_sources: [...get(quiz).question_sources, newSection] });
    return newSection;
  }

  /**
   * @throws {Error} if section not found
   * Deletes the given section by sectionIndex */
  function removeSection(sectionIndex) {
    if (!get(allSections)[sectionIndex]) {
      throw new Error(`Section with index ${sectionIndex} not found; cannot be removed.`);
    }
    const updatedSections = get(allSections)
      .slice(0, sectionIndex)
      .concat(get(allSections).slice(sectionIndex + 1));
    updateQuiz({ question_sources: updatedSections });
    if (get(allSections).length === 0) {
      // Always need to have at least one section
      addSection();
    }
  }

  watch(activeSectionIndex, () => {
    // Clear the selected questions when changing sections
    set(_selectedQuestionIds, []);
  });
  // ------------
  // Quiz General
  // ------------

  /** @affects _quiz
   * @affects activeSectionIndex
   * @param {string} collection - The collection (aka current class ID) to associate the exam with
   * Adds a new section to the quiz and sets the activeSectionID to it, preparing the module for
   * use */

  async function initializeQuiz(collection, quizId = 'new') {
    if (quizId === 'new') {
      const assignments = [collection];
      set(_quiz, objectWithDefaults({ collection, assignments }, Quiz));
      addSection();
    } else {
      const exam = await ExamResource.fetchModel({ id: quizId });
      const { exam: quiz, exercises } = await fetchExamWithContent(exam);
      // Put the exercises into the local cache
      for (const exercise of exercises) {
        _exerciseMap[exercise.id] = exercise;
      }
      set(_quiz, objectWithDefaults(quiz, Quiz));
      if (get(allSections).length === 0) {
        addSection();
      }
    }
    set(quizHasChanged, false);
  }

  /**
   * @returns {Promise<Quiz>}
   */
  function saveQuiz() {
    if (!validateQuiz(get(_quiz))) {
      return Promise.reject(`Quiz is not valid: ${JSON.stringify(get(_quiz))}`);
    }

    const quizData = get(_quiz);

    const id = quizData.id;

    const finalQuiz = {};

    for (const field of fieldsToSave) {
      finalQuiz[field] = quizData[field];
    }

    if (finalQuiz.draft) {
      const questionSourcesWithoutResourcePool = get(allSections).map(section => {
        const sectionToSave = { ...section };
        delete sectionToSave.section_id;
        sectionToSave.questions = section.questions.map(question => {
          const questionToSave = { ...question };
          delete questionToSave.item;
          return questionToSave;
        });
        return sectionToSave;
      });
      finalQuiz.question_sources = questionSourcesWithoutResourcePool;
    }

    return ExamResource.saveModel({ id, data: finalQuiz }).then(exam => {
      if (id !== exam.id) {
        updateQuiz({ id: exam.id });
      }
      // Update quizHasChanged to false once we have saved the quiz
      set(quizHasChanged, false);
      return exam;
    });
  }

  /**
   * @param  {Quiz} updates
   * @throws {TypeError} if updates is not a valid Quiz object
   * @affects _quiz
   * Validates the input type and then updates _quiz with the given updates */
  function updateQuiz(updates) {
    set(quizHasChanged, true);
    if (!validateQuiz(updates)) {
      throw new TypeError(`Updates are not a valid Quiz object: ${JSON.stringify(updates)}`);
    }
    set(_quiz, { ...get(_quiz), ...updates });
  }

  // --------------------------------
  // Questions / Exercises management
  // --------------------------------

  /** @param {QuizQuestion[]} questions
   * @affects _selectedQuestionIds - Adds question to _selectedQuestionIds if it isn't
   * there already */
  function addQuestionsToSelection(ids) {
    set(_selectedQuestionIds, uniq([...get(_selectedQuestionIds), ...ids]));
  }

  /**
   * @param {QuizQuestion[]} questions
   * @affects _selectedQuestionIds - Removes question from _selectedQuestionIds if it is there */
  function removeQuestionsFromSelection(ids) {
    set(
      _selectedQuestionIds,
      get(_selectedQuestionIds).filter(_id => !ids.includes(_id)),
    );
  }

  function clearSelectedQuestions() {
    set(_selectedQuestionIds, []);
  }

  // Utilities

  // Computed properties
  /** @type {ComputedRef<Quiz>} The value of _quiz */
  const quiz = computed(() => get(_quiz));
  /** @type {ComputedRef<QuizSection[]>} The value of _quiz's `question_sources` */
  const allSections = computed(() => get(quiz).question_sources);
  /** @type {ComputedRef<QuizSection>} The active section */
  const activeSection = computed(() => get(allSections)[get(activeSectionIndex)]);
  /** @type {ComputedRef<QuizSection[]>} The inactive sections */
  const inactiveSections = computed(() =>
    get(allSections)
      .slice(0, get(activeSectionIndex))
      .concat(get(allSections).slice(get(activeSectionIndex) + 1)),
  );

  /** @type {ComputedRef<QuizQuestion[]>} All questions in the active section's `questions` property
   *                                      those which are currently set to be used in the section */
  const activeQuestions = computed(() => get(activeSection)?.questions || []);

  /** @type {ComputedRef<Object.<string, QuizExercise>>}
   * A map of exercise id to exercise for the currently active section */
  const activeResourceMap = computed(() => {
    const map = {};
    for (const question of get(activeQuestions)) {
      if (!map[question.exercise_id]) {
        map[question.exercise_id] = _exerciseMap[question.exercise_id];
      }
    }
    return map;
  });

  const allResourceMap = computed(() => {
    // Check the quiz value, so that our computed property is reactive to changes in the quiz
    // as the _exerciseMap is not reactive, but is only updated when the quiz is updated
    return _quiz.value && _exerciseMap;
  });

  /** @type {ComputedRef<QuizExercise[]>}   The active section's exercises */
  const activeResourcePool = computed(() => Object.values(get(activeResourceMap)));

  /** @type {ComputedRef<String[]>}
   * All QuizQuestion.items the user selected for the active section */
  const selectedActiveQuestions = computed(() => get(_selectedQuestionIds));

  /** @type {ComputedRef<Array<QuizQuestion>>} A list of all questions in the quiz */
  const allQuestionsInQuiz = computed(() => {
    return get(allSections).reduce((acc, section) => {
      acc = [...acc, ...section.questions];
      return acc;
    }, []);
  });

  const allSectionsEmpty = computed(() => {
    return get(allSections).every(section => section.questions.length === 0);
  });

  /**

   */
  function deleteActiveSelectedQuestions() {
    const sectionIndex = get(activeSectionIndex);
    const { questions: section_questions } = get(activeSection);
    const selectedIds = get(selectedActiveQuestions);
    const questions = section_questions.filter(q => !selectedIds.includes(q.item));
    updateSection({
      sectionIndex,
      questions,
    });
    set(_selectedQuestionIds, []);
  }

  const noQuestionsSelected = computed(() => get(selectedActiveQuestions).length === 0);
  /** @type {ComputedRef<String>} The label that should be shown alongside the "Select all" checkbox
   */
  const selectAllLabel = computed(() => {
    if (get(noQuestionsSelected)) {
      const { selectAllLabel$ } = enhancedQuizManagementStrings;
      return selectAllLabel$();
    } else {
      const { numberOfSelectedQuestions$ } = enhancedQuizManagementStrings;
      return numberOfSelectedQuestions$({ count: get(selectedActiveQuestions).length });
    }
  });

  /**
   * Map of exercise id to array of question items that are not used for each exercise
   * @type {ComputedRef<Object.<string, string[]>>}
   */
  const activeExercisesUnusedQuestionsMap = computed(() => {
    const map = {};
    for (const exercise of Object.values(get(activeResourceMap))) {
      const unusedQuestions = exercise.assessmentmetadata.assessment_item_ids
        .map(aid => `${exercise.id}:${aid}`)
        .filter(qid => !get(allQuestionsInQuiz).find(q => q.item === qid));
      map[exercise.id] = unusedQuestions;
    }
    return map;
  });

  /**
   * Method to replace questions in `questionItems` with new questions selected from
   * the unused questions of the exercises that each question belongs to.
   * @param {Array<string>} questionItems
   * @throws {Error} If there are no enough unused questions in the exercise to replace a question
   */
  function autoReplaceQuestions(questionItems = []) {
    if (!questionItems?.length) {
      return;
    }
    const questionsToReplace = questionItems
      .map(questionItem => get(activeQuestions).find(q => q.item === questionItem))
      .filter(Boolean);
    const exercises = uniq(questionsToReplace.map(q => q.exercise_id));

    const shuffledExercisesUnusedQuestionsMap = {};
    exercises.forEach(exerciseId => {
      const unusedQuestions = get(activeExercisesUnusedQuestionsMap)[exerciseId];
      if (!unusedQuestions?.length) {
        throw new Error(`No unused questions found for exercise ${exerciseId}`);
      }
      const shuffledQuestionItems = shuffled(unusedQuestions);
      const exerciseQuestions = exerciseToQuestionArray(_exerciseMap[exerciseId]);
      const shuffledQuestions = shuffledQuestionItems.map(item =>
        exerciseQuestions.find(q => q.item === item),
      );
      shuffledExercisesUnusedQuestionsMap[exerciseId] = shuffledQuestions;
    });

    const newQuestions = questionsToReplace.map(question => {
      const exerciseId = question.exercise_id;
      const unusedQuestions = shuffledExercisesUnusedQuestionsMap[exerciseId];
      const newQuestion = unusedQuestions.pop();
      if (!newQuestion) {
        throw new Error(`No enough unused questions found for exercise ${exerciseId}`);
      }
      return newQuestion;
    });

    const questionItemsToReplace = questionsToReplace.map(q => q.item);
    const baseQuestions = get(activeQuestions);

    const questionsToAdd = _replaceQuestions(baseQuestions, questionItemsToReplace, newQuestions);
    updateSection({ sectionIndex: get(activeSectionIndex), questions: questionsToAdd });
  }

  provide('allQuestionsInQuiz', allQuestionsInQuiz);
  provide('updateSection', updateSection);
  provide('addQuestionsToSection', addQuestionsToSection);
  provide('addQuestionsToSectionFromResources', addQuestionsToSectionFromResources);
  provide('addSection', addSection);
  provide('removeSection', removeSection);
  provide('updateQuiz', updateQuiz);
  provide('addQuestionsToSelection', addQuestionsToSelection);
  provide('removeQuestionsFromSelection', removeQuestionsFromSelection);
  provide('clearSelectedQuestions', clearSelectedQuestions);
  provide('allSections', allSections);
  provide('activeSectionIndex', activeSectionIndex);
  provide('activeSection', activeSection);
  provide('activeSectionIndex', activeSectionIndex);
  provide('inactiveSections', inactiveSections);
  provide('activeResourcePool', activeResourcePool);
  provide('activeResourceMap', activeResourceMap);
  provide('allResourceMap', allResourceMap);
  provide('activeQuestions', activeQuestions);
  provide('selectedActiveQuestions', selectedActiveQuestions);
  provide('deleteActiveSelectedQuestions', deleteActiveSelectedQuestions);
  provide('questionItemsToReplace', questionItemsToReplace);
  provide('setQuestionItemsToReplace', setQuestionItemsToReplace);
  provide('autoReplaceQuestions', autoReplaceQuestions);
  provide('activeExercisesUnusedQuestionsMap', activeExercisesUnusedQuestionsMap);

  return {
    // Methods
    saveQuiz,
    updateSection,
    addQuestionsToSectionFromResources,
    addSection,
    removeSection,
    initializeQuiz,
    updateQuiz,
    addQuestionsToSelection,
    removeQuestionsFromSelection,
    setQuestionItemsToReplace,

    // Computed
    quizHasChanged,
    quiz,
    allSections,
    activeSectionIndex,
    activeSection,
    inactiveSections,
    activeResourcePool,
    activeResourceMap,
    activeQuestions,
    selectedActiveQuestions,
    selectAllLabel,
    allSectionsEmpty,
    noQuestionsSelected,
    allQuestionsInQuiz,
  };
}

export function injectQuizCreation() {
  const allQuestionsInQuiz = inject('allQuestionsInQuiz');
  const updateSection = inject('updateSection');
  const addQuestionsToSection = inject('addQuestionsToSection');
  const addQuestionsToSectionFromResources = inject('addQuestionsToSectionFromResources');
  const addSection = inject('addSection');
  const removeSection = inject('removeSection');
  const updateQuiz = inject('updateQuiz');
  const addQuestionsToSelection = inject('addQuestionsToSelection');
  const removeQuestionsFromSelection = inject('removeQuestionsFromSelection');
  const clearSelectedQuestions = inject('clearSelectedQuestions');
  const allSections = inject('allSections');
  const activeSectionIndex = inject('activeSectionIndex');
  const activeSection = inject('activeSection');
  const inactiveSections = inject('inactiveSections');
  const activeResourcePool = inject('activeResourcePool');
  const activeResourceMap = inject('activeResourceMap');
  const allResourceMap = inject('allResourceMap');
  const activeQuestions = inject('activeQuestions');
  const selectedActiveQuestions = inject('selectedActiveQuestions');
  const deleteActiveSelectedQuestions = inject('deleteActiveSelectedQuestions');
  const questionItemsToReplace = inject('questionItemsToReplace');
  const setQuestionItemsToReplace = inject('setQuestionItemsToReplace');
  const autoReplaceQuestions = inject('autoReplaceQuestions');
  const activeExercisesUnusedQuestionsMap = inject('activeExercisesUnusedQuestionsMap');

  return {
    // Methods
    deleteActiveSelectedQuestions,
    updateSection,
    addQuestionsToSection,
    addQuestionsToSectionFromResources,
    addSection,
    removeSection,
    updateQuiz,
    clearSelectedQuestions,
    addQuestionsToSelection,
    removeQuestionsFromSelection,
    setQuestionItemsToReplace,
    autoReplaceQuestions,

    // Computed
    allQuestionsInQuiz,
    allSections,
    activeSectionIndex,
    activeSection,
    inactiveSections,
    activeResourcePool,
    activeResourceMap,
    allResourceMap,
    activeQuestions,
    selectedActiveQuestions,
    questionItemsToReplace,
    activeExercisesUnusedQuestionsMap,
  };
}
