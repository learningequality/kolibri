<template>

  <div class="breadcrumb-wrapper">
    <span v-for="ancestor in breadcrumbs" class="crumb">
      <span v-if="ancestor.vlink">
        <router-link :to="ancestor.vlink">{{ ancestor.title }}</router-link>
      </span>
      <span v-else>{{ ancestor.title }}</span>
    </span>
  </div>

</template>


<script>

  const find = require('lodash/find');

  const CoachConstants = require('../../constants');
  const coachGetters = require('../../state/getters/main');

  module.exports = {
    $trNameSpace: 'reportBreadcrumbs',
    $trs: {
      channels: 'Channels',
    },
    computed: {
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
            title: this.$tr('channels'),
            vlink: {
              name: CoachConstants.PageNames.RECENT_CHANNELS,
              params: { classId: this.classId },
            },
          },
          { title: this.channelTitle }
        ];
      },
      channelTitle() {
        return find(this.channels, channel => channel.id === this.pageState.channelId).title;
      },
      recentItemCrumbs() {
        return [
          {
            title: this.$tr('channels'),
            vlink: {
              name: CoachConstants.PageNames.RECENT_CHANNELS,
              params: { classId: this.classId },
            },
          },
          {
            title: this.channelTitle,
            vlink: {
              name: CoachConstants.PageNames.RECENT_ITEMS_FOR_CHANNEL,
              params: {
                classId: this.classId,
                channelId: this.pageState.channelId,
              },
            },
          },
          { title: this.pageState.contentScopeSummary.title }
        ];
      },
      topicCrumbs() {
        return [
          // link to the root channels page
          {
            title: this.$tr('channels'),
            vlink: {
              name: CoachConstants.PageNames.TOPIC_CHANNELS,
              params: { classId: this.classId },
            },
          },
          // links to each ancestor
          ...this.pageState.contentScopeSummary.ancestors.map((item, index) => {
            const breadcrumb = { title: item.title };
            if (index) {
              // links to parent topics
              breadcrumb.vlink = {
                name: CoachConstants.PageNames.TOPIC_ITEM_LIST,
                params: {
                  classId: this.classId,
                  channelId: this.pageState.channelId,
                  topicId: item.id,
                },
              };
            } else {
              // link to channel root
              breadcrumb.vlink = {
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
          { title: this.pageState.contentScopeSummary.title }
        ];
      },
    },
    vuex: {
      getters: {
        channels: state => state.core.channels.list,
        classId: state => state.classId,
        pageName: state => state.pageName,
        pageState: state => state.pageState,
        isTopicPage: coachGetters.isTopicPage,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .breadcrumb-wrapper
    font-size: smaller
    display: inline-block
    color: $core-text-annotation

  .crumb + .crumb::before // before any crumb coming after another crumb
    content: '>'
    margin: 8px
    color: $core-text-annotation

  .crumb a
    color: $core-text-annotation

</style>
