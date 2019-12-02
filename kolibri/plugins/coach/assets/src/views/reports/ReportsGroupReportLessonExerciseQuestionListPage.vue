<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <KPageContainer>

      <ReportsGroupReportLessonExerciseHeader />

      <ReportsControls @export="exportCSV">
        <h2>{{ coachString('overallLabel') }}</h2>
      </ReportsControls>

      <CoreTable :emptyMessage="coachString('questionListEmptyState')">
        <thead slot="thead">
          <tr>
            <th>{{ coachString('questionLabel') }}</th>
            <th>{{ coachString('helpNeededLabel') }}</th>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr v-for="tableRow in table" :key="tableRow.question_id">
            <td>
              <KLabeledIcon icon="person">
                <KRouterLink
                  :text="tableRow.title"
                  :to="questionLink(tableRow.question_id)"
                />
              </KLabeledIcon>
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
      </CoreTable>
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import { mapGetters } from 'vuex';
  import commonCoach from '../common';
  import LearnerProgressRatio from '../common/status/LearnerProgressRatio';
  import CSVExporter from '../../csv/exporter';
  import * as csvFields from '../../csv/fields';
  import ReportsGroupReportLessonExerciseHeader from './ReportsGroupReportLessonExerciseHeader';
  import ReportsControls from './ReportsControls';
  import { PageNames } from './../../constants';

  export default {
    name: 'ReportsGroupReportLessonExerciseQuestionListPage',
    components: {
      ReportsGroupReportLessonExerciseHeader,
      ReportsControls,
      LearnerProgressRatio,
    },
    mixins: [commonCoach],
    computed: {
      ...mapGetters('questionList', ['difficultQuestions']),
      lesson() {
        return this.lessonMap[this.$route.params.lessonId];
      },
      resource() {
        return this.contentMap[this.$route.params.exerciseId];
      },
      group() {
        return this.groupMap[this.$route.params.groupId];
      },
      table() {
        return this.difficultQuestions.map(question => {
          const tableRow = {};
          Object.assign(tableRow, question);
          return tableRow;
        });
      },
    },
    methods: {
      questionLink(questionId) {
        return this.classRoute(PageNames.REPORTS_GROUP_REPORT_LESSON_EXERCISE_QUESTION_PAGE_ROOT, {
          questionId,
          exerciseId: this.$route.params.exerciseId,
        });
      },
      exportCSV() {
        const columns = [
          {
            name: this.coachString('questionLabel'),
            key: 'title',
          },
          ...csvFields.helpNeeded(),
        ];

        const exporter = new CSVExporter(columns, this.className);
        exporter.addNames({
          group: this.group.name,
          lesson: this.lesson.title,
          resource: this.resource.title,
          difficultQuestions: this.coachString('difficultQuestionsLabel'),
        });

        exporter.export(this.table);
      },
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped>

  @import '../common/print-table';

  .stats {
    margin-right: 16px;
  }

</style>
