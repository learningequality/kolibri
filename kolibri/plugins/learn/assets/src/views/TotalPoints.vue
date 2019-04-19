<template>

  <div v-if="isUserLoggedIn">
    <div ref="icon" class="points">
      <div class="points-icon-border">
        <PointsIcon class="icon" :active="true" />
      </div>
      <div v-show="!windowIsSmall" class="description">
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

  import { mapGetters } from 'vuex';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import PointsIcon from 'kolibri.coreVue.components.PointsIcon';
  import KTooltip from 'kolibri.coreVue.components.KTooltip';

  export default {
    name: 'TotalPoints',
    components: {
      PointsIcon,
      KTooltip,
    },
    mixins: [responsiveWindow],
    computed: {
      ...mapGetters(['totalPoints', 'currentUserId', 'isUserLoggedIn']),
    },
    watch: { currentUserId: 'fetchPoints' },
    created() {
      this.$store.dispatch('fetchPoints');
    },
    $trs: { pointsTooltip: 'You earned { points, number } points' },
  };

</script>


<style lang="scss" scoped>

  .points {
    padding: 8px 0;
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
    margin-left: 8px;
    font-size: 14px;
    font-weight: bold;
  }

  .points-icon-border {
    display: inline;
    padding: 4px 8px;
    background: white;
    border-radius: 100%;
  }

</style>
