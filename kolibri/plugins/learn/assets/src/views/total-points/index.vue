<template>

  <div v-if="isUserLoggedIn" class="points" ref="points">
    <points-icon class="icon" :active="true" />
    <div class="description">
      <div class="description-value">{{ $formatNumber(totalPoints) }}</div>
    </div>
    <ui-tooltip trigger="points" :position="'bottom right'" :openOn="'hover focus'">{{ $tr('pointsTooltip', { points: totalPoints }) }}</ui-tooltip>
  </div>

</template>


<script>

  import { totalPoints, currentUserId, isUserLoggedIn } from 'kolibri.coreVue.vuex.getters';
  import { fetchPoints } from 'kolibri.coreVue.vuex.actions';
  import pointsIcon from 'kolibri.coreVue.components.pointsIcon';
  import uiTooltip from 'keen-ui/src/UiTooltip';

  export default {
    name: 'totalPoints',
    $trs: { pointsTooltip: 'You have earned { points, number } points!' },
    components: {
      pointsIcon,
      uiTooltip,
    },
    vuex: {
      getters: {
        totalPoints,
        currentUserId,
        isUserLoggedIn,
      },
      actions: { fetchPoints },
    },
    watch: { currentUserId: 'fetchPoints' },
    created() {
      this.fetchPoints();
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
    margin-left: 8px

  .description-value
    font-size: x-large

</style>
