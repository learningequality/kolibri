<template>

  <LabeledIcon :label="text">
    <mat-svg category="device" name="access_time" />
  </LabeledIcon>

</template>


<script>

  import statusMixin from './status';

  export default {
    name: 'InProgress',
    mixins: [statusMixin],
    $trs: {
      basicLabelInProgress: '{count, plural, other {In-progress}}',
      countShortInProgress: '{count, number, integer}',
      ratioShortInProgress: '{count, number, integer} of {total, number, integer}',
      countInProgress: '{count, number, integer} {count, plural, other {in-progress}}',
      ratioInProgress:
        '{count, number, integer} of {total, number, integer} {count, plural, other {in-progress}}',
      allInProgress: 'All {count, number, integer} {count, plural, other {in-progress}}',
    },
  };

</script>


<style lang="scss" scoped></style>
