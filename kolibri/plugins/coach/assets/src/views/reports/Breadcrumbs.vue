<template>

  <KBreadcrumbs v-if="breadcrumbs.length" :items="breadcrumbs" />

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import KBreadcrumbs from 'kolibri.coreVue.components.KBreadcrumbs';
  import { PageNames } from '../../constants';

  export default {
    name: 'Breadcrumbs',
    $trs: {
      allClassroomsText: 'Classes',
      channels: 'Channels',
      learners: 'Learners',
    },
    components: { KBreadcrumbs },
    computed: {
      ...mapGetters({
        channels: 'getChannels',
      }),
      ...mapState('reports', [
        'channelId',
        'contentScope',
        'contentScopeSummary',
        'userScope',
        'userScopeId',
        'userScopeName',
      ]),
      ...mapGetters([
        'getChannelObject',
        'isTopicPage',
        'isLearnerPage',
        'isRecentPage',
        'numberOfAssignedClassrooms',
      ]),
      ...mapState(['classId', 'pageName', 'currentClassroom']),
      currentLearnerForReport() {
        if (this.userScope === 'user') {
          return {
            name: this.userScopeName,
            id: this.userScopeId,
          };
        }
      },
      currentLearnerReportContentNode() {
        if (this.contentScope) {
          return {
            name: this.contentScopeSummary.title,
            ancestors: this.contentScopeSummary.ancestors,
          };
        }
      },
      channelTitle() {
        return this.channelId ? this.getChannelObject(this.channelId).title : '';
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
        const { title } = this.contentScopeSummary || {};
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
                channelId: this.channelId,
              },
            },
          },
          title && { text: title },
        ].filter(Boolean);
      },
      topicCrumbs() {
        if (!this.isTopicPage) return [];
        const { ancestors = [], title } = this.contentScopeSummary;
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
                  channelId: this.channelId,
                  topicId: item.id,
                },
              };
            } else {
              // link to channel root
              breadcrumb.link = {
                name: PageNames.TOPIC_CHANNEL_ROOT,
                params: {
                  classId: this.classId,
                  channelId: this.channelId,
                },
              };
            }
            return breadcrumb;
          }),
          // current item
          title && { text: this.contentScopeSummary.title },
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
  };

</script>


<style lang="scss" scoped></style>
