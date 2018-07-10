<template>

  <div class="core-table-container">
    <table class="core-table">
      <slot></slot>
      <slot name="thead"></slot>
      <slot name="tbody"></slot>
    </table>
  </div>

</template>


<script>

  export default {
    name: 'coreTable',
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  // SPECIAL CLASSES
  // core-table-icon-col - Icon Column
  // core-table-main-col - Main Column
  // core-table-checkbox-col - Checkbox column
  // core-table-rows-selectable - Rows are selectable
  // core-table-row-selected - Row is selected

  .core-table-container
    overflow-x: auto
    overflow-y: hidden

  .core-table
    width: 100%
    font-size: 14px

  >>>thead
    border-bottom: solid 1px $core-grey
    tr
      font-size: 12px
      color: $core-text-annotation

  >>>tbody
    tr:not(:last-child)
      border-bottom: solid 1px $core-grey

  >>>tr
    text-align: left

  >>>th, >>>td
    padding: 12px 16px 12px 0

  >>>th:not(.core-table-icon-col):not(.core-table-checkbox-col),
  >>>td:not(.core-table-icon-col):not(.core-table-checkbox-col)
    min-width: 120px

  >>>.core-table-icon-col,
  >>>.core-table-checkbox-col
    width: 40px

  >>>.core-table-main-col
    font-weight: bold


  >>>.core-table-icon-col
    .ui-icon
      display: inline-block
      height: 24px
      font-size: 24px
      vertical-align: inherit

  >>>.core-table-checkbox-col
    .k-checkbox-container
      margin: 0 0 0 2px

  >>>.core-table-rows-selectable
    tr
      cursor: pointer
      &:hover
        background-color: $core-grey

  >>>.core-table-row-selected
    background-color: $core-bg-canvas

</style>
