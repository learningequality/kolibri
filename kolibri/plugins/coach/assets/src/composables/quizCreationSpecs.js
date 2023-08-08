/**
 * Defines a set of specifications for use with `kolibri.utils.objectSpecs` utilities for validating
 * the shape of an object. This allows us to define a set of rules for what an object should look
 * like, and then validate that an object conforms to those rules.
 *
 * Note also that any file importing this should also have the JSDoc typedefs available to your IDE.
 */

/**
 * TODO: Work this out better for the mental mapping. What we get from the API re: content needs
 * to be translated into the objects we need to create a Quiz, at a high level.
 *
 * Keywords to consider: Assessment, Exercise, ContentNode, Topic, QuizQuestion...
 *
 *
 * FIXME: #11025 defines the `resource_pool` property which needs to be added to the `QuizSection`
 * object -- this means we have an in-data-structure representation of the resource pool and can
 * just keep that up to date and derive UI, and such from there
 *
 * ## Assessments
 * This is used as the name for the questions within an exercise when we get them from the API.
 * Assessments are individual questions within a given Exercise. When we get a piece of content
 * that is an Exercise kind, it should have some `assessment_metadata` which will have everything
 * we need to enumerate the QuizQuestions associated with an Exercise.
 *
 * ## ContentNode & Exercises
 * ContentNodes are the objects that represent the content. They have a `kind` which, in our case,
 * will be one of either TOPIC or EXERCISE. Any ContentNode can provide a list of its ancestors and
 * can be used to get a list of its descendants.
 *
 * TOPICS, in our case, are navigation nodes and, if they are "selected" then all of their
 * descendants are also "selected".
 *
 * EXERCISES, on the other hand, are the actual content that we want to use in our Quiz. They will
 * have the IDs for the assessments we will use to create and show the QuizQuestions.
 *
 *
 * ## QuizQuestions
 * These are the data which will be persisted in the `question_sources` property of a Quiz - in
 * each of the QuizSections therein. They should represent everything we need to:
 * - Render a question preview
 * - Differentiate one question from another within the exercise
 */

/*
 * @typedef   {Object}  Topic           A topic - a collection of exercises
 * @property  {Array}   ancestors       A list of objects with ID and Title (for breadcrumbs)
 * @property

/*
 * @typedef   {Object}  Exercise        A particular exercise that can be selected within a quiz
 * @property  {string}  ancestor_id     The ID of the parent contentnode
 * @property  {string}  content_id      The ID for the piece of content
 * @property  {string}  id              Unique ID for this exercise
 * @property  {bool}    is_leaf         More or less means "is_not_a_topic"
 * @property  {string}  kind            Exercise or Topic in our case, most likely see
 *                                      kolibri.core.assets.src.constants.ContentNodeKinds
 * @property  {Array}   assessment_ids  A list of assessment item IDs that are associated with
 *                                      this exercise
 * @property  {string}  contentnode     The contentnode ID for the Assessment
 * @property  {string}  title           The resource title
 */
export const Exercise = {
  ancestor_id: {
    type: String,
    default: '',
  },
  question_id: {
    type: String,
    default: '',
  },
  id: {
    type: String,
    default: '',
  },
  is_leaf: {
    type: Boolean,
    default: true,
  },
  kind: {
    type: String,
    default: '',
  },
  title: {
    type: String,
    default: '',
  },
  assessment_ids: {
    type: Array,
    default: () => [],
  },
  contentnode: {
    type: String,
    default: '',
  },
};

/*
 * @typedef  {Object} QuizQuestion         A particular question in a Quiz
 * @property {string} exercise_id          The ID of the resource from which the question originates
 * @property {string} question_id          A *unique* identifier of this particular question within
 *                                         the quiz -- same as the `assessment_item_id`
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
    default: () => [],
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

[
  {
    id: 'b5092f8637e64d24a54ad82913ff6409',
    author: '',
    available: true,
    channel_id: '95a52b386f2c485cb97dd60901674a98',
    coach_content: false,
    content_id: 'c58ffa74410251eab7afe2be2e41c842',
    description: 'Practice adding numbers to make 10.',
    kind: 'exercise',
    license_description: 'Special permissions',
    license_name: 'Special Permissions',
    license_owner: 'Khan Academy',
    num_coach_contents: 0,
    options: {},
    parent: 'cd0ce67976bb40308124f0a7ffef7b6b',
    sort_order: 1.5,
    title: 'Make 10',
    lft: 124,
    rght: 125,
    tree_id: 1,
    learning_activities: ['VwRCom7G'],
    grade_levels: [],
    resource_types: [],
    accessibility_labels: [],
    categories: [],
    duration: null,
    ancestors: [
      {
        id: '95a52b386f2c485cb97dd60901674a98',
        title: 'Kolibri QA Channel',
      },
      {
        id: '57098e75d62c4b68a215065842eaea2c',
        title: 'Exercises',
      },
      {
        id: 'cd0ce67976bb40308124f0a7ffef7b6b',
        title: 'CK12 Exercises',
      },
    ],
    admin_imported: true,
    assessmentmetadata: {
      assessment_item_ids: [
        'f2e064644da15858ad8f32625170e2e2',
        'abce870ef4a45986863a7392cf83ed40',
        'ef473c447142594ab35f324907fd04bb',
        'e9ad528f551758cc81241e88d0b251b8',
        '89141e7cf27b511c8997948027ec4304',
        '12b22edefb7955b4801d98e961332185',
        '5fe283d53edf5378a23d3f77a79045d3',
        'd763625da02f59aaa6f5c81e7770ee96',
        '5e9dbf5384c45821bf2e097022db95e6',
        'b390bcb9ff415cbca3aedddd03e4df92',
        '5735448478a156199719b83848481df3',
        '2460e3522b7a5bed8b5f2aab4213493f',
        'fee738165aee5b61bdcaf1c56de0ec34',
        '2054fcdccb0255fa88a28b8264bd713a',
        '118e19f359cd527392d2a30c9a8779bf',
        'd46f1aaee2a859dd87834dcd50f6f6f1',
        'f55dd75166525b219da991f67eb65075',
        'bc4d058e89d5516699413117e2811044',
        '3044c1af1f295aaba69fc1347e003def',
        '1c6bb4a62c135688895163e1304f736f',
      ],
      number_of_assessments: 20,
      mastery_model: {
        type: 'm_of_n',
        n: 7,
        m: 5,
      },
      randomize: true,
      is_manipulable: true,
      contentnode: 'b5092f8637e64d24a54ad82913ff6409',
    },
    tags: [],
    files: [
      {
        id: 'b8149f134d804db1910e2212f457c7f1',
        priority: 1,
        preset: 'exercise',
        supplementary: false,
        thumbnail: false,
        lang: null,
        checksum: '013f0af5e7c883565281862b72c3e3ec',
        available: true,
        file_size: 864619,
        extension: 'perseus',
        storage_url: '/content/storage/0/1/013f0af5e7c883565281862b72c3e3ec.perseus',
      },
      {
        id: '7b1c240e7a964ef19d7b2c9ed20f28af',
        priority: 2,
        preset: 'exercise_thumbnail',
        supplementary: true,
        thumbnail: true,
        lang: null,
        checksum: '0eb1e92b68e89c39b456c401fc052fb1',
        available: true,
        file_size: 1818,
        extension: 'png',
        storage_url: '/content/storage/0/e/0eb1e92b68e89c39b456c401fc052fb1.png',
      },
    ],
    thumbnail: '/content/storage/0/e/0eb1e92b68e89c39b456c401fc052fb1.png',
    lang: {
      id: 'en',
      lang_code: 'en',
      lang_subcode: null,
      lang_name: 'English',
      lang_direction: 'ltr',
    },
    is_leaf: true,
  },
  {
    id: 'b08ce82221df4e00a5722629cf37563b',
    author: 'CK-12',
    available: true,
    channel_id: '95a52b386f2c485cb97dd60901674a98',
    coach_content: true,
    content_id: '60a420d14b725cf09e3ba3294c879a97',
    description: '',
    kind: 'exercise',
    license_description: '',
    license_name: 'CC BY-NC',
    license_owner: 'CK-12',
    num_coach_contents: 1,
    options: {},
    parent: 'cd0ce67976bb40308124f0a7ffef7b6b',
    sort_order: 4.5,
    title: 'Adding Multiple One-digit Numbers with Pictures Practice',
    lft: 130,
    rght: 131,
    tree_id: 1,
    learning_activities: ['VwRCom7G'],
    grade_levels: [],
    resource_types: [],
    accessibility_labels: [],
    categories: [],
    duration: null,
    ancestors: [
      {
        id: '95a52b386f2c485cb97dd60901674a98',
        title: 'Kolibri QA Channel',
      },
      {
        id: '57098e75d62c4b68a215065842eaea2c',
        title: 'Exercises',
      },
      {
        id: 'cd0ce67976bb40308124f0a7ffef7b6b',
        title: 'CK12 Exercises',
      },
    ],
    admin_imported: true,
    assessmentmetadata: {
      assessment_item_ids: [
        '8d2203a6fa2b5941b632104b5d794124',
        '7f60b422106a5f3f857db1f60ecffd8c',
        'ceabffa99cbe51869ad627cc0ca3d19f',
        'd3ee825b7f6252ba832eb7b3436587c9',
        '368e2d710c6a535abe2f5093aaa61de5',
        '504aae6026255dc598e77e9836841ff2',
        '3079d3f8c2655dd5bd0a3815c5ffb24d',
        'e34b6d8856635856abd954e8df3c1526',
        '531b168958cc5b02a617a68f7c342bfe',
        '1f869163313453f88743778d56a8e40c',
      ],
      number_of_assessments: 10,
      mastery_model: {
        type: 'm_of_n',
        n: 5,
        m: 5,
      },
      randomize: true,
      is_manipulable: true,
      contentnode: 'b08ce82221df4e00a5722629cf37563b',
    },
    tags: [],
    files: [
      {
        id: '63b77b2afbb848ad8f12eb217aac5b93',
        priority: 1,
        preset: 'exercise',
        supplementary: false,
        thumbnail: false,
        lang: null,
        checksum: '3d84bc20a04ede67cf5cfa6e9aad541c',
        available: true,
        file_size: 241663,
        extension: 'perseus',
        storage_url: '/content/storage/3/d/3d84bc20a04ede67cf5cfa6e9aad541c.perseus',
      },
      {
        id: 'e1021d1a68d94279b41973f8b88dd15e',
        priority: 2,
        preset: 'exercise_thumbnail',
        supplementary: true,
        thumbnail: true,
        lang: null,
        checksum: 'e987091f98b63e69f1df1a990f9fdaf8',
        available: true,
        file_size: 5946,
        extension: 'png',
        storage_url: '/content/storage/e/9/e987091f98b63e69f1df1a990f9fdaf8.png',
      },
    ],
    thumbnail: '/content/storage/e/9/e987091f98b63e69f1df1a990f9fdaf8.png',
    lang: {
      id: 'en',
      lang_code: 'en',
      lang_subcode: null,
      lang_name: 'English',
      lang_direction: 'ltr',
    },
    is_leaf: true,
  },
];
