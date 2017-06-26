<template>

  <breadcrumbs  v-if="breadcrumbs.length" :items="breadcrumbs"/>

</template>


<script>

  import find from 'lodash/find';
  import * as CoachConstants from '../../constants';
  import * as coachGetters from '../../state/getters/main';
  import breadcrumbs from 'kolibri.coreVue.components.breadcrumbs';
  export default {
    $trNameSpace: 'reportBreadcrumbs',
    $trs: { channels: 'Channels' },
    components: { breadcrumbs },
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
              params: { classId: this.classId }
            }
          },
          { text: this.channelTitle }
        ];
      },
      recentItemCrumbs() {
        return [
          {
            text: this.$tr('channels'),
            link: {
              name: CoachConstants.PageNames.RECENT_CHANNELS,
              params: { classId: this.classId }
            }
          },
          {
            text: this.channelTitle,
            link: {
              name: CoachConstants.PageNames.RECENT_ITEMS_FOR_CHANNEL,
              params: {
                classId: this.classId,
                channelId: this.pageState.channelId
              }
            }
          },
          { text: this.pageState.contentScopeSummary.title }
        ];
      },
      topicCrumbs() {
        return [
          {
            text: this.$tr('channels'),
            link: {
              name: CoachConstants.PageNames.TOPIC_CHANNELS,
              params: { classId: this.classId }
            }
          },
          ...this.pageState.contentScopeSummary.ancestors.map((item, index) => {
            const breadcrumb = { text: item.title };
            if (index) {
              breadcrumb.link = {
                name: CoachConstants.PageNames.TOPIC_ITEM_LIST,
                params: {
                  classId: this.classId,
                  channelId: this.pageState.channelId,
                  topicId: item.id
                }
              };
            } else {
              breadcrumb.link = {
                name: CoachConstants.PageNames.TOPIC_CHANNEL_ROOT,
                params: {
                  classId: this.classId,
                  channelId: this.pageState.channelId
                }
              };
            }
            return breadcrumb;
          }),
          { text: this.pageState.contentScopeSummary.title }
        ];
      }
    },
    vuex: {
      getters: {
        channels: state => state.core.channels.list,
        classId: state => state.classId,
        pageName: state => state.pageName,
        pageState: state => state.pageState,
        isTopicPage: coachGetters.isTopicPage
      }
    }
  };

</script>


<style lang="stylus" scoped></style>
