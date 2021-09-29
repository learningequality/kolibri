<template>

  <div
    v-if="progress"
    class="progress-bar-wrapper"
    :style="{ backgroundColor: $themePalette.grey.v_200 }"
    role="progressbar"
    :aria-valuemin="0"
    :aria-valuemax="100"
    :aria-valuenow="progress * 100"
  >
    <div
      class="progress-bar"
      :style="{
        width: `${progress * 100}%`,
        backgroundColor: progress === 1 ?
          $themeTokens.mastered : (progress > 0 ? $themeTokens.progress : ''),
      }"
    >
    </div>
  </div>

</template>


<script>

  /**
   * A progress bar that has three states:
   * - won't display when not started (progress = 0)
   * - blue bar when in progress (0 < progress < 1)
   * - full width yellow bar when complete (progress = 1)
   */
  export default {
    name: 'ProgressBar',
    props: {
      /**
       * A fraction between 0 and 1
       */
      progress: {
        type: Number,
        required: false,
        default: null,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .progress-bar-wrapper {
    width: 100%;
    height: 4px;
    border-radius: 4px;
    opacity: 0.9;

    .progress-bar {
      height: 100%;
    }
  }

</style>
