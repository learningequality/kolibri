<template>

  <div v-if="isUserLoggedIn && !isSuperuser" class="points" ref="points">
    <points-icon class="icon" :active="true"/>
    <div class="description">
      <div class="description-value">{{ $formatNumber(totalPoints) }}</div>
    </div>
    <ui-tooltip trigger="points" :position="'bottom right'" :openOn="'hover focus'">{{ $tr('pointsTooltip', { points: totalPoints }) }}</ui-tooltip>
  </div>

</template>


<script>

  const { totalPoints, currentUserId, isUserLoggedIn, isSuperuser } = require('kolibri.coreVue.vuex.getters');
  const { fetchPoints } = require('kolibri.coreVue.vuex.actions');

  module.exports = {
    $trNameSpace: 'totalPoints',
    $trs: {
      totalPoints: 'Total points',
      pointsTooltip: 'You have earned { points, number } points!',
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
    created() {
      this.fetchPoints();
    },
    watch: {
      currentUserId: 'fetchPoints',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .points
    font-weight: bold
    font-size: small

  .icon
    display: inline-block
    width: 20px
    height: 20px

  .description
    display: inline-block
    padding-left: 0.25em

  .description-value
    font-size: x-large

</style>
