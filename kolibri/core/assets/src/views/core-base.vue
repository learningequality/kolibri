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
          :topLevelPageName="topLevelPageName"
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

  import { TopLevelPageNames } from 'kolibri.coreVue.vuex.constants';
  import values from 'lodash/values';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import appBar from 'kolibri.coreVue.components.appBar';
  import sideNav from 'kolibri.coreVue.components.sideNav';
  import appBody from './app-body';
  import globalSnackbar from './global-snackbar';
  import immersiveToolbar from './immersive-toolbar';

  export default {
    name: 'coreBase',
    $trs: {
      kolibriMessage: 'Kolibri',
      kolibriTitleMessage: '{ title } - Kolibri',
    },
    components: {
      appBar,
      immersiveToolbar,
      sideNav,
      appBody,
      globalSnackbar,
    },
    mixins: [responsiveWindow],
    props: {
      // This prop breaks the separation between core and plugins.
      // It's being used as a work-around until plugins have a way
      // of registering components to be added to the nav bar.
      topLevelPageName: {
        type: String,
        validator(value) {
          if (!value) {
            return true; // Okay if it's undefined
          }
          return values(TopLevelPageNames).includes(value);
        },
      },
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
    vuex: {
      getters: {
        // set document title (window name)
        documentTitle: state => state.core.title,
        toolbarTitle: state => state.pageState.toolbarTitle,
      },
    },
    data: () => ({ navShown: false }),
    computed: {
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
    watch: {
      documentTitle: 'updateDocumentTitle',
    },
    created() {
      this.updateDocumentTitle();
    },
    methods: {
      // move this responsibility to state?
      updateDocumentTitle() {
        document.title = this.documentTitle
          ? this.$tr('kolibriTitleMessage', { title: this.documentTitle })
          : this.$tr('kolibriMessage');
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .align-to-parent
    position: absolute
    top: 0
    left: 0

  .app-bar
    height: 64px
    width: 100%

  .app-bar-actions
    display: inline-block

  .content-container
    position: absolute
    overflow-x: hidden
    right: 0
    bottom: 0
    padding-bottom: 40px

</style>
