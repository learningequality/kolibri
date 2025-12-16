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
      @input="$emit('input', facilityName)"
    />
  </div>

</template>


<script>

  export default {
    name: 'FacilityNameTextbox',
    props: {
      value: {
        type: String,
        required: true,
        default: '',
      },
    },
    data() {
      return {
        facilityName: this.value,
        fieldVisited: false,
      };
    },
    computed: {
      facilityNameErrorMessage() {
        if (this.facilityName.trim() === '') {
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
      /**
       * @public
       */
      focus() {
        if (this.$refs.facilityName) {
          this.$refs.facilityName.focus();
        }
      },
    },
    $trs: {
      facilityNameFieldLabel: {
        message: 'Learning facility name',
        context: 'The field where the admin adds the name of their facility.',
      },
      facilityNameFieldEmptyErrorMessage: {
        message: 'Facility cannot be empty',
        context: 'Error message which displays if the admin does not enter a facility name.',
      },
      facilityNameFieldMaxLengthReached: {
        message: 'Facility name cannot be more than 50 characters',
        context:
          "Error message which displays if the admin inputs a facility name that's over 50 characters.",
      },
    },
  };

</script>


<style lang="scss" scoped></style>
