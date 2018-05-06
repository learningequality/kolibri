<template>

  <div v-if="value > 0">
    <mat-svg
      category="maps"
      name="local_library"
      class="coach-icon"
    />
    <span v-if="!isTopic">
      {{ $tr('coachLabel') }}
    </span>
    <span v-else>
      {{ value }}
    </span>
  </div>

</template>


<script>

  export default {
    name: 'coachContentLabel',
    props: {
      value: {
        type: Number,
        default: 0,
      },
      // Show number next to label if a topic, otherwise show simple label
      isTopic: {
        type: Boolean,
        default: false,
      },
    },
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
