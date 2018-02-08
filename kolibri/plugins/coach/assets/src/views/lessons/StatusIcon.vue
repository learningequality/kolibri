<template>

  <span class="status-icon">
    <mat-svg
      v-if="active"
      category="image"
      name="lens"
      class="status-icon-active"
    />
    <mat-svg
      v-else
      category="image"
      name="lens"
      class="status-icon-inactive"
    />
    <span class="active-text">{{ active ? $tr('active') : $tr('inactive') }}</span>
  </span>

</template>


<script>

  export default {
    name: 'statusIcon',
    props: {
      active: {
        type: Boolean,
        default: false,
      },
    },
    $trs: {
      active: 'Active',
      inactive: 'Inactive',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .status-icon
    vertical-align: middle

  .status-icon-active,
  .status-icon-inactive
    vertical-align: middle

  .status-icon-active
    fill: $core-status-correct

  .status-icon-inactive
    fill: $core-grey

  .active-text
    margin-left: 8px
    vertical-align: inherit

</style>
