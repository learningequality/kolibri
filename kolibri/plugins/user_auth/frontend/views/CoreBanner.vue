<template>

  <div
    class="banner"
    :style="{ background: $themeTokens.surface }"
  >
    <div class="banner-inner">
      <KGrid>
        <!-- Grid Content -->
        <KGridItem
          :layout8="{ span: bannerClosed ? 5 : 8 }"
          :layout12="{ span: bannerClosed ? 9 : 12 }"
        >
          <slot :bannerClosed="bannerClosed"></slot>
        </KGridItem>

        <!-- Grid Buttons -->
        <KGridItem
          v-if="bannerClosed"
          class="button-grid-item"
          :layout8="{ span: 3 }"
          :layout12="{ span: 3 }"
        >
          <KButton
            ref="open_button"
            class="open-button"
            :text="$tr('openButton')"
            appearance="flat-button"
            :primary="true"
            @click="toggleBanner"
          />
        </KGridItem>
        <KGridItem
          v-else
          class="button-grid-item"
        >
          <KButton
            ref="close_button"
            class="close-button"
            :text="coreString('closeAction')"
            appearance="flat-button"
            :primary="true"
            @click="toggleBanner"
          />
        </KGridItem>
      </KGrid>
    </div>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

  export default {
    name: 'CoreBanner',
    mixins: [commonCoreStrings],
    data() {
      return {
        bannerClosed: false,
      };
    },
    created() {
      document.addEventListener('focusin', this.focusChange);
    },
    beforeDestroy() {
      document.removeEventListener('focusin', this.focusChange);
    },
    methods: {
      toggleBanner() {
        this.bannerClosed = !this.bannerClosed;
        if (this.previouslyFocusedElement) {
          this.previouslyFocusedElement.focus();
        }
      },
      focusChange(e) {
        // We need the element prior to the close button and more info
        if (
          (this.$refs.close_button && e.target != this.$refs.close_button.$el) ||
          (this.$refs.open_button && e.target != this.$refs.open_button.$el)
        ) {
          this.previouslyFocusedElement = e.target;
        }
      },
    },
    $trs: {
      openButton: {
        message: 'More Info',
        context: 'Indicates that there is more information available when this button is selected.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .banner {
    @extend %dropshadow-6dp;

    position: relative;
    width: 100%;
    margin: 0 auto;
  }

  .banner-inner {
    max-width: 1000px;
    padding-top: 0;
    padding-right: 16px;
    padding-left: 16px;
    margin: 0 auto;

    h1 {
      font-weight: bold;
    }
  }

  .button-grid-item {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    min-height: 60px;
  }

</style>
