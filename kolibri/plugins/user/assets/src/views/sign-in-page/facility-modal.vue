<template>

  <core-modal @cancel="emitClose" :title="$tr('facilitySelectionModalHeader')">
    <form @submit.prevent="submitAndClose">
      {{ $tr('facilitySelectionPrompt') }}

      <k-radio-button
        v-for="facility in facilities"
        v-model="selectedFacility"
        :key="facility.id"
        :label="facility.name"
        :value="facility.id"
      />
      <div class="core-modal-buttons">
        <k-button
          :text="$tr('submitFacilitySelectionButtonPrompt')"
          :primary="true"
          type="submit"
        />
      </div>
    </form>
  </core-modal>

</template>


<script>

  import { mapGetters, mapActions } from 'kolibri.utils.vuexCompat';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kRadioButton from 'kolibri.coreVue.components.kRadioButton';
  import kButton from 'kolibri.coreVue.components.kButton';
  import { getFacilityConfig } from 'kolibri.coreVue.vuex.actions';
  import { facilities } from 'kolibri.coreVue.vuex.getters';

  function currentFacilityId(state) {
    return state.facilityId;
  }

  export default {
    name: 'facilityModal',
    components: {
      coreModal,
      kRadioButton,
      kButton,
    },
    data() {
      return {
        selectedFacility: currentFacilityId(this.$store.state),
      };
    },
    computed: {
      ...mapGetters({
        // currentFacilityId uses session, with is anonymous in sign-in-page
        currentFacilityId,
        facilities,
      }),
    },
    methods: {
      ...mapActions({
        getFacilityConfig,
        setFacilityId(store) {
          store.dispatch('SET_FACILITY_ID', this.selectedFacility);
        },
        clearLoginError(store) {
          store.dispatch('CORE_SET_LOGIN_ERROR', '');
        },
      }),
      emitClose() {
        this.$emit('close');
      },
      submitAndClose() {
        this.setFacilityId();
        this.clearLoginError();
        this.getFacilityConfig(this.selectedFacility).then(this.emitClose);
      },
    },
    $trs: {
      facilitySelectionPrompt: 'Which facility do you want to sign in to?',
      submitFacilitySelectionButtonPrompt: 'Select',
      facilitySelectionModalHeader: 'Select a facility',
    },
  };

</script>


<style lang="stylus" scoped></style>
