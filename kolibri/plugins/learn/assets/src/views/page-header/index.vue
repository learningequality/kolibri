<template>

  <div class="header-wrapper">
    <div class="extra-nav">
      <slot name="extra-nav"/>
    </div>
    <div class="header">
      <h1 class="title">
        {{ title }}
        <progress-icon :progress="progress"/>
      </h1>
      <div class="end">
        <slot name="end-header"/>
      </div>
    </div>
  </div>

</template>


<script>

  const ContentNodeKinds = require('kolibri.coreVue.vuex.constants').ContentNodeKinds;

  module.exports = {
    components: {
      'progress-icon': require('kolibri.coreVue.components.progressIcon'),
    },
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
            if (state.core.logging.mastery.totalattempts > 0 &&
              state.core.logging.summary.progress === 0) {
              // If there have been attempts, but no progress, return some progress.
              return 0.1;
            }
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

  @require '~kolibri.styles.definitions'

  .header-wrapper .extra-nav a
    color: $core-text-annotation
    font-weight: 300

</style>


<style lang="stylus" scoped>

  .extra-nav
    font-size: 12px
    min-height: 16px

  .title
    display: inline-block

  .end
    float: right

</style>
