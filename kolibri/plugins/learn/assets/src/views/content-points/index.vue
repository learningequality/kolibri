<template>

  <transition name="popup">
    <div class="popover-container">
      <div class="popover">
        <div class="content">
          <ui-close-button
              size="small"
              @click="closePopover"
              class="close"
          ></ui-close-button>
          <span class="encourage">{{ $tr('niceWork') }}</span>
          <div class="points-wrapper">
            <div class="points">
              <points-icon class="popover-icon" :active="true"/>
              <span class="plus-points">{{ $tr('plusPoints', { maxPoints }) }}</span>
            </div>
          </div>
          <div class="description">
            <div class="item-wrapper">
              <p class="next-item">{{ $tr('nextContent') }}</p>
              <div class="content-name">
                <content-icon class="content-icon" :kind="kind"/>
                <p>{{ title }}</p>
              </div>
            </div>
          </div>
          <slot name="nextItemBtn"/>
        </div>
      </div>
    </div>
  </transition>

</template>


<script>

  const { contentPoints } = require('kolibri.coreVue.vuex.getters');
  const { MaxPointsPerContent } = require('kolibri.coreVue.vuex.constants');

  module.exports = {
    $trNameSpace: 'contentPoints',
    $trs: {
      plusPoints: '+ { maxPoints, number } Points',
      niceWork: 'Nice work. Keep it up!',
      nextContent: 'Next item',
    },
    components: {
      'points-icon': require('kolibri.coreVue.components.pointsIcon'),
      'ui-close-button': require('keen-ui/src/UiCloseButton'),
      'content-icon': require('kolibri.coreVue.components.contentIcon'),
    },
    vuex: {
      getters: {
        contentPoints,
      },
    },
    props: {
      kind: {
        type: String,
      },
      title: {
        type: String,
      },
    },
    computed: {
      maxPoints() {
        return MaxPointsPerContent;
      },
    },
    methods: {
      closePopover() {
        this.$emit('close');
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .popover-container
    position: absolute
    height: 0
    left: 10%
    top: 50%
    z-index: 1000

  .popover
    background-color: $core-bg-canvas
    padding: 10px 15px 5px
    box-shadow: grey 2px 2px 5px 1px

  .popover-icon
    float: left
    width: 30px
    height: 30px

  .plus-points
    padding-left: 5px
    font-size: 1.5em
    font-weight: bold
    color: $core-correct-color

  .points-wrapper
    margin: 2em
    text-align: center

  .points
    display: inline-block

  .encourage
    color: $core-text-default
    font-size: 1.5em
    font-weight: bold
    margin: auto 3em

  .content
    display: inline-table
    margin-right: 10px
    padding-top: 0.5em
    text-align: center

  .close
    position: absolute
    right: 10px
    top: 10px

  .popup-enter-active, .popup-leave-active
    transition: all 0.3s ease

  .popup-enter
    top: 25%
    opacity: 0

  .popup-leave-active
    top: 5%
    opacity: 0

  .content-icon
    float: left
    font-size: 1.5em
    line-height: 0
    margin-right: 0.5em

  .item-wrapper
    text-align: left
    margin-left: 1em

  .next-item
    color: $core-accent-color
    font-weight: bold
    font-size: 0.9em

  .content-name
    color: $core-text-annotation
    font-size: 0.9em

  .description
    width: 400px

</style>
