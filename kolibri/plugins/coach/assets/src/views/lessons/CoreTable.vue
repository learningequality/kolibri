<template>

  <div class="core-table">
    <table>
      <slot name="thead"></slot>
      <slot name="tbody"></slot>
    </table>
  </div>

</template>


<script>

  export default {
    name: 'CoreTable',
   };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  // SPECIAL CLASSES
  // icon-col - For icons
  // main-col - For main content

  .core-table
    overflow-x: auto

    table
      font-size: 14px
      width: 100%

    thead
      border-bottom-width: 1px
      border-bottom-style: solid
      border-bottom-color: $core-grey
      tr
        color: $core-text-annotation
        text-align: left
        font-size: 12px

    tbody
      tr:not(:last-child)
        border-bottom-width: 1px
        border-bottom-style: solid
        border-bottom-color: $core-grey

    th, td
      padding-top: 12px
      padding-right: 16px
      padding-bottom: 12px
      padding-left: 0

    .icon-col
      width: 40px

    .main-col
      font-weight: bold

    th:not(.icon-col),
    td:not(.icon-col)
      min-width: 120px

</style>
