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
        topic: state => state.topic,
        topicTitle: state => (state.topic || {}).title,
        topicCrumbs: state => (state.topic || {}).breadcrumbs || [],
        content: state => state.content,
        contentTitle: state => (state.content || {}).title,
        contentCrumbs: state => (state.content || {}).breadcrumbs || [],
      }),
      channel() {
        return this.channelsMap[(this.topic || this.content || {}).channel_id];
      },
      channelRootId() {
        return this.channel && this.channel.root;
      },
      channelTitle() {
        return this.channel && this.channel.name;
      },
      inLearn() {
        return this.pageMode === PageModes.LIBRARY && this.pageName !== PageNames.LIBRARY;
      },
      inTopics() {
        return this.pageMode === PageModes.TOPICS && this.pageName !== PageNames.TOPICS_ROOT;
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
      middleTopicBreadcrumbs() {
        let crumbs = [];

        // Channels have no previous topics
        if (this.pageName === PageNames.TOPICS_CHANNEL) {
          return crumbs;
        }

        // Link to top-level Channel
        crumbs.push({
          text: this.channelTitle,
          link: {
            name: PageNames.TOPICS_CHANNEL,
            params: {
              channel_id: this.channelRootId,
            },
          },
        });

        // Links to previous topics
        if (this.pageName === PageNames.TOPICS_CONTENT) {
          crumbs = [...crumbs, ...this.topicCrumbLinks(this.contentCrumbs)];
        } else if (this.pageName === PageNames.TOPICS_TOPIC) {
          crumbs = [...crumbs, ...this.topicCrumbLinks(this.topicCrumbs)];
        }
        return crumbs;
      },
      lastTopicBreadcrumb() {
        if (this.pageName === PageNames.TOPICS_CHANNEL) {
          return { text: this.channelTitle };
        } else if (this.pageName === PageNames.TOPICS_CONTENT) {
          return { text: this.contentTitle };
        } else if (this.pageName === PageNames.TOPICS_TOPIC) {
          return { text: this.topicTitle };
        }

        return {};
      },
      topicsBreadcrumbs() {
        return [
          // All Channels Link
          {
            text: this.coreString('channelsLabel'),
            link: { name: PageNames.TOPICS_ROOT },
          },
          ...this.middleTopicBreadcrumbs,
          this.lastTopicBreadcrumb,
        ];
      },
    },
    methods: {
      topicCrumbLinks(crumbs) {
        return crumbs.map(({ title, id }) => ({
          text: title,
          link: {
            name: PageNames.TOPICS_TOPIC,
            params: { id },
          },
        }));
      },
    },
  };

</script>


<style lang="scss" scoped></style>
