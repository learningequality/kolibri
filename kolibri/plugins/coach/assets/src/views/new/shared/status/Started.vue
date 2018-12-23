<template>

  <LabeledIcon :label="text">
    <mat-svg category="device" name="access_time" />
  </LabeledIcon>

</template>


<script>

  import statusMixin from './status';

  export default {
    name: 'Started',
    mixins: [statusMixin],
    $trs: {
      basicLabelStarted: '{count, plural, other {Started}}',
      countShortStarted: '{count, number, integer}',
      ratioShortStarted: '{count, number, integer} of {total, number, integer}',
      countStarted: '{count, number, integer} {count, plural, other {started}}',
      ratioStarted:
        '{count, number, integer} of {total, number, integer} {count, plural, other {started}}',
      allStarted: 'All {count, number, integer} {count, plural, other {started}}',
    },
  };

</script>


<style lang="scss" scoped></style>
