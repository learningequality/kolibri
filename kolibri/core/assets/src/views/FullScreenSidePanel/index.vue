<template>

  <div
    ref="sidePanel"
    class="side-panel-wrapper"
    :class="{ 'is-rtl': isRtl, 'is-mobile': isMobile }"
    tabindex="0"
    @keyup.esc="closePanel"
  >
    <transition name="side-panel">
      <div
        class="side-panel"
        :style="{
          color: $themeTokens.text,
          backgroundColor: $themeTokens.surface,
          right: (rtlAlignment === 'right' ? 0 : ''),
          left: (rtlAlignment === 'left' ? 0 : ''),
          width: (sidePanelOverrideWidth ? sidePanelOverrideWidth : '')
        }"
      >
        <div v-if="!closeButtonHidden">
          <KIconButton
            icon="close"
            class="close-button"
            :ariaLabel="coreString('closeAction')"
            :tooltip="coreString('closeAction')"
            @click="closePanel"
          />
        </div>
        <slot></slot>
      </div>
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

  export default {
    name: 'FullScreenSidePanel',
    components: {
      Backdrop,
    },
    mixins: [responsiveWindowMixin, commonCoreStrings],
    props: {
      closeButtonHidden: {
        type: Boolean,
        default: false,
      },
      // to customize the width of the side panel in different scenarios
      sidePanelOverrideWidth: {
        type: String,
        required: false,
        default: null,
      },
      // to which side of the screen should the panel be fixed?
      // set alignment based on LTR languages
      // rtl is handled as appropriate through computed props
      alignment: {
        type: String,
        required: true,
        validator(value) {
          return ['right', 'left'].includes(value);
        },
      },
    },
    computed: {
      isMobile() {
        return this.windowBreakpoint == 0;
      },
      rtlAlignment() {
        if (this.isRtl && this.alignment === 'left') {
          return 'right';
        } else if (this.isRtl && this.alignment === 'right') {
          return 'left';
        } else {
          return this.alignment;
        }
      },
    },
    /* this is the easiest way I could think to avoid having dual scroll bars */
    mounted() {
      const htmlTag = window.document.getElementsByTagName('html')[0];
      htmlTag.style['overflow-y'] = 'hidden';
    },
    beforeDestroy() {
      const htmlTag = window.document.getElementsByTagName('html')[0];
      htmlTag.style['overflow-y'] = 'auto';
    },
    methods: {
      closePanel() {
        this.$emit('closePanel');
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

  .side-panel-wrapper {
    overflow-x: hidden;
  }

  .side-panel {
    position: fixed;
    top: 0;
    bottom: 0;
    // Must be <= 12 z-index so that KDropdownMenu shows over
    z-index: 12;
    width: 436px;
    height: 100vh;
    padding: 32px;
    overflow: auto;
    font-size: 14px;

    .is-mobile & {
      width: 100vw;
    }
  }

  .title {
    max-width: 70vw;
    margin-left: 32px;
  }

  .close-button {
    position: fixed;
    top: 32px;
    right: 32px;
    z-index: 24; // Always above everything
  }

  .next-resource-footer {
    position: fixed;
    bottom: 0;
    height: 100px;
  }

  .backdrop {
    color: rgba(0, 0, 0, 0.7);
  }

  /** Need to be sure a KDropdownMenu shows up on the Side Panel */
  /deep/ .tippy-popper {
    z-index: 24;
  }

</style>
