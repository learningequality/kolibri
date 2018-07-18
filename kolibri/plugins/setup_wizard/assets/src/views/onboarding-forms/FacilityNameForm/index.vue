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
      :maxlength="50"
    />
  </onboarding-form>

</template>


<script>

  import { mapActions } from 'vuex';
  import KTextbox from 'kolibri.coreVue.components.KTextbox';
  import OnboardingForm from '../OnboardingForm';

  export default {
    name: 'FacilityNameForm',
    components: {
      OnboardingForm,
      KTextbox,
    },
    $trs: {
      facilityNamingFormHeader: 'Name your Facility',
      facilityNamingFormDescription:
        'A "Facility" is the location where you are installing Kolibri, such as a school or training center',
      facilityNameFieldLabel: 'Facility name',
      facilityNameFieldEmptyErrorMessage: 'Facility cannot be empty',
      facilityNameFieldMaxLengthReached: 'Facility name cannot be more than 100 characters',
    },
    props: {
      submitText: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        facilityName: this.$store.state.onboardingData.facility.name,
        fieldVisited: false,
      };
    },
    computed: {
      facilityNameErrorMessage() {
        if (this.facilityName === '') {
          return this.$tr('facilityNameFieldEmptyErrorMessage');
        }
        if (this.facilityName.length > 100) {
          return this.$tr('facilityNameFieldMaxLengthReached');
        }
        return '';
      },
      facilityNameIsInvalid() {
        return this.fieldVisited && Boolean(this.facilityNameErrorMessage);
      },
    },
    methods: {
      ...mapActions(['submitFacilityName']),
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
  };

</script>


<style lang="scss" scoped></style>
