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
            class="fixed-header"
            :style="fixedHeaderStyles"
          >
            <div class="header-content">
              <slot name="header"> </slot>
              <KIconButton
                v-if="closeButtonIconType"
                :icon="closeButtonIconType"
                class="close-button"
                :style="closeButtonStyle"
                :ariaLabel="closeButtonMessage"
                :tooltip="closeButtonMessage"
                @click="closePanel"
              />
            </div>
          </div>

          <!-- Default slot for inserting content which will scroll on overflow -->
          <div
            class="side-panel-content"
            :style="contentStyles"
          >
            <slot></slot>
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
  import Backdrop from 'kolibri.coreVue.components.Backdrop';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import FocusTrap from 'kolibri.coreVue.components.FocusTrap';

  export default {
    name: 'SidePanelModal',
    components: {
      Backdrop,
      FocusTrap,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { windowBreakpoint } = useKResponsiveWindow();
      return {
        /* Will be calculated in mounted() as it will get the height of the fixedHeader then */
        // @type {RefImpl<number>}
        windowBreakpoint,
        fixedHeaderHeight: '0px',
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
      fixedHeaderStyles() {
        return {
          ...this.langDirStyles,
          width: this.responsiveWidth,
          minHeight: '60px',
          position: 'fixed',
          top: 0,
          backgroundColor: this.$themeTokens.surface,
          borderBottom: `1px solid ${this.$themePalette.grey.v_400}`,
          padding: '0 1em',
          // Header border stays over content with this, but under any tooltips
          'z-index': 16,
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
      /* Change of position with change of close button type, default is close */
      closeButtonStyle() {
        if (this.isRtl) {
          if (this.closeButtonIconType === 'close') {
            return {
              position: 'absolute',
              top: '50%',
              transform: 'translateY(-50%)',
              left: '1em',
              'z-index': '24',
            };
          } else {
            return {
              position: 'absolute',
              top: '50%',
              transform: 'translateY(-50%)',
              right: '1em',
              'z-index': '24',
            };
          }
        }
        if (this.closeButtonIconType === 'back') {
          return {
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            left: '1em',
            'z-index': '24',
          };
        } else {
          return {
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            right: '1em',
            'z-index': '24',
          };
        }
      },
      contentStyles() {
        return {
          /* When the header margin is 0px from top, add 24 to accomodate close button */
          'margin-top': this.fixedHeaderHeight === '0px' ? '16px' : this.fixedHeaderHeight,
          padding: '24px 32px 16px',
          'overflow-y': 'scroll',
          'overflow-x': 'hidden',
          height: `calc(100vh - ${this.fixedHeaderHeight})`,
        };
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
      // Gets the height of the fixed header - adds 40 to account for padding + 24 for closeButton
      this.fixedHeaderHeight = `${this.$refs.fixedHeader.clientHeight}px`;
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
    width: calc(100% - 20px);
  }

  /** Need to be sure a KDropdownMenu shows up on the Side Panel */
  /deep/ .tippy-popper {
    z-index: 24;
  }

</style>
