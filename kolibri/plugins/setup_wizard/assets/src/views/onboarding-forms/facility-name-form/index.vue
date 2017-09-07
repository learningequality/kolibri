<template>

  <onboarding-form
    :header="$tr('facilityNamingFormHeader')"
    :description="$tr('facilityNamingFormDescription')"
    :submit-text="submitText"
    @submit="setFacilityName"
    >
    <k-textbox :autofocus="true" v-model="facilityName" :label="$tr('facilityFieldLabel')"/>
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
      facilityNamingFormDescription:
        'A Facility is the location where you are installing Kolibri, such as a school or training center.',
      facilityFieldLabel: 'Facility name',
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
