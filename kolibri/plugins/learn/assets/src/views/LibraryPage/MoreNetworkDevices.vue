<template>

  <div>
    <KGrid>
      <KGridItem
        v-for="device in devices"
        :key="device.id"
        :layout="{ span: layoutSpan }"
      >
        <UnPinnedDevices
          :device="device"
          :routeTo="genLibraryPageBackLink(device.id, false)"
        />
      </KGridItem>
      <KGridItem
        v-if="devices.length"
        key="view-all"
        :layout="{ span: layoutSpan }"
      >
        <UnPinnedDevices
          :device="{}"
          :viewAll="true"
          :routeTo="genLibraryPageBackLink(null, true)"
        />
      </KGridItem>
    </KGrid>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import useKResponsiveWindow from 'kolibri.coreVue.composables.useKResponsiveWindow';
  import useContentLink from '../../composables/useContentLink';
  import UnPinnedDevices from './UnPinnedDevices';

  export default {
    name: 'MoreNetworkDevices',
    components: {
      UnPinnedDevices,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { genLibraryPageBackLink } = useContentLink();
      const { windowBreakpoint } = useKResponsiveWindow();
      return {
        genLibraryPageBackLink,
        windowBreakpoint,
      };
    },
    props: {
      devices: {
        type: Array,
        required: true,
      },
    },
    computed: {
      layoutSpan() {
        let span = 3;
        if ([0, 1, 2, 6].includes(this.windowBreakpoint)) {
          span = 4;
        } else if ([3, 4, 5].includes(this.windowBreakpoint)) {
          span = 6;
        }
        return span;
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
