<template>

  <UiAlert
    type="error"
    :dismissible="false"
  >
    {{ alertText }}
  </UiAlert>

</template>


<script>

  import UiAlert from 'kolibri-design-system/lib/keen/UiAlert';
  import { ContentWizardErrors } from '../../constants';

  const errorToTrStringMap = {
    [ContentWizardErrors.CHANNEL_NOT_FOUND_ON_DRIVE]: 'channelNotFoundOnDriveError',
    [ContentWizardErrors.CHANNEL_NOT_FOUND_ON_SERVER]: 'channelNotFoundOnServerError',
    [ContentWizardErrors.CHANNEL_NOT_FOUND_ON_STUDIO]: 'channelNotFoundError',
    [ContentWizardErrors.DRIVE_IS_NOT_WRITEABLE]: 'driveNotWritableError',
    [ContentWizardErrors.DRIVE_NOT_FOUND]: 'driveUnavailableError',
    [ContentWizardErrors.DRIVE_ERROR]: 'driveError',
    [ContentWizardErrors.TRANSFER_IN_PROGRESS]: 'transferInProgressError',
    // Recycling 'channel not found error'
    [ContentWizardErrors.TREEVIEW_LOADING_ERROR]: 'channelNotFoundError',
    [ContentWizardErrors.NETWORK_LOCATION_DOES_NOT_EXIST]: 'networkLocationDoesNotExist',
    [ContentWizardErrors.NETWORK_LOCATION_UNAVAILABLE]: 'networkLocationUnavailable',
    [ContentWizardErrors.KOLIBRI_STUDIO_UNAVAILABLE]: 'kolibriStudioUnavailable',
    [ContentWizardErrors.NETWORK_LOCATION_DOES_NOT_HAVE_CHANNEL]:
      'networkLocationDoesNotHaveChannel',
  };

  export default {
    name: 'ContentWizardUiAlert',
    components: {
      UiAlert,
    },
    props: {
      errorType: {
        type: String,
        default: null,
      },
    },
    computed: {
      alertText() {
        return this.$tr(errorToTrStringMap[this.errorType]) || '';
      },
    },
    $trs: {
      channelNotFoundError: {
        message: 'Channel not found',
        context: 'Error message that displays if a channel cannot be found.',
      },
      channelNotFoundOnDriveError: {
        message: 'Channel not found on drive',
        context:
          'Error message that displays if a channel cannot be found on an external disk drive.\n',
      },
      channelNotFoundOnServerError: {
        message: 'Channel is not available to export from server',
        context: 'Error message.',
      },
      driveUnavailableError: {
        message: 'Drive not found or is disconnected',
        context: 'Error message.',
      },
      driveNotWritableError: {
        message: 'Drive is not writable',
        context:
          'Error message that displays if the drive being used is not capable of having new data written on it.',
      },
      driveError: {
        message: 'There was a problem accessing the drives connected to the server',
        context: 'Error message.',
      },
      networkLocationDoesNotExist: {
        message: 'The device with this ID does not exist',
        context: 'Error message.\n',
      },
      networkLocationUnavailable: {
        message: 'The Kolibri server on the selected device is not available at the moment',
        context: 'Error message.\n',
      },
      transferInProgressError: {
        message: 'A transfer is currently in progress',
        context: 'Error message.\n',
      },
      kolibriStudioUnavailable: {
        message: 'Kolibri Studio is unavailable',
        context: 'Error message.',
      },
      networkLocationDoesNotHaveChannel: {
        message: 'The device with this ID does not have the desired channel',
        context: 'Error message.\n',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
