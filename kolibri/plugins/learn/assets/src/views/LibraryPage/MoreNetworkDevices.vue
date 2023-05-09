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
      return {
        genLibraryPageBackLink,
      };
    },
    inject: ['$layoutSpan'],
    props: {
      devices: {
        type: Array,
        required: true,
      },
    },
    computed: {
      layoutSpan() {
        return this.$layoutSpan();
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
