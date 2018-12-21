<template>

  <LabeledIcon :label="text">
    <mat-svg category="action" name="stars" />
  </LabeledIcon>

</template>


<script>

  import statusMixin from './status';

  export default {
    name: 'Completed',
    mixins: [statusMixin],
    $trs: {
      basicLabelCompleted: '{count, plural, other {Completed}}',
      countShortCompleted: '{count, number, integer}',
      ratioShortCompleted: '{count, number, integer} of {total, number, integer}',
      countCompleted: '{count, number, integer} {count, plural, other {completed}}',
      ratioCompleted:
        '{count, number, integer} of {total, number, integer} {count, plural, other {completed}}',
      allCompleted: 'All {count, number, integer} {count, plural, other {completed}}',
    },
  };

</script>


<style lang="scss" scoped></style>
