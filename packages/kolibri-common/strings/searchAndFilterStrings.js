import { createTranslator } from 'kolibri/utils/i18n';

export const searchAndFilterStrings = createTranslator('SearchAndFilterStrings', {
  // Labels
  filterAndSearchLabel: {
    message: 'Filter and search',
    context:
      'Label for a section of the page that contains options for searching and filtering content',
  },
  moveChannelUpLabel: {
    message: 'Move up one',
    context: 'Label to rearrange channel order. Not seen on UI.',
  },
  moveChannelDownLabel: {
    message: 'Move down one',
    context: 'Label to rearrange channel order. Not seen on UI.',
  },

  upLabel: {
    message: 'Up',
    context: 'Label to move an item up in a list',
  },

  downLabel: {
    message: 'Down',
    context: 'Label to move an item down in a list',
  },

  moveResourceUpButtonDescription: {
    message: 'Move this resource one position up in this lesson',
    context: 'Refers to changing the order of resources in a lesson.',
  },

  moveResourceDownButtonDescription: {
    message: 'Move this resource one position down in this lesson',
    context: 'Refers to changing the order of resources in a lesson.',
  },
  saveLessonResources: {
    message: 'save & finish',
    context: 'Button to save resources in a lesson',
  },
  numberOfSelectedResources: {
    message:
      '{count, number, integer} {count, plural, one {resource selected} other {resources selected}}',
    context: 'Indicates the number of resources selected',
  },
  numberOfSelectedQuestions: {
    message:
      '{count, number, integer} {count, plural, one {question selected} other {questions selected}}',
    context: 'Indicates the number of questions selected',
  },
  openParentFolderLabel: {
    message: 'Open parent folder',
    context: 'Button label to open the parent folder of a resource',
  },
  openExerciseLabel: {
    message: 'Open exercise',
    context: 'Button label to open the exercise a question belongs to',
  },
  removeResourceLabel: {
    message: 'Remove resource',
    context: 'Button label to remove a resource from the selected resources',
  },
  emptyResourceList: {
    message: 'No resources selected',
    context: 'Message displayed when no resources are selected',
  },
  emptyQuestionsList: {
    message: 'No questions selected',
    context: 'Message displayed when no questions are selected',
  },
  searchInFolder: {
    message: "Search in '{folder}'",
    context: 'Title for search resources in folder',
  },
  resultsCount: {
    message: '{count, number} {count, plural, one {result} other {results}}',
    context: 'Number of search results when we have an exact count',
  },
  resultsCountInFolder: {
    message: "{count, number} {count, plural, one {result} other {results}} in '{folder}'",
    context: 'Number of search results when we have an exact count in a specific folder',
  },
  overResultsCount: {
    message: 'Over {count, number} results',
    context: 'Number of search results when we know there are more than the count',
  },
  overResultsCountInFolder: {
    message: "Over {count, number} results in '{folder}'",
    context:
      'Number of search results when we know there are more than the count in a specific folder',
  },
  backToSearchResultsLabel: {
    message: 'Back to search results',
    context: 'Button to go back to search results',
  },
  chooseACategory: {
    message: 'Choose a category',
    context: 'Label for a selector component to choose a category',
  },
  addText: {
    message: 'Add',
    context: 'Button for adding a resource',
  },

  copyrightHolderDataHeader: {
    message: 'Copyright holder',
    context:
      'Refers to the person or organization who holds the copyright or legal ownership for that resource.',
  },
  licenseDataHeader: {
    message: 'License',
    context:
      "Refers to the type of license the learning resource has. For example, 'CC BY-NC' meaning 'Creative Commons: attribution, non-commercial'.",
  },
  addedIndicator: {
    message: 'Added',
    context: 'Notification that can refer to when resources are added to a lesson, for example.',
  },
  notAvailableLabel: {
    message: 'Not available',
    context: 'Message that shows when the value of key is null',
  },
  minutes: {
    message: '{value, number, integer} {value, plural, one {minute} other {minutes}}',
    context:
      'Indicates time spent by learner on a specific activity. Only translate minute/minutes.',
  },
  dismissAction: {
    message: 'Dismiss',
    context: 'Button label to dismiss a notification',
  },
  saveSettingsAction: {
    message: 'Save settings',
    context: 'Button label to save resource selection settings',
  },
  insufficientResources: {
    message:
      'There are currently only {count, number} questions across all practice resources in your library. To create a larger quiz, consider adding more resources to your library.',
    context: 'Message to indicate that the license is not sufficient for the user.',
  },
});
