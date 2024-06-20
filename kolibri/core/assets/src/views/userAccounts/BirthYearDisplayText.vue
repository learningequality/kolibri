<template>

  <KOptionalText :text="birthYearDate ? $formatDate(birthYearDate, { year: 'numeric' }) : ''" />

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
        default: null,
      },
    },
    computed: {
      isSpecified() {
        return this.birthYear !== NOT_SPECIFIED && this.birthYear !== DEFERRED;
      },
      birthYearDate() {
        if (!this.isSpecified || !this.birthYear) {
          return null;
        }
        const date = new Date();
        date.setFullYear(this.birthYear);
        return date;
      },
    },
  };

</script>


<style lang="scss" scoped></style>
