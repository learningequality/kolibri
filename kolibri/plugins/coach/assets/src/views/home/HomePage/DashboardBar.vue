<template>

  <div class="bar-wrapper">
    <div class="bar" :style="barStyle"></div>
    <div class="visuallyhidden">
      <!-- todo - how to internationalize? -->
      {{ $formatNumber(Math.floor(percentage * 100)) }}%
    </div>
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';

  export default {
    name: 'DashboardBar',
    props: {
      percentage: {
        type: Number,
        required: true,
        validator(value) {
          return value >= 0 && value <= 1;
        },
      },
    },
    computed: {
      ...mapGetters(['$coreStatusProgress', '$coreStatusMastered']),
      barStyle() {
        return {
          width: `${Math.floor(100 * this.percentage)}%`,
          backgroundColor:
            this.percentage === 1 ? this.$coreStatusMastered : this.$coreStatusProgress,
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
    background-color: #dedede;
    border-radius: $radius;
    opacity: 0.65;
  }

  .bar {
    height: 100%;
    margin-right: auto;
    border-radius: $radius;
    transition: all $core-time ease;
  }

</style>
