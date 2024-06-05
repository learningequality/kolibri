import { createTranslator } from 'kolibri.utils.i18n';

export const enhancedQuizManagementStrings = createTranslator('EnhancedQuizManagementStrings', {
  selectAllLabel: {
    message: 'Select all',
  },
  sectionLabel: {
    message: 'Section { sectionNumber, number }',
  },
  createNewQuiz: {
    message: 'Create new quiz',
  },
  quizSectionsLabel: {
    message: 'Quiz sections',
    context: 'Used as an aria-label for screen readers to describe the purpose of the list of tabs',
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
    message: 'Select resources from channels',
  },
  sectionOrder: {
    message: 'Section order',
  },
  currentSection: {
    message: 'Current section',
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
  replaceQuestions: {
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
  replaceAction: {
    message: 'Replace',
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
  questionOrder: {
    message: 'Question order',
  },
  randomizedLabel: {
    message: 'Randomized',
  },
  selectFromBookmarks: {
    message: 'Select from bookmarks',
  },
  randomizedOptionDescription: {
    message: 'Each learner sees a different question order',
  },
  fixedLabel: {
    message: 'Fixed',
  },
  fixedOptionDescription: {
    message: 'Each learner sees the same question order',
  },
  questionEditedSuccessfully: {
    message: 'Question edited successfully',
  },
  reviewSelectedResources: {
    message: 'Review selected resources',
  },
  deleteConfirmation: {
    message: "Are you sure you want to delete section '{section_title}'?",
    context:
      'A warning message that appears when the user tries to leave the page without saving their work',
  },
  closeConfirmationTitle: {
    message: 'Are you sure you want to leave this page?',
    context:
      'The title of a confirmation modal informing the user that they will lose their work if they leave the page',
  },
  closeConfirmationMessage: {
    message: 'You will lose any unsaved edits to your work',
    context:
      'The body of a confirmation modal informing the user that they will lose their work if they leave the page',
  },

  numberOfSelectedResources: {
    message:
      '{ count, number } { count, plural, one { resource selected } other { resources selected }} from { channels, number } { channels, plural, one { channel } other { channels }}',
  },
  numberOfSelectedReplacements: {
    message:
      '{ count, number } of { total, number } {total, plural, one {replacement selected} other {replacements selected}}',
  },
  numberOfQuestionsReplaced: {
    message:
      '{ count, number } { count, plural, one { question successfully replaced } other { questions successfully replaced }} ',
  },
  numberOfResourcesSelected: {
    message: '{count, number} {count, plural, one {resource selected} other {resources selected}}',
  },
  selectedResourcesInformation: {
    message:
      '{count, number, integer} of {total, number, integer} {total, plural, one {question selected} other {questions selected}}',
  },
  selectMoreQuestion: {
    message:
      'Select { count } more { count, plural , one { question } other { questions }} to continue',
  },
  selectFewerQuestion: {
    message:
      'Select { count } fewer { count, plural ,one { question } other { questions }} to continue',
  },
  cannotSelectSomeTopicWarning: {
    message:
      'You can only select folders with 12 or less exercises and no subfolders to avoid oversized quizzes.',
  },
  changesSavedSuccessfully: {
    message: 'Changes saved successfully',
    context: 'A snackbar message that appears when the user saves their changes',
  },
  sectionDeletedNotification: {
    message: "Section '{ section_title }' deleted",
    context: 'A snackbar message that appears when the user deletes a section',
  },
  questionsDeletedNotification: {
    message: '{ count, number } { count, plural, one { question } other { questions }} deleted',
    context: 'A snackbar message that appears when the user deletes questions',
  },
  updateResources: {
    message: 'Update resources',
  },
  allSectionsEmptyWarning: {
    message: "You don't have any questions in the quiz",
  },
  notEnoughReplacementsTitle: {
    message: 'Not enough replacements available',
    context:
      'Title of modal when a user tries to replace more questions than are available in the pool',
  },
  notEnoughReplacementsMessage: {
    message:
      "You've selected { selected, number } { selected, plural, one { question } other { questions } } to replace, but {available, plural, =0 { don't have questions } one { only have 1 question } other { only have { available } questions } } available to replace them with.",
    context:
      'Message of modal when a user tries to replace more questions than are available in the pool',
  },
  addMoreResourcesWithEmptyPool: {
    message: 'Please add more resources to this section.',
    context: 'Message of modal when a user tries to replace questions but the pool is empty',
  },
  addMoreResourcesWithNonEmptyPool: {
    message:
      'Please add more resources to this section, or go back and only select up to { available, number } { available, plural, one { question } other { questions } } to be replaced.',
    context:
      'Message of modal when a user tries to replace more questions than are available in the pool',
  },
  addResourcesAction: {
    message: 'Add resources',
  },
  goBackAction: {
    message: 'Go back',
  },
});
