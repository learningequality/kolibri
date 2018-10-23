<template>

  <div
    v-if="isUserLoggedIn"
    class="points"
  >
    <PointsIcon
      class="icon"
      :active="true"
      ref="points"
    />

    <div class="description">
      <div class="description-value">
        {{ $formatNumber(totalPoints) }}
      </div>
    </div>

    <UiTooltip
      trigger="points"
      position="bottom right"
      openOn="hover focus"
    >
      {{ $tr('pointsTooltip', { points: totalPoints }) }}
    </UiTooltip>
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import PointsIcon from 'kolibri.coreVue.components.PointsIcon';
  import UiTooltip from 'keen-ui/src/UiTooltip';

  export default {
    name: 'TotalPoints',
    $trs: { pointsTooltip: 'You earned { points, number } points' },
    components: {
      PointsIcon,
      UiTooltip,
    },
    computed: {
      ...mapGetters(['totalPoints', 'currentUserId', 'isUserLoggedIn']),
    },
    watch: { currentUserId: 'fetchPoints' },
    created() {
      this.$store.dispatch('fetchPoints');
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .points {
    padding: 8px 0;
    color: $core-text-annotation;
  }

  .icon {
    position: relative;
    top: 2px;
    display: inline-block;
    width: 16px;
    height: 16px;
  }

  .description {
    display: inline-block;
    margin-left: 16px;
  }

</style>
