import { validateObject, objectWithDefaults } from 'kolibri.utils.objectSpecs';
import { get, set } from '@vueuse/core';
import { computed, ref, onMounted } from 'kolibri.lib.vueCompositionApi';
import { Exercise, Quiz, QuizQuestion, QuizSection } from './quizCreationSpecs.js';

/*
 * Composable function presenting primary interface for Quiz Creation
 */
export function useQuizCreation() {
  // STATE

  /* @type {ref<Quiz>}
   * The "source of truth" quiz object from which all reactive properties should derive */
  const _quiz = ref(objectWithDefaults(Quiz));

  /* @type {ref<QuizSection>}
   * The section that is currently selected for editing */
  const _activeSectionId = ref(null);

  /* @type {ref<QuizQuestion[]>}
   * The questions that are currently selected for action in the active section */
  const _selectedQuestions = ref([]);

  // API

  // Section Management

  /* @param   {QuizSection} section
   * @returns {QuizSection}
   * @affects _quiz - Updates the section with the given section_id with the given param
   * @throws {TypeError} if section is not a valid QuizSection */
  function updateSection({ section_id, ...section }) {}

  /* @param {QuizQuestion[]} newQuestions
   * @affects _quiz - Updates the active section's `questions` property
   * @affects _selectedQuestions - Clears this back to an empty array
   * @throws {TypeError} if newQuestions is not a valid array of QuizQuestions
   * Updates the active section's `questions` property with the given newQuestions, and clears
   * _selectedQuestions from it. Then it resets _selectedQuestions to an empty array */
  function replaceSelectedQuestions(newQuestions) {}

  /* @returns {QuizSection}
   * Adds a section to the quiz and returns it*/
  function addSection() {}

  /* @throws {Error} if section not found
   * Deletes the given section by section_id */
  function removeSection(section_id) {}

  /* @param {string} [section_id]
   * @affects _activeSectionId
   * Sets the given section_id as the active section ID, however, if the ID is not found or is null
   * it will set the activeId to the first section in _quiz.question_sources */
  function setActiveSection(section_id = null) {}

  // Quiz Management

  /* @affects _quiz
   * @affects _activeSectionId
   * Adds a new section to the quiz and sets the activeSectionID to it, preparing the module for
   * use */
  function initializeQuiz() {}

  /* @param  {Quiz} updates
   * @throws {TypeError} if updates is not a valid Quiz object
   * @affects _quiz
   * Validates the input type and then updates _quiz with the given updates */
  function updateQuiz(updates) {}

  // Computed properties
  /* @returns {Quiz} The value of _quiz */
  const quiz = computed();
  /* @returns {QuizSection[]} The value of _quiz's `question_sources` */
  const allSections = computed();
  /* @returns {QuizSection} The active section */
  const activeSection = computed();
  /* @returns {Exercise[]} The active section's `exercise_pool` - that is, Exercises from which
   *                       we will enumerate all available questions */
  const activeExercisePool = computed();
  /* @returns {QuizQuestion[]} All questions in the active section's `questions` property,
   *                           those which are currently selected to be used in the section */
  const activeQuestions = computed();
  /* @returns {QuizQuestion[]} Questions in the active section's `exercise_pool` that are not in
   *                           `questions` */
  const replacementQuestions = computed();
}
