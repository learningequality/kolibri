<template>

  <KModal
    :title="currentTitle"
    @submit="handleSubmit"
    @cancel="$emit('cancel')"
  >
    <p v-if="atSelectSource">
      Select source form
    </p>
    <p v-else-if="atSelectAddress">
      Select facility form
    </p>

    <template #actions>
      <KButton
        :text="coreString('cancelAction')"
        appearance="flat-button"
        @click="$emit('cancel')"
      />
      <KButton
        :text="coreString('continueAction')"
        appearance="raised-button"
        primary
        @click="handleSubmit"
      />
    </template>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';

  const SELECT_SOURCE = 'SELECT_SOURCE';
  const SELECT_ADDRESS = 'SELECT_ADDRESS';

  export default {
    name: 'SyncFacilityModal',
    components: {},
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
      currentTitle() {
        if (this.atSelectSource) {
          return this.getCommonSyncString('selectSourceTitle');
        } else if (this.atSelectAddress) {
          return this.getCommonSyncString('selectNetworkAddressTitle');
        }
        return '';
      },
    },
    methods: {
      handleSubmit() {
        if (this.atSelectSource) {
          this.step = SELECT_ADDRESS;
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
