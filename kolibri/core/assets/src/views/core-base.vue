<template>

  <div>
    <div v-if="navBarNeeded">
      <app-bar
        class="app-bar align-to-parent"
        :title="appBarTitle"
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
    </div>

    <app-body
      :topGap="headerHeight"
      :bottomGap="bottomMargin"
      :class="`gutter-${windowSize.gutterWidth}`"
      :padding="mobile ? 16 : 32"
    >
      <slot></slot>
    </app-body>

  </div>

</template>


<script>

  import { TopLevelPageNames } from 'kolibri.coreVue.vuex.constants';
  import values from 'lodash/values';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import appBar from 'kolibri.coreVue.components.appBar';
  import sideNav from 'kolibri.coreVue.components.sideNav';
  import errorBox from './error-box';
  import appBody from './app-body';
  import loadingSpinner from 'kolibri.coreVue.components.loadingSpinner';
  import globalSnackbar from './global-snackbar';

  export default {
    name: 'coreBasePage',
    components: {
      appBar,
      sideNav,
      errorBox,
      loadingSpinner,
      globalSnackbar,
      appBody,
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
    },
    vuex: {
      getters: {
        loading: state => state.core.loading,
        error: state => state.core.error,
        title: state => state.core.title,
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
