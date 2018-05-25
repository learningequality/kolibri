<template>

  <div class="vab" v-if="value > 0">
    <ui-tooltip trigger="icon" position="top center">
      {{ $tr('coachLabel') }}
    </ui-tooltip>
    <ui-icon
      class="coach-mat-icon"
      ref="icon"
    >
      <mat-svg name="local_library" category="maps" />
    </ui-icon>
    <span class="counter" v-if="isTopic">
      {{ value }}
    </span>
  </div>

</template>


<script>

  import UiIcon from 'keen-ui/src/UiIcon';
  import UiTooltip from 'keen-ui/src/UiTooltip';

  export default {
    name: 'coachContentLabel',
    components: {
      UiIcon,
      UiTooltip,
    },
    props: {
      value: {
        type: Number,
        default: 0,
      },
      // Show number next to label if a topic
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

  .vab
    vertical-align: bottom

  .counter
    font-size: 11px
    vertical-align: inherit

  .coach-mat-icon.ui-icon
    font-size: 16px
    color: $core-status-progress

</style>
