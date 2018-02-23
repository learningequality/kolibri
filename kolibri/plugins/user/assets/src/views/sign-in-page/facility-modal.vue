<template>

  <core-modal @cancel="emitClose" title="Select a facility">
    <form @submit.prevent="submitAndClose">

    </form>
    Which facility do you want to log into?

    <k-radio-button
      v-for="facility in facilities"
      v-model="selectedFacility"
      :key="facility.id"
      :label="facility.name"
      :radiovalue="facility.id"
    />

    <k-button
      class="core-modal-buttons"
      @click="emitClose"
      text="Cancel"
    />
    <k-button
      class="core-modal-buttons"
      text="Continue"
      :primary="true"
      type="submit"
    />


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
    props: {
      facilities: {
        type: Array,
        required: true,
      },
    },
    data() {
      return {
        selectedFacility: this.facilities[0].id,
      };
    },
    computed: {},
    methods: {
      emitClose() {
        this.$emit('close');
      },
      submitAndClose() {
        this.getFacilityConfig(this.selectedFacility);
        this.clearLoginError();
        this.emitClose();
      },
    },
    $trs: {},
    vuex: {
      actions: {
        getFacilityConfig,
        clearLoginError(store) {
          store.dispatch('CORE_SET_LOGIN_ERROR', '');
        },
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
