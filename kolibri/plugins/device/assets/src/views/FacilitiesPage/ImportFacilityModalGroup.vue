<template>

  <div>
    <!-- Select Network Address Step -->
    <SelectDeviceModalGroup
      v-if="atSelectAddress"
      @submit="handleAddressSubmit"
      @cancel="closeModal"
    />

    <!-- Select Facility Step -->
    <SelectFacilityModal
      v-else-if="atSelectFacility"
      :device="device"
      @submit="handleFacilitySubmit"
      @cancel="closeModal"
    />

    <!-- Admin Credentials Step -->
    <FacilityAdminCredentialsModal
      v-else-if="atCredentials"
      :facility="facility"
      :device="device"
      @submit="handleCredentialsSubmit"
      @cancel="closeModal"
    />
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import commonSyncElements from 'kolibri-common/mixins/commonSyncElements';
  import SelectDeviceModalGroup from 'kolibri-common/components/syncComponentSet/SelectDeviceModalGroup';
  import SelectFacilityModal from './SelectFacilityModal';
  import FacilityAdminCredentialsModal from './FacilityAdminCredentialsModal';

  const Steps = Object.freeze({
    SELECT_ADDRESS: 'SELECT_ADDRESS',
    SELECT_FACILITY: 'SELECT_FACILITY',
    CREDENTIALS: 'CREDENTIALS',
  });

  export default {
    name: 'ImportFacilityModalGroup',
    components: {
      SelectDeviceModalGroup,
      SelectFacilityModal,
      FacilityAdminCredentialsModal,
    },
    mixins: [commonCoreStrings, commonSyncElements],
    data() {
      return {
        step: Steps.SELECT_ADDRESS,
        facility: {},
        device: {},
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
    },
    methods: {
      handleAddressSubmit(address) {
        this.device = {
          id: address.id,
          name: address.nickname || address.device_name,
          baseurl: address.base_url,
        };
        this.step = Steps.SELECT_FACILITY;
      },
      handleFacilitySubmit(facility) {
        this.facility = facility;
        this.step = Steps.CREDENTIALS;
      },
      handleCredentialsSubmit(taskId) {
        this.$emit('success', taskId);
      },
      closeModal() {
        this.$emit('cancel');
      },
    },
  };

</script>


<style lang="scss" scoped></style>
