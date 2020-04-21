<template>

  <KModal
    :title="currentTitle"
    @submit="handleSubmit"
    @cancel="$emit('cancel')"
  >
    <p v-if="atSelectAddress">
      Select address form
    </p>
    <p v-else-if="atSelectFacility">
      Select facility form
    </p>
    <p v-else-if="atCredentials">
      Admin credentials form
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

  const SELECT_ADDRESS = 'SELECT_ADDRESS';
  const SELECT_FACILITY = 'SELECT_FACILITY';
  const CREDENTIALS = 'CREDENTIALS';

  export default {
    name: 'ImportFacilityModal',
    components: {},
    mixins: [commonCoreStrings, commonSyncElements],
    props: {},
    data() {
      return {
        step: SELECT_ADDRESS,
      };
    },
    computed: {
      atSelectAddress() {
        return this.step === SELECT_ADDRESS;
      },
      atSelectFacility() {
        return this.step === SELECT_FACILITY;
      },
      atCredentials() {
        return this.step === CREDENTIALS;
      },
      currentTitle() {
        if (this.atSelectAddress) {
          return this.getCommonSyncString('selectNetworkAddressTitle');
        } else if (this.atSelectFacility) {
          return this.getCommonSyncString('selectFacilityTitle');
        } else if (this.atCredentials) {
          return this.getCommonSyncString('adminCredentialsTitle');
        }
        return '';
      },
    },
    methods: {
      handleSubmit() {
        if (this.atSelectAddress) {
          this.step = SELECT_FACILITY;
        } else if (this.atSelectFacility) {
          this.step = CREDENTIALS;
        } else if (this.atCredentials) {
          this.authenticateCredentials();
        }
      },
      authenticateCredentials() {
        return Promise.resolve().then(() => {
          this.$emit('cancel');
        });
      },
    },
  };

</script>


<style lang="scss" scoped></style>
