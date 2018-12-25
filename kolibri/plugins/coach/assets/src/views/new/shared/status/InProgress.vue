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
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
