<template>

  <k-modal
    :title="$tr('facilitySelectionModalHeader')"
    :submitText="$tr('submitFacilitySelectionButtonPrompt')"
    :cancelText="$tr('close')"
    @submit="submitAndClose"
    @cancel="emitClose"
  >
    {{ $tr('facilitySelectionPrompt') }}

    <k-radio-button
      v-for="facility in facilities"
      v-model="selectedFacility"
      :key="facility.id"
      :label="facility.name"
      :value="facility.id"
    />
  </k-modal>

</template>


<script>

  import { mapState, mapGetters, mapActions, mapMutations } from 'vuex';
  import kModal from 'kolibri.coreVue.components.kModal';
  import kRadioButton from 'kolibri.coreVue.components.kRadioButton';
  import kButton from 'kolibri.coreVue.components.kButton';

  export default {
    name: 'facilityModal',
    components: {
      kModal,
      kRadioButton,
      kButton,
    },
    data() {
      return {
        selectedFacility: this.currentFacilityId,
      };
    },
    computed: {
      ...mapGetters(['facilities']),
      ...mapState({
        // currentFacilityId uses session, with is anonymous in sign-in-page
        currentFacilityId: 'facilityId',
      }),
    },
    methods: {
      ...mapActions(['getFacilityConfig']),
      ...mapMutations({
        setFacilityId: 'SET_FACILITY_ID',
        setLoginError: 'CORE_SET_LOGIN_ERROR',
      }),
      emitClose() {
        this.$emit('close');
      },
      submitAndClose() {
        this.setFacilityId(this.selectedFacility);
        this.setLoginError('');
        this.getFacilityConfig(this.selectedFacility).then(this.emitClose);
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


<style lang="stylus" scoped></style>
