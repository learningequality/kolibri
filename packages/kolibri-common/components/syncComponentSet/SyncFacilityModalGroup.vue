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

    <RegisterFacilityModal
      v-else-if="atRegister"
      :displaySkipOption="true"
      @success="handleValidateSuccess"
      @cancel="closeModal"
      @skip="emitKdpSync"
    />
    <ConfirmationRegisterModal
      v-else-if="atConfirmation"
      :targetFacility="facilityForSync"
      :projectName="kdpProject.name"
      :token="kdpProject.token"
      :successOnAlreadyRegistered="true"
      @success="emitKdpSync"
      @cancel="closeModal"
    />
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import commonSyncElements from 'kolibri-common/mixins/commonSyncElements';
  import SelectDeviceModalGroup from './SelectDeviceModalGroup';
  import SelectSyncSourceModal from './SelectSyncSourceModal';
  import RegisterFacilityModal from './RegisterFacilityModal';
  import ConfirmationRegisterModal from './ConfirmationRegisterModal';

  const Steps = Object.freeze({
    SELECT_SOURCE: 'SELECT_SOURCE',
    SELECT_ADDRESS: 'SELECT_ADDRESS',
    REGISTER_FACILITY: 'REGISTER_FACILITY',
    CONFIRMATION_REGISTER: 'CONFIRMATION_REGISTER',
  });

  export default {
    name: 'SyncFacilityModalGroup',
    components: {
      ConfirmationRegisterModal,
      RegisterFacilityModal,
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
        step: Steps.SELECT_SOURCE,
        syncSubmitDisabled: false,
        kdpProject: null, // { name, token }
      };
    },
    computed: {
      atSelectSource() {
        return this.step === Steps.SELECT_SOURCE;
      },
      atSelectAddress() {
        return this.step === Steps.SELECT_ADDRESS;
      },
      atRegister() {
        return this.step === Steps.REGISTER_FACILITY;
      },
      atConfirmation() {
        return this.step === Steps.CONFIRMATION_REGISTER;
      },
    },
    methods: {
      handleSourceSubmit(data) {
        if (data.source === 'PEER') {
          this.step = Steps.SELECT_ADDRESS;
        } else {
          if (this.facilityForSync.dataset.registered) {
            this.emitKdpSync();
          } else {
            this.step = Steps.REGISTER_FACILITY;
          }
        }
      },
      handleAddressSubmit(data) {
        if (!data.device_name) {
          data.device_name = data.nickname;
        }
        this.$emit('syncPeer', data, this.facilityForSync);
      },
      handleValidateSuccess({ name, token }) {
        this.kdpProject = { name, token };
        this.step = Steps.CONFIRMATION_REGISTER;
      },
      closeModal() {
        this.$emit('close');
      },
      emitKdpSync() {
        this.$emit('syncKDP', this.facilityForSync);
      },
    },
  };

</script>


<style lang="scss" scoped></style>
