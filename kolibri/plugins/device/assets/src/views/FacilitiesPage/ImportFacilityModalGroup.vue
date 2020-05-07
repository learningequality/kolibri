<template>

  <div>
    <!-- Select Network Address Step -->
    <SelectAddressModalGroup
      v-if="atSelectAddress"
      @cancel="$emit('cancel')"
      @submit="handleSubmit"
    />

    <!-- Select Facility Step -->
    <KModal
      v-else-if="atSelectFacility"
      :title="getCommonSyncString('selectFacilityTitle')"
      :submitText="coreString('continueAction')"
      :cancelText="coreString('cancelAction')"
      @submit="handleSubmit"
      @cancel="$emit('cancel')"
    >
      <RadioButtonGroup
        v-if="atSelectFacility"
        :items="facilities"
        :currentValue.sync="selectedFacilityId"
        :itemLabel="x => formatNameAndId(x.name, x.id)"
        :itemValue="x => x.id"
        :facilities="facilities"
      />
    </KModal>

    <!-- Admin Credentials Step -->
    <KModal
      v-else-if="atCredentials"
      :title="getCommonSyncString('adminCredentialsTitle')"
      :submitText="coreString('continueAction')"
      :cancelText="coreString('cancelAction')"
      @submit="handleSubmit"
      @cancel="$emit('cancel')"
    >
      <FacilityAdminCredentialsForm
        v-bind="{ facility, device }"
      />
    </KModal>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import {
    SelectAddressModalGroup,
    FacilityAdminCredentialsForm,
    RadioButtonGroup,
  } from 'kolibri.coreVue.componentSets.sync';

  const SELECT_ADDRESS = 'SELECT_ADDRESS';
  const SELECT_FACILITY = 'SELECT_FACILITY';
  const CREDENTIALS = 'CREDENTIALS';

  const fakeFacilities = [
    {
      id: 'D81C',
      name: 'Atkinson Hall',
    },
    {
      id: '2A59',
      name: 'Price Center',
    },
  ];

  export default {
    name: 'ImportFacilityModalGroup',
    components: {
      SelectAddressModalGroup,
      RadioButtonGroup,
      FacilityAdminCredentialsForm,
    },
    mixins: [commonCoreStrings, commonSyncElements],
    props: {},
    data() {
      return {
        step: SELECT_ADDRESS,
        facility: {
          name: 'York Hall',
          id: '81b2',
        },
        device: {
          name: 'LINUX 3',
          id: 'ee31',
        },
        facilities: fakeFacilities,
        selectedFacilityId: '',
        address: {},
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
    },
    methods: {
      handleSubmit(data = {}) {
        if (this.atSelectAddress) {
          this.address = { ...data };
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
