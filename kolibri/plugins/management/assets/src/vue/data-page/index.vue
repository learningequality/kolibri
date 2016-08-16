<template>

  <div>
    <h1>Export Usage Data</h1>

    <p>
      Download a comma-separated spreadsheet containing information about users and
      their interactions with the content on this device.
    </p>

    <icon-button @click="downloadCSV" text="Download CSV">
      <svg src="../icons/download.svg"></svg>
    </icon-button>
  </div>

</template>


<script>

  const Kolibri = require('kolibri');
  module.exports = {
    methods: {
      downloadCSV() {
        window.open(Kolibri.urls['contentsummarylogcsv-list'](), '_blank');
      },
    },
    components: {
      'icon-button': require('icon-button'),
    },
  };

</script>


<style lang="stylus" scoped></style>
