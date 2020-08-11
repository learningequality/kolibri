<template>

  <KOptionalText :text="scoreText" />

</template>


<script>

  import { coachStringsMixin } from './commonCoachStrings';

  export default {
    name: 'Score',
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
    computed: {
      scoreText() {
        if (this.value === undefined || this.value === null) {
          return '';
        } else {
          return this.coachString('percentage', { value: this.value });
        }
      },
    },
  };

</script>


<style lang="scss" scoped></style>
