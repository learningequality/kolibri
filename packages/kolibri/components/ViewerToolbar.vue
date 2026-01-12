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
        <KIconButton
          :icon="isInFullscreen ? 'fullscreen_exit' : 'fullscreen'"
          :ariaLabel="isInFullscreen ? exitFullscreen$() : enterFullscreen$()"
          :tooltip="isInFullscreen ? exitFullscreen$() : enterFullscreen$()"
          @click="$emit('toggleFullscreen')"
        />
      </KButtonGroup>
    </div>
  </BaseToolbar>

</template>


<script>

  import { createTranslator } from 'kolibri/utils/i18n';
  import BaseToolbar from 'kolibri/components/BaseToolbar';

  export const viewerToolbarStrings = createTranslator('ViewerToolbar', {
    exitFullscreen: {
      message: 'Exit fullscreen',
      context: 'Button tooltip to exit fullscreen view in a content viewer.',
    },
    enterFullscreen: {
      message: 'Enter fullscreen',
      context: 'Button tooltip to enter fullscreen view in a content viewer.',
    },
  });

  export default {
    name: 'ViewerToolbar',
    components: {
      BaseToolbar,
    },
    setup() {
      const { exitFullscreen$, enterFullscreen$ } = viewerToolbarStrings;
      return { exitFullscreen$, enterFullscreen$ };
    },
    props: {
      isInFullscreen: {
        type: Boolean,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  // Dimensions and elevation are scoped here rather than on the shared
  // BaseToolbar, whose other consumer is sized for its own layout.
  .base-toolbar.viewer-toolbar {
    z-index: 1;
    min-height: 48px;
    padding: 0 16px;

    @extend %dropshadow-2dp;
  }

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
