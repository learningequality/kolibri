<template>

  <k-breadcrumbs v-if="breadcrumbs.length" :items="breadcrumbs" />

</template>


<script>

  import { getChannels, getChannelObject } from 'kolibri.coreVue.vuex.getters';
  import kBreadcrumbs from 'kolibri.coreVue.components.kBreadcrumbs';
  import { PageNames } from '../../constants';
  import {
    isTopicPage,
    isRecentPage,
    isLearnerPage,
    numberOfAssignedClassrooms,
  } from '../../state/getters/main';

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
              name: this.rootPageName,
              params: { classId: id },
            },
          },
        ];
      },
      rootPageName() {
        if (this.isLearnerPage) {
          return PageNames.LEARNER_LIST;
        }
        if (this.isRecentPage) {
          return PageNames.RECENT_CHANNELS;
        }
        if (this.isTopicPage) {
          return PageNames.TOPIC_CHANNELS;
        }
      },
      breadcrumbs() {
        return [...this.classroomCrumbs, ...this.subPageCrumbs].filter(Boolean);
      },
      subPageCrumbs() {
        if (this.isLearnerPage) {
          return this.learnerPageCrumbs;
        }
        if (this.isRecentPage) {
          return this.recentItemCrumbs;
        }
        if (this.isTopicPage) {
          return this.topicCrumbs;
        }
        return [];
      },
      learnerPageCrumbs() {
        if (!this.isLearnerPage) return [];
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
      recentItemCrumbs() {
        if (!this.isRecentPage) return [];
        const { title } = this.pageState.contentScopeSummary || {};
        return [
          {
            text: this.$tr('channels'),
            link: {
              name: PageNames.RECENT_CHANNELS,
              params: { classId: this.classId },
            },
          },
          this.channelTitle && {
            text: this.channelTitle,
            link: {
              name: PageNames.RECENT_ITEMS_FOR_CHANNEL,
              params: {
                classId: this.classId,
                channelId: this.pageState.channelId,
              },
            },
          },
          title && { text: title },
        ].filter(Boolean);
      },
      topicCrumbs() {
        if (!this.isTopicPage) return [];
        const { ancestors = [], title } = this.pageState.contentScopeSummary;
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
          ...ancestors.map((item, index) => {
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
          title && { text: this.pageState.contentScopeSummary.title },
        ].filter(Boolean);
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
        isRecentPage,
        getChannelObject: state => getChannelObject.bind(null, state),
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
