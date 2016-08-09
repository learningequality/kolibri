<template>

  <div>
    <h2>DATA</h2>
    <button @click="downloadCSV">Download CSV</button>
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
  };

</script>


<style lang="stylus" scoped></style>
