<template>

  <form @submit="setFacilityName">
    <fieldset>
      <legend>
        <h1>
          Set facility name
        </h1>
      </legend>

      <k-textbox v-model="facilityName" label="Facility name"/>

      <k-button type="submit" :text="submitText" />

    </fieldset>
  </form>

</template>


<script>

  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  import kButton from 'kolibri.coreVue.components.kButton';
  import { submitFacilityName } from '../../../state/actions/forms';

  export default {
    name: 'facilityNameForm',
    props: {
      submitText: {
        type: String,
        required: true,
      },
      onboardingData: {
        type: Object,
        required: true,
      },
    },
    components: {
      kTextbox,
      kButton,
    },
    data() {
      return {
        facilityName: this.onboardingData.facility.name,
      };
    },
    methods: {
      setFacilityName() {
        this.submitFacilityName(this.facilityName);
        this.$emit('submit');
      },
    },
    vuex: {
      actions: {
        submitFacilityName,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
