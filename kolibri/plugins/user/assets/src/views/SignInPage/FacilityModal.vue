<template>

  <KModal
    :title="$tr('facilitySelectionModalHeader')"
    :submitText="$tr('submitFacilitySelectionButtonPrompt')"
    @submit="submitAndClose"
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
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'FacilityModal',
    mixins: [commonCoreStrings],
    data() {
      const facilityId = this.$store.state.facilityId || this.$store.getters.facilities[0].id;
      return {
        // currentFacilityId uses session, with is anonymous in sign-in-page
        selectedFacility: facilityId,
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
        this.$store.commit('CORE_SET_SESSION', {
          facility_id: this.selectedFacility,
        });
        this.setLoginError('');
        this.getFacilityConfig(this.selectedFacility).then(() => this.$emit('submit'));
      },
    },
    $trs: {
      facilitySelectionPrompt: 'Which facility do you want to sign in to?',
      submitFacilitySelectionButtonPrompt: 'Select',
      facilitySelectionModalHeader: 'Select a facility',
    },
  };

</script>


<style lang="scss" scoped></style>
