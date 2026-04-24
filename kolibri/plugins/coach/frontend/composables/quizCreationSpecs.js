/**
 * Defines a set of specifications for use with `kolibri.utils.objectSpecs` utilities for validating
 * the shape of an object. This allows us to define a set of rules for what an object should look
 * like, and then validate that an object conforms to those rules.
 *
 * Note also that any file importing this should also have the JSDoc typedefs available to your IDE.
 */

export const QuizExercise = {
  id: {
    type: String,
    default: '',
  },
  title: {
    type: String,
    default: '',
  },
  parent: {
    type: String,
    default: '',
  },
  content_id: {
    type: String,
    default: '',
  },
  is_leaf: {
    type: Boolean,
    default: false,
  },
  kind: {
    type: String,
    default: '',
  },
  assessmentmetadata: {
    type: Object,
    default: () => ({ assessment_item_ids: [] }),
  },
};

/**
 * Validates that a value is a 32-character hexadecimal exercise ID.
 * @param {string} value - The value to validate.
 * @returns {boolean} True if valid, false otherwise.
 */
function _exercise_id_validator(value) {
  return /^[0-9a-f]{32}$/.test(value);
}

export const QuizQuestion = {
  item: {
    type: String,
    required: true,
    validator: value => {
      const segments = value.split(':');
      if (segments.length !== 2) {
        return false;
      }
      if (segments[0] === '' || segments[1] === '') {
        return false;
      }
      // The exercise_id (segment[0]) should be a 32 digit hex string
      if (!_exercise_id_validator(segments[0])) {
        return false;
      }
      return true;
    },
  },
  exercise_id: {
    type: String,
    required: true,
    validator: _exercise_id_validator,
  },
  question_id: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    default: '',
  },
  counter_in_exercise: {
    type: Number,
    default: 0,
  },
};

/**
 * @typedef  {object}             QuizSection                Defines a single section of the quiz
 * @property {string}             section_id                 A unique ID for the section - this is
 *                                                           only used on the front-end.
 * @property {string}             section_title              The title of the quiz section.
 * @property {string}             description                A text blob associated with the
 *                                                           section.
 * @property {QuizQuestion[]}     questions                  The list of QuizQuestion objects in the
 *                                                           section.
 * @property {boolean}            learners_see_fixed_order   A bool flag indicating whether this
 *                                                           section is shown in the same order, or
 *                                                           randomized, to the learners.
 */
export const QuizSection = {
  section_id: {
    type: String,
    default: () => Math.random().toString(36).substring(7), // makes a random 7 digit string
  },
  section_title: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
  questions: {
    type: Array,
    default: () => [],
    spec: QuizQuestion,
  },
  learners_see_fixed_order: {
    type: Boolean,
    default: true,
  },
};

/**
 * Returns a random integer between 0 and 999 for use as a quiz seed.
 * @returns {number} A random integer.
 */
function getRandomInt() {
  return Math.floor(Math.random() * 1000);
}

/**
 * @typedef  {object}         Quiz                The overall primary Quiz object
 * @property {string}         title               The title of the whole quiz.
 * @property {QuizSection[]}  question_sources    The QuizSection objects that make up the quiz.
 * @property {number}         seed                A random number used to seed the randomization.
 */
export const Quiz = {
  title: {
    type: String,
    default: '',
  },
  assignments: {
    type: Array,
    default: () => [],
  },
  draft: {
    type: Boolean,
    default: true,
  },
  active: {
    type: Boolean,
    default: false,
  },
  archive: {
    type: Boolean,
    default: false,
  },
  learner_ids: {
    type: Array,
    default: () => [],
  },
  collection: {
    type: String,
    default: '',
  },
  question_sources: {
    type: Array,
    default: () => [],
    spec: QuizSection,
  },
  seed: {
    type: Number,
    default: getRandomInt,
  },
  // Default to sections being shown in a fixed order
  learners_see_fixed_order: {
    type: Boolean,
    default: true,
  },
  // Default to quiz reports being visible immediately after learner submits quiz
  instant_report_visibility: {
    type: Boolean,
    default: true,
  },
};
