<template>

  <span v-if="isSpecified && displayText">
    {{ displayText }}
  </span>
  <KEmptyPlaceholder v-else />

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { FacilityUserGender } from 'kolibri.coreVue.vuex.constants';

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
        return this.gender !== NOT_SPECIFIED && this.birthYear !== DEFERRED;
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
