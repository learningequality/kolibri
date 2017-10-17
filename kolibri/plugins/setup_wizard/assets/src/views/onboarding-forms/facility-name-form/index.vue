<template>

  <onboarding-form
    :header="$tr('facilityNamingFormHeader')"
    :description="$tr('facilityNamingFormDescription')"
    :submitText="submitText"
    @submit="setFacilityName"
    >
    <k-textbox
      :autofocus="true"
      v-model="facilityName"
      @blur="validateFacilityName"
      :invalid="facilityNameIsInvalid"
      :invalidText="facilityNameErrorMessage"
      ref="facilityName"
      :label="$tr('facilityNameFieldLabel')"
    />
  </onboarding-form>

</template>


<script>

  import { submitFacilityName } from '../../../state/actions/forms';

  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  import onboardingForm from '../onboarding-form';

  export default {
    name: 'facilityNameForm',
    components: {
      onboardingForm,
      kTextbox,
    },
    $trs: {
      facilityNamingFormHeader: 'Name your Facility',
      facilityNamingFormDescription:
        'A Facility is the location where you are installing Kolibri, such as a school or training center.',
      facilityNameFieldLabel: 'Facility name',
      facilityNameFieldEmptyErrorMessage: 'Facility cannot be empty',
    },
    props: {
      submitText: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        facilityName: this.currentFacilityName,
        fieldVisited: false,
      };
    },
    computed: {
      facilityNameErrorMessage() {
        if (this.facilityName === '') {
          return this.$tr('facilityNameFieldEmptyErrorMessage');
        }
        return '';
      },
      facilityNameIsInvalid() {
        return this.fieldVisited && !!this.facilityNameErrorMessage;
      },
    },
    methods: {
      validateFacilityName() {
        this.fieldVisited = true;
      },
      setFacilityName() {
        this.validateFacilityName();
        if (this.facilityNameIsInvalid) {
          this.$refs.facilityName.focus();
        } else {
          this.submitFacilityName(this.facilityName);
          this.$emit('submit');
        }
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
