<template>

  <div class="header-wrapper">
    <div class="extra-nav">
      <slot name="extra-nav"></slot>
    </div>
    <div class="header">
      <div class="content-icon-wrapper">
        <content-icon :kind="contentIconKind"></content-icon>
      </div>
      <div class="title"><h1>{{ title }}</h1></div>
    </div>
  </div>

</template>


<script>

  module.exports = {
    props: {
      title: {
        type: String,
      },
    },
    computed: {
      contentIconKind() {
        return this.contentKind ? this.contentKind : 'topic';
      },
    },
    vuex: {
      getters: {
        contentKind: (state) => {
          if (state.pageState.content) {
            return state.pageState.content.kind;
          }
          return 'topic';
        },
      },
    },
  };

</script>


<style lang="stylus">

  /** WARNING - unscoped styles for children                  */
  /* use very precise selectors to minimize risk of collision */

  @require '~kolibri.styles.coreTheme'

  .header-wrapper .extra-nav a
    color: $core-text-annotation
    font-weight: 300

  // @stylint off
  .header-wrapper .icon-wrapper > *
    // @stylint on
    width: 1em
    height: 1em

</style>


<style lang="stylus" scoped>

  .header-wrapper
    margin-top: 1em

  .extra-nav
    font-size: 12px
    min-height: 16px

  .header
    position: relative
    height: 3em

  .content-icon-wrapper
    position: absolute
    left: 0
    height: 27px
    width: 27px

  .title
    margin-left: 35px

</style>
