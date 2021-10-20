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
        }"
      >
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
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';

  export default {
    name: 'FullScreenSidePanel',
    components: {
      Backdrop,
      //SidePanelResourcesList,
    },
    mixins: [responsiveWindowMixin],
    computed: {
      isMobile() {
        return this.windowBreakpoint == 0;
      },
      /**
      ---- hope to move the responsibility for this to other avenues ----
      ...mapState('topicsTree', ['content', 'contents']),
      panelType() {
        return 'resourceMetadata';
      },
      siblingNodes() {
        let siblings = this.contents.filter(
          currentContent => currentContent.parent === this.content.parent
        );
        return siblings;
      },
      nextTopic() {
        let currentContentGrandparent = this.content.ancestors[0].id;
        let topicsWithSameAncestor = this.contents.filter(
          item =>
            !item.is_leaf && item.ancestors[0] && item.ancestors[0].id === currentContentGrandparent
        );
        let currentIndex = topicsWithSameAncestor
          .map(topic => topic.id)
          .indexOf(this.content.parent);
        let nextTopic = topicsWithSameAncestor[currentIndex + 1] || null;
        return nextTopic;
      },
      title() {
        if (this.panelType === 'resourceMetadata') {
          return this.content.title;
        } else {
          return this.$tr('topicHeader');
        }
      },
      */
    },
    methods: {
      closePanel() {
        this.$emit('closePanel');
      },
    },
    $trs: {
      /*
      topicHeader: {
        message: 'Also in this folder',
        context: 'Title of the panel with all topic contents. ',
      },
      */
    },
    // $trs: {
    //   topicHeader: {
    //     message: 'Also in this folder',
    //     context: 'Title of the panel with all topic contents. ',
    //   },
    // },
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
    right: 0;
    bottom: 0;
    // Must be <= 12 z-index so that KDropdownMenu shows over
    z-index: 12;
    width: 472px;
    height: 100vh;
    padding: 24px;
    overflow: scroll;
    font-size: 14px;

    @media (min-width: 436px) {
      width: 346px;
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
