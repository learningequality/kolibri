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
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
{}
