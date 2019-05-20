<template>

  <KModal
    :title="$tr('facilitySelectionModalHeader')"
    :submitText="$tr('submitFacilitySelectionButtonPrompt')"
    :cancelText="$tr('close')"
    @submit="submitAndClose"
    @cancel="$emit('cancel')"
  >
    {{ $tr('facilitySelectionPrompt') }}

    <KRadioButton
      v-for="facility in facilities"
      :key="facility.id"
      v-model="selectedFacility"
      :label="facility.name"
      :value="facility.id"
    />
  </KModal>

</template>


<script>

  import { mapGetters, mapActions, mapMutations } from 'vuex';
  import KModal from 'kolibri.coreVue.components.KModal';
  import KRadioButton from 'kolibri.coreVue.components.KRadioButton';

  export default {
    name: 'FacilityModal',
    components: {
      KModal,
      KRadioButton,
    },
    data() {
      return {
        // currentFacilityId uses session, with is anonymous in sign-in-page
        selectedFacility: this.$store.state.facilityId,
      };
    },
    computed: {
      ...mapGetters(['facilities']),
    },
    methods: {
      ...mapActions(['getFacilityConfig']),
      ...mapMutations({
        setFacilityId: 'SET_FACILITY_ID',
        setLoginError: 'CORE_SET_LOGIN_ERROR',
      }),
      submitAndClose() {
        this.setFacilityId(this.selectedFacility);
        this.setLoginError('');
        this.getFacilityConfig(this.selectedFacility).then(() => this.$emit('submit'));
      },
    },
    $trs: {
      facilitySelectionPrompt: 'Which facility do you want to sign in to?',
      submitFacilitySelectionButtonPrompt: 'Select',
      facilitySelectionModalHeader: 'Select a facility',
      close: 'Close',
    },
  };

</script>


<style lang="scss" scoped></style>
