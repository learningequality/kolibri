<template>

  <div>
    <span v-for="ancestor in list">
      <span v-if="ancestor.id"><a :href="ancestor.id">{{ ancestor.name }}</a> > </span>
      <span v-else> {{ ancestor.name }}</span>
    </span>
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
