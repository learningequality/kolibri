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
      name="panorama_fish_eye"
      class="status-icon-inactive"
    />
    <template v-if="active">
      {{ $tr('active') }}
    </template>
    <template v-else>
      {{ $tr('inactive') }}
    </template>
  </span>

</template>


<script>

  export default {
    name: 'StatusIcon',
    props: {
      active: {
        type: Boolean,
        default: false,
      }
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

</style>
