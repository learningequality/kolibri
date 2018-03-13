<template>

  <immersive-full-screen :backPageLink="backPageLink" :backPageText="backPageText">
    <learner-exercise-report />
  </immersive-full-screen>

</template>


<script>

  import * as constants from '../../../constants';
  import immersiveFullScreen from 'kolibri.coreVue.components.immersiveFullScreen';
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
        if (this.pageName === constants.PageNames.RECENT_LEARNER_ITEM_DETAILS) {
          return {
            name: constants.PageNames.RECENT_LEARNERS_FOR_ITEM,
            params: {
              classId: this.classId,
              channelId: this.channelId,
              contentId: this.exercise.pk,
            },
          };
        }
        if (this.pageName === constants.PageNames.TOPIC_LEARNER_ITEM_DETAILS) {
          return {
            name: constants.PageNames.TOPIC_LEARNERS_FOR_ITEM,
            params: {
              classId: this.classId,
              channelId: this.channelId,
              contentId: this.exercise.pk,
            },
          };
        }
        if (this.pageName === constants.PageNames.LEARNER_ITEM_DETAILS) {
          return {
            name: constants.PageNames.LEARNER_ITEM_LIST,
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
        if (constants.LearnerReports.includes(this.pageName)) {
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
