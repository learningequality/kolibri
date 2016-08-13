<template>

  <div>
    <h1>Export Data</h1>
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
