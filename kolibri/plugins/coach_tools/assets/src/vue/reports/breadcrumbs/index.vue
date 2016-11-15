<template>

  <div class="beadcrumbs">
    <span v-for="ancestor in list">
      <span v-if="ancestor.vlink"><a v-link="ancestor.vlink">{{ ancestor.title }}</a> &gt; </span>
      <span v-else> {{ ancestor.title }}</span>
    </span>
  </div>

</template>


<script>

  module.exports = {
    props: {
      list: {
        type: Array,
        required: true,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  .beadcrumbs
    padding: 0.5em
    line-height: 2em
    font-size: smaller

</style>
