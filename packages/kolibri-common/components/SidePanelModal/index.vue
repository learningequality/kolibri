<template>

  <div
    ref="sidePanel"
    :tabindex="0"
    :class="{ 'is-rtl': isRtl, 'is-mobile': isMobile }"
    @keyup.esc="closePanel"
  >
    <transition name="side-panel">
      <KFocusTrap
        @shouldFocusFirstEl="$emit('shouldFocusFirstEl')"
        @shouldFocusLastEl="focusLastEl"
      >
        <section
          class="side-panel"
          role="region"
          :style="sidePanelStyles"
          :aria-label="ariaLabel"
        >
          <!-- Fixed header -->
          <div
            ref="fixedHeader"
            class="side-panel-header"
            :style="headerStyles"
          >
            <div
              class="header-content"
              :style="{
                flexDirection: closeButtonIconType === 'close' ? 'row' : 'row-reverse',
              }"
            >
              <div>
                <slot name="header"> </slot>
              </div>
              <KIconButton
                v-if="closeButtonIconType"
                :icon="closeButtonIconType"
                class="close-button"
                :ariaLabel="closeButtonMessage"
                :tooltip="closeButtonMessage"
                @click="closePanel"
              />
            </div>
          </div>

          <!-- Default slot for inserting content which will scroll on overflow -->
          <div class="side-panel-content">
            <slot></slot>
          </div>
          <div
            v-if="$slots.bottomNavigation"
            ref="fixedBottombar"
            class="bottom-navigation"
            :style="{ backgroundColor: $themeTokens.surface }"
          >
            <slot name="bottomNavigation"></slot>
          </div>
        </section>
      </KFocusTrap>
    </transition>

    <Backdrop
      :transitions="true"
      class="backdrop"
      @click="closePanel"
    />
  </div>

</template>


<script>

  import { get } from '@vueuse/core';
  import Backdrop from 'kolibri/components/Backdrop';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';

  export default {
    name: 'SidePanelModal',
    components: {
      Backdrop,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { windowBreakpoint } = useKResponsiveWindow();
      return {
        /* Will be calculated in mounted() as it will get the height of the fixedHeader then */
        // @type {RefImpl<number>}
        windowBreakpoint,
        lastFocus: null,
      };
    },
    props: {
      /* CloseButtonIconType icon from parent component */
      closeButtonIconType: {
        type: String,
        required: false,
        default: 'close',
        validator: value => {
          return ['close', 'back'].includes(value);
        },
      },
      /* Optionally override the default width of the side panel with valid CSS value */
      sidePanelWidth: {
        type: String,
        required: false,
        default: '436px',
      },
      /* Which side of the screen should the panel be fixed? Reverses the value when isRtl */
      alignment: {
        type: String,
        required: true,
        validator(value) {
          return ['right', 'left'].includes(value);
        },
      },
      ariaLabel: {
        type: String,
        required: false,
        default: null,
      },
    },
    computed: {
      isMobile() {
        // This should be suitable for any mobile/tablet
        return get(this.windowBreakpoint) <= 2;
      },
      /* Returns an object with properties left or right set to the appropriate value
         depending on isRtl and this.alignment */
      rtlAlignment() {
        if (this.isRtl && this.alignment === 'left') {
          return 'right';
        } else if (this.isRtl && this.alignment === 'right') {
          return 'left';
        } else {
          return this.alignment;
        }
      },
      /* Returns an object with this.rtlAlignment set to 0 */
      langDirStyles() {
        return {
          [this.rtlAlignment]: 0,
        };
      },
      responsiveWidth() {
        return this.isMobile ? '100vw' : this.sidePanelWidth;
      },
      /** Styling Properties */
      headerStyles() {
        return {
          backgroundColor: this.$themeTokens.surface,
          borderBottom: `1px solid ${this.$themePalette.grey.v_400}`,
        };
      },
      sidePanelStyles() {
        return {
          ...this.langDirStyles,
          width: this.responsiveWidth,
          top: 0,
          position: 'fixed',
          color: this.$themeTokens.text,
          backgroundColor: this.$themeTokens.surface,
          'z-index': 12,
        };
      },
      closeButtonMessage() {
        return this.closeButtonIconType === 'back'
          ? this.coreString('backAction')
          : this.coreString('closeAction');
      },
    },
    beforeMount() {
      this.lastFocus = document.activeElement;
    },
    /* this is the easiest way I could think to avoid having dual scroll bars and to avoid
     strange screen-squeezing behavior noted here:
     https://user-images.githubusercontent.com/79847249/164241012-b161bad7-8a46-4221-a391-a375899ed9a9.mp4 */
    mounted() {
      const htmlTag = window.document.getElementsByTagName('html')[0];
      htmlTag.style['overflow-y'] = 'hidden';
      this.$nextTick(() => {
        this.$emit('shouldFocusFirstEl');
      });
    },
    beforeDestroy() {
      const htmlTag = window.document.getElementsByTagName('html')[0];
      htmlTag.style['overflow-y'] = 'auto';
    },
    destroyed() {
      window.setTimeout(() => this.lastFocus.focus());
    },
    methods: {
      closePanel() {
        this.$emit('closePanel');
      },
      focusLastEl() {
        this.$el.querySelector('.close-button').focus();
      },
      /**
       * @public
       * Reset the next focus to the first focus element
       */
      focusFirstEl() {
        this.$el.querySelector('.close-button').focus();
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 100%;
  }

  /** Need to be sure a KDropdownMenu shows up on the Side Panel */
  /deep/ .tippy-popper {
    z-index: 24;
  }

  .side-panel {
    display: flex;
    flex-direction: column;
    height: 100vh;

    .side-panel-header {
      width: 100%;
      min-height: 60px;
      padding: 0 1em;
    }

    .side-panel-content {
      flex-grow: 1;
      padding: 24px 32px 16px;
      overflow-x: hidden;
      overflow-y: auto;
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
