<template>

  <div class="wrapper">
    <KIcon v-if="active" icon="pointsActive" />
    <KIcon v-else icon="pointsInactive" />
  </div>

</template>


<script>

  export default {
    name: 'PointsIcon',
    props: {
      active: {
        type: Boolean,
        default: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .wrapper {
    vertical-align: inherit;
  }

</style>
