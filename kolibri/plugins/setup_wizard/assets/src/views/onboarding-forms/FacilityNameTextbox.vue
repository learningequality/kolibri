<template>

  <div>
    <KTextbox
      ref="facilityName"
      v-model="facilityName"
      :invalid="facilityNameIsInvalid"
      :invalidText="facilityNameErrorMessage"
      :label="$tr('facilityNameFieldLabel')"
      :maxlength="50"
      @blur="validateFacilityName"
    />
  </div>

</template>


<script>

  import KTextbox from 'kolibri.coreVue.components.KTextbox';

  export default {
    name: 'FacilityNameTextbox',
    components: {
      KTextbox,
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
    $trs: {
      facilityNameFieldLabel: 'Facility name',
      facilityNameFieldEmptyErrorMessage: 'Facility cannot be empty',
      facilityNameFieldMaxLengthReached: 'Facility name cannot be more than 50 characters',
    },
  };

</script>


<style lang="scss" scoped></style>
