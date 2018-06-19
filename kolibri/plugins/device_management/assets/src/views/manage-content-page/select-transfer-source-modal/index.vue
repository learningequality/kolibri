<template>

  <div>
    <select-import-source-modal
      v-if="atSelectImportSource"
      ref="selectImportSourceModal"
    />
    <select-drive-modal
      v-if="atSelectDrive"
      ref="selectDriveModal"
    />
  </div>

</template>


<script>

  import { ContentWizardPages } from '../../../constants';
  import selectImportSourceModal from './select-import-source-modal';
  import selectDriveModal from './select-drive-modal';

  export default {
    name: 'selectTransferSourceModal',
    components: {
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
    },
    vuex: {
      getters: {
        wizardPageName: ({ pageState }) => pageState.wizardState.pageName,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
