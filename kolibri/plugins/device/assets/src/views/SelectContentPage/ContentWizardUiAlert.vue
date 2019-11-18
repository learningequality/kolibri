<template>

  <UiAlert
    type="error"
    :dismissible="false"
  >
    {{ alertText }}
  </UiAlert>

</template>


<script>

  import UiAlert from 'keen-ui/src/UiAlert';
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
      },
    },
    computed: {
      alertText() {
        return this.$tr(errorToTrStringMap[this.errorType]) || '';
      },
    },
    $trs: {
      channelNotFoundError: 'Channel not found',
      channelNotFoundOnDriveError: 'Channel not found on drive',
      channelNotFoundOnServerError: 'Channel is not available to export from server',
      driveUnavailableError: 'Drive not found or is disconnected',
      driveNotWritableError: 'Drive is not writable',
      driveError: 'There was a problem accessing the drives connected to the server',
      networkLocationDoesNotExist: 'The device with this ID does not exist',
      networkLocationUnavailable:
        'The Kolibri server on the selected device is not available at the moment',
      transferInProgressError: 'A transfer is currently in progress',
      kolibriStudioUnavailable: 'Kolibri Studio is unavailable',
      networkLocationDoesNotHaveChannel:
        'The device with this ID does not have the desired channel',
    },
  };

</script>


<style lang="scss" scoped></style>
