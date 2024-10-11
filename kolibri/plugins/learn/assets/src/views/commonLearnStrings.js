import { createTranslator } from 'kolibri/utils/i18n';

export const learnStrings = createTranslator('CommonLearnStrings', {
  // Labels
  learnLabel: {
    message: 'Learn',
    context:
      "Each time a learner signs in to Kolibri, the first thing they see is the  'Learn' page with the list of all the classes they are enrolled to.",
  },
  resumeLabel: {
    message: 'Resume',
    context: 'Label for links that go to content that has been started and can be resumed',
  },
  classesAndAssignmentsLabel: {
    message: 'Classes and assignments',
    context: 'Label for links that go to class or lesson content',
  },
  channelAndFoldersLabel: {
    message: 'Channel and folders',
    context: 'Label for links that go to the main channel or its subfolders',
  },
  filterAndSearchLabel: {
    message: 'Filter and search',
    context:
      'Label for a section of the page that contains options for searching and filtering content',
  },
  mostPopularLabel: {
    message: 'Most popular',
    context: 'Label for links that go to the most popular content',
  },
  popularLabel: {
    message: 'Popular',
    context: 'Label for links that go to the most popular content.',
  },
  nextStepsLabel: {
    message: 'Next steps',
    context: 'Label for links that go to post-requisites for content that has been completed.',
  },
  exploreResources: {
    message: 'Explore resources',
    context: "Heading in the 'Learn' section where users can view learning resources.\n",
  },
  logo: {
    message: 'From the channel {channelTitle}',
    context:
      'Added to create a complete alt-text description of a logo on a content card to indicate to the user what channel the resource belongs to. For example: From the channel Khan Academy - English',
  },
  resourceCompletedLabel: {
    message: 'Resource completed',
    context:
      'Message when the user successfully finishes a resource or marks a resource as complete',
  },
  dontShowThisAgainLabel: {
    message: "Don't show this again",
    context:
      'Option that allows the user to prevent this resource from displaying in the future while using category search',
  },
  markResourceAsCompleteLabel: {
    message: 'Mark resource as complete',
    context:
      'Title of the modal window where a user will confirm or cancel marking a resource as complete manually.',
  },
  suggestedTime: {
    message: 'Suggested time',
    context: 'Time suggested by coach for how long an independent practice quiz should take',
  },
  exploreLibraries: {
    message: 'Explore libraries',
    context: 'Title for Explore Libraries page',
  },
  kolibriLibrary: {
    message: 'Kolibri Library',
    context: 'Title for Kolibri Libraries',
  },

  // Resource Metadata strings
  author: {
    message: 'Author',
    context:
      'Indicates who is the author of that specific learning resource. For example, "Author: Learning Equality".',
  },
  license: {
    message: 'License',
    context:
      'Indicates the type of license of that specific learning resource. For example, "License: CC BY-NC-ND".\n',
  },
  toggleLicenseDescription: {
    message: 'Toggle license description',
    context:
      'Describes the arrow which a learner can select to view more information about the type of license that a resource has.',
  },
  copyrightHolder: {
    message: 'Copyright holder',
    context:
      'Indicates who holds the copyright of that specific learning resource. For example, "Copyright holder: Ubongo Media".',
  },
  estimatedTime: {
    message: 'Estimated time',
    context: 'Refers to the expected time it will take the learner to complete a resource.',
  },
  documentTitle: {
    message: '{ contentTitle } - { channelTitle }',
    context: 'DO NOT TRANSLATE\nCopy the source string.',
  },
  shareFile: {
    message: 'Share',
    context: 'Option to share a specific file from a learning resource.',
  },
  locationsInChannel: {
    message: 'Location in {channelname}',
    context:
      "When there are multiple instances of the same resource, learner can see their 'locations' (positions in the respective folders of the channel) at the bottom of the sidebar with all the metadata, when they select the resource in the Kolibri Library.",
  },
  viewResource: {
    message: 'View resource',
    context: 'Refers to a button where the user can view all the details for a resource.',
  },
  showLess: {
    message: 'Show less',
    context: '',
  },
  whatYouWillNeed: {
    message: 'What you will need',
    context: '',
  },
  moreLibraries: {
    message: 'More',
    context: 'Title section containing unpinned devices',
  },
  loadingLibraries: {
    message: 'Loading Kolibri libraries around you',
    context:
      "Status message displayed on the Library page while Kolibri on the user's device is searching the local network for other devices with Kolibri, in order to make their libraries available for browsing.",
  },
  cannotConnectToLibrary: {
    message:
      'Kolibri cannot connect to the library on {deviceName}. Your network connection may be unstable, or {deviceName} is no longer available.',
    context: '',
  },
  backToAllLibraries: {
    message: 'Go back to all libraries',
    context: '',
  },
});

export function learnString(key, args) {
  return learnStrings.$tr(key, args);
}

export default {
  methods: { learnString },
};
