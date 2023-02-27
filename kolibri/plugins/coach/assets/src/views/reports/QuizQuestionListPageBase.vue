<template>

  <ReportsQuizBaseListPage @export="exportCSV">
    <div>
      <CoreTable :emptyMessage="coachString('questionListEmptyState')">
        <template #headers>
          <th>{{ coachString('questionLabel') }}</th>
          <th>{{ coachString('helpNeededLabel') }}</th>
        </template>
        <template #tbody>
          <transition-group tag="tbody" name="list">
            <tr v-for="(tableRow, index) in table" :key="tableRow.item + index">
              <td>
                <span v-if="$isPrint">{{ tableRow.title }}</span>
                <KRouterLink
                  v-if="!exam.missing_resource"
                  :text="tableRow.title"
                  :to="questionLink(tableRow.item)"
                  icon="question"
                />
                <span v-else>
                  <KIcon icon="question" />{{ tableRow.title }}
                </span>
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
    </div>
  </ReportsQuizBaseListPage>

</template>


<script>

  import { mapGetters } from 'vuex';
  import commonCoach from '../common';
  import LearnerProgressRatio from '../common/status/LearnerProgressRatio';
  import CSVExporter from '../../csv/exporter';
  import * as csvFields from '../../csv/fields';
  import ReportsQuizBaseListPage from './ReportsQuizBaseListPage';
  import { PageNames } from './../../constants';

  export default {
    name: 'QuizQuestionListPageBase',
    components: {
      LearnerProgressRatio,
      ReportsQuizBaseListPage,
    },
    mixins: [commonCoach],
    computed: {
      ...mapGetters('questionList', ['difficultQuestions']),
      exam() {
        return this.examMap[this.$route.params.quizId];
      },
      group() {
        return this.$route.params.groupId && this.groupMap[this.$route.params.groupId];
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
        return this.classRoute(
          this.group
            ? PageNames.REPORTS_GROUP_REPORT_QUIZ_QUESTION_PAGE_ROOT
            : PageNames.REPORTS_QUIZ_QUESTION_PAGE_ROOT,
          {
            questionId,
            quizId: this.$route.params.quizId,
          }
        );
      },
      exportCSV() {
        const columns = [...csvFields.questionTitle(), ...csvFields.helpNeeded()];

        const exporter = new CSVExporter(columns, this.className);
        const names = {
          resource: this.exam.title,
          difficultQuestions: this.coachString('difficultQuestionsLabel'),
        };

        if (this.group) {
          names.group = this.group.name;
        }
        exporter.addNames(names);

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
