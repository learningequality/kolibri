<template>

  <LabeledIcon :label="text">
    <mat-svg category="action" name="stars" />
  </LabeledIcon>

</template>


<script>

  import LabeledIcon from './LabeledIcon';

  export default {
    name: 'Completed',
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
          return this.$tr('completed');
        }
        if (this.verbosity === 0) {
          if (this.showRatio) {
            return this.$tr('portionCompletedShort', { count: this.count, total: this.total });
          }
          return this.$tr('numberCompletedShort', { count: this.count, total: this.total });
        }
        if (this.showRatio) {
          return this.$tr('portionCompleted', { count: this.count, total: this.total });
        }
        return this.$tr('numberCompleted', { count: this.count, total: this.total });
      },
    },
    $trs: {
      numberCompletedShort: '{count, number, integer}',
      portionCompletedShort: '{count, number, integer} of {total, number, integer}',
      numberCompleted: '{count, number, integer} {count, plural, other {completed}}',
      portionCompleted:
        '{count, number, integer} of {total, number, integer} {count, plural, other {completed}}',
      allCompleted: 'All {count, number, integer} completed',
      completed: 'Completed',
    },
  };

</script>


<style lang="scss" scoped></style>
