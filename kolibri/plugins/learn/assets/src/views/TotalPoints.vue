<template>

  <div v-if="isUserLoggedIn">
    <div class="points" ref="icon">
      <PointsIcon class="icon" :active="true" />
      <div class="description">
        <div class="description-value">
          {{ $formatNumber(totalPoints) }}
        </div>
      </div>
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

  import { mapGetters, mapActions } from 'vuex';
  import PointsIcon from 'kolibri.coreVue.components.PointsIcon';
  import KTooltip from 'kolibri.coreVue.components.KTooltip';

  export default {
    name: 'TotalPoints',
    $trs: { pointsTooltip: 'You earned { points, number } points' },
    components: {
      PointsIcon,
      KTooltip,
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
