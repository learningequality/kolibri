<template>

  <div>
    <nav-bar>
      <slot name="nav"></slot>
    </nav-bar>
    <loading-spinner class='main-wrapper' v-show="loading"></loading-spinner>
    <div class='main-wrapper' v-scroll='onScroll' v-if='!loading'>
      <error-box v-if='error'></error-box>
      <slot name="above"></slot>
      <main role="main" class="page-content">
        <slot name="content"></slot>
      </main>
      <slot name="below"></slot>
    </div>
  </div>

</template>


<script>

  require('vue-scroll');

  module.exports = {
    components: {
      'nav-bar': require('./nav-bar'),
      'error-box': require('./error-box'),
      'loading-spinner': require('loading-spinner'),
    },
    vuex: {
      getters: {
        loading: state => state.core.loading,
        error: state => state.core.error,
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
    ready() {
      setInterval(() => {
        if (this.scrolled) {
          this.$broadcast('scrolling', this.position);
          this.scrolled = false;
        }
      }, 75);
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

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
      padding-left: 69px
      padding-right: 0
    @media screen and (max-width: $portrait-breakpoint)
      padding: 0 0.6em
      padding-bottom: 100px

  .page-content
    margin: auto
    width-auto-adjust()

</style>
