<template>

  <div v-if="isUserLoggedIn" ref="icon" class="points-wrapper">
    <div class="icon-wrapper" :style="{ backgroundColor: $themeTokens.surface }">
      <PointsIcon class="icon" />
    </div>
    <div v-show="!windowIsSmall" class="description">
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

  import { mapGetters, mapActions } from 'vuex';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import PointsIcon from 'kolibri.coreVue.components.PointsIcon';
  import KTooltip from 'kolibri.coreVue.components.KTooltip';

  export default {
    name: 'TotalPoints',
    components: {
      PointsIcon,
      KTooltip,
    },
    mixins: [responsiveWindow, themeMixin],
    computed: {
      ...mapGetters(['totalPoints', 'currentUserId', 'isUserLoggedIn']),
    },
    watch: {
      currentUserId() {
        this.fetchPoints();
      },
    },
    created() {
      this.fetchPoints();
    },
    methods: {
      ...mapActions(['fetchPoints']),
    },
    $trs: { pointsTooltip: 'You earned { points, number } points' },
  };

</script>


<style lang="scss" scoped>

  .points-wrapper {
    position: relative;
  }

  .icon-wrapper {
    position: absolute;
    top: -4px;
    display: inline-block;
    width: 32px;
    height: 32px;
    text-align: center;
    border-radius: 100%;
  }

  .icon {
    position: relative;
    top: 7px;
    display: inline-block;
    width: 16px;
    height: 16px;
  }

  .description {
    position: relative;
    display: inline-block;
    margin-left: 40px;
    font-size: 14px;
  }

</style>
