<template>

  <div class="bar-wrapper">
    <div class="bar" :style="barStyleActive"></div>
  </div>

</template>


<script>

  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import activeLearnersTallyMixin from './activeLearnersTallyMixin';

  export default {
    name: 'ActiveLearnerSummaryBar',
    mixins: [activeLearnersTallyMixin, themeMixin],
    computed: {
      barStyleActive() {
        const widthRatio = this.active / this.total;
        return {
          width: `${Math.ceil(100 * widthRatio)}%`,
          backgroundColor: this.backgroundColor(),
        };
      },
    },
    methods: {
      backgroundColor() {
        if (this.active == this.total) {
          return this.$coreStatusCorrect;
        } else {
          return this.$coreStatusProgress;
        }
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
    opacity: 0.75;
    transition: all $core-time ease;
  }

  .help {
    opacity: 0.85;
  }

</style>
