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
  import { ContentWizardErrors } from '../../state/actions/contentWizardActions';

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
        switch (this.errorType) {
          case ContentWizardErrors.CHANNEL_NOT_FOUND_ON_DRIVE:
            return this.$tr('channelNotFoundOnDriveError');
          case ContentWizardErrors.CHANNEL_NOT_FOUND_ON_SERVER:
            return this.$tr('channelNotFoundOnServerError');
          case ContentWizardErrors.CHANNEL_NOT_FOUND_ON_STUDIO:
            return this.$tr('channelNotFoundError');
          case ContentWizardErrors.DRIVE_IS_NOT_WRITEABLE:
            return this.$tr('driveNotWritableError');
          case ContentWizardErrors.DRIVE_NOT_FOUND:
            return this.$tr('driveUnavailableError');
          case ContentWizardErrors.TRANSFER_IN_PROGRESS:
            return this.$tr('transferInProgressError');
          default:
            return '';
        }
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
