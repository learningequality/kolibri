<template>

  <div>
    <KGrid>
      <KGridItem
        v-for="device in devices"
        :key="device.id"
        :layout12="{ span: 3 }"
        :layout8="{ span: 4 }"
        :layout4="{ span: 4 }"
      >
        <UnPinnedDevices :device="device" />
      </KGridItem>
      <KGridItem
        v-if="devices.length"
        key="view-all"
        :layout12="{ span: 3 }"
        :layout8="{ span: 4 }"
        :layout4="{ span: 4 }"
      >
        <UnPinnedDevices
          :device="{}"
          :viewAll="true"
          :routeTo="viewAllRoute"
        />
      </KGridItem>
    </KGrid>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { PageNames } from '../../constants';
  import UnPinnedDevices from './UnPinnedDevices';

  export default {
    name: 'MoreNetworkDevices',
    components: {
      UnPinnedDevices,
    },
    mixins: [commonCoreStrings],
    props: {
      devices: {
        type: Array,
        required: true,
      },
    },
    computed: {
      viewAllRoute() {
        return { name: PageNames.EXPLORE_LIBRARIES };
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
    width: 100%;
    max-height: 258px;
    padding-bottom: $margin;
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

  .cardgroup .card-main-wrapper {
    display: inline-flex;
  }

  .device-name {
    padding-left: 10px;
    text-transform: uppercase;
  }

</style>
