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
          right: (alignment === 'right' ? 0 : ''),
          left: (alignment === 'left' ? 0 : ''),
          width: (sidePanelOverrideWidth ? sidePanelOverrideWidth : '')
        }"
      >
        <div v-if="!closeButtonHidden">
          <KIconButton
            icon="close"
            class="close-button"
            @click="closePanel"
          />
        </div>
        <slot></slot>

      <!--
        <h2 class="title">
          {{ title }}
          <span>
            <KIconButton
              icon="close"
              class="close-button"
              @click="togglePanel"
            />
          </span>
        </h2>
        <SidePanelResourceMetadata
          v-if="panelType === 'resourceMetadata'"
          :togglePanel="togglePanel"
        />
        <SidePanelResourcesList
          v-if="panelType === 'resourcesList'"
          :contents="siblingNodes"
          :currentContent="content"
          :togglePanel="togglePanel"
          :nextTopic="nextTopic"
        />
      -->
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
  //import { mapState } from 'vuex';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  //import SidePanelResourcesList from './SidePanelResourcesList';

  export default {
    name: 'FullScreenSidePanel',
    components: {
      Backdrop,
      //SidePanelResourcesList,
    },
    mixins: [responsiveWindowMixin],
    props: {
      closeButtonHidden: {
        type: Boolean,
        default: false,
      },
      alignment: {
        type: String,
        default: 'right',
        validator(val) {
          return ['right', 'left'].includes(val);
        },
      },
      // to customize the width of the side panel in different scenarios
      sidePanelOverrideWidth: {
        type: String,
        required: false,
        default: null,
      },
    },
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
    width: 472px;
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
