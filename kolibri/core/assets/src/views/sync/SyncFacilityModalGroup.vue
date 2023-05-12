<template>

  <div>
    <SelectSyncSourceModal
      v-if="atSelectSource"
      :formDisabled="syncSubmitDisabled"
      @submit="handleSourceSubmit"
      @cancel="closeModal()"
    />

    <SelectDeviceModalGroup
      v-else-if="atSelectAddress"
      :filterByFacilityId="facilityForSync.id"
      :selectAddressDisabled="syncSubmitDisabled"
      @submit="handleAddressSubmit"
      @cancel="closeModal()"
    />
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import SelectDeviceModalGroup from './SelectDeviceModalGroup';
  import SelectSyncSourceModal from './SelectSyncSourceModal';

  const Steps = Object.freeze({
    SELECT_SOURCE: 'SELECT_SOURCE',
    SELECT_ADDRESS: 'SELECT_ADDRESS',
  });

  export default {
    name: 'SyncFacilityModalGroup',
    components: {
      SelectSyncSourceModal,
      SelectDeviceModalGroup,
    },
    mixins: [commonCoreStrings, commonSyncElements],
    props: {
      // If facility has not been KDP-registered, skip to SelectDeviceForm
      // and use facility ID to filter the selectable addresses
      facilityForSync: {
        type: Object,
        required: true,
      },
    },
    data() {
      return {
        step: null,
        syncSubmitDisabled: false,
        displaySkipOption: true,
      };
    },
    computed: {
      atSelectSource() {
        return !this.step;
      },
      atSelectAddress() {
        return this.step === Steps.SELECT_ADDRESS;
      },
    },
    methods: {
      handleSourceSubmit(data) {
        if (data.source === 'PEER') {
          this.step = Steps.SELECT_ADDRESS;
        } else {
          if (this.facilityForSync.dataset.registered) {
            this.$emit('syncKDP', this.facilityForSync);
          } else {
            this.$emit('register', this.displaySkipOption, this.facilityForSync);
          }
        }
      },
      handleAddressSubmit(data) {
        if (!data.device_name) {
          data.device_name = data.nickname;
        }
        this.$emit('syncPeer', data, this.facilityForSync);
      },
      closeModal() {
        this.$emit('close');
      },
    },
  };

</script>


<style lang="scss" scoped></style>
