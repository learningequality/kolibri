/**
 * Defines a set of specifications for use with `kolibri.utils.objectSpecs` utilities for validating
 * the shape of an object. This allows us to define a set of rules for what an object should look
 * like, and then validate that an object conforms to those rules.
 *
 * Note also that any file importing this should also have the JSDoc typedefs available to your IDE.
 */

/**
 * @typedef   {Object}  QuizExercise    An object referencing an exercise or topic to be used
 *                                      within the `QuizSeciton.resource_pool` property.
 * @property  {string}  id              Unique ID for this exercise (aka, `exercise_id` elsewhere)
 * @property  {string}  title           The resource title
 * @property  {string}  parent          The ID of the parent contentnode
 * @property  {string}  content_id      The ID for the piece of content
 * @property  {bool}    is_leaf         Whether or not this is a leaf node (i.e. an exercise)
 * @property  {string}  kind            Exercise or Topic in our case - see: `ContentNodeKinds`
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

function _exercise_id_validator(value) {
  return /^[0-9a-f]{32}$/.test(value);
}

/**
 * @typedef  {Object} QuizQuestion         A particular question in a Quiz - aka an assessment item
 *                                         from an QuizExercise.
 * @property {string} item                 A  ** unique **  identifier for this question that is
 *                                         a combination of <exercise_id>:<question_id>
 * @property {string} exercise_id          The ID of the resource from which the question originates
 * @property {string} question_id          A *unique* identifier of this particular question within
 *                                         the quiz -- same as the `assessment_item_id`
 * @property {string} title                A title for the question, editable by the user
 * @property {number} counter_in_exercise  A number assigned to separate questions which have the
 *                                         same exercise title to differentiate them
 */
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
 * @typedef  {Object}             QuizSection                Defines a single section of the quiz
 * @property {string}             section_id                 A unique ID for the section - this is
 *                                                           only used on the front-end
 * @property {string}             section_title              The title of the quiz section
 * @property {string}             description                A text blob associated with the section
 * @property {QuizQuestion[]}     questions                  The list of QuizQuestion objects in the
 *                                                           section
 * @property {boolean}            learners_see_fixed_order   A bool flag indicating whether this
 *                                                           section is shown in the same order, or
 *                                                           randomized, to the learners
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
    default: false,
  },
};

function getRandomInt() {
  return Math.floor(Math.random() * 1000);
}

/**
 * @typedef  {Object}         Quiz                The overall primary Quiz object
 * @property {string}         title               The title of the whole quiz
 * @property {QuizSection[]}  question_sources    A list of the QuizSection objects that make up the
 * @property {number}         seed                A random number used to seed the randomization
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
};
