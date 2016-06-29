<template>

  <div>
    <div v-el:container></div>
  </div>

</template>


<script>

  const PDFobject = require('pdfobject');
  module.exports = {
    props: ['defaultFile'],
    ready() {
      PDFobject.embed(this.defaultFile.storage_url, this.$els.container);
    },
  };

</script>


<style lang="stylus" scoped></style>
