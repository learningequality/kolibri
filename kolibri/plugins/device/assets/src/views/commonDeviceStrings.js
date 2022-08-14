import { createTranslator } from 'kolibri.utils.i18n';

const deviceStrings = createTranslator('CommonDeviceStrings', {
  deviceManagementTitle: {
    message: 'Device',
    context:
      'The device is the physical or virtual machine that has the Kolibri server installed on it.',
  },
  emptyTasksMessage: {
    message: 'There are no tasks to display',
    context: 'Shown as an empty state on pages that display device tasks',
  },
  newResourceLabel: {
    message: 'New',
    context: 'Label that is shown with resources that were added after upgrading the channel.',
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

/**
 * @param {string} key Key mapped to a string above
 * @param {args} Args that would be passed to a string deviced with ICU message syntax
 * @returns {string}
 */
export function deviceString(key, args) {
  return deviceStrings.$tr(key, args);
}

export default {
  methods: { deviceString },
};
