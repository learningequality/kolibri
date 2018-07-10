<template>

  <immersive-full-screen :backPageLink="backPageLink" :backPageText="backPageText">
    <learner-exercise-report />
  </immersive-full-screen>

</template>


<script>

  import { mapState } from 'vuex';
  import immersiveFullScreen from 'kolibri.coreVue.components.immersiveFullScreen';
  import { PageNames, LearnerReports } from '../../../constants';
  import learnerExerciseReport from './learner-exercise-report';

  export default {
    name: 'learnerExerciseDetailPage',
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
      immersiveFullScreen,
      learnerExerciseReport,
    },
    computed: {
      ...mapState(['classId', 'pageName']),
      ...mapState({
        channelId: state => state.pageState.channelId,
        exercise: state => state.pageState.exercise,
        user: state => state.pageState.user,
      }),
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
              contentId: this.exercise.pk,
            },
          };
        }
        if (this.pageName === PageNames.TOPIC_LEARNER_ITEM_DETAILS) {
          return {
            name: PageNames.TOPIC_LEARNERS_FOR_ITEM,
            params: {
              classId: this.classId,
              channelId: this.channelId,
              contentId: this.exercise.pk,
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
              topicId: this.parentTopic.pk,
            },
          };
        }
        return undefined;
      },
      backPageText() {
        if (LearnerReports.includes(this.pageName)) {
          return this.$tr('backPrompt', { backTitle: this.parentTopic.title });
        }
        return this.$tr('backPrompt', { backTitle: this.exercise.title });
      },
      parentTopic() {
        return this.exercise.ancestors[this.exercise.ancestors.length - 1];
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
