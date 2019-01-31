<template>

  <div class="bar-wrapper">
    <div class="bar" :style="barStyleStarted"></div>
    <div class="bar" :style="barStyleCompleted"></div>
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';

  export default {
    name: 'DashboardBar',
    props: {
      completed: {
        type: Number,
        required: true,
      },
      started: {
        type: Number,
        required: true,
      },
      total: {
        type: Number,
        required: true,
      },
    },
    computed: {
      ...mapGetters(['$coreStatusProgress', '$coreStatusMastered']),
      percentageCompleted() {
        return this.completed / this.total;
      },
      barStyleCompleted() {
        return {
          width: `${Math.floor(100 * this.percentageCompleted)}%`,
          backgroundColor: this.$coreStatusMastered,
        };
      },
      percentageStarted() {
        return (this.started + this.completed) / this.total;
      },
      barStyleStarted() {
        return {
          width: `${Math.floor(100 * this.percentageStarted)}%`,
          backgroundColor: this.$coreStatusProgress,
        };
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .bar-wrapper {
    position: relative;
    width: 100%;
    height: 16px;
    overflow: hidden;
    background-color: #dedede;
    border-radius: $radius;
    opacity: 0.6;
  }

  .bar {
    position: absolute;
    height: 100%;
    margin-right: auto;
    transition: all $core-time ease;
  }

</style>
