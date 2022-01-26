<template>

  <div
    ref="sidePanel"
    :tabindex="0"
    :class="{ 'is-rtl': isRtl, 'is-mobile': isMobile }"
    @keyup.esc="closePanel"
  >
    <transition name="side-panel">
      <FocusTrap
        :firstEl="firstFocusableEl"
        :lastEl="lastFocusableEl"
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

          <!-- Default slot for inserting content which will scroll on overflow -->
          <div class="side-panel-content" :style="contentStyles">
            <slot></slot>
          </div>

          <KIconButton
            v-if="fullScreenSidePanelCloseButton"
            ref="closeButton"
            icon="close"
            class="close-button"
            :style="closeButtonFullScreenSidePanelStyles"
            :ariaLabel="coreString('closeAction')"
            :tooltip="coreString('closeAction')"
            @click="closePanel"
          />
          <KIconButton
            v-else
            ref="closeButton"
            icon="close"
            class="close-button"
            :style="closeButtonStyles"
            :ariaLabel="coreString('closeAction')"
            :tooltip="coreString('closeAction')"
            @click="closePanel"
          />

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
        default: false,
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
        firstFocusableEl: null,
        lastFocusableEl: null,
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
          position: 'fixed',
          top: 0,
          backgroundColor: this.$themeTokens.surface,
          'border-bottom': `1px solid ${this.$themePalette.grey.v_500}`,
          padding: '24px 32px',
          // Header border stays over content with this, but under any tooltips
          'z-index': 16,
          // Ensure the content doesn't overlap the close button when present, accounts for RTL
          [`padding-${this.rtlAlignment}`]: this.closeButtonHidden ? 0 : '80px',
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
      closeButtonStyles() {
        return {
          top: `calc((${this.fixedHeaderHeight} - 40px) / 2)`,
        };
      },
      closeButtonFullScreenSidePanelStyles() {
        return {
          position: 'absolute',
          top: '8px',
          right: '8px',
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
        this.setFocusTrap();
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
      setFocusTrap() {
        if (this.$refs.sidePanel && !this.$refs.sidePanel.contains(document.activeElement)) {
          this.focusSidePanel();
        }
        this.firstFocusableEl =
          this.$el.querySelector('input[id="searchfield"]') || // if `EmbeddedSidePanel` is for search/filter btn
          this.$el.querySelector('.raised') || // if `EmbeddedSidePanel` is for info btn
          this.$el.querySelector('.side-panel-folder-link'); // if `EmbeddedSidePanel` is for folders btn
        this.lastFocusableEl = this.$refs.closeButton.$el;
      },
      focusSidePanel() {
        this.$refs.sidePanel.focus();
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
    position: fixed;
    right: 32px;
    z-index: 24;
  }

  /** Need to be sure a KDropdownMenu shows up on the Side Panel */
  /deep/ .tippy-popper {
    z-index: 24;
  }

</style>
