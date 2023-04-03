<template>

  <!-- eslint-disable vue/html-indent -->

  <KGrid v-if="pinnedDevices !== null">
    <KGridItem
      v-for="device in pinnedDevices"
      :key="device.id"
    >
      <KGridItem>
        <h2>
          <KIcon :icon="getDeviceIcon(device)" />
          <span class="device-name">{{ device.device_name }}</span>
        </h2>
      </KGridItem>
      <div class="card-layout">
        <div class="cards">
          <ChannelCardGroupGrid
            data-test="channel-cards"
            class="grid"
            :contents="device.channels"
            isRemote="true"
          >
            <ExploreCard
              :style="cardStyle"
              class="card-main-wrapper"
            />
          </ChannelCardGroupGrid>
        </div>
      </div>

    </KGridItem>
  </KGrid>

</template>


<script>

  import useKResponsiveWindow from 'kolibri.coreVue.composables.useKResponsiveWindow';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import useDevices from './../../composables/useDevices';
  import ChannelCardGroupGrid from './../ChannelCardGroupGrid';
  import ExploreCard from './ExploreCard';

  export default {
    name: 'PinnedNetworkResources',
    components: {
      ChannelCardGroupGrid,
      ExploreCard,
    },
    mixins: [responsiveWindowMixin, commonCoreStrings],
    setup() {
      const { windowBreakpoint, windowGutter } = useKResponsiveWindow();
      const { baseurl, fetchDevices } = useDevices();
      return {
        windowBreakpoint,
        fetchDevices,
        baseurl,
        windowGutter,
      };
    },
    props: {
      pinnedDevices: {
        type: Array,
        required: true,
      },
    },
    data() {
      return {};
    },
    computed: {
      cardStyle() {
        return {
          backgroundColor: this.$themeTokens.surface,
          color: this.$themeTokens.text,
          marginBottom: `${this.windowGutter}px`,
          minHeight: `${this.overallHeight}px`,
          textAlign: 'center',
        };
      },
    },
    methods: {
      getDeviceIcon(device) {
        if (device['operating_system'] === 'Android') {
          return 'device';
        } else if (!device['subset_of_users_device']) {
          return 'cloud';
        } else {
          return 'laptop';
        }
      },
    },
  };

</script>


<style lang="scss"  scoped>

  @import '~kolibri-design-system/lib/styles/definitions';
  @import '../HybridLearningContentCard/card';

  $margin: 24px;

  .card-main-wrapper {
    @extend %dropshadow-1dp;

    position: relative;
    display: inline-flex;
    width: 350px;
    max-height: 270px;
    padding-bottom: $margin;
    margin-left: 8px;
    text-decoration: none;
    vertical-align: top;
    border-radius: $radius;
    transition: box-shadow $core-time ease;

    &:hover {
      @extend %dropshadow-8dp;
    }

    &:focus {
      outline-width: 4px;
      outline-offset: 6px;
    }
  }

  .card-layout .cards {
    float: left;
  }

  .cardgroup .card-main-wrapper {
    display: inline-flex;
  }

  .device-name {
    padding-left: 10px;
  }

</style>
