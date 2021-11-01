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
      <ReportsLessonPracticeQuizHeader @previewClick="onPreviewClick" />
      <!-- <CoreTable :emptyMessage="coachString('questionListEmptyState')">
        <template #headers>
          <th>{{ coachString('questionLabel') }}</th>
          <th>{{ coachString('helpNeededLabel') }}</th>
        </template>
        <template #tbody>
          <transition-group tag="tbody" name="list">
            <tr v-for="tableRow in table" :key="tableRow.question_id">
              <td>
                <KRouterLink
                  :text="tableRow.title"
                  :to="questionLink(tableRow.question_id)"
                />
              </td>
              <td>
                <LearnerProgressRatio
                  :verb="VERBS.needHelp"
                  :icon="ICONS.help"
                  :total="tableRow.total"
                  :count="tableRow.total - tableRow.correct"
                  :verbosity="1"
                />
              </td>
            </tr>
          </transition-group>
        </template>
      </CoreTable> -->
    </KPageContainer>
  </CoreBase>

</template>


<script>

  // import { mapGetters } from 'vuex';
  import commonCoach from '../common';
  // import LearnerProgressRatio from '../common/status/LearnerProgressRatio';
  import { LastPages } from '../../constants/lastPagesConstants';
  // import CSVExporter from '../../csv/exporter';
  // import * as csvFields from '../../csv/fields';
  import ReportsLessonPracticeQuizHeader from './ReportsLessonPracticeQuizHeader';
  // import ReportsControls from './ReportsControls';
  // import { PageNames } from './../../constants';

  export default {
    name: 'ReportsLessonPracticeQuizQuestionListPage',
    components: {
      ReportsLessonPracticeQuizHeader,
      // ReportsControls,
      // LearnerProgressRatio,
    },
    mixins: [commonCoach],
    computed: {
      // ...mapGetters('questionList', ['difficultQuestions']),
      // lesson() {
      //   return this.lessonMap[this.$route.params.lessonId];
      // },
      resource() {
        return this.contentMap[this.$route.params.practiceQuizId];
      },
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
      onPreviewClick() {
        this.$router.push(
          this.$router.getRoute(
            'RESOURCE_CONTENT_PREVIEW',
            {
              contentId: this.resource.node_id,
            },
            {
              last: LastPages.PRACTICE_QUIZ_LEARNER_LIST,
              practiceQuizId: this.resource.content_id,
            }
          )
        );
      },
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
