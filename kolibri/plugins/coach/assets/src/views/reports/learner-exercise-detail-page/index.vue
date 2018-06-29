<template>

  <immersive-full-screen :backPageLink="backPageLink" :backPageText="backPageText">
    <learner-exercise-report />
  </immersive-full-screen>

</template>


<script>

  import immersiveFullScreen from 'kolibri.coreVue.components.immersiveFullScreen';
  import { PageNames, LearnerReports } from '../../../constants';
  import learnerExerciseReport from './learner-exercise-report';

  export default {
    name: 'coachExerciseRenderPage',
    $trs: { backPrompt: 'Back to { backTitle }' },
    components: {
      immersiveFullScreen,
      learnerExerciseReport,
    },
    computed: {
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
    vuex: {
      getters: {
        channelId: state => state.pageState.channelId,
        user: state => state.pageState.user,
        exercise: state => state.pageState.exercise,
        classId: state => state.classId,
        pageName: state => state.pageName,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
