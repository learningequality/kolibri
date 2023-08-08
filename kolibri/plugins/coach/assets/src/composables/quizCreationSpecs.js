/**
 * Defines a set of specifications for use with `kolibri.utils.objectSpecs` utilities for validating
 * the shape of an object. This allows us to define a set of rules for what an object should look
 * like, and then validate that an object conforms to those rules.
 *
 * Note also that any file importing this should also have the JSDoc typedefs available to your IDE.
 */

/*
 * @typedef   {Object}  Exercise        A particular exercise that can be selected within a quiz
 * @property  {string}  ancestor_id     The ID of the parent contentnode
 * @property  {string}  content_id      The ID for the piece of content
 * @property  {string}  id              Unique ID for this exercise
 * @property  {bool}    is_leaf         More or less means "is_not_a_topic"
 * @property  {string}  kind            Exercise or Topic in our case, most likely see
 *                                      kolibri.core.assets.src.constants.ContentNodeKinds
 * @property  {string}  title           The resource title
 */
export const Exercise = {
  ancestor_id: {
    type: String,
    required: true,
  },
  question_id: {
    type: String,
    required: true,
  },
  id: {
    type: String,
    required: true,
  },
  is_leaf: {
    type: Boolean,
    required: true,
  },
  kind: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
};

/*
 * @typedef  {Object} QuizQuestion         A particular question in a Quiz
 * @property {string} exercise_id          The ID of the resource from which the question originates
 * @property {string} question_id          A *unique* identifier of this particular question within
 *                                         the quiz
 * @property {string} title                A title for the question
 * @property {number} counter_in_exercise  A number assigned to separate questions which have the
 *                                         same title to differentiate them
 */
export const QuizQuestion = {
  exercise_id: {
    type: String,
    required: true,
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
    type: 'number',
    default: 0,
  },
  missing_resource: {
    type: Boolean,
    default: false,
  },
};

/*
 * @typedef  {Object}           QuizSection                Defines a single section of the quiz
 * @property {string}           section_id                 A unique ID for the section - this is
 *                                                         only used on the front-end
 * @property {string}           section_title              The title of the quiz section
 * @property {string}           description                A text blob associated with the section
 * @property {number}           question_count             The number of questions in the section
 * @property {QuizQuestion[]}   questions                  The list of QuizQuestion objects in the
 *                                                         section
 * @property {boolean}          learners_see_fixed_order   A bool flag indicating whether this
 *                                                         section is shown in the same order, or
 *                                                         randomized, to the learners
 * @property {ExerciseMap}      exercise_pool              An array of contentnode ids indicat
 */
export const QuizSection = {
  section_id: {
    type: String,
    required: true,
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
  exercise_pool: {
    type: Array,
    default: () =>  [],
    spec: Exercise,
  },
};

/*
 * @typedef  {Object}         Quiz                The overall primary Quiz object
 * @property {string}         title               The title of the whole quiz
 * @property {QuizSection[]}  question_sources    A list of the QuizSection objects that make up the
 */
export const Quiz = {
  title: {
    type: String,
    default: '',
  },
  question_sources: {
    type: Array,
    default: () => [],
    spec: QuizSection,
  },
};
