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
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
