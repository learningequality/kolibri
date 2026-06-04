import { createTranslator } from 'kolibri/utils/i18n';

export const searchAndFilterStrings = createTranslator('SearchAndFilterStrings', {
  // Labels
  filterAndSearchLabel: {
    message: 'Filter and search',
    context:
      'Label for a section of the page that contains options for searching and filtering content',
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
  NOutOfMSelectedQuestions: {
    message:
      '{count, number} of {total, number} {total, plural, one {question selected} other {questions selected}}',
    context:
      'Indicates the number of questions selected out of the total of questions that needs to be selected',
  },
  openParentFolderLabel: {
    message: 'Open parent folder',
    context: 'Button label to open the parent folder of a resource',
  },
  openExerciseLabel: {
    message: 'Open exercise',
    context: 'Button label to open the exercise a question belongs to',
  },
  warningForQuizFromOldKolibri: {
    message:
      'This quiz was created using an older version of Kolibri and cannot be edited directly. Create a copy of it to edit the resources.',
    context: 'Warning message for quizzes created in an older version of Kolibri.',
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
    message: "Search in folder '{folder}'",
    context: 'Title for search resources in folder',
  },
  resultsCount: {
    message: '{count, number} {count, plural, one {result} other {results}}',
    context: 'Number of search results when we have an exact count',
  },
  autocompleteResultsAvailable: {
    message:
      '{count, number} {count, plural, one {result} other {results}} available. Use the up and down arrow keys to review.',
    context: 'Autocomplete result count and navigation help for screen readers.',
  },

  // Search synonyms: extra words a learner might type that should surface a
  // learning activity in autocomplete even though they aren't its label.

  // Watch
  searchTermVideo: {
    message: 'video',
    context: "Related word that should surface the 'Watch' learning activity in search.",
  },
  searchTermMovie: {
    message: 'movie',
    context: "Related word that should surface the 'Watch' learning activity in search.",
  },
  searchTermFilm: {
    message: 'film',
    context: "Related word that should surface the 'Watch' learning activity in search.",
  },
  searchTermAnimation: {
    message: 'animation',
    context: "Related word that should surface the 'Watch' learning activity in search.",
  },

  // Listen
  searchTermAudio: {
    message: 'audio',
    context: "Related word that should surface the 'Listen' learning activity in search.",
  },
  searchTermPodcast: {
    message: 'podcast',
    context: "Related word that should surface the 'Listen' learning activity in search.",
  },
  searchTermMusic: {
    message: 'music',
    context: "Related word that should surface the 'Listen' learning activity in search.",
  },
  searchTermSong: {
    message: 'song',
    context: "Related word that should surface the 'Listen' learning activity in search.",
  },

  // Read
  searchTermBook: {
    message: 'book',
    context: "Related word that should surface the 'Read' learning activity in search.",
  },
  searchTermArticle: {
    message: 'article',
    context: "Related word that should surface the 'Read' learning activity in search.",
  },
  searchTermText: {
    message: 'text',
    context: "Related word that should surface the 'Read' learning activity in search.",
  },
  searchTermDocument: {
    message: 'document',
    context: "Related word that should surface the 'Read' learning activity in search.",
  },
  searchTermStory: {
    message: 'story',
    context: "Related word that should surface the 'Read' learning activity in search.",
  },

  // Practice
  searchTermExercise: {
    message: 'exercise',
    context: "Related word that should surface the 'Practice' learning activity in search.",
  },
  searchTermQuiz: {
    message: 'quiz',
    context: "Related word that should surface the 'Practice' learning activity in search.",
  },
  searchTermTest: {
    message: 'test',
    context: "Related word that should surface the 'Practice' learning activity in search.",
  },
  searchTermDrill: {
    message: 'drill',
    context: "Related word that should surface the 'Practice' learning activity in search.",
  },
  searchTermWorksheet: {
    message: 'worksheet',
    context: "Related word that should surface the 'Practice' learning activity in search.",
  },

  // Create
  searchTermMake: {
    message: 'make',
    context: "Related word that should surface the 'Create' learning activity in search.",
  },
  searchTermBuild: {
    message: 'build',
    context: "Related word that should surface the 'Create' learning activity in search.",
  },
  searchTermDraw: {
    message: 'draw',
    context: "Related word that should surface the 'Create' learning activity in search.",
  },
  searchTermDesign: {
    message: 'design',
    context: "Related word that should surface the 'Create' learning activity in search.",
  },
  searchTermCraft: {
    message: 'craft',
    context: "Related word that should surface the 'Create' learning activity in search.",
  },

  // Explore
  searchTermInteractive: {
    message: 'interactive',
    context: "Related word that should surface the 'Explore' learning activity in search.",
  },
  searchTermGame: {
    message: 'game',
    context: "Related word that should surface the 'Explore' learning activity in search.",
  },
  searchTermSimulation: {
    message: 'simulation',
    context: "Related word that should surface the 'Explore' learning activity in search.",
  },

  // Reflect
  searchTermJournal: {
    message: 'journal',
    context: "Related word that should surface the 'Reflect' learning activity in search.",
  },
  searchTermReview: {
    message: 'review',
    context: "Related word that should surface the 'Reflect' learning activity in search.",
  },
  searchTermSelfAssessment: {
    message: 'self-assessment',
    context: "Related word that should surface the 'Reflect' learning activity in search.",
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
  selectResource: {
    message: 'Select resource',
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
  selectedIndicator: {
    message: 'Selected',
    context:
      'Notification that can refer to when resources are selected to add to a lesson, for example.',
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
  insufficientResources: {
    message:
      'There are currently only {count, number} questions across all practice resources in your library. To create a larger quiz, contact your administrator to add more resources to your library.',
    context:
      'Message to indicate that the resources are not sufficient for the user to create a quiz.',
  },
});
