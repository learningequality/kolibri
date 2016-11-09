<template>

  <div class="beadcrumbs">
    <span v-for="ancestor in list">
      <span v-if="ancestor.url"><a :href="ancestor.url">{{ ancestor.name }}</a> &gt; </span>
      <span v-else> {{ ancestor.name }}</span>
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
    background-color: white
    padding: 0.5em
    line-height: 2em
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)

</style>
