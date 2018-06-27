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
    $trs: { backPrompt: 'Back to { backTitle }' },
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


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  $container-side-padding = 15px

  .details-container
    width: 100%
    height: 85%
    padding-top: $container-side-padding
    clearfix()

  .attempt-log-container
    width: 30%
    height: 100%
    overflow-y: auto
    float: left

  .exercise-container
    width: 70%
    height: 100%
    padding: $containerSidePadding
    float: left

</style>
