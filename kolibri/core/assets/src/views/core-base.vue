<template>

  <div>
    <!-- temporary hack, resolves flicker when using other templates -->
    <template v-if="navBarNeeded">

      <immersive-toolbar
        v-if="immersivePage"
        :appBarTitle="toolbarTitle || appBarTitle"
        :icon="immersivePageIcon"
        :route="immersivePageRoute"
        :primary="immersivePagePrimary"
        :height="headerHeight"
        @nav-icon-click="$emit('navIconClick')"
      />

      <template v-else>
        <app-bar
          class="app-bar align-to-parent"
          :title="toolbarTitle || appBarTitle"
          :height="headerHeight"
          :navShown="navShown"
          @toggleSideNav="navShown=!navShown"
        >
          <div slot="app-bar-actions" class="app-bar-actions">
            <slot name="app-bar-actions"></slot>
          </div>
        </app-bar>
        <side-nav
          :navShown="navShown"
          :headerHeight="headerHeight"
          :width="navWidth"
          @toggleSideNav="navShown=!navShown"
        />
      </template>

    </template>

    <app-body
      :topGap="headerHeight"
      :bottomGap="bottomMargin"
      :class="`gutter-${windowSize.gutterWidth}`"
    >
      <slot></slot>
    </app-body>

    <global-snackbar />

  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import AppBar from 'kolibri.coreVue.components.AppBar';
  import SideNav from 'kolibri.coreVue.components.SideNav';
  import appBody from './app-body';
  import globalSnackbar from './global-snackbar';
  import immersiveToolbar from './immersive-toolbar';

  export default {
    name: 'CoreBase',
    $trs: {
      kolibriMessage: 'Kolibri',
      kolibriTitleMessage: '{ title } - Kolibri',
      errorPageTitle: 'Error',
    },
    components: {
      AppBar,
      immersiveToolbar,
      SideNav,
      appBody,
      globalSnackbar,
    },
    mixins: [responsiveWindow],
    props: {
      appBarTitle: {
        type: String,
        required: false,
      },
      // Prop that determines whether to show nav components
      navBarNeeded: {
        type: Boolean,
        default: true,
      },
      // reserve space at the bottom for floating widgets
      bottomMargin: {
        type: Number,
        default: 0,
      },
      // IMMERSIVE-SPECIFIC
      immersivePage: {
        type: Boolean,
        required: false,
        default: false,
      },
      immersivePageIcon: {
        type: String,
        required: false,
        default: 'close',
      },
      immersivePageRoute: {
        type: Object,
        required: false,
      },
      // determines the color, primary being the classic kolibri appbar color
      immersivePagePrimary: {
        type: Boolean,
        required: false,
      },
    },
    metaInfo() {
      return {
        // Use arrow function to bind $tr to this component
        titleTemplate: title => {
          if (this.error) {
            return this.$tr('errorPageTitle');
          }
          if (!title) {
            // If no child component sets title, it reads 'Kolibri'
            return this.$tr('kolibriMessage');
          }
          // If child component sets title, it reads 'Child Title - Kolibri'
          return this.$tr('kolibriTitleMessage', { title });
        },
      };
    },
    data: () => ({ navShown: false }),
    computed: {
      ...mapState({
        toolbarTitle: state => state.pageState.toolbarTitle,
        error: state => state.error,
      }),
      mobile() {
        return this.windowSize.breakpoint < 2;
      },
      headerHeight() {
        return this.mobile ? 56 : 64;
      },
      navWidth() {
        return this.headerHeight * 4;
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .align-to-parent {
    position: absolute;
    top: 0;
    left: 0;
  }

  .app-bar {
    width: 100%;
    height: 64px;
  }

  .app-bar-actions {
    display: inline-block;
  }

  .content-container {
    position: absolute;
    right: 0;
    bottom: 0;
    padding-bottom: 40px;
    overflow-x: hidden;
  }

</style>
