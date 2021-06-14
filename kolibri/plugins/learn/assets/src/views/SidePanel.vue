<template>

  <div
    v-if="panelOpen"
    ref="sidePanel"
    class="side-panel-wrapper"
    tabindex="0"
    @keyup.esc="togglePanel"
  >
    <transition name="side-panel">
      <div
        class="side-panel"
        :style="{
          color: $themeTokens.text,
          backgroundColor: $themeTokens.surface,
        }"
      >
        <h2 class="title">
          {{ title }}
          <span>
            <KIconButton
              icon="close"
              class="close-button"
              @click="togglePanel"
            /></span>
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
      </div>
    </transition>
    <Backdrop
      :transitions="true"
      class="backdrop"
      @click="togglePanel"
    />
  </div>

</template>


<script>

  import Backdrop from 'kolibri.coreVue.components.Backdrop';
  import { mapState } from 'vuex';
  // import { showTopicsContent } from '../modules/topicsTree/handlers';
  import SidePanelResourceMetadata from './SidePanelResourceMetadata';
  import SidePanelResourcesList from './SidePanelResourcesList';

  export default {
    name: 'SidePanel',
    components: {
      Backdrop,
      SidePanelResourceMetadata,
      SidePanelResourcesList,
    },
    data: function() {
      return {
        panelOpen: true,
      };
    },
    computed: {
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
    },
    methods: {
      togglePanel() {
        // this.$emit('togglePanel');
        this.panelOpen = !this.panelOpen;
      },
      //   containFocus(event) {
      //     if (event.target === window) {
      //       return event;
      //     }
      //     if (!this.$refs.sidePanel.contains(event.target)) {
      //       this.$refs.coreMenu.$el.focus();
      //     }
      //     return event;
      //   },
    },
    $trs: {
      topicHeader: 'Also in this topic',
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
    right: 0;
    z-index: 16;
    width: 100vw;
    height: 100vh;
    padding-top: 18px;
    overflow: scroll;
    font-size: 14px;

    @media (min-width: 436px) {
      width: 436px;
    }
  }

  .title {
    max-width: 70vw;
    margin-left: 32px;
  }

  .close-button {
    position: fixed;
    top: 22px;
    right: 36px;
  }

  .next-resource-footer {
    position: fixed;
    bottom: 0;
    height: 100px;
  }

  .backdrop {
    z-index: 4;
    color: rgba(0, 0, 0, 0.7);
  }

</style>
