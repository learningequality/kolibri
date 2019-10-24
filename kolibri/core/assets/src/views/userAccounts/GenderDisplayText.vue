<template>

  <span v-if="displayText">
    {{ displayText }}
  </span>
  <KEmptyPlaceholder v-else />

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { FacilityUserGender } from 'kolibri.coreVue.vuex.constants';

  const { NOT_SPECIFIED, MALE, FEMALE } = FacilityUserGender;

  export default {
    name: 'GenderDisplayText',
    mixins: [commonCoreStrings],
    props: {
      gender: {
        type: String,
      },
    },
    computed: {
      displayText() {
        if (this.gender === NOT_SPECIFIED) {
          return this.coreString('genderOptionNotSpecified');
        } else if (this.gender === MALE) {
          return this.coreString('genderOptionMale');
        } else if (this.gender === FEMALE) {
          return this.coreString('genderOptionFemale');
        } else {
          return '';
        }
      },
    },
  };

</script>


<style lang="scss" scoped></style>
