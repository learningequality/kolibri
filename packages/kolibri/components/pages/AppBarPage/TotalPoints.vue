<template>

  <div
    v-if="isUserLoggedIn"
    ref="icon"
    class="points-wrapper"
  >
    <div
      class="icon-wrapper"
      :style="{ backgroundColor: $themeTokens.surface }"
    >
      <KIcon
        icon="pointsActive"
        :color="$themeTokens.primary"
      />
    </div>
    <div class="description">
      {{ $formatNumber(totalPoints) }}
    </div>
    <KTooltip
      reference="icon"
      :refs="$refs"
    >
      {{ $tr('pointsTooltip', { points: totalPoints }) }}
    </KTooltip>
  </div>

</template>


<script>

  import useUser from 'kolibri/composables/useUser';
  import useTotalProgress from 'kolibri/composables/useTotalProgress';

  export default {
    name: 'TotalPoints',
    setup() {
      const { currentUserId, isUserLoggedIn } = useUser();
      const { fetchPoints, totalPoints } = useTotalProgress();
      return {
        currentUserId,
        isUserLoggedIn,
        fetchPoints,
        totalPoints,
      };
    },
    watch: {
      currentUserId() {
        this.fetchPoints();
      },
    },
    created() {
      this.fetchPoints();
    },
    $trs: {
      pointsTooltip: {
        message: 'You earned { points, number } points',
        context: 'Notification indicating how many points a leaner has earned.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .icon-wrapper {
    display: inline-block;
    width: 32px;
    height: 32px;
    text-align: center;
    // Aligns the round background with its siblings
    border-radius: 100%;
  }

  .icon {
    margin-top: 4px;
  }

  .description {
    display: inline-block;
    margin-left: 8px;
    font-size: 14px;
  }

</style>
