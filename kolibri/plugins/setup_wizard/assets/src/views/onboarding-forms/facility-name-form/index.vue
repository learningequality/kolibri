<template>

  <onboarding-form
    :header="$tr('facilityNamingFormHeader')"
    :details="$tr('facilityNamingFormDetails')"
    :submit-text="submitText"
    @submit="setFacilityName"
    >
    <k-textbox v-model="facilityName" label="Facility name"/>
  </onboarding-form>

</template>


<script>

  import { submitFacilityName } from '../../../state/actions/forms';

  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  import onboardingForm from '../onboarding-form';

  export default {
    name: 'facilityNameForm',
    $trs: {
      facilityNamingFormHeader: 'Name your Facility',
      facilityNamingFormDetails:
        'A Facility is the location where you are installing Kolibri, ' +
          'such as a school or training center.',
    },
    props: {
      submitText: {
        type: String,
        required: true,
      },
    },
    components: {
      onboardingForm,
      kTextbox,
    },
    data() {
      return {
        facilityName: this.currentFacilityName,
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
      getters: {
        currentFacilityName: state => state.onboardingData.facility.name,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
