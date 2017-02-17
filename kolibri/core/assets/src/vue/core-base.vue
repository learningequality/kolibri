<template>

  <div>
    <app-bar
      :style="navOpenStyle"
      @toggleSideNav="navShown=!navShown"
      :title="topLevelPageName"
      :navShown="navShown"
      :height="baseMaterialIncrement">
      <div slot="app-bar-actions" class="app-bar-actions">
        <slot name="app-bar-actions"/>
      </div>
    </app-bar>
    <nav-bar
      @toggleSideNav="navShown=!navShown"
      :topLevelPageName="topLevelPageName"
      :navShown="navShown"
      :headerHeight="baseMaterialIncrement"
      :width="navWidth"/>
    <loading-spinner v-if="loading" class="loading-spinner-fixed"/>
    <div class="main-wrapper" v-scroll="onScroll" v-if="!loading" :style="navOpenStyle">
      <error-box v-if="error"/>
      <slot name="above"/>
      <slot name="content"/>
      <slot name="below"/>
    </div>
  </div>

</template>


<script>

  const Vue = require('vue');
  const TopLevelPageNames = require('kolibri.coreVue.vuex.constants').TopLevelPageNames;
  const vueScroll = require('vue-scroll');
  const values = require('lodash.values');
  const responsiveWindow = require('kolibri.coreVue.mixins.responsiveWindow');

  Vue.use(vueScroll);

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
    },
    components: {
      'app-bar': require('./app-bar'),
      'nav-bar': require('./nav-bar'),
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
        if (oldVal === 4 & newVal === 5) {
          // Pop out the nav if transitioning from 4 to 5
          this.navShown = true;
        } else if (oldVal === 2 & newVal === 1) {
          // Pop in the nav if transitioning from 2 to 1
          this.navShown = false;
        }
      },
    },
    data: () => ({
      scrolled: false,
      navShown: false,
    }),
    computed: {
      mobile() {
        return this.windowSize.breakpoint < 2;
      },
      baseMaterialIncrement() {
        return this.mobile ? 56 : 64;
      },
      navWidth() {
        return this.baseMaterialIncrement * 5;
      },
      tablet() {
        return (this.windowSize.breakpoint > 1) & (this.windowSize.breakpoint < 5);
      },
      paddingForNav() {
        if (this.mobile | (this.tablet & !this.navShown)) {
          return 0;
        }
        return this.navWidth;
      },
      navOpenStyle() {
        if (this.navShown) {
          return { marginLeft: `${this.paddingForNav}px` };
        }
        return '';
      },
    },
    methods: {
      onScroll(e, position) {
        this.position = position;
        this.scrolled = true;
      },
    },
    mounted() {
      setInterval(() => {
        if (this.scrolled) {
          this.$emit('scroll', this.position);
          this.scrolled = false;
        }
      }, 75);
      if (this.windowSize.breakpoint >= 5) {
        this.navShown = true;
      }
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .loading-spinner-fixed
    position: fixed

  .app-bar-actions
    display: inline-block

</style>
