<template>

  <k-breadcrumbs v-if="breadcrumbs.length" :items="breadcrumbs" />

</template>


<script>

  import find from 'lodash/find';
  import { getChannels } from 'kolibri.coreVue.vuex.getters';
  import * as CoachConstants from '../../constants';
  import * as coachGetters from '../../state/getters/main';
  import kBreadcrumbs from 'kolibri.coreVue.components.kBreadcrumbs';
  export default {
    name: 'reportBreadcrumbs',
    $trs: { channels: 'Channels' },
    components: { kBreadcrumbs },
    computed: {
      channelTitle() {
        return find(this.channels, channel => channel.id === this.pageState.channelId).title;
      },
      breadcrumbs() {
        if (this.pageName === CoachConstants.PageNames.RECENT_ITEMS_FOR_CHANNEL) {
          return this.recentChannelItemsCrumbs;
        } else if (this.pageName === CoachConstants.PageNames.RECENT_LEARNERS_FOR_ITEM) {
          return this.recentItemCrumbs;
        } else if (this.isTopicPage) {
          return this.topicCrumbs;
        }
        return [];
      },
      recentChannelItemsCrumbs() {
        return [
          {
            text: this.$tr('channels'),
            link: {
              name: CoachConstants.PageNames.RECENT_CHANNELS,
              params: { classId: this.classId },
            },
          },
          { text: this.channelTitle },
        ];
      },
      recentItemCrumbs() {
        return [
          {
            text: this.$tr('channels'),
            link: {
              name: CoachConstants.PageNames.RECENT_CHANNELS,
              params: { classId: this.classId },
            },
          },
          {
            text: this.channelTitle,
            link: {
              name: CoachConstants.PageNames.RECENT_ITEMS_FOR_CHANNEL,
              params: {
                classId: this.classId,
                channelId: this.pageState.channelId,
              },
            },
          },
          { text: this.pageState.contentScopeSummary.title },
        ];
      },
      topicCrumbs() {
        return [
          // link to the root channels page
          {
            text: this.$tr('channels'),
            link: {
              name: CoachConstants.PageNames.TOPIC_CHANNELS,
              params: { classId: this.classId },
            },
          },
          // links to each ancestor
          ...this.pageState.contentScopeSummary.ancestors.map((item, index) => {
            const breadcrumb = { text: item.title };
            if (index) {
              breadcrumb.link = {
                name: CoachConstants.PageNames.TOPIC_ITEM_LIST,
                params: {
                  classId: this.classId,
                  channelId: this.pageState.channelId,
                  topicId: item.id,
                },
              };
            } else {
              // link to channel root
              breadcrumb.link = {
                name: CoachConstants.PageNames.TOPIC_CHANNEL_ROOT,
                params: {
                  classId: this.classId,
                  channelId: this.pageState.channelId,
                },
              };
            }
            return breadcrumb;
          }),
          // current item
          { text: this.pageState.contentScopeSummary.title },
        ];
      },
    },
    vuex: {
      getters: {
        channels: getChannels,
        classId: state => state.classId,
        pageName: state => state.pageName,
        pageState: state => state.pageState,
        isTopicPage: coachGetters.isTopicPage,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
