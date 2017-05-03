<template>

  <div>
    <transition name="popup">
      <div v-if="popoverShown" class="popover-container">
        <div class="popover">
          <div class="content">
            <div class="topline">
              <points-icon class="popover-icon" :active="true"/>
              <span class="plus-points">{{ $tr('plusPoints', { maxPoints }) }}</span>
            </div>
            <span class="encourage">{{ $tr('niceWork') }}</span>
          </div>
          <ui-close-button
              size="small"
              @click="closePopover"
              class="close"
          ></ui-close-button>
        </div>
      </div>
    </transition>
    <div class="points" :style="style">
      <points-icon class="in-points icon" :active="active"/>
      <span class="count in-points">{{ $formatNumber(maxPoints) }}</span>
    </div>
  </div>

</template>


<script>

  const { contentPoints } = require('kolibri.coreVue.vuex.getters');
  const { MaxPointsPerContent } = require('kolibri.coreVue.vuex.constants');

  module.exports = {
    $trNameSpace: 'contentPoints',
    $trs: {
      plusPoints: '+ { maxPoints, number } Points',
      niceWork: 'Nice work. Keep it up!',
    },
    components: {
      'points-icon': require('kolibri.coreVue.components.pointsIcon'),
      'ui-close-button': require('keen-ui/src/UiCloseButton'),
    },
    vuex: {
      getters: {
        contentPoints,
      },
    },
    props: {
      showPopover: {
        type: Boolean,
        default: false,
      },
    },
    watch: {
      popoverShown: 'popOverSetTime',
    },
    data: () => ({
      internalPopoverShown: true,
    }),
    computed: {
      maxPoints() {
        return MaxPointsPerContent;
      },
      active() {
        return this.contentPoints === this.maxPoints;
      },
      style() {
        if (this.active) {
          return {};
        }
        return {
          color: 'grey',
          boxShadow: 'inset 1px 1px 3px 1px #b3b3b3',
        };
      },
      popoverShown() {
        return this.showPopover && this.internalPopoverShown;
      },
    },
    methods: {
      closePopover() {
        this.internalPopoverShown = false;
      },
      popOverSetTime(newVal, oldVal) {
        if (newVal === true && oldVal !== true) {
          setTimeout(this.closePopover, 5000);
        }
      }
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .points
    display: inline-block
    font-weight: bold
    background-color: #EEEEEE
    color: $core-accent-color
    padding: 10px

    .in-points
      display: table-cell
      vertical-align: middle

  .icon
    width: 30px
    height: 30px

  .count
    padding-left: 5px
    font-size: 25px

  .popover-container
    position: absolute
    height: 0
    right: 5%
    top: 15%

  .popover
    background-color: $core-bg-canvas
    border-left: $core-correct-color solid 3px
    padding: 10px 15px 5px
    box-shadow: grey 2px 2px 5px 1px

  .popover-icon
    float: left
    width: 20px
    height: 20px

  .plus-points
    padding-left: 5px
    font-size: 1.5em
    font-weight: bold
    color: $core-correct-color

  .topline
    padding-bottom: 5px
    clearfix()

  .encourage
    color: $core-text-annotation
    font-size: 0.9em
    font-weight: bold

  .content
    display: inline-table
    margin-right: 10px

  .close
    float: right
    display: inline-table

  .popup-enter-active, .popup-leave-active
    transition: all 0.3s ease

  .popup-enter
    top: 25%
    opacity: 0

  .popup-leave-active
    top: 5%
    opacity: 0

</style>
