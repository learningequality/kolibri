<template>
  <div>
    <KGrid>
      <KGridItem
        v-for="device in devices"
        :key="device.id"
        :layout="{ span: cardColumnSpan, alignment: 'auto' }"
      >
        <UnPinnedDevices
          :deviceName="device.device_name"
          :channels="device.channels.length"
          :allDevices="device"
          :operatingSystem="device.operatingSystem"
        />
      </KGridItem>
    </KGrid>

    <KGrid>
      <KGridItem
        v-if="devices.length > 3"
        :layout="{ span: cardColumnSpan, alignment: 'auto' }"
      >
        <div
          class="card-main-wrapper"
          :style="cardStyle"
        >
          <h5 style="padding:15px;margin:auto;margin-top: 15px;"> {{ coreString('viewAll') }} </h5>
        </div>
      </KGridItem>
    </KGrid>
  </div>

</template>


<script>

  import useKResponsiveWindow from 'kolibri.coreVue.composables.useKResponsiveWindow';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import UnPinnedDevices from './UnPinnedDevices';

  export default {
    name: 'MoreNetworkDevices',
    components: {
      UnPinnedDevices,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { windowBreakpoint, windowGutter } = useKResponsiveWindow();
      return {
        windowBreakpoint,
        windowGutter
      };
    },
    props: {
      devices: {
        type: Array,
        required: true,
      },
    },
    data() {
      return {};
    },
    computed: {
      cardColumnSpan() {
        if (this.windowBreakpoint <= 2) return 4;
        if (this.windowBreakpoint <= 3) return 6;
        if (this.windowBreakpoint <= 6) return 4;
        return 3;
      },
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
