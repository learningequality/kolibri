<template>

  <div>
    <SelectSyncSourceModal
      v-if="atSelectSource"
      @submit="handleSourceSubmit"
      @cancel="closeModal()"
    />

    <SelectAddressModalGroup
      v-else-if="atSelectAddress"
      :fetchAddressArgs="''"
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
      facilityForSync: {
        type: Object,
        required: true,
      },
    },
    data() {
      return {
        step: this.facilityForSync.dataset.registered ? Steps.SELECT_SOURCE : Steps.SELECT_ADDRESS,
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
        this.startPeerSync(data);
      },
      closeModal() {
        this.$emit('close');
      },
      startKdpSync() {
        this.startKdpSyncTask(this.facilityForSync.id).then(task => {
          this.$emit('success', task.id);
        });
      },
      startPeerSync(peerData) {
        this.startPeerSyncTask({
          facility: this.facilityForSync.id,
          facility_name: this.facilityForSync.name,
          device_name: peerData.device_name,
          device_id: peerData.id,
          baseurl: peerData.base_url,
        }).then(task => {
          this.$emit('success', task.id);
        });
      },
    },
  };

</script>


<style lang="scss" scoped></style>
