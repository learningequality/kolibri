<template>

  <BaseToolbar
    class="viewer-toolbar"
    :style="{ backgroundColor: $themePalette.grey.v_100 }"
  >
    <div class="toolbar-layout">
      <div class="toolbar-left">
        <slot name="left"></slot>
      </div>
      <div class="toolbar-center">
        <slot name="center"></slot>
      </div>
      <KButtonGroup class="toolbar-right">
        <slot name="right"></slot>
        <KButton
          ref="fullscreenButton"
          :text="isInFullscreen ? $tr('exitFullscreen') : $tr('enterFullscreen')"
          :icon="isInFullscreen ? 'fullscreen_exit' : 'fullscreen'"
          :primary="embedded"
          :appearance="embedded ? 'raised-button' : 'flat-button'"
          @click="$emit('toggleFullscreen')"
        />
      </KButtonGroup>
    </div>
  </BaseToolbar>

</template>


<script>

  import BaseToolbar from 'kolibri-common/components/BaseToolbar';

  export default {
    name: 'ViewerToolbar',
    components: {
      BaseToolbar,
    },
    props: {
      isInFullscreen: {
        type: Boolean,
        required: true,
      },
      embedded: {
        type: Boolean,
        default: false,
      },
    },
    $trs: {
      exitFullscreen: {
        message: 'Exit fullscreen',
        context: 'Button tooltip to exit fullscreen view in a content viewer.',
      },
      enterFullscreen: {
        message: 'Enter fullscreen',
        context: 'Button tooltip to enter fullscreen view in a content viewer.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .toolbar-layout {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
    min-height: inherit;
  }

  .toolbar-left {
    display: flex;
    flex-shrink: 0;
    gap: 4px;
    align-items: center;
  }

  .toolbar-center {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .toolbar-right {
    display: flex;
    flex-shrink: 0;
    gap: 4px;
    align-items: center;
  }

</style>
