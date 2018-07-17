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

  import { mapState } from 'vuex';
  import { ContentWizardPages } from '../../../constants';
  import selectImportSourceModal from './SelectImportSourceModal';
  import selectDriveModal from './SelectDriveModal';

  export default {
    name: 'SelectTransferSourceModal',
    components: {
      selectImportSourceModal,
      selectDriveModal,
    },
    computed: {
      ...mapState({
        wizardPageName: ({ pageState }) => pageState.wizardState.pageName,
      }),
      atSelectImportSource() {
        return this.wizardPageName === ContentWizardPages.SELECT_IMPORT_SOURCE;
      },
      atSelectDrive() {
        return this.wizardPageName === ContentWizardPages.SELECT_DRIVE;
      },
    },
  };

</script>


<style lang="scss" scoped></style>
