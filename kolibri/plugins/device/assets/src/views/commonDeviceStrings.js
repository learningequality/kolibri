import { createTranslator } from 'kolibri.utils.i18n';

const deviceStrings = createTranslator('CommonDeviceStrings', {
  emptyTasksMessage: {
    message: 'There are no tasks to display',
    context: 'Shown as an empty state on pages that display device tasks',
  },
  newResourceLabel: {
    message: 'New',
    context: 'Label that is shown with resources that were added after upgrading the channel',
  },
  newChannelLabel: {
    message: 'New',
    context: 'Refers to CHANNEL; indicates that it was recently updated, imported, and unlocked',
  },
  unlistedChannelLabel: {
    message: 'Unlisted channel',
    context:
      'Label for channels that are not listed as public and require knowing a special token to import them',
  },
});

export default {
  methods: {
    deviceString(key, args) {
      return deviceStrings.$tr(key, args);
    },
  },
};
