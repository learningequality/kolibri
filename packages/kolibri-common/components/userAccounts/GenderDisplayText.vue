<template>

  <KOptionalText :text="isSpecified && displayText ? displayText : ''" />

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { FacilityUserGender } from 'kolibri/constants';

  const { NOT_SPECIFIED, DEFERRED, MALE, FEMALE } = FacilityUserGender;

  export default {
    name: 'GenderDisplayText',
    mixins: [commonCoreStrings],
    props: {
      gender: {
        type: String,
        default: null,
      },
    },
    computed: {
      isSpecified() {
        return this.gender !== NOT_SPECIFIED && this.gender !== DEFERRED;
      },
      displayText() {
        if (this.gender === MALE) {
          return this.coreString('genderOptionMale');
        } else if (this.gender === FEMALE) {
          return this.coreString('genderOptionFemale');
        }
        return null;
      },
    },
  };

</script>


<style lang="scss" scoped></style>
