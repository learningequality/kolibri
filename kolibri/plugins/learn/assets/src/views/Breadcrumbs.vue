<template>

  <div class="learn-breadcrumbs">
    <KBreadcrumbs v-if="inLearn" :items="learnBreadcrumbs" />
    <KBreadcrumbs v-else-if="inTopics" :items="topicsBreadcrumbs" />
    <KBreadcrumbs v-else-if="showClassesBreadcrumbs" :items="classesBreadcrumbs" />
  </div>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import KBreadcrumbs from 'kolibri.coreVue.components.KBreadcrumbs';
  import { PageNames, PageModes } from '../constants';
  import { learnStringsMixin } from './commonLearnStrings';
  import classesBreadcrumbItems from './classes/classesBreadcrumbItems';

  export default {
    name: 'Breadcrumbs',
    components: { KBreadcrumbs },
    mixins: [classesBreadcrumbItems, learnStringsMixin],
    computed: {
      ...mapGetters(['pageMode']),
      ...mapState(['pageName']),
      ...mapState('topicsTree', {
        channelRootId: state => (state.channel || {}).root_id,
        channelTitle: state => (state.channel || {}).title,
        topicTitle: state => (state.topic || {}).title,
        topicCrumbs: state => (state.topic || {}).breadcrumbs || [],
        contentTitle: state => (state.content || {}).title,
        contentCrumbs: state => (state.content || {}).breadcrumbs || [],
      }),
      inLearn() {
        return this.pageMode === PageModes.RECOMMENDED && this.pageName !== PageNames.RECOMMENDED;
      },
      inTopics() {
        return this.pageMode === PageModes.TOPICS && this.pageName !== PageNames.TOPICS_ROOT;
      },
      learnBreadcrumbs() {
        return [
          {
            text: this.coachCommon$tr('recommendedLabel'),
            link: { name: PageNames.RECOMMENDED },
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
            text: this.coachCommon$tr('channelsLabel'),
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
