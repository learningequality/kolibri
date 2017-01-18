<template>

  <div class="header-wrapper">
    <div class="extra-nav">
      <slot name="extra-nav"/>
    </div>
    <div class="header">
      <div class="content-icon-wrapper">
        <content-icon :kind="contentKind"/>
      </div>
      <h1 class="title">{{ title }}</h1>
      <div class="progress-icon-wrapper">
        <progress-icon :progress="progress"/>
      </div>
    </div>
  </div>

</template>


<script>

  const ContentNodeKinds = require('kolibri.coreVue.vuex.constants').ContentNodeKinds;

  module.exports = {
    props: {
      title: {
        type: String,
      },
    },
    vuex: {
      getters: {
        contentKind: (state) => {
          if (state.pageState.content) {
            return state.pageState.content.kind;
          }
          return ContentNodeKinds.TOPIC;
        },
        progress: (state) => {
          if (state.pageState.content) {
            return state.core.logging.summary.progress;
          }
          return null;
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
    margin-top: 42px // height of toolbar

  .extra-nav
    font-size: 12px
    min-height: 16px

  .header
    position: relative

  .content-icon-wrapper,
  .progress-icon-wrapper
    display: inline-block
    height: 27px
    width: 27px

  .title
    display: inline-block

</style>
