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
    [ContentWizardErrors.TRANSFER_IN_PROGRESS]: 'transferInProgressError',
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
      transferInProgressError: 'A content transfer is currently in progress',
    },
  };

</script>


<style lang="stylus" scoped></style>
