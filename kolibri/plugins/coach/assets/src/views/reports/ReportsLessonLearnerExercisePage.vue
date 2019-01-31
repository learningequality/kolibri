<template>

  <CoreBase
    :immersivePage="true"
    :immersivePageRoute="toolbarRoute"
    :appBarTitle="exercise.title"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
  >
    <LearnerExerciseReport
      @navigate="handleNavigation"
    />
  </CoreBase>

</template>


<script>

  import { mapState } from 'vuex';
  import commonCoach from '../common';
  import LearnerExerciseReport from '../common/LearnerExerciseReport';

  export default {
    name: 'ReportsLessonLearnerExercisePage',
    components: {
      LearnerExerciseReport,
    },
    mixins: [commonCoach],
    $trs: {},
    computed: {
      ...mapState('classSummary', { classId: 'id' }),
      ...mapState('exerciseDetail', ['exercise']),
      ...mapState('lessonSummary', ['currentLesson']),
      toolbarRoute() {
        return this.classRoute('ReportsLessonLearnerPage', {});
      },
    },
    methods: {
      handleNavigation(params) {
        this.$router.push({
          name: this.name,
          params: {
            classId: this.classId,
            lessonId: this.currentLesson.id,
            ...params,
          },
        });
      },
    },
  };

</script>


<style lang="scss" scoped></style>
