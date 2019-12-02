<template>

  <ReportsQuizBaseListPage @export="exportCSV">
    <CoreTable :emptyMessage="coachString('learnerListEmptyState')">
      <thead slot="thead">
        <tr>
          <th>{{ coachString('nameLabel') }}</th>
          <th>{{ coreString('progressLabel') }}</th>
          <th>{{ coachString('scoreLabel') }}</th>
          <th>{{ coachString('groupsLabel') }}</th>
        </tr>
      </thead>
      <transition-group slot="tbody" tag="tbody" name="list">
        <tr v-for="tableRow in table" :key="tableRow.id">
          <td>
            <KLabeledIcon icon="person">
              <KRouterLink
                v-if="tableRow.statusObj.status !== STATUSES.notStarted"
                :text="tableRow.name"
                :to="classRoute('ReportsQuizLearnerPage', {
                  learnerId: tableRow.id,
                  questionId: 0,
                  interactionIndex: 0
                })"
              />
              <template v-else>
                {{ tableRow.name }}
              </template>
            </KLabeledIcon>
          </td>
          <td v-if="tableRow.statusObj.status !== STATUSES.started">
            <StatusSimple
              :status="tableRow.statusObj.status"
            />
            <div
              v-if="tableRow.statusObj.status === STATUSES.completed"
              class="small-answered-count"
              :style="answerCountColorStyles"
            >
              {{
                completedQuestionsCountLabel(tableRow.statusObj.num_answered, exam.question_count)
              }}
            </div>
          </td>
          <td v-else>
            <KLabeledIcon>
              <KIcon slot="icon" :color="$themeTokens.progress" icon="inProgress" />
              {{
                $tr('questionsCompletedRatioLabel',
                    {count: tableRow.statusObj.num_answered || 0, total: exam.question_count})
              }}
            </KLabeledIcon>
          </td>
          <td>
            <Score
              v-if="tableRow.statusObj.status === STATUSES.completed"
              :value="tableRow.statusObj.score || 0.0"
            />
          </td>
          <td>
            <TruncatedItemList :items="tableRow.groups" />
          </td>
        </tr>
      </transition-group>
    </CoreTable>
  </ReportsQuizBaseListPage>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../common';
  import CSVExporter from '../../csv/exporter';
  import * as csvFields from '../../csv/fields';
  import ReportsQuizBaseListPage from './ReportsQuizBaseListPage';

  export default {
    name: 'ReportsQuizLearnerListPage',
    components: {
      ReportsQuizBaseListPage,
    },
    mixins: [commonCoach, commonCoreStrings],
    data() {
      return {
        filter: 'allQuizzes',
      };
    },
    computed: {
      filterOptions() {
        return [
          {
            label: this.coachString('allQuizzesLabel'),
            value: 'allQuizzes',
          },
          {
            label: this.coachString('activeQuizzesLabel'),
            value: 'activeQuizzes',
          },
          {
            label: this.coachString('inactiveQuizzesLabel'),
            value: 'inactiveQuizzes',
          },
        ];
      },
      exam() {
        return this.examMap[this.$route.params.quizId];
      },
      recipients() {
        return this.getLearnersForExam(this.exam);
      },
      table() {
        const learners = this.recipients.map(learnerId => this.learnerMap[learnerId]);
        const sorted = this._.sortBy(learners, ['name']);
        return sorted.map(learner => {
          const tableRow = {
            groups: this.getGroupNamesForLearner(learner.id),
            statusObj: this.getExamStatusObjForLearner(this.exam.id, learner.id),
          };
          Object.assign(tableRow, learner);
          return tableRow;
        });
      },
      answerCountColorStyles() {
        return {
          color: this.$themeTokens.annotation,
        };
      },
    },
    beforeMount() {
      this.filter = this.filterOptions[0];
    },
    methods: {
      completedQuestionsCountLabel(answered, total) {
        if (answered === total) {
          return this.$tr('allQuestionsAnswered');
        } else {
          return this.$tr('questionsCompletedRatioLabel', { count: answered || 0, total: total });
        }
      },
      exportCSV() {
        const columns = [
          ...csvFields.name(),
          ...csvFields.learnerProgress('statusObj.status'),
          ...csvFields.score(),
          ...csvFields.list('groups', 'groupsLabel'),
        ];

        const exporter = new CSVExporter(columns, this.className);
        exporter.addNames({
          resource: this.exam.title,
        });

        exporter.export(this.table);
      },
    },
    $trs: {
      allQuizzes: 'All quizzes',
      activeQuizzes: 'Active quizzes',
      inactiveQuizzes: 'Inactive quizzes',
      allQuestionsAnswered: 'All questions answered',
      questionsCompletedRatioLabel:
        '{count, number, integer} of {total, number, integer} questions {count, plural, other {answered}}',
    },
  };

</script>


<style lang="scss" scoped>

  @import '../common/print-table';

  .small-answered-count {
    display: block;
    margin-left: 1.75rem; /* matches KLabeledIcon */
    font-size: small;
  }

</style>
