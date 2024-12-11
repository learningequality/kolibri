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
  numberOfSelectedResource: {
    message:
      '{count, number, integer} {count, plural, one {resource selected} other {resources selected}}',
    context: 'Indicates the number of resources selected',
  },
});
