<template>

  <span v-if="displayText">
    {{ displayText }}
  </span>
  <KEmptyPlaceholder v-else />

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { DemographicConstants } from 'kolibri.coreVue.vuex.constants';

  const { NOT_SPECIFIED, DEFERRED } = DemographicConstants;

  export default {
    name: 'BirthYearDisplayText',
    mixins: [commonCoreStrings],
    props: {
      birthYear: {
        type: String,
      },
    },
    computed: {
      displayText() {
        if (this.birthYear === NOT_SPECIFIED) {
          return this.coreString('birthYearNotSpecified');
        } else if (this.birthYear !== DEFERRED) {
          return this.birthYear;
        } else {
          return '';
        }
      },
    },
  };

</script>


<style lang="scss" scoped></style>
