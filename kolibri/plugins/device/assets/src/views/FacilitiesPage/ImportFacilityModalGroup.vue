<template>

  <div>
    <!-- Select Network Address Step -->
    <SelectAddressModalGroup
      v-if="atSelectAddress"
      @cancel="$emit('cancel')"
      @submit="handleAddressSubmit"
    />

    <!-- Select Facility Step -->
    <KModal
      v-else-if="atSelectFacility"
      :title="getCommonSyncString('selectFacilityTitle')"
      :submitText="coreString('continueAction')"
      :cancelText="coreString('cancelAction')"
      @submit="handleFacilitySubmit"
      @cancel="$emit('cancel')"
    >
      <p>
        {{ deviceInfoMsg }}
      </p>
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
      @submit="handleCredentialsSubmit"
      @cancel="$emit('cancel')"
    >
      <FacilityAdminCredentialsForm
        ref="credentialsForm"
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

  const Steps = Object.freeze({
    SELECT_ADDRESS: 'SELECT_ADDRESS',
    SELECT_FACILITY: 'SELECT_FACILITY',
    CREDENTIALS: 'CREDENTIALS',
  });

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
        step: Steps.SELECT_ADDRESS,
        facility: null,
        device: null,
        facilities: [],
        selectedFacilityId: '',
      };
    },
    computed: {
      atSelectAddress() {
        return this.step === Steps.SELECT_ADDRESS;
      },
      atSelectFacility() {
        return this.step === Steps.SELECT_FACILITY;
      },
      atCredentials() {
        return this.step === Steps.CREDENTIALS;
      },
      deviceInfoMsg() {
        if (this.atSelectFacility) {
          return this.coreString('commaSeparatedPair', {
            item1: this.formatNameAndId(this.device.device_name, this.device.id),
            item2: this.device.base_url,
          });
        }
        return '';
      },
    },
    methods: {
      handleAddressSubmit(device) {
        this.device = { ...device };
        this.step = Steps.SELECT_FACILITY;
        this.fetchNetworkLocationFacilities(this.device.id).then(data => {
          this.facilities = [...data.facilities];
        });
      },
      handleFacilitySubmit() {
        this.facility = this.facilities.find(facility => facility.id === this.selectedFacilityId);
        this.step = Steps.CREDENTIALS;
      },
      handleCredentialsSubmit() {
        this.$refs.credentialsForm.submitCredentials().then(taskId => {
          if (taskId) {
            this.$emit('success', taskId);
          }
        });
      },
    },
  };

</script>


<style lang="scss" scoped></style>
