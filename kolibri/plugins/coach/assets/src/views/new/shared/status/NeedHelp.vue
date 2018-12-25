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
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
