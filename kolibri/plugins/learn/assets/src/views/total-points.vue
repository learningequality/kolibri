<template>

  <div v-if="isUserLoggedIn" class="points" ref="points">
    <points-icon class="icon" :active="true" />
    <div class="description">
      <div class="description-value">{{ $formatNumber(totalPoints) }}</div>
    </div>
    <ui-tooltip trigger="points" :position="'bottom right'" :openOn="'hover focus'">
      {{ $tr('pointsTooltip', { points: totalPoints }) }}
    </ui-tooltip>
  </div>

</template>


<script>

  import { mapGetters, mapActions } from 'vuex';
  import pointsIcon from 'kolibri.coreVue.components.pointsIcon';
  import uiTooltip from 'keen-ui/src/UiTooltip';

  export default {
    name: 'TotalPoints',
    $trs: { pointsTooltip: 'You earned { points, number } points!' },
    components: {
      pointsIcon,
      uiTooltip,
    },
    computed: {
      ...mapGetters(['totalPoints', 'currentUserId', 'isUserLoggedIn']),
    },
    watch: { currentUserId: 'fetchPoints' },
    created() {
      this.fetchPoints();
    },
    methods: {
      ...mapActions(['fetchPoints']),
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .points {
    font-size: small;
    font-weight: bold;
  }

  .icon {
    position: relative;
    top: 2px;
    display: inline-block;
    width: 20px;
    height: 20px;
  }

  .description {
    display: inline-block;
    margin-left: 8px;
  }

  .description-value {
    font-size: x-large;
  }

</style>
