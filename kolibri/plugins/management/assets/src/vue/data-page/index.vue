<template>

  <div class="wrapper">

    <h1>Export Usage Data</h1>

    <p>
      Download comma-separated spreadsheets containing information about users and
      their interactions with the content on this device.
    </p>

    <div class="exportblock">
      <h2>Content Summary Logs</h2>
      <p>
        Each row in a content summary log represents a summary of a user's entire history of
        interactions with a particular piece of content.
      </p>
      <a :href="summarylogurl">
        <icon-button text="Download CSV">
          <svg src="../icons/download.svg"></svg>
        </icon-button>
      </a>
    </div>

    <div class="exportblock">
      <h2>Content Session Logs</h2>
      <p>
        Each row in a content session log represents a user's interactions with a particular
        piece of content within the context of a single page load.
      </p>
      <a :href="sessionlogurl">
        <icon-button text="Download CSV">
          <svg src="../icons/download.svg"></svg>
        </icon-button>
      </a>
    </div>

  </div>

</template>


<script>

  const Kolibri = require('kolibri');
  module.exports = {
    components: {
      'icon-button': require('icon-button'),
    },
    computed: {
      summarylogurl() {
        return Kolibri.urls['contentsummarylogcsv-list']();
      },
      sessionlogurl() {
        return Kolibri.urls['contentsessionlogcsv-list']();
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require 'jeet'

  @media (min-width: 900px)
    .exportblock
      col(1/2)

  .wrapper
    cf()

</style>
