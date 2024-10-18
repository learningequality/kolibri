import { createTranslator } from 'kolibri/utils/i18n';

export default createTranslator('ChannelUpdateStrings', {
  notAvailableFromDrives: {
    message: 'This channel was not found on any attached drives',
    context: "Error message that displays if channel can't be found on an external disk drive.",
  },
  notAvailableFromNetwork: {
    message: 'This channel was not found on any Kolibri server on your network',
    context:
      "Error message that displays if a channel can't be found on the Kolibri network. This may display when the user imports resources from a different device running Kolibri in their same local network, or from a Kolibri server hosted outside their LAN.\n\nKolibri will try to automatically detect other instances (peers) running in the same LAN. If detection is unsuccessful, this message displays.",
  },
  notAvailableFromStudio: {
    message: 'This channel was not found on Kolibri Studio',
    context: "Error message that displays if channel can't be found on Kolibri Studio.",
  },
});
