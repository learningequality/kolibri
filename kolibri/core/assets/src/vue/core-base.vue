<template>

  <div>
    <nav-bar>
      <slot name="nav"/>
    </nav-bar>
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
  const coreActions = require('kolibri.coreVue.vuex.actions');
  const vueScroll = require('vue-scroll');

  Vue.use(vueScroll);

  module.exports = {
    components: {
      'nav-bar': require('./nav-bar'),
      'error-box': require('./error-box'),
    },
    vuex: {
      actions: {
        handleResize: coreActions.handleResize,
      },
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
      window.addEventListener('resize', this.handleResize);
      this.handleResize();
    },
    beforeDestroy() {
      window.removeEventListener('resize', this.handleResize);
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  .main-wrapper
    position: fixed // must be fixed for ie10
    overflow-y: scroll
    height: 100%
    width: 100%
    padding-left: $left-margin
    padding-right: $right-margin
    padding-bottom: 50px
    z-index: -2
    @media (max-width: $medium-breakpoint + 1)
      padding-right: 0
    @media screen and (max-width: $portrait-breakpoint)
      padding: 0 0.6em
      padding-bottom: 100px

  .loading-spinner-fixed
    position: fixed

</style>
