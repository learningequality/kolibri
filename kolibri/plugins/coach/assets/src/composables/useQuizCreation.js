import isEqual from 'lodash/isEqual';
import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
import uniq from 'lodash/uniq';
import { ExamResource } from 'kolibri.resources';
import { validateObject, objectWithDefaults } from 'kolibri.utils.objectSpecs';
import { get, set } from '@vueuse/core';
import {
  computed,
  ref,
  provide,
  inject,
  getCurrentInstance,
  watch,
} from 'kolibri.lib.vueCompositionApi';
import { fetchExamWithContent } from 'kolibri.utils.exams';
// TODO: Probably move this to this file's local dir
import selectQuestions from '../utils/selectQuestions.js';
import { Quiz, QuizSection } from './quizCreationSpecs.js';

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
   * The QuizQuestion.id's that are currently selected for action in the active section */
  const _selectedQuestionIds = ref([]);

  /** @type {ref<Array>} A list of all Question objects selected for replacement */
  const replacements = ref([]);

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

    // original variables are the original values of the properties we're updating
    const {
      resource_pool: originalResourcePool,
      questions: originalQuestions,
      question_count: originalQuestionCount,
    } = targetSection;

    const { question_count, questions } = updates;

    if (questions && question_count) {
      throw new TypeError(
        'Cannot update both `questions` and `question_count` at the same time; use one or the other.'
      );
    }

    if (question_count) {
      // The question_count is so we need to update the selected resources
      if (question_count > originalQuestionCount) {
        updates.questions = [
          ...originalQuestions,
          ...selectRandomQuestionsFromResources(
            question_count - originalQuestionCount,
            originalResourcePool
          ),
        ];
      } else if (question_count < originalQuestionCount) {
        updates.questions = originalQuestions.slice(0, question_count);
      }
    }

    if (questions) {
      // The questions are being updated
      // Set question_count to the length of the questions array
      updates.question_count = questions.length;
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

  function updateSectionResourcePool({ sectionIndex, resource_pool }) {
    const targetSection = get(allSections)[sectionIndex];
    if (!targetSection) {
      throw new TypeError(`Section with id ${sectionIndex} not found; cannot be updated.`);
    }

    // original variables are the original values of the properties we're updating
    const {
      resource_pool: originalResourcePool,
      questions: originalQuestions,
      question_count: originalQuestionCount,
    } = targetSection;

    const updates = { resource_pool };
    if (resource_pool?.length === 0) {
      // The user has removed all resources from the section, so we can clear all questions too
      updates.questions = [];
    }

    if (resource_pool?.length > 0) {
      // The resource_pool is being updated
      if (originalResourcePool.length === 0) {
        // We're adding resources to a section which didn't previously have any

        // TODO This code could be broken out into a separate functions

        // ***
        // Note that we're basically assuming that `questions*` properties aren't being updated --
        // meaning we expect that we can only update one or the other of `resource_pool` and
        // `questions*` at a time. We can safely assume this because there can't be questions
        // if there weren't resources in the originalResourcePool before.
        // ***
        updates.questions = selectRandomQuestionsFromResources(
          originalQuestionCount || 0,
          resource_pool
        );
      } else {
        // In this case, we already had resources in the section, so we need to handle the
        // case where a resource has been removed so that we remove & replace the questions
        const removedResourceQuestionIds = originalResourcePool.reduce(
          (questionIds, originalResource) => {
            if (!resource_pool.map(r => r.id).includes(originalResource.id)) {
              // If the resource_pool doesn't have the originalResource, we're removing it
              questionIds = [...questionIds, ...originalResource.unique_question_ids];
              return questionIds;
            }
            return questionIds;
          },
          []
        );
        if (removedResourceQuestionIds.length !== 0) {
          const questionsToKeep = originalQuestions.filter(
            q => !removedResourceQuestionIds.includes(q.item)
          );
          const numReplacementsNeeded = originalQuestionCount - questionsToKeep.length;
          updates.questions = [
            ...questionsToKeep,
            ...selectRandomQuestionsFromResources(numReplacementsNeeded, resource_pool),
          ];
        }
      }
    }
    updateSection({ sectionIndex, ...updates });
  }

  function handleReplacement() {
    const questions = activeQuestions.value.map(question => {
      if (selectedActiveQuestions.value.includes(question.id)) {
        return replacements.value.shift();
      }
      return question;
    });
    updateSection({
      sectionIndex: get(activeSectionIndex),
      questions,
    });
  }

  /**
   * @description Selects random questions from the active section's `resource_pool` - no side
   * effects
   * @param {Number} numQuestions
   * @param {QuizExercise[]} pool The resource pool to select questions from, will default to
   *  the activeResourcePool's value if not provided. This is useful if you need to select questions
   *  from a resource pool that hasn't been committed to the section yet.
   * @param {String[]} excludedIds A list of IDs to exclude from random selection
   * @returns {QuizQuestion[]}
   */
  function selectRandomQuestionsFromResources(numQuestions, pool = [], excludedIds = []) {
    pool = pool.length ? pool : get(activeResourcePool);
    const exerciseIds = pool.map(r => r.id);
    const exerciseTitles = pool.map(r => r.title);
    const questionIdArrays = pool.map(r => r.unique_question_ids);
    return selectQuestions(
      numQuestions,
      exerciseIds,
      exerciseTitles,
      questionIdArrays,
      Math.floor(Math.random() * 1000),
      [
        ...excludedIds,
        // Always exclude the questions that are already in the entire quiz
        ...get(allQuestionsInQuiz).map(q => q.item),
      ]
    );
  }

  /**
   * @param {QuizQuestion[]} newQuestions
   * @affects _quiz - Updates the active section's `questions` property
   * @affects _selectedQuestionIds - Clears this back to an empty array
   * @throws {TypeError} if newQuestions is not a valid array of QuizQuestions
   * Updates the active section's `questions` property with the given newQuestions, and clears
   * _selectedQuestionIds from it. Then it resets _selectedQuestionIds to an empty array */
  // TODO WRITE THIS FUNCTION
  function replaceSelectedQuestions(newQuestions) {
    return newQuestions;
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
      const exerciseMap = {};
      for (const exercise of exercises) {
        exerciseMap[exercise.id] = exercise;
      }
      quiz.question_sources = quiz.question_sources.map(section => {
        const resource_pool = uniq(section.questions.map(resource => resource.exercise_id))
          .map(exercise_id => exerciseMap[exercise_id])
          .filter(Boolean);
        return {
          ...section,
          resource_pool,
        };
      });
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
      // Here we update each section's `resource_pool` to only be the IDs of the resources
      const questionSourcesWithoutResourcePool = get(allSections).map(section => {
        const sectionToSave = { ...section };
        delete sectionToSave.resource_pool;
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

  /** @param {QuizQuestion} question
   * @affects _selectedQuestionIds - Adds question to _selectedQuestionIds if it isn't
   * there already */
  function addQuestionToSelection(id) {
    set(_selectedQuestionIds, uniq([...get(_selectedQuestionIds), id]));
  }

  /**
   * @param {QuizQuestion} question
   * @affects _selectedQuestionIds - Removes question from _selectedQuestionIds if it is there */
  function removeQuestionFromSelection(id) {
    set(
      _selectedQuestionIds,
      get(_selectedQuestionIds).filter(_id => id !== _id)
    );
  }

  function toggleQuestionInSelection(id) {
    if (get(_selectedQuestionIds).includes(id)) {
      removeQuestionFromSelection(id);
    } else {
      addQuestionToSelection(id);
    }
  }

  function clearSelectedQuestions() {
    set(_selectedQuestionIds, []);
  }

  function selectAllQuestions() {
    if (get(allQuestionsSelected)) {
      clearSelectedQuestions();
    } else {
      set(
        _selectedQuestionIds,
        get(activeQuestions).map(q => q.item)
      );
    }
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
      .concat(get(allSections).slice(get(activeSectionIndex) + 1))
  );
  /** @type {ComputedRef<QuizExercise[]>}   The active section's `resource_pool` */
  const activeResourcePool = computed(() => get(activeSection).resource_pool);
  /** @type {ComputedRef<QuizExercise[]>}   The active section's `resource_pool` */
  const activeResourceMap = computed(() =>
    get(activeResourcePool).reduce((acc, resource) => {
      acc[resource.id] = resource;
      return acc;
    }, {})
  );
  /** @type {ComputedRef<QuizQuestion[]>} All questions in the active section's `resource_pool`
   *                                      exercises */
  const activeQuestionsPool = computed(() => {
    const pool = get(activeResourcePool);
    const exerciseIds = pool.map(r => r.exercise_id);
    const exerciseTitles = pool.map(r => r.title);
    const questionIdArrays = pool.map(r => r.unique_question_ids);
    return selectQuestions(
      pool.reduce((acc, r) => acc + r.assessmentmetadata.assessment_item_ids.length, 0),
      exerciseIds,
      exerciseTitles,
      questionIdArrays,
      get(_quiz).seed
    );
  });
  /** @type {ComputedRef<QuizQuestion[]>} All questions in the active section's `questions` property
   *                                      those which are currently set to be used in the section */
  const activeQuestions = computed(() => get(activeSection).questions);
  /** @type {ComputedRef<String[]>} All QuizQuestion.ids the user selected for the active section */
  const selectedActiveQuestions = computed(() => get(_selectedQuestionIds));
  /** @type {ComputedRef<QuizQuestion[]>} Questions in the active section's `resource_pool` that
   *                                         are not in `questions` */
  const replacementQuestionPool = computed(() => {
    const excludedQuestions = get(allQuestionsInQuiz).map(q => q.item);
    return get(activeQuestionsPool).filter(q => !excludedQuestions.includes(q.item));
  });

  /** @type {ComputedRef<Array<QuizQuestion>>} A list of all questions in the quiz */
  const allQuestionsInQuiz = computed(() => {
    return get(allSections).reduce((acc, section) => {
      acc = [...acc, ...section.questions];
      return acc;
    }, []);
  });

  /** Handling the Select All Checkbox
   * See: remove/toggleQuestionFromSelection() & selectAllQuestions() for more */

  /** @type {ComputedRef<Boolean>} Whether all active questions are selected */
  const allQuestionsSelected = computed(() => {
    return Boolean(
      get(selectedActiveQuestions).length &&
        isEqual(
          get(selectedActiveQuestions).sort(),
          get(activeQuestions)
            .map(q => q.item)
            .sort()
        )
    );
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
    const question_count = questions.length;
    updateSection({
      sectionIndex,
      questions,
      question_count,
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

  /** @type {ComputedRef<Boolean>} Whether the select all checkbox should be indeterminate */
  const selectAllIsIndeterminate = computed(() => {
    return !get(allQuestionsSelected) && !get(noQuestionsSelected);
  });

  provide('allQuestionsInQuiz', allQuestionsInQuiz);
  provide('updateSection', updateSection);
  provide('updateSectionResourcePool', updateSectionResourcePool);
  provide('handleReplacement', handleReplacement);
  provide('replaceSelectedQuestions', replaceSelectedQuestions);
  provide('addSection', addSection);
  provide('removeSection', removeSection);
  provide('updateQuiz', updateQuiz);
  provide('addQuestionToSelection', addQuestionToSelection);
  provide('removeQuestionFromSelection', removeQuestionFromSelection);
  provide('clearSelectedQuestions', clearSelectedQuestions);
  provide('replacements', replacements);
  provide('allSections', allSections);
  provide('activeSectionIndex', activeSectionIndex);
  provide('activeSection', activeSection);
  provide('activeSectionIndex', activeSectionIndex);
  provide('inactiveSections', inactiveSections);
  provide('activeResourcePool', activeResourcePool);
  provide('activeResourceMap', activeResourceMap);
  provide('activeQuestionsPool', activeQuestionsPool);
  provide('activeQuestions', activeQuestions);
  provide('selectedActiveQuestions', selectedActiveQuestions);
  provide('allQuestionsSelected', allQuestionsSelected);
  provide('selectAllIsIndeterminate', selectAllIsIndeterminate);
  provide('replacementQuestionPool', replacementQuestionPool);
  provide('selectAllQuestions', selectAllQuestions);
  provide('deleteActiveSelectedQuestions', deleteActiveSelectedQuestions);
  provide('toggleQuestionInSelection', toggleQuestionInSelection);

  return {
    // Methods
    saveQuiz,
    updateSection,
    updateSectionResourcePool,
    handleReplacement,
    replaceSelectedQuestions,
    addSection,
    removeSection,
    initializeQuiz,
    updateQuiz,
    clearSelectedQuestions,
    addQuestionToSelection,
    removeQuestionFromSelection,

    // Computed
    quizHasChanged,
    replacements,
    quiz,
    allSections,
    activeSectionIndex,
    activeSection,
    inactiveSections,
    activeResourcePool,
    activeResourceMap,
    activeQuestionsPool,
    activeQuestions,
    selectedActiveQuestions,
    replacementQuestionPool,
    selectAllIsIndeterminate,
    selectAllLabel,
    allSectionsEmpty,
    allQuestionsSelected,
    noQuestionsSelected,
    allQuestionsInQuiz,
  };
}

export function injectQuizCreation() {
  const allQuestionsInQuiz = inject('allQuestionsInQuiz');
  const updateSection = inject('updateSection');
  const updateSectionResourcePool = inject('updateSectionResourcePool');
  const handleReplacement = inject('handleReplacement');
  const replaceSelectedQuestions = inject('replaceSelectedQuestions');
  const addSection = inject('addSection');
  const removeSection = inject('removeSection');
  const updateQuiz = inject('updateQuiz');
  const addQuestionToSelection = inject('addQuestionToSelection');
  const removeQuestionFromSelection = inject('removeQuestionFromSelection');
  const clearSelectedQuestions = inject('clearSelectedQuestions');
  const replacements = inject('replacements');
  const allSections = inject('allSections');
  const activeSectionIndex = inject('activeSectionIndex');
  const activeSection = inject('activeSection');
  const inactiveSections = inject('inactiveSections');
  const activeResourcePool = inject('activeResourcePool');
  const activeResourceMap = inject('activeResourceMap');
  const activeQuestionsPool = inject('activeQuestionsPool');
  const activeQuestions = inject('activeQuestions');
  const allQuestionsSelected = inject('allQuestionsSelected');
  const selectAllIsIndeterminate = inject('selectAllIsIndeterminate');
  const selectedActiveQuestions = inject('selectedActiveQuestions');
  const replacementQuestionPool = inject('replacementQuestionPool');
  const selectAllQuestions = inject('selectAllQuestions');
  const deleteActiveSelectedQuestions = inject('deleteActiveSelectedQuestions');
  const toggleQuestionInSelection = inject('toggleQuestionInSelection');

  return {
    // Methods
    deleteActiveSelectedQuestions,
    selectAllQuestions,
    updateSection,
    updateSectionResourcePool,
    handleReplacement,
    replaceSelectedQuestions,
    addSection,
    removeSection,
    updateQuiz,
    clearSelectedQuestions,
    addQuestionToSelection,
    removeQuestionFromSelection,
    toggleQuestionInSelection,

    // Computed
    allQuestionsSelected,
    allQuestionsInQuiz,
    selectAllIsIndeterminate,
    replacements,
    allSections,
    activeSectionIndex,
    activeSection,
    inactiveSections,
    activeResourcePool,
    activeResourceMap,
    activeQuestionsPool,
    activeQuestions,
    selectedActiveQuestions,
    replacementQuestionPool,
  };
}
