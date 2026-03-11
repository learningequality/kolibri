<template>

  <div class="side-panel-layout">
    <div
      class="side-panel-header"
      :class="{
        immersive: immersive,
        'floating-shadow': isScrolled,
      }"
      :style="[
        headerContainerStyleOverrides,
        immersive ? { backgroundColor: $themeTokens.appBar } : {},
      ]"
    >
      <KIconButton
        v-if="goBack"
        icon="back"
        :ariaLabel="backAction$()"
        :tooltip="backAction$()"
        @click="goBack"
      />
      <!-- Id used for aria-labelledby in SidePanelModal.vue -->
      <div
        id="side-panel-title"
        class="title-wrapper"
      >
        <slot name="title">
          <div class="title-content">
            <h1
              class="title"
              :style="{
                marginTop: subtitle ? '8px' : '0',
              }"
            >
              {{ title }}
            </h1>
            <div
              v-if="subtitle"
              class="subtitle"
              :style="{
                color: $themeTokens.annotation,
              }"
            >
              {{ subtitle }}
            </div>
          </div>
        </slot>
      </div>
      <KIconButton
        v-if="closePanel"
        icon="close"
        :ariaLabel="closeAction$()"
        :tooltip="closeAction$()"
        @click="closePanel"
      />
    </div>

    <!-- Default slot for inserting content which will scroll on overflow -->
    <div
      class="side-panel-content"
      :style="contentContainerStyleOverrides"
      @scroll="handleScroll"
    >
      <slot :isScrolled="isScrolled"></slot>
    </div>
    <div
      v-if="$slots.bottomNavigation"
      ref="fixedBottombar"
      class="bottom-navigation"
      :style="{ backgroundColor: $themeTokens.surface }"
    >
      <slot name="bottomNavigation"></slot>
    </div>
  </div>

</template>


<script>

  import { ref } from 'vue';
  import throttle from 'lodash/throttle';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';

  export default {
    name: 'SidePanelLayout',
    setup() {
      const isScrolled = ref(false);

      const _handleScroll = event => {
        isScrolled.value = event.target.scrollTop > 0;
      };

      const handleScroll = throttle(_handleScroll, 100);
      const { backAction$, closeAction$ } = coreStrings;

      return {
        isScrolled,
        handleScroll,

        backAction$,
        closeAction$,
      };
    },
    props: {
      /**
       * Callback function to go back to the previous subpage.
       * If not provided, the back button will not be shown.
       */
      goBack: {
        type: Function,
        required: false,
        default: null,
      },
      /**
       * Callback function to close the side panel.
       * If not provided, the close button will not be shown.
       */
      closePanel: {
        type: Function,
        required: false,
        default: null,
      },
      /**
       * Whether to apply immersive styling to the header.
       * Immersive styling includes a drop shadow and a appBar background color.
       */
      immersive: {
        type: Boolean,
        required: false,
        default: false,
      },
      /**
       * Title text to display in the header.
       */
      title: {
        type: String,
        required: false,
        default: '',
      },
      /**
       * Subtitle text to display below the title in the header.
       */
      subtitle: {
        type: String,
        required: false,
        default: '',
      },
      /**
       * Style overrides for the header container.
       * Accepts an object with CSS properties and values.
       */
      headerContainerStyleOverrides: {
        type: Object,
        required: false,
        default: null,
      },
      /**
       * Style overrides for the content container.
       * Accepts an object with CSS properties and values.
       */
      contentContainerStyleOverrides: {
        type: Object,
        required: false,
        default: null,
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .side-panel-layout {
    display: flex;
    flex-direction: column;
    height: 100%;

    .side-panel-header {
      z-index: 1;
      display: flex;
      gap: 12px;
      width: 100%;
      padding: 16px 24px;

      .title-wrapper {
        display: flex;
        // flex-grow to take up remaining space between buttons
        // making the back and close buttons align to left and right edges.
        flex-grow: 1;
        align-items: center;
        overflow: hidden;

        .title-content {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-width: 100%;
        }
      }

      .title,
      .subtitle {
        margin: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .title {
        font-size: 20px;
        font-weight: 600;
      }

      .subtitle {
        font-size: 14px;
      }

      &.immersive {
        @extend %dropshadow-2dp;
      }
    }

    .side-panel-content {
      // Set flex-grow to 1 to take up remaining space, making
      // the header and bottom navigation align to the top and bottom edges.
      flex-grow: 1;
      padding: 0 24px 16px;
      overflow-x: hidden;
      overflow-y: auto;
    }

    .floating-shadow {
      @extend %dropshadow-1dp;
    }

    .bottom-navigation {
      @extend %dropshadow-2dp;

      z-index: 1;
      display: flex;
      justify-content: space-between;
      width: 100%;
      padding: 1em;
      line-height: 2.5em;
      text-align: center;
    }
  }

</style>
