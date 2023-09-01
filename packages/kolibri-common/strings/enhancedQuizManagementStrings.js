import { createTranslator } from 'kolibri.utils.i18n';

export const enhancedQuizManagementStrings = createTranslator('EnhancedQuizManagementStrings', {
  createNewQuiz: {
    message: 'Create new quiz',
  },
  quizTitle: {
    message: 'Quiz title',
  },
  addQuizSections: {
    message: 'Add one or more sections to the quiz, according to your needs',
  },
  addSectionLabel: {
    message: 'Add section',
  },
  editSectionLabel: {
    message: 'Edit section',
  },
  deleteSectionLabel: {
    message: 'Delete section',
  },
  noQuestionsInSection: {
    message: 'There are no questions in this section',
  },
  addQuizSectionQuestionsInstructions: {
    message: 'To add questions, select resources from the available channels',
  },
  addQuestionsLabel: {
    message: 'Add questions',
  },
  sectionSettings: {
    message: 'Section settings',
  },
  sectionTitle: {
    message: 'Section title',
  },
  numberOfQuestionsLabel: {
    message: 'Number of questions',
  },
  optionalDescriptionLabel: {
    message: 'Description (optional)',
  },
  quizResourceSelection: {
    message: 'Quiz resource selection',
  },
  selectResourcesFromChannels: {
    messages: 'Select resources from channels',
  },
  sectionOrder: {
    message: 'Section order',
  },
  currentSection: {
    message: 'Current section',
  },
  deleteSection: {
    message: 'Delect section',
  },
  applySettings: {
    message: 'Apply settings',
  },
  addQuestions: {
    message: 'Add questions',
  },
  selectFoldersOrExercises: {
    message: 'Select folders or exercises from these channels',
  },
  numberOfSelectedBookmarks: {
    message: '{ count, number } { count, plural, one { bookmark } other { bookmarks }}',
  },
  numberOfSelectedQuestions: {
    message: '{count, number} {count, plural, one {question selected} other {questions selected}}',
  },
  replqceQuestions: {
    message: 'Replace questions',
  },
  changeResources: {
    message: 'Change resources',
  },
  questionList: {
    message: 'Question list',
  },
  addAnswer: {
    message: 'Add answer',
  },
  collapseAll: {
    message: 'Collapse all',
  },
  expandAll: {
    message: 'Expand all',
  },
  replace: {
    message: 'Replace',
  },
  replaceQuestions: {
    message: 'Replace questions',
  },
  replaceQuestionsExplaination: {
    message: 'The new questions you selected will replace the current ones.',
  },
  noUndoWarning: {
    message: "You can't undo or cancel this.",
  },
  resourceMismatchWarning: {
    message: 'The resource you chose does not match the number of questions you want to replace.',
  },
  resourceMismatchDirection: {
    message:
      'Please choose a different resource or decrease the number of questions to be replaced.',
  },
  questionEditedSuccessfully: {
    message: 'Question edited successfully',
  },
  reviewSelectedResources: {
    message: 'Review selected resources',
  },
  numberOfSelectedResources: {
    message:
      '{ count, number } { count, plural, one { resource selected } other { resources selected }} from { count, number } { count, plural, one { channel } other { channels }}',
  },
  numberOfSelectedReplacements: {
    message:
      '{ count, number } of{ count, number } {count, plural, one {question selected} other {questions selected}}',
  },
  numberOfQuestionsReplaced: {
    message:
      '{ count, number } { count, plural, one { question successfully replaced } other { questions successfully replaced }} ',
  },
});
