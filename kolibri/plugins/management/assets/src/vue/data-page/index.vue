<template>

  <div class="wrapper">

    <h1>Export Usage Data</h1>

    <p>
      Download CSV (comma-separated value) files containing information about users and
      their interactions with the content on this device.
    </p>

    <div class="exportblock">
      <h2>Detail Logs</h2>
      <p>
        Individual visits to each piece of content.
      </p>
      <a :href="sessionlogurl">
        <icon-button text="Download">
          <svg src="../icons/download.svg"/>
        </icon-button>
      </a>
      <p class="infobox">
        <b>Note</b>: When a user views a piece of content, we record how long they spend and the progress they make.
        Each row in this file records a single visit a user made to a specific piece of content.
        This includes anonymous usage, when no user is logged in.
      </p>
    </div>

    <div class="exportblock">
      <h2>Summary Logs</h2>
      <p>
        Total time/progress for each piece of content.
      </p>
      <a :href="summarylogurl">
        <icon-button text="Download">
          <svg src="../icons/download.svg"/>
        </icon-button>
      </a>
      <p class="infobox">
        <b>Note</b>: A user may visit the same piece of content multiple times. This file records the total time and
        progress each user has achieved for each piece of content, summarized across possibly more than
        one visit. Anonymous usage is not included.
      </p>
    </div>

  </div>

</template>


<script>

  const coreApp = require('kolibri');

  module.exports = {
    components: {
      'icon-button': require('kolibri.coreVue.components.iconButton'),
    },
    computed: {
      summarylogurl() {
        return coreApp.urls['contentsummarylogcsv-list']();
      },
      sessionlogurl() {
        return coreApp.urls['contentsessionlogcsv-list']();
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require 'jeet'
  @require '~kolibri.styles.coreTheme'

  @media (min-width: $medium-breakpoint)
    .exportblock
      col(1/2)

  .infobox
    background-color: $core-bg-warning
    border-radius: $radius
    font-size: 0.8em
    padding: 8px
    margin-left: -8px
    margin-right: 8px

  .wrapper
    cf()

</style>
