<template>

  <LabeledIcon :label="text">
    <mat-svg category="content" name="remove_circle" />
  </LabeledIcon>

</template>


<script>

  import statusMixin from './status';

  export default {
    name: 'NotStarted',
    mixins: [statusMixin],
    $trs: {
      basicLabelNotStarted: '{count, plural, other {Not started}}',
      countShortNotStarted: '{count, number, integer}',
      ratioShortNotStarted: '{count, number, integer} of {total, number, integer}',
      countNotStarted: '{count, number, integer} {count, plural, other {not started}}',
      ratioNotStarted:
        '{count, number, integer} of {total, number, integer} {count, plural, other {not started}}',
      allNotStarted: 'None of {count, number, integer} started',
    },
  };

</script>


<style lang="scss" scoped></style>
{}
