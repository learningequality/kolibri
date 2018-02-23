<template>

  <core-modal @cancel="emitClose" :title="$tr('facilitySelectionModalHeader')">
    <form @submit.prevent="submitAndClose">
      {{ $tr('facilitySelectionPrompt') }}

      <k-radio-button
        v-for="facility in facilities"
        v-model="selectedFacility"
        :key="facility.id"
        :label="facility.name"
        :radiovalue="facility.id"
      />
      <div>
        <k-button
          class="core-modal-buttons"
          @click="emitClose"
          :text="$tr('cancelFacilitySelectionButtonPrompt')"
        />
        <k-button
          class="core-modal-buttons"
          :text="$tr('submitFacilitySelectionButtonPrompt')"
          :primary="true"
          type="submit"
        />
      </div>
    </form>
  </core-modal>

</template>


<script>

  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kRadioButton from 'kolibri.coreVue.components.kRadioButton';
  import kButton from 'kolibri.coreVue.components.kButton';
  import { getFacilityConfig } from 'kolibri.coreVue.vuex.actions';

  export default {
    name: 'facilityModal',
    components: {
      coreModal,
      kRadioButton,
      kButton,
    },
    data() {
      return {
        selectedFacility: this.currentFacilityId,
      };
    },
    methods: {
      emitClose() {
        this.$emit('close');
      },
      submitAndClose() {
        this.setFacilityId();
        this.clearLoginError();
        this.getFacilityConfig(this.selectedFacility);
        this.emitClose();
      },
    },
    $trs: {
      facilitySelectionPrompt: 'Which facility do you want to sign into?',
      cancelFacilitySelectionButtonPrompt: 'cancel',
      submitFacilitySelectionButtonPrompt: 'submit',
      facilitySelectionModalHeader: 'Select a facility',
    },
    vuex: {
      getters: {
        // currentFacilityId uses session, with is anonymous in sign-in-page
        currentFacilityId: state => state.facilityId,
        facilities: state => state.core.facilities,
      },
      actions: {
        getFacilityConfig,
        setFacilityId(store) {
          store.dispatch('SET_FACILITY_ID', this.selectedFacility);
        },
        clearLoginError(store) {
          store.dispatch('CORE_SET_LOGIN_ERROR', '');
        },
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
