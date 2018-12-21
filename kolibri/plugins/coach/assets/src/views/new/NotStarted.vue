<template>

  <LabeledIcon :label="text">
    <mat-svg category="content" name="remove_circle" />
  </LabeledIcon>

</template>


<script>

  import LabeledIcon from './LabeledIcon';

  export default {
    name: 'NotStarted',
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
          return this.$tr('notStarted');
        }
        if (this.verbosity === 0) {
          if (this.showRatio) {
            return this.$tr('portionNotStartedShort', { count: this.count, total: this.total });
          }
          return this.$tr('numberNotStartedShort', { count: this.count, total: this.total });
        }
        if (this.showRatio) {
          return this.$tr('portionNotStarted', { count: this.count, total: this.total });
        }
        return this.$tr('numberNotStarted', { count: this.count, total: this.total });
      },
    },
    $trs: {
      numberNotStartedShort: '{count, number, integer}',
      portionNotStartedShort: '{count, number, integer} of {total, number, integer}',
      numberNotStarted: '{count, number, integer} {count, plural, other {not started}}',
      portionNotStarted:
        '{count, number, integer} of {total, number, integer} {count, plural, other {not started}}',
      allNotStarted: 'None of {count, number, integer} started',
      notStarted: 'Not started',
    },
  };

</script>


<style lang="scss" scoped></style>
