<template>

  <div class="wrapper">
    <div id="progress-bar-label" class="visuallyhidden">
      {{ coreString('progressLabel') }}
    </div>
    <div
      class="progress-bar-wrapper"
      :style="{ backgroundColor: $themePalette.grey.v_200 }"
      role="progressbar"
      aria-labelledby="progress-bar-label"
      :aria-valuenow="percent"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <div
        class="progress-bar-complete"
        :style="{
          width: percent + '%',
          backgroundColor: color || $themeTokens.primary
        }"
      >
      </div>
    </div>
    <div v-if="showPercentage" class="progress-bar-text">
      {{ $tr('pct', [progress]) }}
    </div>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'ProgressBar',
    mixins: [commonCoreStrings],
    props: {
      progress: {
        type: Number,
        required: true,
      },
      color: {
        type: String,
        required: false,
      },
      showPercentage: {
        type: Boolean,
        required: false,
        default: true,
      },
    },
    computed: {
      percent() {
        return Math.max(Math.min(this.progress * 100, 100), 0);
      },
    },
    $trs: {
      pct: '{0, number, percent}',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .wrapper {
    position: relative;
    padding-right: 40px;
    white-space: nowrap;
  }

  .progress-bar-wrapper {
    position: relative;
    display: inline-block;
    float: left;
    width: 100%;
    max-width: 125px;
    height: 1.2em;
    margin-right: 5px;
    overflow: hidden;
    border-radius: 15px;
  }

  .progress-bar-complete {
    width: 0;
    height: 100%;
    transition: width $core-time ease;
  }

  .progress-bar-text {
    position: relative;
    right: 0;
    display: inline-block;
    width: 30px;
    text-align: left;
  }

</style>
