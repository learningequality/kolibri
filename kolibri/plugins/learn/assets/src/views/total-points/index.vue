<template>

  <div v-if="isUserLoggedIn && !isSuperuser" class="points" ref="points">
    <div class="circle in-points">
      <points-icon class="icon" :active="true"/>
    </div>
    <span class="total in-points">{{ $formatNumber(totalPoints) }}</span>
    <ui-tooltip trigger="points" :position="'bottom right'" :openOn="'hover focus'">{{ $tr('totalPoints', { points: totalPoints }) }}</ui-tooltip>
  </div>

</template>


<script>

  const { totalPoints, currentUserId, isUserLoggedIn, isSuperuser } = require('kolibri.coreVue.vuex.getters');
  const { fetchPoints } = require('kolibri.coreVue.vuex.actions');

  module.exports = {
    $trNameSpace: 'totalPoints',
    $trs: {
      totalPoints: 'You have earned { points, number } points!',
    },
    components: {
      'points-icon': require('kolibri.coreVue.components.pointsIcon'),
      'ui-tooltip': require('keen-ui/src/UiTooltip'),
    },
    vuex: {
      getters: {
        totalPoints,
        currentUserId,
        isUserLoggedIn,
        isSuperuser,
      },
      actions: {
        fetchPoints,
      }
    },
    watch: {
      currentUserId: 'fetchPoints',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .points
    display: inline-block
    font-weight: bold
    .in-points
      display: inline-block

  .circle
    border-radius: 50%
    width: 25px
    height: 25px
    background-color: white

  .icon
    position: relative
    top: 2.5px
    left: 2.5px
    width: 20px
    height: 20px

  .total
    padding-left: 5px

</style>
