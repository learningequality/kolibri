<template>

  <div class="learn-breadcrumbs">
    <k-breadcrumbs v-if="inLearn" :items="learnBreadcrumbs" />
    <k-breadcrumbs v-else-if="inTopics" :items="topicsBreadcrumbs" />
    <k-breadcrumbs v-else-if="showClassesBreadcrumbs" :items="classesBreadcrumbs" />
  </div>

</template>


<script>

  import kBreadcrumbs from 'kolibri.coreVue.components.kBreadcrumbs';
  import { PageNames, PageModes } from '../constants';
  import { pageMode } from '../state/getters';
  import classesBreadcrumbItems from './classes/classesBreadcrumbItems';

  export default {
    name: 'breadcrumbs',
    $trs: {
      recommended: 'Recommended',
      channels: 'Channels',
    },
    components: { kBreadcrumbs },
    mixins: [classesBreadcrumbItems],
    computed: {
      inLearn() {
        return this.pageMode === PageModes.RECOMMENDED && this.pageName !== PageNames.RECOMMENDED;
      },
      inTopics() {
        return this.pageMode === PageModes.TOPICS && this.pageName !== PageNames.TOPICS_ROOT;
      },
      learnBreadcrumbs() {
        return [
          {
            text: this.$tr('recommended'),
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
      },
      topicsBreadcrumbs() {
        return [
          // All Channels Link
          {
            text: this.$tr('channels'),
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
    vuex: {
      getters: {
        pageName: state => state.pageName,
        pageMode,
        channelRootId: state => (state.pageState.channel || {}).root_id,
        channelTitle: state => (state.pageState.channel || {}).title,
        topicTitle: state => (state.pageState.topic || {}).title,
        topicCrumbs: state => (state.pageState.topic || {}).breadcrumbs || [],
        contentTitle: state => (state.pageState.content || {}).title,
        contentCrumbs: state => (state.pageState.content || {}).breadcrumbs || [],
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
