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
          width: '436px',
          height: '100vh',
          color: $themeTokens.text,
          backgroundColor: $themeTokens.surface,
        }"
      >
        <h2>
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
          :togglePanel="togglePanel"
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
  // import { mapState } from 'vuex';
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
      // ...mapState('topicsTree', ['content']),
      panelType() {
        return 'resourcesList';
      },
      // siblingNodes() {
      //   console.log('content', this.content);
      // },
      // title() {
      //   if (this.panelType === 'resourceMetadata') {
      //     return this.content.title;
      //   } else if (this.panelType === 'resourcesList') {
      //     return this.$tr('topicHeader');
      //   }
      // },
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
    padding: 32px;
    padding-top: 18px;
    font-size: 14px;
  }

  .close-button {
    position: fixed;
    top: 22px;
    right: 36px;
  }

  .backdrop {
    z-index: 4;
    color: rgba(0, 0, 0, 0.7);
  }

</style>
