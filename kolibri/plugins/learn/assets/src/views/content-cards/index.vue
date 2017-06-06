<template>

  <component :header="header" :subheader="subheader" :contents="contents" :is="container" />

</template>


<script>

  module.exports = {
    props: {
      header: {
        type: String,
        required: false,
      },
      subheader: {
        type: String,
        required: false,
      },
      container: {
        type: String,
        default: 'grid',
      },
      contents: {
        type: Array,
        validator(contents) {
          return contents.length;
        },
      },
    },
    components: {
      carousel: require('./content-carousel'),
      grid: require('./content-grid'),
    },
  };

</script>


<style lang="stylus" scoped></style>
