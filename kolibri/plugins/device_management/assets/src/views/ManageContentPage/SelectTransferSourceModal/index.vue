<template>

  <div>
    <SelectImportSourceModal v-if="atSelectImportSource" />
    <SelectDriveModal v-if="atSelectDrive" />
    <SelectNetworkAddressModal v-if="atSelectNetworkAddress" />
  </div>

</template>


<script>

  import { ContentWizardPages } from '../../../constants';
  import SelectNetworkAddressModal from '../SelectNetworkAddressModal';
  import SelectImportSourceModal from './SelectImportSourceModal';
  import SelectDriveModal from './SelectDriveModal';

  export default {
    name: 'SelectTransferSourceModal',
    components: {
      SelectDriveModal,
      SelectImportSourceModal,
      SelectNetworkAddressModal,
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
      atSelectNetworkAddress() {
        return this.pageName === ContentWizardPages.SELECT_NETWORK_ADDRESS;
      },
    },
  };

</script>


<style lang="scss" scoped></style>
