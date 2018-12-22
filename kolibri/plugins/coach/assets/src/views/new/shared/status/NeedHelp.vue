<template>

  <LabeledIcon :label="text">
    <mat-svg category="alert" name="error" />
  </LabeledIcon>

</template>


<script>

  import statusMixin from './status';

  export default {
    name: 'NeedHelp',
    mixins: [statusMixin],
    $trs: {
      basicLabelNeedHelp: '{count, plural, one {Needs help} other {Need help}}',
      countShortNeedHelp: '{count, number, integer}',
      ratioShortNeedHelp: '{count, number, integer} of {total, number, integer}',
      countNeedHelp: '{count, number, integer} {count, plural, one {needs help} other {need help}}',
      ratioNeedHelp:
        '{count, number, integer} of {total, number, integer} {count, plural, one {needs help} other {need help}}',
      allNeedHelp: 'All {count, number, integer} need help',
    },
  };

</script>


<style lang="scss" scoped></style>
