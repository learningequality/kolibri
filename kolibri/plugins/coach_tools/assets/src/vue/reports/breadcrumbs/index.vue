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

</style>
