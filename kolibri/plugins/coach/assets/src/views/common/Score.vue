<template>

  <span>
    <template v-if="value === undefined || value === null">-</template>
    <template v-else>{{ coachStrings.$tr('percentage', {value}) }}</template>
  </span>

</template>


<script>

  import { coachStringsMixin } from './commonCoachStrings';

  export default {
    name: 'Score',
    components: {},
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
