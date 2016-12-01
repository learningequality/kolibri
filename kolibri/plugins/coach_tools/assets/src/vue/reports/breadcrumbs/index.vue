<template>

  <div class="breadcrumb-wrapper-div">
    <span v-for="ancestor in list">
      <span v-if="ancestor.vlink"><router-link :to="ancestor.vlink">{{ ancestor.title }}</router-link> &gt; </span>
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

  .breadcrumb-wrapper-div
    padding: 0.5em
    line-height: 2em
    font-size: smaller
    display: inline-block

</style>
