<template>

  <KGrid>

    <KGridItem
      v-for="item in groups"
      :key="item.id"
      :layout="{ span: cardColumnSpan, alignment: 'auto' }"
    >
      <UnPinnedDevices
        :deviceName="item.deviceName"
        :channels="item.channels"
      />
    </KGridItem>
  </KGrid>

</template>


<script>

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import UnPinnedDevices from './UnPinnedDevices';

  export default {
    name: 'MoreNetworkDevices',
    components: {
      UnPinnedDevices,
    },
    mixins: [responsiveWindowMixin],
    data() {
      return {
        groups: [
          {
            id: 1,
            deviceName: 'Device 1',
            channels: 2,
            content: [
              {
                id: 1,
                title: 'Card 1',
                body: ' ',
              },
              {
                id: 2,
                title: 'Card 2',
                body: 'Explore',
              },
            ],
          },
          {
            id: 2,
            deviceName: 'Device 2',
            channels: 7,
            content: [
              {
                id: 1,
                title: 'Card 1',
                body: ' ',
              },
              {
                id: 2,
                title: 'Card 2',
                body: ' ',
              },
            ],
          },
          {
            id: 3,
            deviceName: 'Device 3',
            channels: 5,
            content: [
              {
                id: 1,
                title: 'Card 1',
                body: ' ',
              },
              {
                id: 2,
                title: 'Card 2',
                body: 'Explore',
              },
            ],
          },
          {
            id: 4,
            deviceName: 'Device 4',
            channels: 2,
            content: [
              {
                id: 1,
                title: 'Card 1',
                body: ' ',
              },
              {
                id: 2,
                title: 'Card 2',
                body: ' ',
              },
              {
                id: 2,
                title: 'Card 2',
                body: ' ',
              },
              {
                id: 2,
                title: 'Card 2',
                body: ' ',
              },
              {
                id: 2,
                title: 'Card 2',
                body: ' ',
              },
              {
                id: 2,
                title: 'Card 2',
                body: 'Explore',
              },
            ],
          },
          {
            id: 5,
            deviceName: 'Device 5',
            channels: 8,
            content: [
              {
                id: 1,
                title: 'Card 1',
                body: ' ',
              },
              {
                id: 2,
                title: 'Card 2',
                body: 'Explore',
              },
            ],
          },
          {
            id: 3,
            deviceName: 'Device 3',
            channels: 1,
            content: [
              {
                id: 1,
                title: 'Card 1',
                body: ' ',
              },
              {
                id: 2,
                title: 'Card 2',
                body: ' ',
              },
              {
                id: 2,
                title: 'Card 2',
                body: ' ',
              },
              {
                id: 2,
                title: 'Card 2',
                body: ' ',
              },
              {
                id: 2,
                title: 'Card 2',
                body: 'Explore',
              },
            ],
          },
        ],
      };
    },
    computed: {
      cardColumnSpan() {
        if (this.windowBreakpoint <= 2) return 4;
        if (this.windowBreakpoint <= 3) return 6;
        if (this.windowBreakpoint <= 6) return 4;
        return 3;
      },
    },
  };

</script>


<style lang="scss"  scoped>

  @import '~kolibri-design-system/lib/styles/definitions';
  @import '../ContentCard/card';

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
