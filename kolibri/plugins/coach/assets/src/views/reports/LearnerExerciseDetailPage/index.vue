<template>

  <ImmersiveFullScreen :backPageLink="backPageLink" :backPageText="backPageText">
    <LearnerExerciseReportOld />
  </ImmersiveFullScreen>

</template>


<script>

  import { mapState } from 'vuex';
  import ImmersiveFullScreen from 'kolibri.coreVue.components.ImmersiveFullScreen';
  import { PageNames } from '../../../constants';
  import LearnerExerciseReportOld from './LearnerExerciseReportOld';

  export default {
    name: 'LearnerExerciseDetailPage',
    $trs: {
      backPrompt: 'Back to { backTitle }',
      documentTitleForRecentLearnerItems: 'Recent - Learner Details',
      documentTitleForLearnerTopic: 'Topics - Learner Details',
      documentTitleForLearnerItem: 'Learners - Item Details',
    },
    metaInfo() {
      return {
        title: this.documentTitle,
      };
    },
    components: {
      ImmersiveFullScreen,
      LearnerExerciseReportOld,
    },
    computed: {
      ...mapState(['pageName']),
      ...mapState('classSummary', { classId: 'id' }),
      ...mapState('exerciseDetail', ['exercise', 'user']),
      channelId() {
        return this.$route.params.channelId;
      },
      documentTitle() {
        switch (this.pageName) {
          case PageNames.LEARNER_ITEM_DETAILS:
            return this.$tr('documentTitleForLearnerItem');
          case PageNames.RECENT_LEARNER_ITEM_DETAILS:
            return this.$tr('documentTitleForRecentLearnerItems');
          case PageNames.TOPIC_LEARNER_ITEM_DETAILS:
            return this.$tr('documentTitleForLearnerTopic');
        }
      },
      backPageLink() {
        if (this.pageName === PageNames.RECENT_LEARNER_ITEM_DETAILS) {
          return {
            name: PageNames.RECENT_LEARNERS_FOR_ITEM,
            params: {
              classId: this.classId,
              channelId: this.channelId,
              contentId: this.exercise.id,
            },
          };
        }
        if (this.pageName === PageNames.TOPIC_LEARNER_ITEM_DETAILS) {
          return {
            name: PageNames.TOPIC_LEARNERS_FOR_ITEM,
            params: {
              classId: this.classId,
              channelId: this.channelId,
              contentId: this.exercise.id,
            },
          };
        }
        if (this.pageName === PageNames.LEARNER_ITEM_DETAILS) {
          return {
            name: PageNames.LEARNER_ITEM_LIST,
            params: {
              classId: this.classId,
              channelId: this.channelId,
              userId: this.user.id,
              topicId: this.parentTopic.id,
            },
          };
        }
        return undefined;
      },
      backPageText() {
        // if (LearnerReports.includes(this.pageName)) {
        //   return this.$tr('backPrompt', { backTitle: this.parentTopic.title });
        // }
        return this.$tr('backPrompt', { backTitle: this.exercise.title });
      },
      parentTopic() {
        // Have to guard against exercise being {}. In showExerciseDetailView,
        // exercise is being wiped out for some reason.
        if (this.exercise.ancestors) {
          return this.exercise.ancestors[this.exercise.ancestors.length - 1];
        }
        return { title: '' };
      },
    },
  };

</script>


<style lang="scss" scoped></style>
