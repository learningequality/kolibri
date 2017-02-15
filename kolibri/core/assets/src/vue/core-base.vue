<template>

  <div>
    <app-bar class="app-bar" @toggleSideNav="navShownMobile=!navShownMobile" :title="topLevelPageName"/>
    <nav-bar @toggleSideNav="navShownMobile=!navShownMobile" :topLevelPageName="topLevelPageName" :navShownMobile="navShownMobile"/>
    <loading-spinner v-if="loading" class="loading-spinner-fixed"/>
    <div class="main-wrapper" v-scroll="onScroll" v-if="!loading">
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

  Vue.use(vueScroll);

  module.exports = {
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
    },
    data: () => ({
      scrolled: false,
      navShownMobile: false,
    }),
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
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .main-wrapper
    position: fixed // must be fixed for ie10
    overflow-y: scroll
    height: 100%
    width: 100%
    padding-bottom: 50px
    z-index: -2
  .main-wrapper
    padding-left: $nav-width + 25px
    padding-right: 25px
    @media (max-width: $medium-breakpoint + 1)
      padding-left: 69px
      padding-right: 0
    @media screen and (max-width: $portrait-breakpoint)
      padding: 0 0.6em
      padding-bottom: 100px
  .app-bar
    padding-left: $nav-width
    @media screen and (max-width: $portrait-breakpoint)
      padding: 0
  .loading-spinner-fixed
    position: fixed

</style>
