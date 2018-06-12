<template>

  <ui-alert
    type="error"
    :dismissible="false"
  >
    {{ alertText }}
  </ui-alert>

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
  };

  export default {
    name: 'contentWizardUiAlert',
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
      transferInProgressError: 'A content transfer is currently in progress',
    },
  };

</script>


<style lang="stylus" scoped></style>
