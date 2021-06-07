<template>

  <div
    ref="sidePanel"
    class="side-panel-wrapper"
    tabindex="0"
    @keyup.esc="togglePanel"
  >
    <transition name="side-panel">
      <div
        class="side-panel"
        :style="{
          width: '436px',
          height: '100vh',
          color: $themeTokens.text,
          backgroundColor: $themeTokens.surface,
        }"
      >
        <SidePanelResourceMetadata
          v-if="panelType === 'resourceMetadata'"
        />
        <SidePanelResourcesList
          v-if="panelType === 'resourcesList'"
          :contents="siblingNodes"
        />
      </div>
    </transition>
    <Backdrop
      class="side-panel-backdrop"
    />
  </div>

</template>


<script>

  import Backdrop from 'kolibri.coreVue.components.Backdrop';
  import { mapState } from 'vuex';
  import { showTopicsContent } from '../modules/topicsTree/handlers';
  import SidePanelResourceMetadata from './SidePanelResourceMetadata';
  import SidePanelResourcesList from './SidePanelResourcesList';

  export default {
    name: 'SidePanel',
    components: {
      Backdrop,
      SidePanelResourceMetadata,
      SidePanelResourcesList,
    },
    // watch: {
    //   panelShown() {
    //     this.$nextTick(() => {
    //       if (isShown) {
    //         window.addEventListener('focus', this.containFocus, true);
    //         this.previouslyFocusedElement = document.activeElement;
    //         this.$refs.sideNav.focus();
    //       } else {
    //         window.removeEventListener('focus', this.containFocus, true);
    //         this.previouslyFocusedElement.focus();
    //       }
    //     });
    //     return true;
    //   },
    // },
    computed: {
      ...mapState('topicsTree', ['content']),
      panelType() {
        return 'resourcesList';
      },
      siblingNodes() {
        console.log(this.content);
        let topicsTree = showTopicsContent(this.state, this.content.parent);
        console.log(topicsTree);
        return topicsTree;
      },
    },
    // methods: {
    //   // togglePanel() {
    //   //   this.$emit('togglePanel');
    //   // },
    //   containFocus(event) {
    //     if (event.target === window) {
    //       return event;
    //     }
    //     if (!this.$refs.sidePanel.contains(event.target)) {
    //       this.$refs.coreMenu.$el.focus();
    //     }
    //     return event;
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
    z-index: 16;
    font-size: 14px;
  }

  .metadata {
    margin: 32px;
  }

</style>
