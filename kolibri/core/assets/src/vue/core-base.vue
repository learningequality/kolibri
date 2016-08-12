<template>

  <div>
    <nav-bar>
      <slot name="nav"></slot>
    </nav-bar>
    <div class='main-wrapper' v-scroll='onScroll'>
      <error-box v-show='error'></error-box>
      <slot name="above"></slot>
      <main role="main" class="page-content" v-if='!loading'>
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
    },
    vuex: {
      getters: {
        loading: state => state.core.loading,
        error: state => state.core.error,
      },
    },
    methods: {
      onScroll(e, position) {
        this.$broadcast('scrolling', position);
      },
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
    @media screen and (max-width: $portrait-breakpoint)
      padding-left: $card-gutter * 2
      padding-right: $card-gutter
      padding-bottom: 100px

  .page-content
    margin: auto
    padding-right: $card-gutter // visible right-margin in line with grid
    width-auto-adjust()

</style>
