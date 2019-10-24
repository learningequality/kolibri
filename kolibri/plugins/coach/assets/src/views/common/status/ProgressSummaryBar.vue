<template>

  <div
    class="bar-wrapper"
    :style="{ backgroundColor: $themePalette.grey.v_300 }"
  >
    <div class="bar help" :style="helpLineStyle"></div>
    <div class="bar" :style="barStyleStarted"></div>
    <div class="bar" :style="barStyleCompleted"></div>
  </div>

</template>


<script>

  import tallyMixin from './tallyMixin';

  export default {
    name: 'ProgressSummaryBar',
    mixins: [tallyMixin],
    computed: {
      barStyleCompleted() {
        return {
          width: `${Math.ceil((100 * this.completed) / this.total)}%`,
          backgroundColor: this.$themeTokens.mastered,
        };
      },
      barStyleStarted() {
        const widthRatio = this.started / this.total;
        return {
          marginLeft: `${Math.ceil((100 * this.completed) / this.total)}%`,
          width: `${Math.ceil(100 * widthRatio)}%`,
          backgroundColor: this.$themeTokens.progress,
        };
      },
      helpLineStyle() {
        // add on 'completed' for offset
        const widthRatio = this.helpNeeded / this.total;
        return {
          marginLeft: `${Math.ceil((100 * (this.completed + this.started)) / this.total)}%`,
          width: `${Math.ceil(100 * widthRatio)}%`,
          backgroundColor: this.$themeTokens.incorrect,
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
    border-radius: $radius;
  }

  .bar {
    position: absolute;
    height: 100%;
    margin-right: auto;
    opacity: 0.75;
    transition: all $core-time ease;
  }

  .help {
    opacity: 0.85;
  }

</style>
