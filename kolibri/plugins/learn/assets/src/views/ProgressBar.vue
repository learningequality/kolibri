<template>

  <div
    v-if="progress"
    class="progress-bar-wrapper"
    role="progressbar"
    :aria-valuemin="0"
    :aria-valuemax="100"
    :aria-valuenow="progress * 100"
  >
    <p
      v-if="completed"
      class="completion-label"
      :style="{ color: $themePalette.grey.v_800 }"
    >
      <ProgressIcon
        :progress="progress"
        class="completion-icon"
      />
      {{ coreString('completedLabel') }}
    </p>
    <KLinearLoader
      v-if="progress && !completed"
      class="k-linear-loader"
      :delay="false"
      :progress="progress * 100"
      type="determinate"
      :style="{ backgroundColor: $themeTokens.fineLine }"
    />
  </div>

</template>


<script>

  import ProgressIcon from 'kolibri.coreVue.components.ProgressIcon';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import useContentNodeProgress from '../composables/useContentNodeProgress';

  /**
   * A progress bar that has three states:
   * - won't display when not started (progress = 0)
   * - blue bar when in progress (0 < progress < 1)
   * - Completed icon with text when complete
   */
  export default {
    name: 'ProgressBar',
    components: {
      ProgressIcon,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { contentNodeProgressMap } = useContentNodeProgress();
      return { contentNodeProgressMap };
    },
    props: {
      // eslint-disable-next-line kolibri/vue-no-unused-properties
      contentNode: {
        type: Object,
        required: true,
      },
    },
    computed: {
      progress() {
        return this.contentNodeProgressMap[this.contentNode && this.contentNode.content_id] || 0;
      },
      completed() {
        return this.progress >= 1;
      },
    },
  };

</script>


<style lang="scss" scoped>

  .progress-bar-wrapper {
    display: inline-block;
    width: 100%;
    opacity: 0.9;
  }

  .k-linear-loader {
    top: -8px;
    display: block;
    margin-bottom: 0;
  }

  .completion-icon {
    /deep/ svg {
      max-width: 14px;
      max-height: 14px;
    }
  }

  .completion-label {
    margin: 0;
    font-size: 13px;
  }

</style>
