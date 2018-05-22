<template>

  <core-modal
    :title="currentTitle"
    :enableBgClickCancel="false"
    width="400px"
    @enter="goForward"
    @cancel="cancel"
  >
    <select-import-source-modal
      v-if="atSelectImportSource"
      ref="selectImportSourceModal"
      @cancel="cancel"
    />
    <select-drive-modal
      v-if="atSelectDrive"
      ref="selectDriveModal"
      @cancel="cancel"
    />
  </core-modal>

</template>


<script>

  import coreModal from 'kolibri.coreVue.components.coreModal';
  import { ContentWizardPages, TransferTypes } from '../../../constants';
  import { resetContentWizardState } from '../../../state/actions/contentWizardActions';
  import selectImportSourceModal from './select-import-source-modal';
  import selectDriveModal from './select-drive-modal';

  export default {
    name: 'selectTransferSourceModal',
    components: {
      coreModal,
      selectImportSourceModal,
      selectDriveModal,
    },
    computed: {
      atSelectImportSource() {
        return this.wizardPageName === ContentWizardPages.SELECT_IMPORT_SOURCE;
      },
      atSelectDrive() {
        return this.wizardPageName === ContentWizardPages.SELECT_DRIVE;
      },
      currentTitle() {
        if (this.atSelectImportSource) {
          return this.$tr('selectLocalRemoteSourceTitle');
        } else {
          if (this.transferType === TransferTypes.LOCALEXPORT) {
            return this.$tr('selectExportDestinationTitle');
          }
          return this.$tr('selectDriveTitle');
        }
      },
    },
    methods: {
      goForward() {
        if (this.atSelectImportSource) {
          return this.$refs.selectImportSourceModal.goForward();
        } else {
          return this.$refs.selectDriveModal.goForward();
        }
      },
      cancel() {
        return this.resetContentWizardState();
      },
    },
    vuex: {
      getters: {
        wizardPageName: ({ pageState }) => pageState.wizardState.pageName,
        transferType: ({ pageState }) => pageState.wizardState.transferType,
      },
      actions: {
        resetContentWizardState,
      },
    },
    $trs: {
      selectDriveTitle: 'Select a drive',
      selectLocalRemoteSourceTitle: 'Import from',
      selectExportDestinationTitle: 'Select an export destination',
    },
  };

</script>


<style lang="stylus" scoped></style>
