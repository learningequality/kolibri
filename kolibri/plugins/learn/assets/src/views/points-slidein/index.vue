<template>

  <div class="points-slidein">
    <div class="points">
      <points-icon class="points-icon" :active="true" />
      <span class="points-amount">{{ $tr('plusPoints', { maxPoints }) }}</span>
    </div>

    <ui-icon-button
      type="secondary"
      color="default"
      size="small"
      icon="close"
      :ariaLabel="$tr('close')"
      @click="$emit('close')"
    />
    </div>

</template>


<script>

  import { contentPoints } from 'kolibri.coreVue.vuex.getters';
  import { MaxPointsPerContent } from 'kolibri.coreVue.vuex.constants';
  import pointsIcon from 'kolibri.coreVue.components.pointsIcon';
  import uiIconButton from 'keen-ui/src/UiIconButton';

  export default {
    name: 'pointsSlidein',
    $trs: {
      plusPoints: '+ { maxPoints, number } Points',
      close: 'Close',
    },
    components: {
      pointsIcon,
      uiIconButton,
    },

    computed: {
      maxPoints() {
        return MaxPointsPerContent;
      },
    },
    vuex: {
      getters: { contentPoints },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  $box-shadow = 0 2px 4px -1px rgba(0, 0, 0, 0.2),
                0 4px 5px 0 rgba(0, 0, 0, 0.14),
                0 1px 10px 0 rgba(0, 0, 0, 0.12)

  .points-slidein
    position: fixed
    top: 84px
    right: 24px
    z-index: 24
    padding: 8px
    background-color: $core-bg-canvas
    box-shadow: $box-shadow
    animation-fill-mode: both
    animation-timing-function: cubic-bezier(0.35, 0, 0.25, 1)
    animation-duration: 0.3s

  .slidein-enter-active
    animation-name: slidein

  .slidein-leave-active
    animation-name: slidein
    animation-direction: reverse

  @keyframes slidein
    from
      transform: translate3d(100%, 0, 0)
      visibility: visible
    to
      transform: translate3d(0, 0, 0)

  .points
    display: inline-block
    margin-left: 16px

  .points-icon
    float: left
    width: 20px
    height: 20px

  .points-amount
    margin-left: 8px
    margin-right: 16px
    font-weight: bold
    color: $core-status-correct

</style>
