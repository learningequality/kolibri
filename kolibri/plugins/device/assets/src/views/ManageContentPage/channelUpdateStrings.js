import { createTranslator } from 'kolibri.utils.i18n';

export default createTranslator('ChannelUpdateStrings', {
  notAvailableFromDrives: {
    message: 'This channel was not found on any attached drives',
    context: "Error message that displays if channel can't be found on an external disk drive.",
  },
  notAvailableFromNetwork: {
    message: 'This channel was not found on other instances of Kolibri',
    context: "Error message that displays if channel can't be found on the Kolibri network.",
  },
  notAvailableFromStudio: {
    message: 'This channel was not found on Kolibri Studio',
    context: "Error message that displays if channel can't be found on Kolibri Studio.",
  },
});
