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

      <ReportsResourceHeader :resource="exercise" @previewClick="onPreviewClick" />

      <ReportsControls @export="exportCSV" />

      <CoreTable :emptyMessage="coachString('questionListEmptyState')">
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
      </CoreTable>
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import { mapGetters, mapState } from 'vuex';
  import commonCoach from '../common';
  import LearnerProgressRatio from '../common/status/LearnerProgressRatio';
  import { LastPages } from '../../constants/lastPagesConstants';
  import CSVExporter from '../../csv/exporter';
  import * as csvFields from '../../csv/fields';
  import ReportsResourceHeader from './ReportsResourceHeader';
  import ReportsControls from './ReportsControls';
  import { PageNames } from './../../constants';

  export default {
    name: 'ReportsLessonExerciseQuestionListPage',
    components: {
      ReportsResourceHeader,
      ReportsControls,
      LearnerProgressRatio,
    },
    mixins: [commonCoach],
    computed: {
      ...mapGetters('questionList', ['difficultQuestions']),
      ...mapState('questionList', ['exercise']),
      lesson() {
        return this.lessonMap[this.$route.params.lessonId];
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
        return this.classRoute(PageNames.REPORTS_LESSON_EXERCISE_QUESTION_PAGE_ROOT, {
          questionId,
          exerciseId: this.$route.params.exerciseId,
        });
      },
      onPreviewClick() {
        this.$router.push(
          this.$router.getRoute(
            'RESOURCE_CONTENT_PREVIEW',
            {
              contentId: this.exercise.id,
            },
            {
              last: LastPages.EXERCISE_QUESTION_LIST,
              exerciseId: this.exercise.content_id,
            }
          )
        );
      },
      exportCSV() {
        const columns = [...csvFields.title(), ...csvFields.helpNeeded()];

        const exporter = new CSVExporter(columns, this.className);
        exporter.addNames({
          lesson: this.lesson.title,
          resource: this.exercise.title,
          difficultQuestions: this.coachString('difficultQuestionsLabel'),
        });

        exporter.export(this.table);
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '../common/print-table';

  .stats {
    margin-right: 16px;
  }

</style>
