<template>

  <div class="learn-breadcrumbs">
    <KBreadcrumbs v-if="inLearn" :items="learnBreadcrumbs" />
    <KBreadcrumbs v-else-if="inTopics" :items="topicsBreadcrumbs" />
    <KBreadcrumbs v-else-if="showClassesBreadcrumbs" :items="classesBreadcrumbs" />
  </div>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import KBreadcrumbs from 'kolibri-design-system/lib/KBreadcrumbs';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { PageNames, PageModes } from '../constants';
  import useChannels from '../composables/useChannels';
  import classesBreadcrumbItems from './classes/classesBreadcrumbItems';
  import commonLearnStrings from './commonLearnStrings';

  export default {
    name: 'Breadcrumbs',
    components: { KBreadcrumbs },
    mixins: [classesBreadcrumbItems, commonCoreStrings, commonLearnStrings],
    setup() {
      const { channelsMap } = useChannels();
      return {
        channelsMap,
      };
    },
    computed: {
      ...mapGetters(['pageMode']),
      ...mapState(['pageName']),
      ...mapState('topicsTree', {
        topicTitle: state => (state.topic || {}).title,
        topicAncestors: state => (state.topic || {}).ancestors || [],
        topicChannelId: state => (state.topic || {}).channel_id,
      }),
      channelTitle() {
        return this.channelsMap[this.topicChannelId].name;
      },
      inLearn() {
        return this.pageMode === PageModes.LIBRARY && this.pageName !== PageNames.LIBRARY;
      },
      inTopics() {
        return (
          this.pageName === PageNames.TOPICS_TOPIC ||
          this.pageName === PageNames.TOPICS_TOPIC_SEARCH
        );
      },
      learnBreadcrumbs() {
        return [
          {
            text: this.learnString('libraryLabel'),
            link: { name: PageNames.LIBRARY },
          },
          { text: this.contentTitle },
        ];
      },
      topicsBreadcrumbs() {
        return [
          ...this.topicAncestors.map(({ title, id }, index) => ({
            // Use the channel name just in case the root node does not have a title.
            text: index === 0 ? this.channelTitle : title,
            link: {
              name: PageNames.TOPICS_TOPIC,
              params: { id },
            },
          })),
          { text: this.topicAncestors.length ? this.topicTitle : this.channelTitle },
        ];
      },
    },
  };

</script>


<style lang="scss" scoped></style>
