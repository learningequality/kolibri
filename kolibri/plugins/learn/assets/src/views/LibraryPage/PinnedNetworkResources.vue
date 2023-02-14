<template>

  <KGrid>
    <KGridItem
      v-for="group in groups"
      :key="group.id"
    >
      <KGridItem>
        <h2>
          <KIcon icon="device" />
          <span class="device-name">{{ group.deviceName }}</span>
        </h2>
      </KGridItem>
      <KGridItem
        v-for="item in group.content"
        :key="item.id"
        :layout="{ span: cardColumnSpan, alignment: 'auto' }"
      >
        <CardContent
          :content="item.title"
          :body="item.body"
        />
      </KGridItem>
    </KGridItem>
  </KGrid>

</template>


<script>

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import CardContent from './CardContent';

  export default {
    name: 'PinnedNetworkResources',
    components: {
      CardContent,
    },
    mixins: [responsiveWindowMixin],
    data() {
      return {
        groups: [
          {
            id: 1,
            deviceName: 'Device 1',
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
                id: 3,
                title: 'Card 2',
                body: ' ',
              },
              {
                id: 4,
                title: 'Card 2',
                body: ' ',
              },
              {
                id: 5,
                title: 'Card 2',
                body: ' ',
              },
              {
                id: 6,
                title: 'Card 2',
                body: 'Explore',
              },
            ],
          },
          {
            id: 5,
            deviceName: 'Device 5',
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
            id: 6,
            deviceName: 'Device 3',
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
                id: 3,
                title: 'Card 2',
                body: ' ',
              },
              {
                id: 4,
                title: 'Card 2',
                body: ' ',
              },
              {
                id: 6,
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
