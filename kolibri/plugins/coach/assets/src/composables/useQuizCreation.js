import { v4 } from 'uuid';
import isEqual from 'lodash/isEqual';
import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
import uniq from 'lodash/uniq';
import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
import { ChannelResource, ExamResource } from 'kolibri.resources';
import { validateObject, objectWithDefaults } from 'kolibri.utils.objectSpecs';
import { get, set } from '@vueuse/core';
import { computed, ref, provide, inject } from 'kolibri.lib.vueCompositionApi';
import { fetchExamWithContent } from 'kolibri.utils.exams';
// TODO: Probably move this to this file's local dir
import selectQuestions from '../utils/selectQuestions.js';
import { Quiz, QuizSection } from './quizCreationSpecs.js';

function uuidv4() {
  return v4().replace(/-/g, '');
}

const { sectionLabel$ } = enhancedQuizManagementStrings;

function displaySectionTitle(section, index) {
  return section.section_title === ''
    ? sectionLabel$({ sectionNumber: index + 1 })
    : section.section_title;
}

/** Validators **/
/* objectSpecs expects every property to be available -- but we don't want to have to make an
 * object with every property just to validate it. So we use these functions to validate subsets
 * of the properties. */

function validateQuiz(quiz) {
  return validateObject(quiz, Quiz);
}

/**
 * Composable function presenting primary interface for Quiz Creation
 */
export default function useQuizCreation() {
  // -----------
  // Local state
  // -----------

  /** @type {ref<Quiz>}
   * The "source of truth" quiz object from which all reactive properties should derive
   * This will be validated and sent to the API when the user saves the quiz */
  const _quiz = ref(objectWithDefaults({}, Quiz));

  /** @type {ref<QuizSection>}
   * The section that is currently selected for editing */
  const _activeSectionId = ref(null);

  /** @type {ref<String[]>}
   * The QuizQuestion.id's that are currently selected for action in the active section */
  const _selectedQuestionIds = ref([]);

  /** @type {ref<Array>} A list of all channels available which have exercises */
  const _channels = ref([]);

  /** @type {ref<Array>} A list of all Question objects selected for replacement */
  const replacements = ref([]);

  // ------------------
  // Section Management
  // ------------------

  /**
   * @param   {QuizSection} section
   * @returns {QuizSection}
   * @affects _quiz - Updates the section with the given section_id with the given param
   * @throws {TypeError} if section is not a valid QuizSection
   **/
  function updateSection({ section_id, ...updates }) {
    const targetSection = get(allSections).find(section => section.section_id === section_id);
    if (!targetSection) {
      throw new TypeError(`Section with id ${section_id} not found; cannot be updated.`);
    }

    // original variables are the original values of the properties we're updating
    const {
      resource_pool: originalResourcePool,
      questions: originalQuestions,
      question_count: originalQuestionCount,
    } = targetSection;

    const { resource_pool, question_count } = updates;

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
          question_count || originalQuestionCount,
          resource_pool
        );
      } else {
        if (question_count === 0) {
          updates.questions = [];
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
              q => !removedResourceQuestionIds.includes(q.id)
            );
            const numReplacementsNeeded =
              (question_count || originalQuestionCount) - questionsToKeep.length;
            updates.questions = [
              ...questionsToKeep,
              ...selectRandomQuestionsFromResources(numReplacementsNeeded, resource_pool),
            ];
          }
        }
      }
    } else if (question_count !== originalQuestionCount) {
      /**
       * Handle edge cases re: questions and question_count changing. When the question_count
       * changes, we remove/add questions to match the new count. If questions are deleted, then
       * we will update question_count accordingly.
       **/

      // If the question count changed AND questions have changed, be sure they're the same length
      // or we can add questions to match the new question_count
      if (question_count < originalQuestionCount) {
        // If the question_count is being reduced, we need to remove any questions that are now
        // outside the bounds of the new question_count
        updates.questions = originalQuestions.slice(0, question_count);
      } else if (question_count > originalQuestionCount) {
        // If the question_count is being increased, we need to add new questions to the end of the
        // questions array
        const numQuestionsToAdd = question_count - originalQuestionCount;
        const newQuestions = selectRandomQuestionsFromResources(
          numQuestionsToAdd,
          originalResourcePool,
          originalQuestions.map(q => q.id) // Exclude questions we already have to avoid duplicates
        );
        updates.questions = [...targetSection.questions, ...newQuestions];
      }
    }

    set(_quiz, {
      ...get(quiz),
      // Update matching QuizSections with the updates object
      question_sources: get(allSections).map(section => {
        if (section.section_id === section_id) {
          return { ...section, ...updates };
        }
        return section;
      }),
    });
  }

  function handleReplacement() {
    const questions = activeQuestions.value.map(question => {
      if (selectedActiveQuestions.value.includes(question.id)) {
        return replacements.value.shift();
      }
      return question;
    });
    updateSection({
      section_id: activeSection.value.section_id,
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
      excludedIds
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
    const newSection = objectWithDefaults({ section_id: uuidv4() }, QuizSection);
    updateQuiz({ question_sources: [...get(quiz).question_sources, newSection] });
    setActiveSection(newSection.section_id);
    return newSection;
  }

  /**
   * @throws {Error} if section not found
   * Deletes the given section by section_id */
  function removeSection(section_id) {
    const updatedSections = get(allSections).filter(section => section.section_id !== section_id);
    if (updatedSections.length === get(allSections).length) {
      throw new Error(`Section with id ${section_id} not found; cannot be removed.`);
    }
    if (updatedSections.length === 0) {
      const newSection = addSection();
      setActiveSection(newSection.section_id);
      updatedSections.push(newSection);
    } else {
      setActiveSection(get(updatedSections)[0].section_id);
    }
    updateQuiz({ question_sources: updatedSections });
  }

  /**
   * @param {string} [section_id]
   * @affects _activeSectionId
   * Sets the given section_id as the active section ID, however, if the ID is not found or is null
   * it will set the activeId to the first section in _quiz.question_sources */
  function setActiveSection(section_id = null) {
    set(_activeSectionId, section_id);
  }

  // ------------
  // Quiz General
  // ------------

  /** @affects _quiz
   * @affects _activeSectionId
   * @affects _channels - Calls _fetchChannels to bootstrap the list of needed channels
   * @param {string} collection - The collection (aka current class ID) to associate the exam with
   * Adds a new section to the quiz and sets the activeSectionID to it, preparing the module for
   * use */

  async function initializeQuiz(collection, quizId = 'new') {
    _fetchChannels();
    if (quizId === 'new') {
      const assignments = [collection];
      set(_quiz, objectWithDefaults({ collection, assignments }, Quiz));
      const newSection = addSection();
      setActiveSection(newSection.section_id);
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
        const newSection = addSection();
        setActiveSection(newSection.section_id);
      } else {
        setActiveSection(get(allSections)[0].section_id);
      }
    }
  }

  /**
   * @returns {Promise<Quiz>}
   * @throws {Error} if quiz is not valid
   */
  function saveQuiz() {
    if (!validateQuiz(get(_quiz))) {
      throw new Error(`Quiz is not valid: ${JSON.stringify(get(_quiz))}`);
    }

    const id = get(_quiz).id;

    const finalQuiz = {
      title: get(_quiz).title,
      assignments: get(_quiz).assignments,
      learner_ids: get(_quiz).learner_ids,
      collection: get(_quiz).collection,
    };

    if (get(_quiz).draft) {
      // Here we update each section's `resource_pool` to only be the IDs of the resources
      const questionSourcesWithoutResourcePool = get(allSections).map(section => {
        const sectionToSave = { ...section };
        delete sectionToSave.resource_pool;
        sectionToSave.questions = section.questions.map(question => {
          const questionToSave = { ...question };
          delete questionToSave.item;
          return questionToSave;
        });
        return sectionToSave;
      });
      finalQuiz.question_sources = questionSourcesWithoutResourcePool;
    }

    return ExamResource.saveModel({ id, data: finalQuiz });
  }

  /**
   * @param  {Quiz} updates
   * @throws {TypeError} if updates is not a valid Quiz object
   * @affects _quiz
   * Validates the input type and then updates _quiz with the given updates */
  function updateQuiz(updates) {
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
        get(activeQuestions).map(q => q.id)
      );
    }
  }

  /**
   * @affects _channels - Fetches all channels with exercises and sets them to _channels */
  function _fetchChannels() {
    ChannelResource.fetchCollection({ params: { has_exercises: true, available: true } }).then(
      response => {
        set(
          _channels,
          response.map(chnl => {
            return {
              ...chnl,
              id: chnl.root,
              title: chnl.name,
              kind: ContentNodeKinds.CHANNEL,
              is_leaf: false,
            };
          })
        );
      }
    );
  }

  // Utilities

  // Computed properties
  /** @type {ComputedRef<Quiz>} The value of _quiz */
  const quiz = computed(() => get(_quiz));
  /** @type {ComputedRef<QuizSection[]>} The value of _quiz's `question_sources` */
  const allSections = computed(() => get(quiz).question_sources);
  /** @type {ComputedRef<QuizSection>} The active section */
  const activeSection = computed(() =>
    get(allSections).find(s => s.section_id === get(_activeSectionId))
  );
  /** @type {ComputedRef<QuizSection[]>} The inactive sections */
  const inactiveSections = computed(() =>
    get(allSections).filter(s => s.section_id !== get(_activeSectionId))
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
    const numQuestions = pool.reduce(
      (count, r) => count + r.assessmentmetadata.assessment_item_ids.length,
      0
    );
    const exerciseIds = pool.map(r => r.exercise_id);
    const exerciseTitles = pool.map(r => r.title);
    const questionIdArrays = pool.map(r => r.unique_question_ids);
    return selectQuestions(
      numQuestions,
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
    const activeQuestionIds = get(activeQuestions).map(q => q.id);
    return get(activeQuestionsPool).filter(q => !activeQuestionIds.includes(q.id));
  });
  /** @type {ComputedRef<Array>} A list of all channels available which have exercises */
  const channels = computed(() => get(_channels));

  /** Handling the Select All Checkbox
   * See: remove/toggleQuestionFromSelection() & selectAllQuestions() for more */

  /** @type {ComputedRef<Boolean>} Whether all active questions are selected */
  const allQuestionsSelected = computed(() => {
    return Boolean(
      get(selectedActiveQuestions).length &&
        isEqual(
          get(selectedActiveQuestions).sort(),
          get(activeQuestions)
            .map(q => q.id)
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
    const { section_id, questions: section_questions } = get(activeSection);
    const selectedIds = get(selectedActiveQuestions);
    const questions = section_questions.filter(q => !selectedIds.includes(q.id));
    const question_count = questions.length;
    updateSection({
      section_id,
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

  provide('updateSection', updateSection);
  provide('handleReplacement', handleReplacement);
  provide('replaceSelectedQuestions', replaceSelectedQuestions);
  provide('addSection', addSection);
  provide('removeSection', removeSection);
  provide('setActiveSection', setActiveSection);
  provide('updateQuiz', updateQuiz);
  provide('addQuestionToSelection', addQuestionToSelection);
  provide('removeQuestionFromSelection', removeQuestionFromSelection);
  provide('clearSelectedQuestions', clearSelectedQuestions);
  provide('channels', channels);
  provide('replacements', replacements);
  provide('allSections', allSections);
  provide('activeSection', activeSection);
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
    handleReplacement,
    replaceSelectedQuestions,
    addSection,
    removeSection,
    setActiveSection,
    initializeQuiz,
    updateQuiz,
    clearSelectedQuestions,
    addQuestionToSelection,
    removeQuestionFromSelection,
    displaySectionTitle,

    // Computed
    channels,
    replacements,
    quiz,
    allSections,
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
  };
}

export function injectQuizCreation() {
  const updateSection = inject('updateSection');
  const handleReplacement = inject('handleReplacement');
  const replaceSelectedQuestions = inject('replaceSelectedQuestions');
  const addSection = inject('addSection');
  const removeSection = inject('removeSection');
  const setActiveSection = inject('setActiveSection');
  const updateQuiz = inject('updateQuiz');
  const addQuestionToSelection = inject('addQuestionToSelection');
  const removeQuestionFromSelection = inject('removeQuestionFromSelection');
  const clearSelectedQuestions = inject('clearSelectedQuestions');
  const channels = inject('channels');
  const replacements = inject('replacements');
  const allSections = inject('allSections');
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
    handleReplacement,
    replaceSelectedQuestions,
    addSection,
    removeSection,
    setActiveSection,
    updateQuiz,
    clearSelectedQuestions,
    addQuestionToSelection,
    removeQuestionFromSelection,
    toggleQuestionInSelection,
    displaySectionTitle,

    // Computed
    allQuestionsSelected,
    selectAllIsIndeterminate,
    channels,
    replacements,
    allSections,
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
