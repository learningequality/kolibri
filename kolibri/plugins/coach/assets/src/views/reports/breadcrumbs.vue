<template>

  <div class="breadcrumb-wrapper">
    <span v-for="ancestor in list" class="crumb">
      <span v-if="ancestor.vlink">
        <router-link :to="ancestor.vlink">{{ ancestor.title }}</router-link>
      </span>
      <span v-else>{{ ancestor.title }}</span>
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

  @require '~kolibri.styles.definitions'

  .breadcrumb-wrapper
    font-size: smaller
    display: inline-block
    color: $core-text-annotation

  .crumb + .crumb::before // before any crumb coming after another crumb
    content: '>'
    margin: 8px
    color: $core-text-annotation

  .crumb a
    color: $core-text-annotation

</style>
