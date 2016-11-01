<template>

  <div>
    <h1>Breadcrumbs</h1>

  </div>

</template>


<script>

  module.exports = {
    props: {
      list: {
        type: Array,
        // required: true,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

</style>
