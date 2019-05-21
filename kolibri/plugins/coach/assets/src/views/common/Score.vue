<template>

  <span>
    <KEmptyPlaceholder v-if="value === undefined || value === null" />
    <template v-else>{{ common$tr('percentage', {value}) }}</template>
  </span>

</template>


<script>

  import KEmptyPlaceholder from 'kolibri.coreVue.components.KEmptyPlaceholder';
  import { coachStringsMixin } from './commonCoachStrings';

  export default {
    name: 'Score',
    components: {
      KEmptyPlaceholder,
    },
    mixins: [coachStringsMixin],
    props: {
      value: {
        type: Number,
        required: false,
        validator(value) {
          return value >= 0 && value <= 1;
        },
      },
    },
  };

</script>


<style lang="scss" scoped></style>
