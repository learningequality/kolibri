<template>

  <div
    class="bar-wrapper"
    :style="{ backgroundColor: 'var(--palette-grey-v300)' }"
  >
    <div
      class="bar help"
      :style="helpLineStyle"
    ></div>
    <div
      class="bar"
      :style="barStyleStarted"
    ></div>
    <div
      class="bar"
      :style="barStyleCompleted"
    ></div>
  </div>

</template>


<script>

  import { toRef } from 'vue';
  import useTally, { tallyProp } from '../../../composables/useTally';

  export default {
    name: 'ProgressSummaryBar',
    setup(props) {
      return useTally(toRef(props, 'tally'));
    },
    props: {
      tally: tallyProp,
    },
    computed: {
      barStyleCompleted() {
        return {
          width: `${Math.ceil((100 * this.completed) / this.total)}%`,
          backgroundColor: 'var(--tokens-mastered)',
        };
      },
      barStyleStarted() {
        const widthRatio = this.started / this.total;
        return {
          marginLeft: `${Math.ceil((100 * this.completed) / this.total)}%`,
          width: `${Math.ceil(100 * widthRatio)}%`,
          backgroundColor: 'var(--tokens-progress)',
        };
      },
      helpLineStyle() {
        // add on 'completed' for offset
        const widthRatio = this.helpNeeded / this.total;
        return {
          marginLeft: `${Math.ceil((100 * (this.completed + this.started)) / this.total)}%`,
          width: `${Math.ceil(100 * widthRatio)}%`,
          backgroundColor: 'var(--tokens-incorrect)',
        };
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

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
