<template>

  <div>
    <SelectSyncSourceModal
      v-if="atSelectSource"
      @submit="handleSubmit"
      @cancel="$emit('cancel')"
    />

    <SelectAddressModalGroup
      v-else-if="atSelectAddress"
      :fetchAddressArgs="''"
      @submit="handleSubmit"
      @cancel="$emit('cancel')"
    />
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import { SelectAddressModalGroup } from 'kolibri.coreVue.componentSets.sync';
  import SelectSyncSourceModal from './SelectSyncSourceModal';

  const SELECT_SOURCE = 'SELECT_SOURCE';
  const SELECT_ADDRESS = 'SELECT_ADDRESS';

  export default {
    name: 'SyncFacilityModalGroup',
    components: {
      SelectSyncSourceModal,
      SelectAddressModalGroup,
    },
    mixins: [commonCoreStrings, commonSyncElements],
    props: {},
    data() {
      return {
        step: SELECT_SOURCE,
      };
    },
    computed: {
      atSelectSource() {
        return this.step === SELECT_SOURCE;
      },
      atSelectAddress() {
        return this.step === SELECT_ADDRESS;
      },
    },
    methods: {
      handleSubmit(data) {
        if (this.atSelectSource) {
          if (data.source === 'PEER') {
            this.step = SELECT_ADDRESS;
          } else {
            this.startSync();
          }
        } else if (this.atSelectAddress) {
          this.startSync();
        }
      },
      startSync() {
        return Promise.resolve().then(() => {
          this.$emit('cancel');
        });
      },
    },
  };

</script>


<style lang="scss" scoped></style>
