<template>

  <div :class="`gutter-${windowSize.gutterWidth}`">
    <app-bar
      class="app-bar"
      :style="appBarStyle"
      @toggleSideNav="navShown=!navShown"
      :title="appBarTitle"
      :navShown="navShown"
      :height="headerHeight">
      <div slot="app-bar-actions" class="app-bar-actions">
        <slot name="app-bar-actions"/>
      </div>
    </app-bar>
    <nav-bar
      @toggleSideNav="navShown=!navShown"
      :topLevelPageName="topLevelPageName"
      :navShown="navShown"
      :headerHeight="headerHeight"
      :width="navWidth"/>
    <loading-spinner v-if="loading" class="loading-spinner-fixed"/>
    <div v-if="!loading" :style="contentStyle" class="content-container">
      <error-box v-if="error"/>
      <slot name="content"/>
    </div>
    <slot name="extra"/>
  </div>

</template>


<script>

  const TopLevelPageNames = require('kolibri.coreVue.vuex.constants').TopLevelPageNames;
  const values = require('lodash.values');
  const responsiveWindow = require('kolibri.coreVue.mixins.responsiveWindow');

  const PADDING = 16;

  module.exports = {
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
    },
    components: {
      'app-bar': require('./app-bar'),
      'nav-bar': require('kolibri.coreVue.components.navBar'),
      'error-box': require('./error-box'),
      'loading-spinner': require('kolibri.coreVue.components.loadingSpinner'),
    },
    vuex: {
      getters: {
        loading: state => state.core.loading,
        error: state => state.core.error,
        title: state => state.core.title,
      },
    },
    watch: {
      title(newVal, oldVal) {
        document.title = `${newVal} - Kolibri`;
      },
      'windowSize.breakpoint': function updateNav(newVal, oldVal) {
        if (oldVal === 4 && newVal === 5) {
          // Pop out the nav if transitioning from 4 to 5
          this.navShown = true;
        } else if (oldVal === 2 && newVal === 1) {
          // Pop in the nav if transitioning from 2 to 1
          this.navShown = false;
        }
      },
    },
    data: () => ({
      navShown: true,
    }),
    computed: {
      mobile() {
        return this.windowSize.breakpoint < 2;
      },
      headerHeight() {
        return this.mobile ? 56 : 64;
      },
      navWidth() {
        return this.navShown ? this.headerHeight * 4 : 0;
      },
      appBarStyle() {
        return { paddingLeft: `${this.navWidth + PADDING}px` };
      },
      contentStyle() {
        return { left: `${this.navWidth}px`, top: `${this.headerHeight}px` };
      },
    },
    mounted() {
      if (this.mobile) {
        this.navShown = false;
      }
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .loading-spinner-fixed
    position: fixed

  .app-bar
    height: 64px
    z-index: 50
    width: 100%
    position: absolute
    top: 0
    left: 0

  .app-bar-actions
    display: inline-block

  .content-container
    position: absolute
    overflow-y: auto
    overflow-x: hidden
    right: 0
    bottom: 0
    padding-bottom: 40px
    padding: 32px

</style>
