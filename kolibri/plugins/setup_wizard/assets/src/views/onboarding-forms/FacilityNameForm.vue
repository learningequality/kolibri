<template>

  <div>
    <KTextbox
      :autofocus="true"
      v-model="facilityName"
      @blur="validateFacilityName"
      :invalid="facilityNameIsInvalid"
      :invalidText="facilityNameErrorMessage"
      ref="facilityName"
      :label="$tr('facilityNameFieldLabel')"
      :maxlength="50"
    />
  </div>

</template>


<script>

  import KTextbox from 'kolibri.coreVue.components.KTextbox';

  export default {
    name: 'FacilityNameForm',
    components: {
      KTextbox,
    },
    $trs: {
      facilityNameFieldLabel: 'Facility name',
      facilityNameFieldEmptyErrorMessage: 'Facility cannot be empty',
      facilityNameFieldMaxLengthReached: 'Facility name cannot be more than 50 characters',
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
      validateFacilityName() {
        this.fieldVisited = true;
      },
      focus() {
        if (this.$refs['facilityName']) {
          this.$refs['facilityName'].focus();
        }
      },
    },
  };

</script>


<style lang="scss" scoped></style>
