<template>

  <k-breadcrumbs v-if="breadcrumbs.length" :items="breadcrumbs" />

</template>


<script>

  import { getChannels, getChannelObject } from 'kolibri.coreVue.vuex.getters';
  import { PageNames } from '../../constants';
  import { isTopicPage, isLearnerPage, numberOfAssignedClassrooms } from '../../state/getters/main';
  import kBreadcrumbs from 'kolibri.coreVue.components.kBreadcrumbs';
  export default {
    name: 'breadcrumbs',
    $trs: {
      allClassroomsText: 'Classes',
      channels: 'Channels',
      learners: 'Learners',
    },
    components: { kBreadcrumbs },
    computed: {
      channelTitle() {
        return this.pageState.channelId
          ? this.getChannelObject(this.pageState.channelId).title
          : '';
      },
      classroomCrumbs() {
        // Only show these first two crumbs if Coach is assigned to 2+ Classrooms
        if (this.numberOfAssignedClassrooms < 2) {
          return [];
        }
        const { name, id } = this.currentClassroom;
        return [
          {
            text: this.$tr('allClassroomsText'),
            link: { name: PageNames.CLASS_LIST },
          },
          {
            text: name,
            link: {
              name: PageNames.CLASS_ROOT,
              params: { classId: id },
            },
          },
        ];
      },
      breadcrumbs() {
        return [...this.classroomCrumbs, ...this.subPageCrumbs].filter(Boolean);
      },
      subPageCrumbs() {
        if (this.isLearnerPage) {
          return this.learnerPageCrumbs;
        }
        if (this.pageName === PageNames.RECENT_ITEMS_FOR_CHANNEL) {
          return this.recentChannelItemsCrumbs;
        } else if (this.pageName === PageNames.RECENT_LEARNERS_FOR_ITEM) {
          return this.recentItemCrumbs;
        } else if (this.isTopicPage) {
          return this.topicCrumbs;
        }
        return [];
      },
      learnerPageCrumbs() {
        return [
          {
            text: this.$tr('learners'),
            link: { name: PageNames.LEARNER_LIST },
          },
          this.currentLearnerForReport && {
            text: this.currentLearnerForReport.name,
            link: {
              name: PageNames.LEARNER_CHANNELS,
              params: {
                userId: this.currentLearnerForReport.id,
              },
            },
          },
          // Crumbs for all preceding topics
          ...(this.currentLearnerReportContentNode
            ? this.learnerReportAncestorCrumbs(this.currentLearnerReportContentNode.ancestors)
            : []),
          // Crumb for the current Topic or Leaf Node
          this.currentLearnerReportContentNode && {
            text: this.currentLearnerReportContentNode.name,
          },
        ];
      },
      recentChannelItemsCrumbs() {
        return [
          {
            text: this.$tr('channels'),
            link: {
              name: PageNames.RECENT_CHANNELS,
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
              name: PageNames.RECENT_CHANNELS,
              params: { classId: this.classId },
            },
          },
          {
            text: this.channelTitle,
            link: {
              name: PageNames.RECENT_ITEMS_FOR_CHANNEL,
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
              name: PageNames.TOPIC_CHANNELS,
              params: { classId: this.classId },
            },
          },
          // links to each ancestor
          ...this.pageState.contentScopeSummary.ancestors.map((item, index) => {
            const breadcrumb = { text: item.title };
            if (index) {
              breadcrumb.link = {
                name: PageNames.TOPIC_ITEM_LIST,
                params: {
                  classId: this.classId,
                  channelId: this.pageState.channelId,
                  topicId: item.id,
                },
              };
            } else {
              // link to channel root
              breadcrumb.link = {
                name: PageNames.TOPIC_CHANNEL_ROOT,
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
    methods: {
      learnerReportAncestorCrumbs(ancestors) {
        if (!ancestors || ancestors.length === 0) {
          return [];
        }
        const [channel, ...topics] = ancestors;
        return [
          {
            text: channel.title,
            link: {
              name: PageNames.LEARNER_CHANNEL_ROOT,
              params: {
                channelId: channel.id,
              },
            },
          },
          ...topics.map(topic => ({
            text: topic.title,
            link: {
              name: PageNames.LEARNER_ITEM_LIST,
              params: {
                topicId: topic.id,
              },
            },
          })),
        ];
      },
    },
    vuex: {
      getters: {
        channels: getChannels,
        classId: state => state.classId,
        pageName: state => state.pageName,
        pageState: state => state.pageState,
        currentClassroom: state => state.currentClassroom,
        isTopicPage,
        isLearnerPage,
        getChannelObject,
        numberOfAssignedClassrooms,
        currentLearnerForReport(state) {
          if (state.pageState.userScope === 'user') {
            return {
              name: state.pageState.userScopeName,
              id: state.pageState.userScopeId,
            };
          }
        },
        currentLearnerReportContentNode(state) {
          if (state.pageState.contentScope) {
            return {
              name: state.pageState.contentScopeSummary.title,
              ancestors: state.pageState.contentScopeSummary.ancestors,
            };
          }
        },
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
