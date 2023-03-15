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
  newEnabledPluginsState: {
    message:
      'When you uncheck a page, it will become invisible to users even if they have permission to access it.',
    context: 'Description for restarting the server.',
  },
  unlistedChannelLabel: {
    message: 'Unlisted channel',
    context:
      'Label for channels that are not listed as public and require knowing a special token to import them',
  },
  notEnoughSpaceForChannelsWarning: {
    message:
      'Not enough space available on your device. Free up disk space or select fewer resources',

    context:
      "Warning that appears when there is not enough space on the user's device for the selected resources",
  },
  permissionsLabel: {
    message: 'Permissions',
    context: "Title of tab in 'Device' section.",
  },
  primaryStorageLabel: {
    message: 'Newly downloaded resources will be added to the primary storage location',
    context: 'Label for primary storage location.',
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
