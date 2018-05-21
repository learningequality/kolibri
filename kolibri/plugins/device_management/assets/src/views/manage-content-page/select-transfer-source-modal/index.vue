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
  import { ContentWizardPages } from '../../../constants';
  import { transitionWizardPage, CANCEL } from '../../../state/actions/contentWizardActions';
  // TODO rename file
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
        // TODO rename constant
        return this.wizardPageName === ContentWizardPages.SELECT_IMPORT_SOURCE;
      },
      atSelectDrive() {
        return this.wizardPageName === ContentWizardPages.SELECT_DRIVE;
      },
      currentTitle() {
        if (this.atSelectImportSource) {
          return this.$tr('selectLocalRemoteSourceTitle');
        }
        return this.$tr('selectDriveTitle');
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
        return this.transitionWizardPage(CANCEL);
      },
    },
    vuex: {
      getters: {
        wizardPageName: ({ pageState }) => pageState.wizardState.pageName,
      },
      actions: {
        transitionWizardPage,
      },
    },
    $trs: {
      selectDriveTitle: 'Select a drive',
      selectLocalRemoteSourceTitle: 'Import from',
    },
  };

</script>


<style lang="stylus" scoped></style>
