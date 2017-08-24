<template>

  <div>
    <div v-if="navBarNeeded" :class="`gutter-${windowSize.gutterWidth}`">
      <app-bar
        class="app-bar align-to-parent"
        :style="appBarStyle"
        @toggleSideNav="navShown=!navShown"
        :title="appBarTitle"
        :navShown="navShown"
        :height="headerHeight">
        <div slot="app-bar-actions" class="app-bar-actions">
          <slot name="app-bar-actions"/>
        </div>
      </app-bar>
      <side-nav
        @toggleSideNav="navShown=!navShown"
        :topLevelPageName="topLevelPageName"
        :navShown="navShown"
        :headerHeight="headerHeight"
        :width="navWidth"/>
      <div :style="contentStyle" class="content-container">
        <loading-spinner v-if="loading" class="align-to-parent"/>
        <template v-else>
          <error-box v-if="error"/>
          <slot/>
        </template>
      </div>
    </div>
    <div v-else>
      <loading-spinner v-if="loading" class="align-to-parent"/>
      <template v-else>
        <error-box v-if="error"/>
        <slot/>
      </template>
    </div>
  </div>

</template>


<script>

  import { TopLevelPageNames } from 'kolibri.coreVue.vuex.constants';
  import values from 'lodash/values';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  const PADDING = 16;
  import appBar from './app-bar';
  import sideNav from 'kolibri.coreVue.components.sideNav';
  import errorBox from './error-box';
  import loadingSpinner from 'kolibri.coreVue.components.loadingSpinner';
  import Vue from 'kolibri.lib.vue';

  export default {
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
    },
    components: {
      appBar,
      sideNav,
      errorBox,
      loadingSpinner,
    },
    vuex: {
      getters: {
        loading: state => state.core.loading,
        error: state => state.core.error,
        title: state => state.core.title,
      },
    },
    watch: {
      title: 'updateDocumentTitle',
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
    data: () => ({ navShown: false }),
    methods: {
      updateDocumentTitle() {
        document.title = this.title ? `${this.title} - Kolibri` : 'Kolibri';
      },
    },
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
        const posKey = this.isRtl ? 'Right' : 'Left';
        return this.mobile ? {} : { ['padding' + posKey]: `${this.navWidth + PADDING}px` };
      },
      contentStyle() {
        const style = { top: `${this.headerHeight}px` };
        const posKey = this.isRtl ? 'right' : 'left';
        style[posKey] = this.mobile ? 0 : `${this.navWidth}px`;
        return style;
      },
    },
    created() {
      this.updateDocumentTitle();
      if (this.mobile) {
        this.navShown = false;
      }
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
    padding: 32px

</style>
