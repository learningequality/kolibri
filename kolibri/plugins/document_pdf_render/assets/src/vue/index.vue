<template>

  <div>
    <div v-el:container></div>
  </div>

</template>


<script>

  const PDFobject = require('pdfobject');
  module.exports = {
    ready() {
      PDFobject.embed('http://www.benlandis.com/sheet-music/piano-rickroll.pdf', this.$els.container);
    },
  };

</script>


<style lang="stylus" scoped>

</style>
