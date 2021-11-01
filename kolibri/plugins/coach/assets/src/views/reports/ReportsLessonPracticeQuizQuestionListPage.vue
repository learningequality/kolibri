<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <template #sub-nav>
      <TopNavbar />
    </template>

    <KPageContainer>

      <h1>DIFFICULT QUESTIONS</h1>
      <p> see ReportsLessonExerciseQuestionListPage for what to render </p>
    </KPageContainer>
  </CoreBase>

</template>


<script>

  // import { mapGetters } from 'vuex';
  import commonCoach from '../common';
  // import LearnerProgressRatio from '../common/status/LearnerProgressRatio';
  // import { LastPages } from '../../constants/lastPagesConstants';
  // import CSVExporter from '../../csv/exporter';
  // import * as csvFields from '../../csv/fields';
  // import ReportsLessonPracticeQuizHeader from './ReportsLessonExerciseHeader';
  // import ReportsControls from './ReportsControls';
  // import { PageNames } from './../../constants';

  export default {
    name: 'ReportsLessonPracticeQuizQuestionListPage',
    components: {
      // ReportsLessonPracticeQuizHeader,
      // ReportsControls,
      // LearnerProgressRatio,
    },
    mixins: [commonCoach],
    computed: {
      // ...mapGetters('questionList', ['difficultQuestions']),
      // lesson() {
      //   return this.lessonMap[this.$route.params.lessonId];
      // },
      // exercise() {
      //   return this.contentMap[this.$route.params.exerciseId];
      // },
      // table() {
      //   return this.difficultQuestions.map(question => {
      //     const tableRow = {};
      //     Object.assign(tableRow, question);
      //     return tableRow;
      //   });
      // },
    },
    methods: {
      // questionLink(questionId) {
      //   return this.classRoute(PageNames.REPORTS_LESSON_EXERCISE_QUESTION_PAGE_ROOT, {
      //     questionId,
      //     exerciseId: this.$route.params.exerciseId,
      //   });
      // },
      // onPreviewClick() {
      //   this.$router.push(
      //     this.$router.getRoute(
      //       'RESOURCE_CONTENT_PREVIEW',
      //       {
      //         contentId: this.exercise.node_id,
      //       },
      //       {
      //         last: LastPages.EXERCISE_QUESTION_LIST,
      //         exerciseId: this.exercise.content_id,
      //       }
      //     )
      //   );
      // },
      // exportCSV() {
      //   const columns = [...csvFields.title(), ...csvFields.helpNeeded()];
      //   const exporter = new CSVExporter(columns, this.className);
      //   exporter.addNames({
      //     lesson: this.lesson.title,
      //     resource: this.exercise.title,
      //     difficultQuestions: this.coachString('difficultQuestionsLabel'),
      //   });
      //   exporter.export(this.table);
      // },
    },
  };

</script>


<style lang="scss" scoped>

  @import '../common/print-table';

  .stats {
    margin-right: 16px;
  }

</style>
