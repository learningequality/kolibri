<template>

  <div>
    <SelectSyncSourceModal
      v-if="atSelectSource"
      @submit="handleSubmit"
      @cancel="closeModal()"
    />

    <SelectAddressModalGroup
      v-else-if="atSelectAddress"
      :fetchAddressArgs="''"
      @submit="handleSubmit"
      @cancel="closeModal()"
    />
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import { SelectAddressModalGroup } from 'kolibri.coreVue.componentSets.sync';
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
        step: Steps.SELECT_SOURCE,
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
      handleSubmit(data) {
        if (this.atSelectSource) {
          if (data.source === 'PEER') {
            this.step = Steps.SELECT_ADDRESS;
          } else {
            this.startSync();
          }
        } else if (this.atSelectAddress) {
          this.startSync();
        }
      },
      closeModal() {
        this.$emit('close');
      },
      startSync() {
        this.startKdpSyncTask(this.facilityForSync.id).then(task => {
          this.$emit('success', task.id);
        });
      },
    },
  };

</script>


<style lang="scss" scoped></style>
