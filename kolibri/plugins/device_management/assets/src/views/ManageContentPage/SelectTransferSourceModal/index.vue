<template>

  <div>
    <SelectImportSourceModal
      v-if="atSelectImportSource"
      ref="selectImportSourceModal"
    />
    <SelectDriveModal
      v-if="atSelectDrive"
      ref="selectDriveModal"
    />
  </div>

</template>


<script>

  import { ContentWizardPages } from '../../../constants';
  import SelectImportSourceModal from './SelectImportSourceModal';
  import SelectDriveModal from './SelectDriveModal';

  export default {
    name: 'SelectTransferSourceModal',
    components: {
      SelectImportSourceModal,
      SelectDriveModal,
    },
    props: {
      pageName: {
        type: String,
      },
    },
    computed: {
      atSelectImportSource() {
        return this.pageName === ContentWizardPages.SELECT_IMPORT_SOURCE;
      },
      atSelectDrive() {
        return this.pageName === ContentWizardPages.SELECT_DRIVE;
      },
    },
  };

</script>


<style lang="scss" scoped></style>
