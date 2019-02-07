<template>

  <div class="bar-wrapper">
    <div class="bar" :style="barStyleStarted"></div>
    <div
      v-if="showErrorBar"
      class="help-line"
      :style="helpLineStyle"
    ></div>
    <div class="bar" :style="barStyleCompleted"></div>
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import tallyMixin from './tallyMixin';

  export default {
    name: 'ProgressSummaryBar',
    mixins: [tallyMixin],
    props: {
      showErrorBar: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      ...mapGetters(['$coreStatusProgress', '$coreStatusMastered', '$coreStatusWrong']),
      barStyleCompleted() {
        return {
          width: `${Math.ceil((100 * this.completed) / this.total)}%`,
          backgroundColor: this.$coreStatusMastered,
        };
      },
      barStyleStarted() {
        const widthRatio = this.started / this.total;
        return {
          marginLeft: `${Math.ceil((100 * this.completed) / this.total)}%`,
          width: `${Math.ceil(100 * widthRatio)}%`,
          backgroundColor: this.$coreStatusProgress,
        };
      },
      helpLineStyle() {
        // add on 'completed' for offset
        const widthRatio = this.helpNeeded / this.total;
        return {
          marginLeft: `${Math.ceil((100 * this.completed) / this.total)}%`,
          width: `${Math.ceil(100 * widthRatio)}%`,
          backgroundColor: this.$coreStatusWrong,
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
  }

  .bar {
    position: absolute;
    height: 100%;
    margin-right: auto;
    opacity: 0.55;
    transition: all $core-time ease;
  }

  .help-line {
    position: absolute;
    bottom: 0;
    width: 45%;
    height: 2px;
    margin-right: auto;
    background-color: red;
    transition: all $core-time ease;
  }

</style>
