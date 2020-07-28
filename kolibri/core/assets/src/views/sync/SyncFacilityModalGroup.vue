<template>

  <div>
    <SelectSyncSourceModal
      v-if="atSelectSource"
      :formDisabled="syncSubmitDisabled"
      @submit="handleSourceSubmit"
      @cancel="closeModal()"
    />

    <SelectAddressModalGroup
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
  import SelectAddressModalGroup from './SelectAddressModalGroup';
  import SelectSyncSourceModal from './SelectSyncSourceModal';

  const Steps = Object.freeze({
    SELECT_SOURCE: 'SELECT_SOURCE',
    SELECT_ADDRESS: 'SELECT_ADDRESS',
  });

  export default {
    name: 'SyncFacilityModalGroup',
    components: {
      SelectSyncSourceModal,
      SelectAddressModalGroup,
    },
    mixins: [commonCoreStrings, commonSyncElements],
    props: {
      // If facility has not been KDP-registered, skip to SelectAddressForm
      // and use facility ID to filter the selectable addresses
      facilityForSync: {
        type: Object,
        required: true,
      },
    },
    data() {
      return {
        step: this.facilityForSync.dataset.registered ? Steps.SELECT_SOURCE : Steps.SELECT_ADDRESS,
        syncSubmitDisabled: false,
      };
    },
    computed: {
      atSelectSource() {
        return this.step === Steps.SELECT_SOURCE;
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
          this.startKdpSync();
        }
      },
      handleAddressSubmit(data) {
        if (!data.device_name) {
          data.device_name = data.nickname;
        }
        this.startPeerSync(data);
      },
      closeModal() {
        this.$emit('close');
      },
      startKdpSync() {
        this.syncSubmitDisabled = true;
        this.startKdpSyncTask({
          id: this.facilityForSync.id,
          name: this.facilityForSync.name,
        })
          .then(task => {
            this.$emit('success', task.id);
          })
          .catch(() => {
            this.$emit('failure');
          });
      },
      startPeerSync(peerData) {
        this.syncSubmitDisabled = true;
        this.startPeerSyncTask({
          facility: this.facilityForSync.id,
          facility_name: this.facilityForSync.name,
          device_name: peerData.device_name,
          device_id: peerData.id,
          baseurl: peerData.base_url,
        })
          .then(task => {
            this.$emit('success', task.id);
          })
          .catch(() => {
            this.$emit('failure');
          });
      },
    },
  };

</script>


<style lang="scss" scoped></style>
