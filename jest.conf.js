const baseConfig = require('kolibri-jest-config/jest.conf');

module.exports = Object.assign(baseConfig, {
  // Only match *.spec.js files - exclude utility files in __tests__ folders
  testMatch: ['**/__tests__/**/*.spec.js', '**/?(*.)spec.js'],
  // Make sure we transpile any raw vue or ES6 files
  // Pattern handles both yarn flat structure and pnpm nested structure
  transformIgnorePatterns: [
    'node_modules/(?!(\\.pnpm/(keen-ui|epubjs|kolibri-common|kolibri|kolibri-design-system|kolibri-constants|uuid)|keen-ui|epubjs|kolibri-common|kolibri|kolibri-design-system|kolibri-constants|uuid))',
  ],
  collectCoverageFrom: [
    'kolibri/**/frontend/**/*.{js,vue}',
    'packages/*/src/*.js',
    '!**/node_modules/**',
    '!**/__fixtures__/**',
    // Exclude Vue SFCs that use optional chaining (?.) in templates — buble
    // (used by vue-template-es2015-compiler during coverage instrumentation)
    // cannot parse this syntax.
    '!kolibri/plugins/coach/frontend/views/common/QuestionsAccordion.vue',
    '!kolibri/plugins/coach/frontend/views/common/resourceSelection/subPages/**',
    '!kolibri/plugins/coach/frontend/views/courses/sidePanels/AssignCourse/subpages/CourseDetails.vue',
    '!kolibri/plugins/coach/frontend/views/quizzes/CreateExamPage/sidePanels/QuizResourceSelection/subPages/SelectFromQuizSearchResults.vue',
    '!kolibri/plugins/qti_viewer/frontend/components/interactions/TextEntryInteraction.vue',
  ],
});
