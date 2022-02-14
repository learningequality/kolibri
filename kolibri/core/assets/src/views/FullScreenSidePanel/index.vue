<template>

  <div
    ref="sidePanel"
    :tabindex="0"
    :class="{ 'is-rtl': isRtl, 'is-mobile': isMobile }"
    @keyup.esc="closePanel"
  >
    <transition name="side-panel">
      <FocusTrap
        @shouldFocusFirstEl="$emit('shouldFocusFirstEl')"
        @shouldFocusLastEl="focusLastEl"
      >
        <div
          class="side-panel"
          :style="sidePanelStyles"
        >

          <!-- Fixed header -->
          <div
            v-show="$slots.header"
            ref="fixedHeader"
            class="fixed-header"
            :style="fixedHeaderStyles"
          >
            <div class="header-content">
              <slot name="header">
              </slot>
            </div>
          </div>

          <KIconButton
            v-if="fullScreenSidePanelCloseButton"
            icon="close"
            class="close-button"
            :ariaLabel="coreString('closeAction')"
            :tooltip="coreString('closeAction')"
            @click="closePanel"
          />

          <!-- Default slot for inserting content which will scroll on overflow -->
          <div class="side-panel-content" :style="contentStyles">
            <slot></slot>
          </div>

        </div>
      </FocusTrap>
    </transition>

    <Backdrop
      :transitions="true"
      class="backdrop"
      @click="closePanel"
    />
  </div>

</template>


<script>

  import Backdrop from 'kolibri.coreVue.components.Backdrop';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import FocusTrap from 'kolibri.coreVue.components.FocusTrap';

  export default {
    name: 'FullScreenSidePanel',
    components: {
      Backdrop,
      FocusTrap,
    },
    mixins: [responsiveWindowMixin, commonCoreStrings],
    props: {
      fullScreenSidePanelCloseButton: {
        type: Boolean,
        default: true,
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
    },
    data() {
      return {
        /* Will be calculated in mounted() as it will get the height of the fixedHeader then */
        fixedHeaderHeight: 0,
        lastFocus: null,
      };
    },
    computed: {
      isMobile() {
        return this.windowBreakpoint == 0;
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
          'border-bottom': `1px solid ${this.$themePalette.grey.v_500}`,
          padding: '24px 32px',
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
      contentStyles() {
        return {
          'margin-top': this.fixedHeaderHeight,
          padding: '24px 32px 16px',
          'overflow-y': 'scroll',
          height: `calc((100vh - ${this.fixedHeaderHeight}px))`,
        };
      },
    },
    beforeMount() {
      this.lastFocus = document.activeElement;
    },
    /* this is the easiest way I could think to avoid having dual scroll bars */
    mounted() {
      const htmlTag = window.document.getElementsByTagName('html')[0];
      htmlTag.style['overflow-y'] = 'hidden';
      // Gets the height of the fixed header - adds 40 to account for padding
      this.fixedHeaderHeight = this.$refs.fixedHeader.clientHeight + 'px';
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
    },
    $trs: {
      /* eslint-disable kolibri/vue-no-unused-translations */
      topicHeader: {
        message: 'Also in this folder',
        context: 'Title of the panel with all topic contents. ',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .header-content {
    width: 100%;
  }

  .close-button {
    position: absolute;
    top: 16px;
    right: 16px;
    z-index: 24;
  }

  /** Need to be sure a KDropdownMenu shows up on the Side Panel */
  /deep/ .tippy-popper {
    z-index: 24;
  }

</style>
