<template>

  <section>
    <KFixedGrid :numCols="3">
      <KFixedGridItem :span="2">
        <h2 :style="{ marginTop: 0 }">
          <KLabeledIcon
            icon="channel"
            :label="$tr('header')"
          />
        </h2>
      </KFixedGridItem>
      <KFixedGridItem :span="1" alignment="right">
        <KRouterLink
          v-if="displayAllChannelsLink"
          :text="crossComponentStrings.$tr('viewAll')"
          :to="allChannelsLink"
          data-test="viewAllLink"
        />
      </KFixedGridItem>
    </KFixedGrid>

    <CardGrid :gridType="1">
      <BaseChannelCard
        v-for="(channel, idx) in visibleChannels"
        :key="idx"
        data-test="channelLink"
        :channel="channel"
        :to="getChannelLink(channel)"
      />
    </CardGrid>
  </section>

</template>


<script>

  import { createTranslator } from 'kolibri.utils.i18n';
  import { PageNames } from '../../../constants';
  import CardGrid from '../../cards/CardGrid';
  import BaseChannelCard from '../../cards/BaseChannelCard';
  import YourClasses from '../../YourClasses';

  export default {
    name: 'ExploreChannels',
    components: {
      CardGrid,
      BaseChannelCard,
    },
    props: {
      channels: {
        type: Array,
        required: true,
      },
      /**
       * If there are more than four channels, only first four of them
       * and "View all" link will be displayed if `true`
       */
      short: {
        type: Boolean,
        required: false,
        default: false,
      },
    },
    data() {
      return {
        crossComponentStrings: { $tr: () => null },
      };
    },
    computed: {
      visibleChannels() {
        if (!this.channels) {
          return [];
        }
        if (this.short) {
          return this.channels.slice(0, 3);
        }
        return this.channels;
      },
      displayAllChannelsLink() {
        return this.channels && this.channels.length > this.visibleChannels.length;
      },
      allChannelsLink() {
        return { name: PageNames.LIBRARY };
      },
    },
    mounted() {
      // TODO: Add 'View all' string into this component after 0.15 release
      this.crossComponentStrings = createTranslator('YourClasses', {
        yourClassesHeader: {
          message: 'Your classes',
          context: 'Refers to the classes the learner is enrolled in.',
        },
        noClasses: {
          message: 'You are not enrolled in any classes',
          context:
            'Message that a learner sees in the Learn > CLASSES section and in the Learn > HOME section if they are not enrolled in any classes.',
        },
        viewAll: {
          message: 'View all',
          context: 'Option to view all the classes the user is enrolled in.',
        },
      });
    },
    methods: {
      getChannelLink(channel) {
        return {
          name: PageNames.TOPICS_TOPIC,
          params: {
            id: channel.root,
          },
          query: {
            last: PageNames.HOME,
          },
        };
      },
    },
    $trs: {
      header: {
        message: 'Explore channels',
        context: "Heading in the 'Learn' section where users can view channels.",
      },
    },
  };

</script>
