<template>

  <div class="vab" v-if="value > 0" :title="titleText">
    <ui-tooltip trigger="icon" position="bottom center" v-if="!isTopic">
      {{ $tr('coachResourceLabel') }}
    </ui-tooltip>
    <ui-icon
      class="coach-mat-icon"
      ref="icon"
      icon="local_library"
    />
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
    computed: {
      titleText() {
        if (this.isTopic) {
          return this.$tr('topicTitle', { count: this.value });
        }
        return null;
      },
    },
    $trs: {
      coachResourceLabel: 'Coach resource',
      topicTitle: 'Contains {count} {count, plural, one {story} other {stories}}',
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
