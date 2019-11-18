<template>

  <div>
    <SelectImportSourceModal
      v-if="atSelectImportSource"
      :manageMode="manageMode"
      @submit="nextState"
      @cancel="emitCancel"
    />
    <SelectDriveModal
      v-if="atSelectDrive"
      :manageMode="manageMode"
      @submit="nextState"
      @cancel="emitCancel"
    />
    <SelectNetworkAddressModal
      v-if="atSelectNetworkAddress"
      :manageMode="manageMode"
      @submit="nextState"
      @cancel="emitCancel"
    />

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
      // Modals will only trigger this callback in manage mode. In vuex-based top-level
      // workflow, the child modals still trigger vuex actions to progress in wizard.
      nextState(data) {
        if (this.atSelectImportSource) {
          if (data.source === ContentSources.KOLIBRI_STUDIO) {
            this.$emit('submit', { source: ContentSources.KOLIBRI_STUDIO });
          } else if (data.source === ContentSources.LOCAL_DRIVE) {
            this.$emit('update:pageName', ContentWizardPages.SELECT_DRIVE);
          } else if (data.source === ContentSources.PEER_KOLIBRI_SERVER) {
            this.$emit('update:pageName', ContentWizardPages.SELECT_NETWORK_ADDRESS);
          }
        } else if (this.atSelectDrive) {
          this.$emit('submit', { source: ContentSources.LOCAL_DRIVE, drive_id: data.driveId });
        } else if (this.atSelectNetworkAddress) {
          this.$emit('submit', {
            source: ContentSources.PEER_KOLIBRI_SERVER,
            address_id: data.addressId,
          });
        }
      },
    },
  };

</script>


<style lang="scss" scoped></style>
