<template>

  <div class="vab" v-if="value > 0">
    <ui-icon icon="local_library" />
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

  .vab
    vertical-align: bottom

  .counter
    font-size: 11px
    vertical-align: inherit

  >>>.ui-icon
    font-size: 16px
    color: $core-status-progress

</style>
