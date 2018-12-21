<template>

  <LabeledIcon :label="text">
    <mat-svg category="device" name="access_time" />
  </LabeledIcon>

</template>


<script>

  import LabeledIcon from './LabeledIcon';

  export default {
    name: 'InProgress',
    components: {
      LabeledIcon,
    },
    props: {
      count: {
        type: Number,
        default: 1,
      },
      total: {
        type: Number,
        default: 1,
      },
      verbosity: {
        type: Number,
        default: 0,
      },
      showRatio: {
        type: Boolean,
        default: true,
      },
      showNumber: {
        type: Boolean,
        default: true,
      },
    },
    computed: {
      text() {
        if (!this.showNumber) {
          if (this.verbosity === 0) {
            return '';
          }
          return this.$tr('inProgress');
        }
        if (this.verbosity === 0) {
          if (this.showRatio) {
            return this.$tr('portionInProgressShort', { count: this.count, total: this.total });
          }
          return this.$tr('numberInProgressShort', { count: this.count, total: this.total });
        }
        if (this.showRatio) {
          return this.$tr('portionInProgress', { count: this.count, total: this.total });
        }
        return this.$tr('numberInProgress', { count: this.count, total: this.total });
      },
    },
    $trs: {
      numberInProgressShort: '{count, number, integer}',
      portionInProgressShort: '{count, number, integer} of {total, number, integer}',
      numberInProgress: '{count, number, integer} {count, plural, other {in-progress}}',
      portionInProgress:
        '{count, number, integer} of {total, number, integer} {count, plural, other {in-progress}}',
      allInProgress: 'All {count, number, integer} in-progress',
      inProgress: 'In-progress',
    },
  };

</script>


<style lang="scss" scoped></style>
