import { createTranslator } from 'kolibri/utils/i18n';

// Shared strings for the EPUB viewer custom-theme components: the add/edit modal,
// the color picker, the theme list item, and the delete confirmation.
export const customThemeStrings = createTranslator('CustomThemeStrings', {
  // Add/edit modal
  addCustomThemeTitle: {
    message: 'Add new theme',
    context: 'Title of the modal to add a new custom theme',
  },
  editCustomThemeTitle: {
    message: 'Edit theme',
    context: 'Title of the modal to edit an existing custom theme',
  },
  addAction: {
    message: 'Add',
    context:
      'Button that adds and applies the new custom theme. The theme takes effect immediately, so this is labeled "Add" rather than "Save".',
  },
  customThemeNameLabel: {
    message: 'Theme name',
    context: 'Label for the textbox to enter the name of the custom theme',
  },
  duplicateCustomThemeName: {
    message: 'A theme with this name already exists',
    context: 'Error message when trying to add a custom theme with a name that already exists',
  },
  defaultThemeName: {
    message: 'My theme {index, number}',
    context:
      'Default name pre-filled when a learner adds a new custom theme, where {index} is a number that keeps the name unique.',
  },
  customThemePreview: {
    message: 'Theme preview',
    context: 'Heading for the preview of the custom theme that is being created or edited',
  },
  thisIsASampleText: {
    message: 'This is a sample text.',
    context: 'Language specific sample text in the preview of the custom theme',
  },
  samplePreviewText: {
    message: 'The quick brown fox jumps over the lazy dog.',
    context: 'Language specific sample sentence shown in the preview of the custom theme',
  },
  linkPreviewText: {
    message: 'This is a link',
    context: 'Text that is a link in the preview of the custom theme',
  },
  themeBackgroundColorButtonDescription: {
    message: 'Background',
    context: 'Description of the button to change the background color of the custom theme',
  },
  themeTextColorButtonDescription: {
    message: 'Text',
    context: 'Description of the button to change the text color of the custom theme',
  },
  themeLinkColorButtonDescription: {
    message: 'Links',
    context: 'Description of the button to change the link color of the custom theme',
  },
  selectBackgroundColor: {
    message: 'Select background color',
    context: 'Aria label for the button to select the background color of the custom theme',
  },
  selectTextColor: {
    message: 'Select text color',
    context: 'Aria label for the button to select the text color of the custom theme',
  },
  selectLinkColor: {
    message: 'Select link color',
    context: 'Aria label for the button to select the link color of the custom theme',
  },

  // Color picker modal
  titleSelectBackground: {
    message: 'Select background color',
    context: 'Title of window that displays when a user tries to select a new background color.',
  },
  titleSelectText: {
    message: 'Select text color',
    context: 'Title of window that displays when a user tries to select a new text color.',
  },
  titleSelectLink: {
    message: 'Select link color',
    context: 'Title of window that displays when a user tries to select a new link color.',
  },
  titleSelectColor: {
    message: 'Select theme color',
    context: 'Title of window that displays when a user tries to select a new theme color.',
  },
  selectAction: {
    message: 'Select',
    context: 'Button that selects a color.',
  },

  // Theme list item
  edit: {
    message: 'Edit',
    context:
      "The EPUB reader allows learners to set the background of the reader to different shades of user preferred colors using the 'Custom Themes' option. This button allows learners to edit a theme.",
  },
  delete: {
    message: 'Delete',
    context:
      "The EPUB reader allows learners to set the background of the reader to different shades of user preferred colors using the 'Custom Themes' option. This button allows learners to delete a theme.",
  },
  setCustomTheme: {
    message: "Set custom theme '{themeName}'",
    context:
      "The EPUB reader allows learners to set the background of the reader to different shades of user preferred colors using the 'My themes' option. In this case it can be set to {themeName}.",
  },
  editCustomTheme: {
    message: "Edit custom theme '{themeName}'",
    context:
      "The EPUB reader allows learners to set the background of the reader to different shades of user preferred colors using the 'My themes' option. In this case it can be edited.",
  },
  deleteCustomTheme: {
    message: "Delete custom theme '{themeName}'",
    context:
      "The EPUB reader allows learners to set the background of the reader to different shades of user preferred colors using the 'My themes' option. In this case it can be deleted.",
  },

  // Delete confirmation modal
  titleDeleteTheme: {
    message: 'Delete theme',
    context: 'Title of window that displays when a user tries to delete a custom theme.',
  },
  confirmationQuestion: {
    message: `Are you sure you want to delete '{themeName}' from your device?`,
    context: 'Confirmation of delete message.',
  },
});
