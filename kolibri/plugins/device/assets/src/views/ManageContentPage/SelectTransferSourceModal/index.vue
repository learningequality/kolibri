<template>

  <div>
    <SelectImportSourceModal
      v-if="atSelectImportSource"
      :manageMode="manageMode"
      @submit="nextState"
      @cancel="emitCancel"
    />
    <SelectDriveModal v-if="atSelectDrive" :manageMode="manageMode" />
    <SelectNetworkAddressModal v-if="atSelectNetworkAddress" :manageMode="manageMode" />
  </div>

</template>


<script>

  import { ContentWizardPages, ContentSources } from '../../../constants';
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
      manageMode: {
        type: Boolean,
        default: false,
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
    mounted() {
      if (!this.pageName) {
        this.$emit('update:pageName', ContentWizardPages.SELECT_IMPORT_SOURCE);
      }
    },
    methods: {
      emitCancel() {
        this.$emit('cancel');
      },
      // In manage mode, 'pageName' is synced with ManageChannelsPage
      nextState(data) {
        if (this.pageName === ContentWizardPages.SELECT_IMPORT_SOURCE) {
          if (data.source === ContentSources.KOLIBRI_STUDIO) {
            this.$emit('submit', { source: ContentSources.KOLIBRI_STUDIO });
          }
        }
      },
    },
  };

</script>


<style lang="scss" scoped></style>
