<template>

  <div v-if="totalPoints" class="points">
    <div class="circle in-points">
      <points-icon class="icon" :active="true" :width="'20px'" :height="'20px'"/>
    </div>
    <span class="total in-points">{{ $formatNumber(totalPoints) }}</span>
  </div>

</template>


<script>

  const { totalPoints } = require('kolibri.coreVue.vuex.getters');
  const { fetchPoints } = require('kolibri.coreVue.vuex.actions');

  module.exports = {
    components: {
      'points-icon': require('kolibri.coreVue.components.pointsIcon'),
    },
    vuex: {
      getters: {
        totalPoints,
      },
      actions: {
        fetchPoints,
      }
    },
    created() {
      this.fetchPoints();
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

  .total
    padding-left: 5px

</style>
