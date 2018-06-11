<template>

  <div class="vab" v-if="value > 0" :title="titleText">
    <ui-icon class="coach-mat-icon">
      <mat-svg name="local_library" category="maps" />
    </ui-icon>
    <span class="counter" v-if="isTopic">
      {{ value }}
    </span>
  </div>

</template>


<script>

  import UiIcon from 'keen-ui/src/UiIcon';

  export default {
    name: 'coachContentLabel',
    components: {
      UiIcon,
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
    computed: {
      titleText() {
        if (this.isTopic) {
          return this.$tr('topicTitle', { count: this.value });
        }
        return this.$tr('coachResourceLabel');
      },
    },
    $trs: {
      coachResourceLabel: 'Coach resource',
      topicTitle: 'Contains {count} {count, plural, one {coach resource} other {coach resources}}',
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
