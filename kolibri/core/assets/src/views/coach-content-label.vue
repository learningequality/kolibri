<template>

  <div class="coach-content-label">
    <mat-svg
      category="maps"
      name="local_library"
      class="coach-icon"
    />
    <span>{{ $tr('coachLabel') }}</span>
  </div>

</template>


<script>

  export default {
    name: 'coachContentLabel',
    $trs: {
      coachLabel: 'Coach',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.theme'

  .coach-icon
    fill: $core-status-progress
    vertical-align: text-bottom
    margin-right: 4px

</style>
