<template>

  <k-breadcrumbs v-if="inLearn" :items="learnBreadcrumbs"/>
  <k-breadcrumbs v-else-if="inTopics" :items="topicsBreadcrumbs"/>

</template>


<script>

  import { PageNames } from '../../constants';
  import { PageModes } from '../../constants';
  import * as getters from '../../state/getters';
  import kBreadcrumbs from 'kolibri.coreVue.components.kBreadcrumbs';
  export default {
    name: 'learnBreadcrumbs',
    $trs: {
      recommended: 'Recommended',
      channels: 'Channels',
    },
    components: { kBreadcrumbs },
    computed: {
      inLearn() {
        return this.pageMode === PageModes.RECOMMENDED;
      },
      learnRootLink() {
        return { name: PageNames.RECOMMENDED };
      },
      learnBreadcrumbs() {
        const crumbs = [
          {
            text: this.$tr('recommended'),
            link: this.learnRootLink,
          },
        ];
        if (this.pageName === PageNames.RECOMMENDED_CONTENT) {
          crumbs.push({ text: this.contentTitle });
        }
        return crumbs;
      },
      inTopics() {
        return this.pageMode === PageModes.TOPICS;
      },
      inTopicsChannel() {
        return this.pageName === PageNames.TOPICS_CHANNEL;
      },
      topicsChannelLink() {
        return {
          name: PageNames.TOPICS_CHANNEL,
          params: {
            channel_id: this.channelRootId,
          },
        };
      },
      topicsRootLink() {
        return {
          name: PageNames.TOPICS_ROOT,
        };
      },
      topicsBreadcrumbs() {
        if (this.pageName === PageNames.TOPICS_ROOT) {
          return [
            {
              text: this.$tr('channels'),
            },
          ];
        }
        const crumbs = [
          {
            text: this.$tr('channels'),
            link: this.topicsRootLink,
          },
        ];
        if (this.inTopicsChannel) {
          crumbs.push({
            text: this.channelTitle,
          });
          return crumbs;
        }
        crumbs.push({
          text: this.channelTitle,
          link: this.topicsChannelLink,
        });
        if (this.pageName === PageNames.TOPICS_CONTENT) {
          this.contentCrumbs.forEach(crumb =>
            crumbs.push({
              text: crumb.title,
              link: this.topicLink(crumb.id),
            })
          );
          crumbs.push({ text: this.contentTitle });
        } else {
          this.topicCrumbs.forEach(crumb =>
            crumbs.push({
              text: crumb.title,
              link: this.topicLink(crumb.id),
            })
          );
          if (!this.inTopicsChannel) {
            crumbs.push({ text: this.topicTitle });
          }
        }
        return crumbs;
      },
    },
    methods: {
      topicLink(topicId) {
        return {
          name: PageNames.TOPICS_TOPIC,
          params: {
            id: topicId,
          },
        };
      },
    },
    vuex: {
      getters: {
        pageName: state => state.pageName,
        pageMode: getters.pageMode,
        channelRootId: state => state.pageState.channel.root_id,
        channelTitle: state => state.pageState.channel.title,
        topicTitle: state => state.pageState.topic.title,
        topicCrumbs: state => (state.pageState.topic || {}).breadcrumbs || [],
        contentTitle: state => state.pageState.content.title,
        contentCrumbs: state => (state.pageState.content || {}).breadcrumbs || [],
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
