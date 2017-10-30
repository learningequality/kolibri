<template>

  <div class="table-section">
    <caption class="visuallyhidden" v-if="caption">{{ caption }}</caption>
    <table class="data-table">
      <slot name="thead"></slot>
      <slot name="tbody" is="transition-group" />
    </table>
  </div>

</template>


<script>

  export default {
    props: {
      caption: { type: String },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .table-section
    background-color: $core-bg-light
    margin-top: 1em
    margin-bottom: 1em
    overflow-x: auto

  .data-table
    width: 100%
    font-size: smaller
    border-spacing: 0

  .tbody-move
    transition: transform 0.5s cubic-bezier(0.55, 0, 0.1, 1)

</style>


<style lang="stylus">

  .data-table
    td, th
      padding: 8px

</style>
